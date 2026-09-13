// src/lib/study-chain.ts — استمرار المعالجة بعد إغلاق الصفحة (سلسلة استدعاء ذاتيّة)
//
// المشكلة: الملخّص يُبنى مقاطع متتابعة (النداء المتزامن لا يسع كتاباً كاملاً داخل
// مهلة الدالّة)، وتقدُّم المقاطع كان مرهوناً باستطلاع المتصفّح — فإغلاق الصفحة
// يُوقف التقدّم حتى المهمّة اليوميّة.
//
// الحلّ: قبل أن تنتهي دالّة الاستطلاع تُطلق دالّةً جديدة مثلها (نداء HTTP إلى
// المسار نفسه)، فتتسلسل الاستدعاءات على الخادم بلا متصفّح. وتتوقّف السلسلة من
// نفسها متى لم يعد ثمّة تقدّم — فلا تدور بلا عمل.
//
// الحرّاس: رمز مشتقّ من AUTH_SECRET (فلا يُطلقها أحد من الخارج)، وسقف قفزات،
// وشرط «تقدَّم شيءٌ فعلاً» قبل كلّ قفزة. والمهمّة اليوميّة تبقى شبكة أمان أخيرة.
import { createHash, timingSafeEqual } from "crypto";
import { APP_URL } from "@/lib/email";

// سقف القفزات في السلسلة الواحدة — حارسٌ مطلق ضدّ الدوران.
export const MAX_CHAIN_HOPS = Math.max(1, Number(process.env.STUDY_CHAIN_MAX_HOPS) || 30);

// رمز السلسلة: مشتقّ من AUTH_SECRET بلا متغيّر بيئة جديد، ولا يُشتقّ منه السرّ.
function chainToken(): string | null {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return createHash("sha256").update(`${secret}|study-chain`).digest("hex");
}

export function isValidChainToken(given: string | null): boolean {
  const expected = chainToken();
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// يُطلق القفزة التالية ولا ينتظر عملها. المهلة القصيرة تكفي لتسليم الطلب:
// الدالّة المستدعاة تُكمل مستقلّةً حتى لو انقطع الاتّصال من طرفنا.
export async function kickStudyChain(hop: number): Promise<void> {
  const token = chainToken();
  if (!token || hop >= MAX_CHAIN_HOPS) return;
  try {
    await fetch(`${APP_URL}/api/study/poll?chain=1&hop=${hop}`, {
      method: "GET",
      headers: { "x-study-chain": token },
      signal: AbortSignal.timeout(2500),
    });
  } catch {
    // انقطاع الانتظار متوقَّع ومقصود — الطلب سُلّم والعمل يجري هناك.
  }
}
