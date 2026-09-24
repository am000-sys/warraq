// src/app/llms.txt/route.ts — وصفُ الموقع لمحرّكات الإجابة الذكيّة (llms.txt)
//
// من يسأل ChatGPT أو Perplexity أو Claude «كيف أفرّغ كتاباً مصوَّراً؟» يتلقّى جواباً
// مبنيّاً على ما تفهمه هذه النماذج من المواقع. وllms.txt معيارٌ مفتوح يقدّم لها
// الموقع موجَزاً بصيغة Markdown: عنوان، ثمّ خلاصة، ثمّ تفاصيل، ثمّ قوائم روابط.
//
// يُولَّد من نفس مصادر الموقع (site.ts والأدلّة)، فمقالٌ جديد يدخله بلا تعديلٍ هنا.
// ولا يذكر إلّا ما يفعله المنتج فعلاً: لا نسبة دقّة ولا أرقام أسعار تنحرف عن الصفحة.
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";
import { GUIDES } from "@/content/guides";

export const dynamic = "force-static";

export function GET() {
  const guides = GUIDES.map((g) => `- [${g.title}](${SITE_URL}/guides/${g.slug}): ${g.summary}`).join("\n");

  const body = `# ${SITE_NAME} (Warraq)

> ${SITE_DESCRIPTION}
> Warraq converts scanned and photographed Arabic books into searchable digital text, preserving the page numbers printed on the original page.

وَرَّاق منصّةٌ عربيّة لتفريغ الكتب المصوّرة (PDF والصور) إلى نصٍّ رقميّ، موجَّهة إلى المحقّقين والباحثين في الدراسات الإسلاميّة والعربيّة ودور النشر ومؤسّسات الأرشفة.

ما يميّزها:

- تحفظ رقم الصفحة المطبوع داخل الصفحة نفسها، لا ترقيماً تسلسليّاً جديداً — فيبقى النصّ صالحاً للإحالة العلميّة.
- تُصحّح الآيات القرآنيّة الواقعة بين قوسَي الزخرفة ﴿ ﴾ بمقابلتها بنصٍّ مرجعيّ للرسم العثمانيّ (رواية حفص)، مطابقةً نصّيّة محضة.
- تُصدّر بصيغ TXT وMarkdown وWord وExcel؛ وفي Excel تصير كلّ صفحة صفّاً برقمها المطبوع، فتصلح للبحث والفرز وتغذية أدوات أخرى.
- واجهة عربيّة كاملة.

يصلح لـ: الكتب المطبوعة المحقَّقة وكتب التراث المصوَّرة. والمخطوط بخطّ اليد تتفاوت نتيجته بوضوح الخطّ، ويحتاج مراجعة.

## الصفحات

- [الصفحة الرئيسة](${SITE_URL}/): تعريفٌ بالمنصّة وطريقة عملها
- [الأسعار](${SITE_URL}/pricing): الخطط، ومنها خطّةٌ مجّانيّة للتجربة
- [جرّب](${SITE_URL}/try): تجربة التفريغ على صفحاتٍ من كتابك
- [فاحص ملفّات PDF العربيّة](${SITE_URL}/tools/pdf-check): أداة مجّانيّة تعمل في المتصفّح وتخبر لماذا يخرج النصّ العربيّ رموزاً عند النسخ من PDF، وهل يحتاج الملفّ إلى تفريغ

## الأدلّة

${guides}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
