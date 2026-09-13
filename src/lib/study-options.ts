// src/lib/study-options.ts — ثوابت الملخّص الدراسي المشتركة (خادم + عميل)
// ملفّ نقيّ بلا أيّ اعتماد على الخادم — يستورده مكوّن الواجهة ومكتبة الخادم معاً.

export type StudyFocus =
  | "definitions"
  | "enumerations"
  | "concepts"
  | "comparisons"
  | "positions"
  | "questions";

export type StudyDepth = "concise" | "balanced" | "deep";

export const FOCUS_OPTIONS: { id: StudyFocus; label: string; desc: string }[] = [
  {
    id: "definitions",
    label: "التعاريف والمصطلحات",
    desc: "إبراز كلّ تعريف بصيغة «المصطلح: شرحه» مع قائمة مصطلحات لكلّ محور",
  },
  {
    id: "enumerations",
    label: "التعدادات والتقسيمات",
    desc: "الأركان والشروط والأقسام في قوائم مرقّمة بارزة لا مدمجة في الفقرات",
  },
  {
    id: "concepts",
    label: "المفاهيم الكلّية والربط",
    desc: "الفكرة الجامعة لكلّ محور وصناديق «مربط الفهم» والعلاقات بين المحاور",
  },
  {
    id: "comparisons",
    label: "المقارنات والجداول",
    desc: "جداول مقارنة للفرق والمذاهب والأقوال المتقابلة حيثما أمكن",
  },
  {
    id: "positions",
    label: "أقوال المذاهب وأدلّتها",
    desc: "القائل + نصّ قوله أو معناه + بيان معنى القول، مع دليله إن ذُكر",
  },
  {
    id: "questions",
    label: "أسئلة مراجعة",
    desc: "أسئلة قصيرة بأجوبتها الموجزة في خاتمة كلّ محور للاختبار الذاتي",
  },
];

export const DEPTH_OPTIONS: { id: StudyDepth; label: string; desc: string }[] = [
  { id: "concise", label: "مركّز", desc: "خلاصة مكثّفة للمراجعة السريعة قبل الاختبار" },
  { id: "balanced", label: "متوازن", desc: "ملخّص وافٍ بلا استطراد — الموصى به" },
  { id: "deep", label: "موسّع", desc: "تفصيل أكبر مع الأدلّة والمناقشات" },
];

export const FOCUS_IDS = FOCUS_OPTIONS.map((f) => f.id);
export const DEPTH_IDS = DEPTH_OPTIONS.map((d) => d.id);

// تقدير صفحات النصّ الحرّ: صفحة كتاب عربيّة نموذجيّة ≈ ١٨٠٠ حرف
export const CHARS_PER_PAGE = 1800;

export function estimateSourcePages(chars: number): number {
  return Math.max(1, Math.ceil(chars / CHARS_PER_PAGE));
}

// ─── سقف تغطية الملخّص الواحد ───────────────────────────────
// الملخّص يُبنى مقاطع متتابعة، وله سقف طولٍ نهائيّ (HARD_TOTAL_CHARS في
// study-poll.ts). فمادّةٌ كبيرة يُغطّى أوّلها ويُنبَّه على الباقي — ولا يُحتسب
// الباقي في السعر.
export const STUDY_MAX_SUMMARY_CHARS = 300_000;

// نسبة طول الملخّص إلى المادّة حسب العمق. **مُعايَرة على التجربة**: مستندٌ من
// ١٦٥ صفحة (≈٣٠٠ ألف حرف) بلغ السقف فعلاً — أي أنّ النسبة عند ذلك العمق ١ فأكثر.
// والقيم أدناه محافظة عمداً: تُقلّل التغطية المُعلَنة والمحتسَبة، فيقع الخطأ في
// جانب المستخدم لا علينا. تُرفع متى صارت لدينا قياسات لكلّ عمق على حدة.
export const DEPTH_OUTPUT_RATIO: Record<StudyDepth, number> = {
  concise: 0.5,
  balanced: 1.0,
  deep: 1.4,
};

// أقصى عدد صفحات من المادّة يغطّيها ملخّص واحد بهذا العمق.
export function maxCoveredPages(depth: StudyDepth): number {
  return Math.max(
    1,
    Math.floor(STUDY_MAX_SUMMARY_CHARS / DEPTH_OUTPUT_RATIO[depth] / CHARS_PER_PAGE),
  );
}

// الصفحات المحتسَبة في السعر: ما يُغطّيه الملخّص فعلاً لا حجم المادّة كلّه.
export function billedPages(sourcePages: number, depth: StudyDepth): number {
  return Math.min(sourcePages, maxCoveredPages(depth));
}

// أسعار الخدمة (صفحات رصيد) — الخادم يقرؤها من SystemSetting ويمرّرها للواجهة
export type StudyPricing = {
  rate: number; // صفحات رصيد لكلّ صفحة مصدر — الدقّة العالية
  minCost: number;
  ratePremium: number; // — الدقّة القصوى
  minCostPremium: number;
};

// تكلفة الملخّص بصفحات الرصيد — تتناسب مع حجم المصدر (الكلفة الفعليّة تتبع المدخل)
export function calcStudyCost(
  sourcePages: number,
  premium: boolean,
  p: StudyPricing,
  depth?: StudyDepth, // عند تمريره: لا يُحتسب ما يتجاوز سقف التغطية
): number {
  const pages = depth ? billedPages(sourcePages, depth) : sourcePages;
  const rate = premium ? p.ratePremium : p.rate;
  const min = premium ? p.minCostPremium : p.minCost;
  return Math.max(min, Math.ceil(pages * rate));
}
