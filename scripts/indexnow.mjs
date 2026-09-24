// scripts/indexnow.mjs — يُبلغ محرّكات IndexNow بعناوين الموقع بعد كلّ بناء إنتاج
//
// IndexNow بروتوكولٌ مفتوح يُخطر به الموقعُ محرّكاتِ البحث فوراً بصفحاته الجديدة
// والمعدَّلة، بدل انتظار زحفها. نداءٌ واحد يصل Bing وYandex وSeznam وNaver وYep —
// ونتائج Bing تغذّي DuckDuckGo وYahoo وEcosia وبحثَ ChatGPT وCopilot.
// أمّا قوقل فلا يشارك فيه، ويبقى طريقه خريطة الموقع وSearch Console.
//
// لا حساب ولا لوحة: يكفي ملفّ المفتاح في public/ ويتحقّق منه المحرّك بنفسه.
//
// القواعد:
// - في بناء الإنتاج وحده — لا تُبلَّغ عناوين المعاينة.
// - لا يُبلَّغ نطاق vercel.app — يُحوَّل إلى النطاق الرسميّ ولا يُفهرَس.
// - لا يُفشل البناء أبداً: أيّ خطأٍ يُسجَّل ويُتجاوز، فالموقع أهمّ من الإبلاغ.
//
// والعناوين تُقرأ من خريطة الموقع المبنيّة نفسها، لا من قائمةٍ ثانية تنحرف عنها.
//
// حدٌّ معروف: البناء ينتهي قبل أن يُرقّى النشر بلحظات، فعنوانٌ جديدٌ تماماً قد
// يُطلب قبل أن يخدمه النشر الجديد. والمحرّكات تزحف بعد دقائق لا ثوانٍ، فالخطر ضئيل،
// وأسوأ ما فيه زيارةٌ تُعاد لاحقاً.
import { readFile, readdir } from "node:fs/promises";

const TAG = "[indexnow]";

async function main() {
  if (process.env.VERCEL_ENV !== "production") {
    console.log(`${TAG} تخطّي — ليس بناء إنتاج`);
    return;
  }
  const site = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (!site || site.includes(".vercel.app")) {
    console.log(`${TAG} تخطّي — لا نطاق رسميّ في NEXT_PUBLIC_APP_URL`);
    return;
  }

  const keyFile = (await readdir("public")).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
  if (!keyFile) {
    console.log(`${TAG} تخطّي — لا ملفّ مفتاح في public/`);
    return;
  }
  const key = (await readFile(`public/${keyFile}`, "utf8")).trim();

  let xml;
  try {
    xml = await readFile(".next/server/app/sitemap.xml.body", "utf8");
  } catch {
    console.log(`${TAG} تخطّي — خريطة الموقع ليست ثابتةً في هذا البناء`);
    return;
  }
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].trim())
    .filter((u) => u === site || u.startsWith(`${site}/`));
  if (urls.length === 0) {
    console.log(`${TAG} تخطّي — لا عناوين بنطاق ${site} في الخريطة`);
    return;
  }

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: new URL(site).host,
      key,
      keyLocation: `${site}/${keyFile}`,
      urlList: urls,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  // 200: قُبل وتُحقّق منه، 202: قُبل وينتظر التحقّق من المفتاح — كلاهما نجاح
  const ok = res.status === 200 || res.status === 202;
  console.log(`${TAG} ${ok ? "أُبلغ" : "رُدّ"} ${urls.length} عنواناً — HTTP ${res.status}`);
}

main()
  .catch((e) => console.warn(`${TAG} تعذّر الإبلاغ (لا أثر له في البناء):`, e?.message ?? e))
  .finally(() => process.exit(0));
