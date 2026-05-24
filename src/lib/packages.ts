// src/lib/packages.ts — باقات شحن الرصيد (هوامش متدرّجة)
// كلّما كبرت الباقة قلّ سعر الصفحة (هامش ٧٠٪ → ٥٠٪)
export type TopUpPackage = {
  id: "small" | "medium" | "large" | "flex";
  nameAr: string;
  pages: number;
  amountSar: number; // بالريال
  perPage: number; // ريال/صفحة
  savePct?: number; // نسبة التوفير مقارنةً بالباقة الصغيرة
  featured?: boolean;
};

export const TOPUP_PACKAGES: TopUpPackage[] = [
  { id: "small", nameAr: "باقة صغيرة", pages: 100, amountSar: 5, perPage: 0.05 },
  {
    id: "medium",
    nameAr: "باقة متوسطة",
    pages: 500,
    amountSar: 18.75,
    perPage: 0.0375,
    savePct: 25,
    featured: true,
  },
  {
    id: "large",
    nameAr: "باقة كبيرة",
    pages: 2500,
    amountSar: 75,
    perPage: 0.03,
    savePct: 40,
  },
];

export function getPackage(id: string): TopUpPackage | undefined {
  return TOPUP_PACKAGES.find((p) => p.id === id);
}

// ─── الباقة المرنة (عدد صفحات بمضاعفات ٥٠) ───────────────
export const FLEX_STEP = 50; // الوحدة
export const FLEX_MIN = 50; // الحدّ الأدنى
export const FLEX_MAX = 10000; // الحدّ الأقصى
export const FLEX_PER_PAGE = 0.05; // ريال/صفحة

// يبني باقة مرنة من عدد الصفحات (دون تحقّق — للعرض في الواجهة)
export function buildFlexiblePackage(pages: number): TopUpPackage {
  return {
    id: "flex",
    nameAr: "باقة مرنة",
    pages,
    amountSar: Math.round(pages * FLEX_PER_PAGE * 100) / 100,
    perPage: FLEX_PER_PAGE,
  };
}

// يتحقّق ثمّ يبني (للخادم) — يعيد undefined إن كان العدد غير صالح
export function getFlexiblePackage(pages: number): TopUpPackage | undefined {
  if (
    !Number.isInteger(pages) ||
    pages < FLEX_MIN ||
    pages > FLEX_MAX ||
    pages % FLEX_STEP !== 0
  ) {
    return undefined;
  }
  return buildFlexiblePackage(pages);
}
