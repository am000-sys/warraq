// src/lib/tap.ts — تكامل Tap Payments (مدى + Apple Pay سعودي + STC Pay)
const secretKey = process.env.TAP_SECRET_KEY?.trim();

export const isTapConfigured = Boolean(secretKey && secretKey.startsWith("sk_"));

// وضع المفتاح: الاختباريّ (sk_test_) ينجح في التطبيق تماماً كالمباشر — الشحنة تُقرأ
// CAPTURED ويُضاف الرصيد — لكنّه لا يحرّك مالاً حقيقيّاً ولا يظهر في لوحة Tap المباشرة.
// لذلك نُظهره صراحةً في تشخيص النظام بدل أن يمرّ صامتاً.
export type TapKeyMode = "live" | "test" | "unknown" | null;

export function tapKeyMode(): TapKeyMode {
  if (!secretKey) return null;
  if (secretKey.startsWith("sk_live_")) return "live";
  if (secretKey.startsWith("sk_test_")) return "test";
  return "unknown"; // مفتاح بصيغة غير معروفة (أو مفتاح منشور pk_ بالخطأ)
}

const TAP_API = "https://api.tap.company/v2";

type TapChargeInput = {
  amountSar: number; // بالريال (وليس الهللات)
  description: string;
  customer: { email: string; name?: string | null };
  redirectUrl: string;
  webhookUrl?: string; // post.url — بدونه لا تُرسل Tap إشعار الحدث إطلاقاً
  metadata: Record<string, string>;
};

export async function createTapCharge(
  input: TapChargeInput,
): Promise<{ url: string; id: string; liveMode: boolean | null }> {
  if (!secretKey) throw new Error("TAP_NOT_CONFIGURED");

  const res = await fetch(`${TAP_API}/charges`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountSar,
      currency: "SAR",
      description: input.description,
      customer: {
        first_name: input.customer.name ?? "عميل",
        email: input.customer.email,
      },
      source: { id: "src_all" }, // كلّ طرق الدفع المتاحة (مدى/Visa/Apple Pay/STC)
      redirect: { url: input.redirectUrl },
      // إشعار الخادم: تعتمد Tap على post.url لكلّ شحنة. إغفاله يعني ألّا يصل الـ webhook
      // فتبقى المعاملة معلّقة لو أغلق العميل التبويب قبل العودة للموقع.
      ...(input.webhookUrl ? { post: { url: input.webhookUrl } } : {}),
      metadata: input.metadata,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data?.transaction?.url) {
    throw new Error(data?.errors?.[0]?.description ?? "فشل إنشاء عمليّة الدفع في Tap");
  }
  return {
    url: data.transaction.url,
    id: data.id,
    liveMode: typeof data.live_mode === "boolean" ? data.live_mode : null,
  };
}

export async function retrieveTapCharge(chargeId: string) {
  if (!secretKey) throw new Error("TAP_NOT_CONFIGURED");
  const res = await fetch(`${TAP_API}/charges/${chargeId}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  return res.json();
}
