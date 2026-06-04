// src/lib/quran-correct.ts
// تصحيح مرجعيّ للآيات القرآنيّة مقابل نصّ الرسم العثمانيّ (مصحف المدينة، رواية حفص).
// معالجة نصّيّة خالصة: لا نداء API ولا تكلفة. يعمل تلقائيّاً ضمن التفريغ الأساسيّ.
//
// المبدأ: نطبّع النصّ المقتبس والنصّ المرجعيّ (إزالة التشكيل + توحيد الحروف) ثمّ
// نطابق تسلسل الكلمات. ثلاثة مسارات للكشف:
//   1) أقواس زخرفيّة ﴿ ﴾  — عتبة 0.82 (موثوق بالسياق)
//   2) أقواس اقتباس شائعة «» أو "" — عتبة 0.82
//   3) سطر مستقلّ يتطابق غالبيّته مع القرآن — عتبة 0.90 (أكثر تحفّظاً)
// محافِظ عمداً: أيّ خطأ ⇒ يُعيد النصّ كما هو.
//
// مصدر النصّ المرجعيّ: src/data/quran-uthmani.json (موثّق داخله، قابل للاستبدال).
// ملاحظة: نستعمل رموز Unicode الصريحة في تعابير المحارف تفادياً للبس.
import quranData from "@/data/quran-uthmani.json";

type Surah = { n: number; name: string; ayat: string[] };
const SURAHS = (quranData as { surahs: Surah[] }).surahs;

// قوسا الزخرفة ﴿ U+FD3E ﴾ U+FD3F
const OPEN = "﴿"; // ﴿
const CLOSE = "﴾"; // ﴾

// مسار ١: أقواس زخرفيّة. نلتقط النصّ من ﴿ حتّى ﴾ أو حتّى بداية زخرفة تالية ﴿
// (شائع في كتب التراث: «﴿ نصّ الآية ﴿رقم﴾» بلا إغلاق صريح للآية قبل رقمها).
// هكذا لا نبتلع رمز رقم الآية ولا نُفسده.
const ORNATE_RE = /﴿([^﴾﴿]{1,2000}?)(?:﴾|(?=﴿))/g;

// مسار ٢: أقواس اقتباس شائعة يستخدمها OCR بدلاً من الزخرفيّة
// «...» · "..." · "..." · ❝...❞
const QUOTE_PATTERNS: RegExp[] = [
  /«([^«»]{4,500}?)»/g, // «»
  /“([^“”]{4,500}?)”/g, // ""
  /❝([^❝❞]{4,500}?)❞/g, // ❝❞
];

const MIN_WORDS = 2; // حدّ أدنى مطلق
const MIN_DETECT_WORDS = 4; // للكشف بلا أقواس
const MATCH_THRESHOLD = 0.75; // عتبة الأقواس (﴿﴾ و«»)
const DETECT_THRESHOLD = 0.90; // عتبة أعلى للكشف الحرّ

// التشكيل وعلامات الضبط القرآنيّة + الألف الخنجريّة (U+0670) + التطويل (U+0640)
const MARKS =
  /[ؐ-ًؚ-ٰٟۖ-ۭࣔ-ࣿﹰ-ﹴﹶ-ﻼ]/g;

export function normalizeArabic(s: string): string {
  return s
    .replace(MARKS, "")
    .replace(/[آأإٱ]/g, "ا") // آ أ إ ٱ → ا
    .replace(/ى/g, "ي") // ى → ي
    .replace(/ئ/g, "ي") // ئ → ي
    .replace(/ؤ/g, "و") // ؤ → و
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ء/g, "") // ء تُحذف
    .replace(/[^ء-ي\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Corpus = {
  orig: string[];
  norm: string[];
  surah: number[];
  ayah: number[]; // معرّف الآية لكلّ كلمة (لربط الحدود)
  bigram: Map<string, number[]>;
};
let CORPUS: Corpus | null = null;

function buildCorpus(): Corpus {
  if (CORPUS) return CORPUS;
  const orig: string[] = [];
  const norm: string[] = [];
  const surah: number[] = [];
  const ayah: number[] = [];
  let ayahId = 0;
  for (const su of SURAHS) {
    for (const a of su.ayat) {
      ayahId++;
      for (const w of a.split(/\s+/)) {
        if (!w) continue;
        const nw = normalizeArabic(w);
        if (!nw) continue;
        orig.push(w);
        norm.push(nw);
        surah.push(su.n);
        ayah.push(ayahId);
      }
    }
  }
  const bigram = new Map<string, number[]>();
  for (let i = 0; i + 1 < norm.length; i++) {
    const key = norm[i] + " " + norm[i + 1];
    const arr = bigram.get(key);
    if (arr) arr.push(i);
    else bigram.set(key, [i]);
  }
  CORPUS = { orig, norm, surah, ayah, bigram };
  return CORPUS;
}

// يبحث عن أفضل مطابقة لتسلسل الكلمات المطبّعة داخل النصّ المرجعيّ.
// يربط على عدّة ثنائيّات عبر المقطع (لا الأوّل فقط) فيصمد أمام فساد الكلمات
// في الحافّتين (مثلاً «أَلَمۡ تَرَ» يقرؤها OCR «المرتمر»). كلّ ثنائيّ سليم في
// الموضع j يقترح بداية مرشّحة start = p - j؛ ثمّ نُقيّم المقطع كاملاً على كلّ مرشّح.
function matchSpan(
  fragNorm: string[],
  c: Corpus,
  threshold = MATCH_THRESHOLD,
): { start: number; len: number } | null {
  const L = fragNorm.length;
  if (L < MIN_WORDS) return null;

  // اجمع بدايات مرشّحة من ثنائيّات المقطع (حتّى ٢٤ ثنائيّاً للسرعة)
  const starts = new Set<number>();
  const scan = Math.min(L - 1, 24);
  for (let j = 0; j < scan; j++) {
    const hits = c.bigram.get(fragNorm[j] + " " + fragNorm[j + 1]);
    if (!hits) continue;
    for (const p of hits) {
      const s = p - j; // محاذاة بداية المقطع مع بداية الآية
      if (s >= 0 && s < c.norm.length) starts.add(s);
    }
  }
  if (starts.size === 0) return null;

  let best: { start: number; len: number; score: number } | null = null;
  for (const start of starts) {
    for (const len of [L, L - 1, L + 1, L - 2, L + 2]) {
      if (len < MIN_WORDS || start + len > c.norm.length) continue;
      if (c.surah[start] !== c.surah[start + len - 1]) continue;
      const cmp = Math.min(len, L);
      let same = 0;
      for (let k = 0; k < cmp; k++) if (c.norm[start + k] === fragNorm[k]) same++;
      const score = same / Math.max(len, L);
      if (!best || score > best.score) best = { start, len, score };
    }
  }
  if (!best || best.score < threshold) return null;

  // ربط الحدود: لو بدأ/انتهى المقطع داخل آية واحدة على بُعد كلمات قليلة من حدّها،
  // نمدّه إلى حدّ الآية — لاستعادة كلمات الحافّة التي أفسدها OCR (مثل «أَلَمۡ»
  // التي تُقرأ ملتصقة بما بعدها). محافِظ: حتّى ٣ كلمات فقط من كلّ طرف.
  let { start, len } = best;
  let end = start + len - 1;
  const SNAP = 3;
  // للخلف حتّى بداية الآية
  for (let k = 0; k < SNAP && start > 0; k++) {
    if (c.ayah[start - 1] !== c.ayah[start]) break; // لا نعبر إلى آية سابقة
    start--;
    len++;
  }
  // للأمام حتّى نهاية الآية
  for (let k = 0; k < SNAP && end + 1 < c.norm.length; k++) {
    if (c.ayah[end + 1] !== c.ayah[end]) break;
    end++;
    len++;
  }
  return { start, len };
}

// يُحاول تصحيح مقطع نصّيّ (مستخرَج من داخل أقواس)
function correctFragment(inner: string, fullMatch: string, c: Corpus): string {
  const fragNorm = normalizeArabic(inner).split(" ").filter(Boolean);
  const m = matchSpan(fragNorm, c);
  if (!m) return fullMatch;
  const correct = c.orig.slice(m.start, m.start + m.len).join(" ");
  return OPEN + correct + CLOSE;
}

// ---- مسار ٣: كشف آية مستقلّة في سطر بلا أقواس ----
// يكشف عن سطر يحتوي نصّاً قرآنيّاً بنسبة عالية ويُصحّحه.
// خوارزميّة: يستخرج الكلمات العربيّة من السطر، يجرّب قطعاً بدءاً من كلمة واحدة
// مُزاحة من الطرفين (لاستيعاب كلمات حافّة غير قرآنيّة مثل "قال:") مع عتبة أعلى.
function tryCorrectStandaloneLine(line: string, c: Corpus): string | null {
  // تجاهل الأسطر التي تحتوي أقواساً مُعالَجة بالفعل
  if (line.includes(OPEN) || line.includes(CLOSE)) return null;

  // استخرج جميع الكلمات العربيّة مع مواضعها في السطر
  const ARABIC_WORD_RE =
    /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿ࢠ-ࣿ]+/g;
  const matches = [...line.matchAll(ARABIC_WORD_RE)];
  if (matches.length < MIN_DETECT_WORDS) return null;

  // جرّب ازاحة من البداية والنهاية (0 أو 1 كلمة) للسماح بكلمات تمهيديّة/ختاميّة
  for (let trimStart = 0; trimStart <= 3; trimStart++) {
    for (let trimEnd = 0; trimEnd <= 3; trimEnd++) {
      const endIdx = matches.length - trimEnd;
      if (endIdx - trimStart < MIN_DETECT_WORDS) continue;
      const slice = matches.slice(trimStart, endIdx);
      const fragNorm = slice.map((m) => normalizeArabic(m[0])).filter(Boolean);
      if (fragNorm.length < MIN_DETECT_WORDS) continue;

      const hit = matchSpan(fragNorm, c, DETECT_THRESHOLD);
      if (!hit) continue;

      const correct = c.orig.slice(hit.start, hit.start + hit.len).join(" ");
      const firstWord = slice[0];
      const lastWord = slice[slice.length - 1];
      // استبدل فقط المقطع المطابَق محافظاً على ما حوله من رموز/مسافات
      const before = line.slice(0, firstWord.index!);
      const after = line.slice(lastWord.index! + lastWord[0].length);
      return before + OPEN + correct + CLOSE + after;
    }
  }
  return null;
}

// ---- الدالّة الرئيسيّة ----
export function correctQuranQuotes(text: string): string {
  if (!text) return text;
  try {
    const c = buildCorpus();

    // مسار ١: الأقواس الزخرفيّة ﴿ ﴾
    let out = text.replace(ORNATE_RE, (full, inner: string) =>
      correctFragment(inner, full, c),
    );
    // مسافة بين إغلاق آية وزخرفة تالية (رمز رقم الآية) للقراءة: ﴾﴿ → ﴾ ﴿
    out = out.replace(/﴾﴿/g, "﴾ ﴿");

    // مسار ٢: أقواس الاقتباس الشائعة «» ""
    for (const re of QUOTE_PATTERNS) {
      re.lastIndex = 0;
      out = out.replace(re, (full, inner: string) => {
        // تحقّق أنّ المحتوى يبدو عربيّاً قبل محاولة التصحيح
        if (!/[؀-ۿ]/.test(inner)) return full;
        return correctFragment(inner, full, c);
      });
    }

    // مسار ٣: أسطر مستقلّة بلا أقواس
    out = out
      .split("\n")
      .map((line) => {
        // تجاهل الأسطر القصيرة أو غير العربيّة
        if (!/[؀-ۿ]{2,}/.test(line)) return line;
        return tryCorrectStandaloneLine(line, c) ?? line;
      })
      .join("\n");

    return out;
  } catch {
    return text;
  }
}
