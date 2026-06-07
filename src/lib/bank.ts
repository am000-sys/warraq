// src/lib/bank.ts — بيانات حساب المالك لاستقبال الحوالات
// عدّلها عبر متغيّرات البيئة على Vercel، أو هنا مباشرةً.
export const BANK = {
  bankName: process.env.BANK_NAME || "بنك الراجحي",
  iban: (process.env.BANK_IBAN || "SA6080000407608010153418").replace(/\s/g, ""),
};

// تنسيق الآيبان بمسافات كلّ ٤ خانات للعرض
export function formatIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}
