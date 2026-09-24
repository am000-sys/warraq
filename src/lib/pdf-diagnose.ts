// src/lib/pdf-diagnose.ts — تشخيص طبقة النصّ في ملفّ PDF عربيّ
//
// منطقٌ نقيّ بلا متصفّح ولا pdfjs: يأخذ النصّ المستخرج من كلّ صفحة ويحكم عليه.
// فصلُه عن الواجهة يجعله قابلاً للاختبار بنصوصٍ معروفة، ويجعل الحكم واحداً أينما استُعمل.
//
// لماذا يخرج النصّ العربيّ من PDF رموزاً؟ لأربعة أسباب يميّزها هذا الفحص:
//   ١. لا طبقة نصّ أصلاً — الملفّ صورٌ مصوَّرة، فلا شيء يُنسخ.
//   ٢. أشكال العرض (Presentation Forms): يُخزَّن الحرف بشكله المتّصل (ﺍﻟﺤﻤﺪ) لا
//      بحرفه الأساسيّ (الحمد). يظهر سليماً على الشاشة، لكنّ البحث لا يعثر عليه
//      وكثيرٌ من البرامج تلصقه مقطّعاً أو مقلوب الترتيب.
//   ٣. ترميزٌ تالف: خطٌّ بلا جدول تحويلٍ إلى يونيكود، أو ترميزٌ قديم قُرئ خطأً،
//      فيخرج «ÇáÍãÏ» أو رموزٌ خاصّة أو علامات ترقيم عشوائيّة.
//   ٤. نصٌّ سليم — يُنسخ مباشرةً ولا يحتاج تفريغاً.

export type PageKind = "image" | "ok" | "presentation" | "encoding" | "latin" | "other";

export type Verdict = "scanned" | "ok" | "broken" | "mixed" | "latin";

// حروف الأبجديّة الأساسيّة (مع الفارسيّة والأورديّة الشائعة في المطبوعات)
const AR = /[ء-يٱ-ۓ]/g;
// أشكال العرض العربيّة أ وب
const PRES = /[ﭐ-﷿ﹰ-ﻼ]/g;
// حروف لاتينيّة موسّعة — علامة ترميز ويندوز العربيّ حين يُقرأ غربيّاً («ÇáÍãÏ»)
const MOJI = /[À-ÿ]/g;
// منطقة الاستعمال الخاصّ ورمز الاستبدال — خطٌّ بلا جدول تحويل
const PUA = /[-�]/g;
// علامات ترقيم ورموز ASCII — خطٌّ يربط حروفه بمواضع رموزٍ عشوائيّة
const SYM = /[!-/:-@[-`{-~]/g;
const LATIN = /[A-Za-z]/g;

const count = (s: string, re: RegExp) => (s.match(re) || []).length;

// أقلّ من هذا لا يُعدّ طبقة نصّ — ترقيمٌ أو رأس صفحةٍ في ملفٍّ مصوَّر
const MIN_TEXT_CHARS = 20;

export function classifyPage(text: string): PageKind {
  const t = text.replace(/\s+/g, "");
  if (t.length < MIN_TEXT_CHARS) return "image";

  const ar = count(t, AR);
  const pres = count(t, PRES);
  const bad = count(t, MOJI) + count(t, PUA);
  const sym = count(t, SYM);
  const lat = count(t, LATIN);

  if (pres > 0 && pres / (ar + pres) > 0.3) return "presentation";
  if (bad > 10 && bad > ar) return "encoding";
  if (sym > t.length * 0.4) return "encoding";
  if (ar >= 10) return "ok";
  if (lat > t.length * 0.5) return "latin";
  // أرقامٌ وفهارس ونحوها — لا يُبنى عليها حكم
  return "other";
}

// صفحاتٌ موزّعة على الملفّ كلّه — فحصُ الكتاب كاملاً بطيء بلا فائدة،
// وفحصُ أوّله وحده يُخطئ في الملفّات المختلطة.
export function samplePages(total: number, max = 12): number[] {
  if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);
  const picks = new Set<number>();
  for (let i = 0; i < max; i++) picks.add(Math.round((i * (total - 1)) / (max - 1)) + 1);
  return [...picks].sort((a, b) => a - b);
}

export type Tally = Record<PageKind, number>;

export function emptyTally(): Tally {
  return { image: 0, ok: 0, presentation: 0, encoding: 0, latin: 0, other: 0 };
}

export function verdictOf(t: Tally): Verdict {
  const counted = t.image + t.ok + t.presentation + t.encoding + t.latin;
  if (counted === 0) return "scanned";
  if (t.image >= counted * 0.8) return "scanned";
  if (t.presentation + t.encoding >= counted * 0.5) return "broken";
  if (t.ok >= counted * 0.8) return "ok";
  if (t.latin >= counted * 0.8) return "latin";
  return "mixed";
}
