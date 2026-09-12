// src/lib/turnstile.ts — تحدٍّ بشريّ صامت (Cloudflare Turnstile)
//
// الغرض: إيقاف الإغراق الآليّ **الموزَّع** على عناوين كثيرة، وهو ما لا يُوقفه
// حدّ المعدّل حسب الـ IP وحده. المستخدم الصادق لا يرى شيئاً في الغالب.
//
// **موقوف افتراضيّاً**: بلا المفتاحين لا يُعرض شيء ولا يُفحص شيء — سلوك الموقع
// مطابق تماماً لما قبله. فلا يُضاف خطر بمجرّد وجود الكود.
const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
const secretKey = process.env.TURNSTILE_SECRET_KEY?.trim() || "";

// يلزم المفتاحان معاً: مفتاح الموقع للواجهة والسرّ للتحقّق.
export const isTurnstileConfigured = Boolean(siteKey && secretKey);

// مفتاح الواجهة يُصدَّر **فارغاً** ما لم يكتمل الإعداد — فلا تظهر أداة تحدٍّ
// لا يفحصها الخادم (ضبط ناقص يُربك المستخدم بلا فائدة أمنيّة).
export const TURNSTILE_SITE_KEY = isTurnstileConfigured ? siteKey : "";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;

export type TurnstileResult = { ok: true } | { ok: false; reason: "missing" | "rejected" };

// يتحقّق من الرمز لدى Cloudflare.
//
// سياسة الفشل — مقصودة وموثّقة:
// • رمز مفقود أو مرفوض صراحةً ⇒ **رفض** (هذا هو الغرض).
// • تعذّر الوصول إلى Cloudflare (عطل شبكة أو مهلة) ⇒ **تمرير** مع تسجيل تحذير.
//   إسقاط كلّ تسجيلات الموقع لعطلٍ عند طرف ثالث ضررٌ أكبر من نفعه، وحدّ المعدّل
//   حسب الـ IP يبقى قائماً أرضيّةً للحماية في تلك اللحظات.
export async function verifyTurnstile(
  token: string | undefined | null,
  ip?: string | null,
): Promise<TurnstileResult> {
  if (!isTurnstileConfigured) return { ok: true };
  if (!token || typeof token !== "string") return { ok: false, reason: "missing" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const body = new URLSearchParams({ secret: secretKey, response: token });
    if (ip && ip !== "unknown") body.set("remoteip", ip);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: controller.signal,
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data?.success === true) return { ok: true };

    console.warn("[turnstile] رُفض الرمز:", data?.["error-codes"] ?? "بلا سبب");
    return { ok: false, reason: "rejected" };
  } catch (err) {
    // عطل نقل — نمرّر ولا نُسقط التسجيل (انظر سياسة الفشل أعلاه)
    console.warn("[turnstile] تعذّر التحقّق، مُرِّر الطلب:", (err as Error)?.message ?? err);
    return { ok: true };
  } finally {
    clearTimeout(timer);
  }
}

export const TURNSTILE_FAILED_MESSAGE =
  "تعذّر التحقّق من أنّك لست برنامجاً آليّاً. أعِد المحاولة.";
