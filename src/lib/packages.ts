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
  { id: "small", nameAr: "باقة صغيرة", pages: 100, amountSar: 6, perPage: 0.06 },
  {
    id: "medium",
    nameAr: "باقة متوسطة",
    pages: 500,
    amountSar: 23,
    perPage: 0.046,
    savePct: 23,
    featured: true,
  },
  {
    id: "large",
    nameAr: "باقة كبيرة",
    pages: 2500,
    amountSar: 94,
    perPage: 0.0376,
    savePct: 37,
  },
];

export function getPackage(id: string): TopUpPackage | undefined {
  return TOPUP_PACKAGES.find((p) => p.id === id);
}

// ─── الباقة المرنة (عدد صفحات بمضاعفات ٥٠) ───────────────
export const FLEX_STEP = 50; // الوحدة
export const FLEX_MIN = 50; // الحدّ الأدنى
export const FLEX_MAX = 10000; // الحدّ الأقصى
export const FLEX_PER_PAGE = 0.06; // ريال/صفحة

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

// ─── الصفحات المجّانيّة عند التسجيل ───────────────────────
// مصدرها الواحد هنا لا في billing.ts: هذا ملفّ نقيّ بلا قاعدة بيانات، فتقرؤه
// صفحات التسويق وحاسبة الكلفة في المتصفّح. و`billing.ts` يُعيد تصديره، فلا
// تتغيّر استيراداته القائمة. القيمة نفسها افتراض User.pagesBalance في المخطّط.
export const FREE_INITIAL_PAGES = 50;

// ─── أوفر طريقٍ لشراء عددٍ من الصفحات ─────────────────────
// يجيب سؤال الزائر الحقيقيّ: «كتابي ٤٠٠ صفحة، كم يكلّفني؟». والجواب ليس بديهيّاً:
// ٤٠٠ صفحة مرنة (٢٤ ريالاً) أغلى من الباقة المتوسطة (٥٠٠ صفحة بـ٢٣)، و٢٦٠٠ صفحة
// أرخص بالكبيرة ثمّ مرنة للباقي منها بستّ باقات متوسطة. فنحسبه حساباً لا تخميناً.
export type PurchaseLine = { pkg: TopUpPackage; qty: number };
export type PurchasePlan = {
  lines: PurchaseLine[]; // الأكبر أوّلاً
  totalHalalas: number; // بالهللات — أعداد صحيحة، بلا أخطاء الفاصلة العائمة
  pagesGranted: number; // ما يُضاف إلى الرصيد فعلاً (قد يزيد على المطلوب)
  purchases: number; // عدد عمليّات الشحن المنفصلة
};

const halalas = (sar: number) => Math.round(sar * 100);

// برمجة ديناميكيّة على وحدات من FLEX_STEP صفحة: أقلّ كلفة لبلوغ كلّ عددٍ من الوحدات
// بالباقات الثابتة، ثمّ تُكمَل البقيّة بباقة مرنة واحدة. عند التساوي في الكلفة:
// عمليّات شحنٍ أقلّ، ثمّ صفحات أكثر، ثمّ باقة مسمّاة بدل المرنة.
export function planPurchase(pagesNeeded: number): PurchasePlan {
  const empty: PurchasePlan = { lines: [], totalHalalas: 0, pagesGranted: 0, purchases: 0 };
  if (!Number.isFinite(pagesNeeded) || pagesNeeded <= 0) return empty;

  const need = Math.ceil(pagesNeeded / FLEX_STEP);
  const fixed = TOPUP_PACKAGES.filter((p) => p.pages % FLEX_STEP === 0).map((p) => ({
    pkg: p,
    units: p.pages / FLEX_STEP,
    cost: halalas(p.amountSar),
  }));
  const flexUnitCost = halalas(FLEX_STEP * FLEX_PER_PAGE);
  const flexMinUnits = Math.ceil(FLEX_MIN / FLEX_STEP);
  const flexMaxUnits = Math.floor(FLEX_MAX / FLEX_STEP);

  // تجاوز المطلوب بباقة واحدة كحدّ أقصى يكفي: ما زاد عليه لا يكون أرخص أبداً
  const top = need + Math.max(0, ...fixed.map((f) => f.units));
  const cost = new Array<number>(top + 1).fill(Infinity);
  const buys = new Array<number>(top + 1).fill(Infinity);
  const via = new Array<number>(top + 1).fill(-1);
  cost[0] = 0;
  buys[0] = 0;
  for (let s = 1; s <= top; s++) {
    fixed.forEach((f, i) => {
      if (f.units > s || cost[s - f.units] === Infinity) return;
      const c = cost[s - f.units] + f.cost;
      const b = buys[s - f.units] + 1;
      if (c < cost[s] || (c === cost[s] && b < buys[s])) {
        cost[s] = c;
        buys[s] = b;
        via[s] = i;
      }
    });
  }

  let best: { s: number; flex: number; total: number; buys: number } | null = null;
  for (let s = 0; s <= top; s++) {
    if (cost[s] === Infinity) continue;
    const flex = Math.max(0, need - s);
    if (flex > 0 && (flex < flexMinUnits || flex > flexMaxUnits)) continue;
    const cand = { s, flex, total: cost[s] + flex * flexUnitCost, buys: buys[s] + (flex > 0 ? 1 : 0) };
    if (
      !best ||
      cand.total < best.total ||
      (cand.total === best.total &&
        (cand.buys < best.buys ||
          (cand.buys === best.buys &&
            (cand.s + cand.flex > best.s + best.flex ||
              (cand.s + cand.flex === best.s + best.flex && cand.flex < best.flex)))))
    ) {
      best = cand;
    }
  }
  if (!best) return empty;

  const qty = new Map<number, number>();
  for (let s = best.s; s > 0; s -= fixed[via[s]].units) {
    qty.set(via[s], (qty.get(via[s]) ?? 0) + 1);
  }
  const lines: PurchaseLine[] = [...qty.entries()].map(([i, n]) => ({ pkg: fixed[i].pkg, qty: n }));
  if (best.flex > 0) lines.push({ pkg: buildFlexiblePackage(best.flex * FLEX_STEP), qty: 1 });
  lines.sort((a, b) => b.pkg.pages - a.pkg.pages);

  return {
    lines,
    totalHalalas: best.total,
    pagesGranted: (best.s + best.flex) * FLEX_STEP,
    purchases: best.buys,
  };
}

// أرخص شراءٍ بعمليّة شحنٍ واحدة يغطّي العدد. يُعرض بديلاً حين تتعدّد عمليّات
// الأوفر: كلّ حوالةٍ بنكيّة إيصالٌ ومراجعة، وقد يفضّل المشتري ريالين زائدين على ذلك.
export function singlePurchase(pagesNeeded: number): PurchasePlan | null {
  if (!Number.isFinite(pagesNeeded) || pagesNeeded <= 0) return null;
  const options: TopUpPackage[] = TOPUP_PACKAGES.filter((p) => p.pages >= pagesNeeded);
  const flex = getFlexiblePackage(Math.max(FLEX_MIN, Math.ceil(pagesNeeded / FLEX_STEP) * FLEX_STEP));
  if (flex) options.push(flex);
  const pick = options.sort(
    (a, b) => halalas(a.amountSar) - halalas(b.amountSar) || b.pages - a.pages,
  )[0];
  if (!pick) return null;
  return {
    lines: [{ pkg: pick, qty: 1 }],
    totalHalalas: halalas(pick.amountSar),
    pagesGranted: pick.pages,
    purchases: 1,
  };
}
