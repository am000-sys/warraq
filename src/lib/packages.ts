// src/lib/packages.ts — باقات شحن الرصيد (هوامش متدرّجة)
// كلّما كبرت الباقة قلّ سعر الصفحة (هامش ٧٠٪ → ٥٠٪)
export type TopUpPackage = {
  id: "small" | "medium" | "large";
  nameAr: string;
  pages: number;
  amountSar: number; // بالريال
  perPage: number; // ريال/صفحة
  savePct?: number; // نسبة التوفير مقارنةً بالباقة الصغيرة
  featured?: boolean;
};

export const TOPUP_PACKAGES: TopUpPackage[] = [
  { id: "small", nameAr: "باقة صغيرة", pages: 100, amountSar: 20, perPage: 0.2 },
  {
    id: "medium",
    nameAr: "باقة متوسطة",
    pages: 500,
    amountSar: 75,
    perPage: 0.15,
    savePct: 25,
    featured: true,
  },
  {
    id: "large",
    nameAr: "باقة كبيرة",
    pages: 2500,
    amountSar: 300,
    perPage: 0.12,
    savePct: 40,
  },
];

export function getPackage(id: string): TopUpPackage | undefined {
  return TOPUP_PACKAGES.find((p) => p.id === id);
}
