// src/lib/tap.ts — تكامل Tap Payments (مدى + Apple Pay سعودي + STC Pay)
const secretKey = process.env.TAP_SECRET_KEY;

export const isTapConfigured = Boolean(secretKey && secretKey.startsWith("sk_"));

const TAP_API = "https://api.tap.company/v2";

type TapChargeInput = {
  amountSar: number; // بالريال (وليس الهللات)
  description: string;
  customer: { email: string; name?: string | null };
  redirectUrl: string;
  metadata: Record<string, string>;
};

export async function createTapCharge(input: TapChargeInput): Promise<{ url: string; id: string }> {
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
      metadata: input.metadata,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data?.transaction?.url) {
    throw new Error(data?.errors?.[0]?.description ?? "فشل إنشاء عمليّة الدفع في Tap");
  }
  return { url: data.transaction.url, id: data.id };
}

export async function retrieveTapCharge(chargeId: string) {
  if (!secretKey) throw new Error("TAP_NOT_CONFIGURED");
  const res = await fetch(`${TAP_API}/charges/${chargeId}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  return res.json();
}
