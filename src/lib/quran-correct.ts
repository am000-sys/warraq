// src/lib/quran-correct.ts
// تصحيح مرجعيّ للآيات القرآنيّة المقتبسة بين قوسي الزخرفة ﴿ ... ﴾ مقابل نصّ الرسم
// العثمانيّ (مصحف المدينة/مجمع الملك فهد، رواية حفص عن عاصم). معالجة نصّيّة خالصة:
// لا نداء API ولا تكلفة. يعمل تلقائيّاً ضمن التفريغ الأساسيّ. استبدال فقط (بلا مرجع).
//
// المبدأ: نطبّع النصّ المقتبس والنصّ المرجعيّ (إزالة التشكيل وتوحيد الحروف) ثمّ نطابق
// تسلسل الكلمات؛ فإن تجاوزت نسبة التطابق العتبة استبدلنا المقتبس بالنصّ العثمانيّ الصحيح.
// محافِظ عمداً: لا نستبدل إلّا عند ثقة كافية حتى لا نمسّ نصّاً غير قرآنيّ.
//
// مصدر النصّ المرجعيّ: src/data/quran-uthmani.json (موثّق داخله، قابل للاستبدال
// بملفّ مجمع الملك فهد الرسميّ بنفس البنية).
//
// ملاحظة: نستعمل رموز Unicode الصريحة (\uXXXX) في تعابير المحارف لتفادي أيّ لبس
// في ترميز المصدر — وخصوصاً علامات الضبط القرآنيّة وقوسي الزخرفة.
import quranData from "@/data/quran-uthmani.json";

type Surah = { n: number; name: string; ayat: string[] };
const SURAHS = (quranData as { surahs: Surah[] }).surahs;

// قوسا الزخرفة القرآنيّة: ﴿ U+FD3F (فتح) ... ﴾ U+FD3E (إغلاق).
// نقبل كلا الترتيبين احتياطاً (مطابقة غير جشِعة) ونوحّد المخرج إلى ﴿ ... ﴾.
const OPEN = "﴿"; // ﴿
const CLOSE = "﴾"; // ﴾
const ORNATE_RE = /[﴿﴾]([^﴿﴾]{1,2000}?)[﴿﴾]/g;

const MIN_WORDS = 2; // لا نستبدل اقتباساً أقصر من كلمتين (تفادي اللبس)
const MATCH_THRESHOLD = 0.82; // أدنى نسبة تطابق للكلمات المطبّعة

// التشكيل وعلامات الضبط القرآنيّة + الألف الخنجريّة (U+0670) + التطويل (U+0640)
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ࣓-ࣿ]/g;

// تطبيع عربيّ متسامح: يزيل التشكيل ويوحّد الحروف ليصمد أمام أخطاء قراءة الضبط.
// نزيل الألف الخنجريّة لِيتطابق الرسم العثمانيّ المقتبَس مع المرجع (الحالة الشائعة).
export function normalizeArabic(s: string): string {
  return s
    .replace(MARKS, "")
    .replace(/[آأإٱ]/g, "ا") // آ أ إ ٱ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ئ/g, "ي") // ئ → ي
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ء/g, "") // ء تُحذف
    .replace(/[^ء-ي\s]/g, " ") // أبقِ الحروف العربيّة الأساسيّة فقط
    .replace(/\s+/g, " ")
    .trim();
}

// فهرس مبنيّ مرّة واحدة (cache على مستوى الوحدة)
type Corpus = {
  orig: string[];
  norm: string[];
  surah: number[];
  bigram: Map<string, number[]>;
};
let CORPUS: Corpus | null = null;

function buildCorpus(): Corpus {
  if (CORPUS) return CORPUS;
  const orig: string[] = [];
  const norm: string[] = [];
  const surah: number[] = [];
  for (const su of SURAHS) {
    for (const ayah of su.ayat) {
      for (const w of ayah.split(/\s+/)) {
        if (!w) continue;
        const nw = normalizeArabic(w);
        if (!nw) continue; // كلمة بلا حروف بعد التطبيع (نادر)
        orig.push(w);
        norm.push(nw);
        surah.push(su.n);
      }
    }
  }
  // فهرس ثنائيّ الكلمات لتسريع إيجاد مواضع البدء المرشّحة
  const bigram = new Map<string, number[]>();
  for (let i = 0; i + 1 < norm.length; i++) {
    const key = norm[i] + " " + norm[i + 1];
    const arr = bigram.get(key);
    if (arr) arr.push(i);
    else bigram.set(key, [i]);
  }
  CORPUS = { orig, norm, surah, bigram };
  return CORPUS;
}

// يبحث عن أفضل مطابقة لتسلسل الكلمات المطبّعة داخل النصّ المرجعيّ
function matchSpan(fragNorm: string[], c: Corpus): { start: number; len: number } | null {
  const L = fragNorm.length;
  if (L < MIN_WORDS) return null;
  const cands = c.bigram.get(fragNorm[0] + " " + fragNorm[1]);
  if (!cands) return null;

  let best: { start: number; len: number; score: number } | null = null;
  for (const start of cands) {
    // نجرّب أطوالاً قريبة لاستيعاب زيادة/نقص كلمة من الـ OCR
    for (const len of [L, L - 1, L + 1]) {
      if (len < MIN_WORDS || start + len > c.norm.length) continue;
      // امنع تجاوز حدود السورة (الاقتباس لا يعبر سورتين)
      if (c.surah[start] !== c.surah[start + len - 1]) continue;
      const cmp = Math.min(len, L);
      let same = 0;
      for (let k = 0; k < cmp; k++) if (c.norm[start + k] === fragNorm[k]) same++;
      const score = same / Math.max(len, L);
      if (!best || score > best.score) best = { start, len, score };
    }
  }
  return best && best.score >= MATCH_THRESHOLD
    ? { start: best.start, len: best.len }
    : null;
}

// يصحّح كلّ اقتباس قرآنيّ بين ﴿ ﴾ في نصّ صفحة. آمن تماماً: أيّ خطأ ⇒ يُعيد النصّ كما هو.
export function correctQuranQuotes(text: string): string {
  if (!text || (text.indexOf(OPEN) === -1 && text.indexOf(CLOSE) === -1)) {
    return text; // لا أقواس زخرفة ⇒ لا عمل (يحافظ على السرعة)
  }
  try {
    const c = buildCorpus();
    return text.replace(ORNATE_RE, (full, inner: string) => {
      const fragNorm = normalizeArabic(inner).split(" ").filter(Boolean);
      const m = matchSpan(fragNorm, c);
      if (!m) return full; // لم نتأكّد ⇒ نترك الاقتباس كما هو
      const correct = c.orig.slice(m.start, m.start + m.len).join(" ");
      return OPEN + correct + CLOSE; // ﴿ النصّ الصحيح ﴾
    });
  } catch {
    return text; // لا نُفسد مخرج التفريغ مهما حدث
  }
}
