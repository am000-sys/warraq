// src/lib/ocr-format.ts
// طبقة تنسيق لمخرج Mistral OCR (نصّ markdown خام لكلّ صفحة):
//  1) استخراج رقم الصفحة المطبوع → printedNumber (ميزة المحقّقين الأساسيّة).
//  2) فصل الحواشي عن المتن وإبرازها بفاصل واضح.
//  3) تنظيف الفراغات الزائدة.
// محافِظة عمداً: لا تُعيد البناء إلّا عند ثقة كافية حتى لا تُفسد مخرجاً جيّداً.

export type FormattedPage = {
  text: string;
  printedNumber: string | null;
};

// أرقام عربيّة-هنديّة + لاتينيّة
const DIGITS = "0-9\\u0660-\\u0669";

// يُجرّد سطراً من علامات markdown/الترقيم لفحص ما إذا كان "رقم صفحة"
function asPageNumber(line: string): string | null {
  const t = line
    .trim()
    .replace(/[*_#>`~]/g, "") // markdown
    .replace(/‏|‎/g, "") // علامات اتّجاه
    .trim();
  if (!t) return null;

  // أنماط شائعة لرقم الصفحة (سطر شبه مستقلّ): "32" · "- ٣٢ -" · "[32]" ·
  // "• ٣٢ •" · "/ ٣٢ /" · "صفحة ٣٢" · "ص ٣٢" · "ص: ٣٢"
  const ORN = "\\[\\(\\)\\]\\-—–~•·.\\s/|=";
  const patterns = [
    new RegExp(`^[${ORN}]*([${DIGITS}]{1,4})[${ORN}]*$`),
    new RegExp(`^(?:صفحة|ص)\\s*[:\\-]?\\s*([${DIGITS}]{1,4})$`),
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) return m[1];
  }
  return null;
}

// يلتقط رقماً مدمجاً في «ترويسة/تذييل جارٍ» قصير مثل: «الفصل الأول ٤٥» أو
// «٤٥ باب الطهارة». محافِظ جدّاً لتفادي التقاط سنة (١٤٢٥) أو رقم من جملة نثريّة:
//   • السطر قصير (≤ ٥ كلمات) — سمة الترويسات لا الجُمل.
//   • الرقم في الحافّة القصوى للسطر (بدايته أو نهايته).
//   • بقيّة السطر حروف عربيّة (عنوان)، لا تنتهي بعلامة جملة.
function pageNumberInHeader(line: string): string | null {
  const t = line
    .trim()
    .replace(/[*_#>`~]/g, "")
    .replace(/‏|‎/g, "")
    .trim();
  if (!t) return null;
  const words = t.split(/\s+/);
  if (words.length < 2 || words.length > 4) return null;
  // لا نلتقط من جملة تنتهي بنقطة/فاصلة (نثر لا ترويسة)
  if (/[.،؛!؟:]$/.test(t)) return null;
  // كلمات سياق تدلّ على عدد لا رقم صفحة (سنة/عدد/آية...) — نتجنّبها
  if (/(?:^|\s)(?:عام|سنة|سنه|آية|الآية|حديث|عدد|رقم)(?:\s|$)/.test(t)) return null;

  // ٣ أرقام كحدّ أقصى: يستبعد السنوات (٤ أرقام) تماماً مع تغطية الصفحات حتّى ٩٩٩
  const reEnd = new RegExp(`^(.*?\\S)\\s+([${DIGITS}]{1,3})$`); // الرقم في النهاية
  const reStart = new RegExp(`^([${DIGITS}]{1,3})\\s+(\\S.*)$`); // الرقم في البداية
  for (const [re, restGroup, numGroup] of [
    [reEnd, 1, 2],
    [reStart, 2, 1],
  ] as const) {
    const m = t.match(re);
    if (!m) continue;
    const rest = m[restGroup];
    // بقيّة السطر يجب أن تكون عنواناً عربيّاً (لا أرقام أخرى/رموز نثر)
    if (new RegExp(`[${DIGITS}]`).test(rest)) continue;
    if (!/[؀-ۿ]/.test(rest)) continue;
    return m[numGroup];
  }
  return null;
}

// يلتقط رقم الصفحة من نافذة أعلى/أسفل الصفحة (يُفضّل الأسفل في كتب التراث).
// لا يقتصر على أوّل/آخر سطر بل يفحص حتّى ٣ أسطر غير فارغة من كلّ طرف، لأنّ الرقم
// قد يقع فوق حاشية أو تحت ترويسة جارية لا في الحافّة تماماً.
function extractPrintedNumber(lines: string[]): string | null {
  const WINDOW = 3;
  // فهارس الأسطر غير الفارغة
  const nonEmpty: number[] = [];
  for (let i = 0; i < lines.length; i++) if (lines[i].trim()) nonEmpty.push(i);
  if (nonEmpty.length === 0) return null;

  // الأسفل أوّلاً: من الحافّة السفلى صعوداً ضمن النافذة
  const bottom = nonEmpty.slice(-WINDOW).reverse();
  for (const idx of bottom) {
    const n = asPageNumber(lines[idx]);
    if (n) {
      lines.splice(idx, 1);
      return n;
    }
  }
  // ثمّ الأعلى: من الحافّة العليا نزولاً ضمن النافذة (مع تجنّب تكرار ما فُحص)
  const top = nonEmpty.slice(0, WINDOW).filter((i) => !bottom.includes(i));
  for (const idx of top) {
    const n = asPageNumber(lines[idx]);
    if (n) {
      lines.splice(idx, 1);
      return n;
    }
  }

  // الطبقة الثانية (احتياط): رقم مدمج في ترويسة/تذييل قصير — على الحافّتين فقط
  const edges = [nonEmpty[nonEmpty.length - 1], nonEmpty[0]];
  for (const idx of edges) {
    if (idx === undefined) continue;
    const n = pageNumberInHeader(lines[idx]);
    if (n) {
      lines.splice(idx, 1);
      return n;
    }
  }
  return null;
}

// يكشف سطر فاصل أفقي (قاعدة) يفصل المتن عن الحواشي
function isRuleLine(line: string): boolean {
  const t = line.trim();
  if (t === "---" || t === "***" || t === "___") return true;
  return /^[-_*—–=\.\s]{5,}$/.test(t) && /[-_*—–=]/.test(t);
}

// يكشف بداية حاشية مرقّمة: "(١) ..." · "١) ..." · "١- ..." · "[1] ..." · "1. ..."
function looksLikeFootnoteStart(line: string): boolean {
  const t = line.trim().replace(/[*_]/g, "");
  return new RegExp(`^[\\[\\(]?\\s*[${DIGITS}]{1,3}\\s*[\\)\\]\\.\\-–—]`).test(t);
}

// يفصل الحواشي عن المتن إن وُجد فاصل واضح يتبعه حواشٍ مرقّمة
function separateFootnotes(text: string): string {
  const lines = text.split("\n");
  // ابحث عن فاصل في النصف الأسفل (الحواشي عادةً أسفل الصفحة)
  const startScan = Math.floor(lines.length / 2);
  let sep = -1;
  for (let i = startScan; i < lines.length; i++) {
    if (isRuleLine(lines[i])) {
      sep = i;
      break;
    }
  }
  if (sep === -1) return text;

  const after = lines.slice(sep + 1);
  const firstAfter = after.find((l) => l.trim());
  if (!firstAfter || !looksLikeFootnoteStart(firstAfter)) return text; // لسنا واثقين → اترك كما هو

  const main = lines.slice(0, sep).join("\n").trim();
  const notes = after.join("\n").trim();
  if (!main || !notes) return text;
  return `${main}\n\n———— الحواشي ————\n${notes}`;
}

// يطبّع مراجع الحواشي إلى صيغة ظاهرة ثابتة (N) — حتى لا تختفي في العرض أو التصدير.
// Mistral قد يُخرج الحواشي بصيغة markdown ‎[^N]‎ التي يحوّلها العارض لروابط قد تختفي.
function normalizeFootnoteMarkers(text: string): string {
  return (
    text
      // تعريف الحاشية: ‎[^N]: نص‎ → ‎(N) نص‎
      .replace(new RegExp(`\\[\\^([${DIGITS}]{1,3})\\]\\s*:`, "g"), "($1)")
      // مرجع الحاشية داخل النص: ‎[^N]‎ → ‎(N)‎
      .replace(new RegExp(`\\[\\^([${DIGITS}]{1,3})\\]`, "g"), "($1)")
      // صيغة superscript ‎^N^‎ → ‎(N)‎
      .replace(new RegExp(`\\^([${DIGITS}]{1,3})\\^`, "g"), "($1)")
  );
}

export function formatOcrPage(raw: string): FormattedPage {
  if (!raw || !raw.trim()) return { text: "", printedNumber: null };

  const lines = raw.replace(/\r/g, "").split("\n");
  const printedNumber = extractPrintedNumber(lines);

  let text = normalizeFootnoteMarkers(lines.join("\n"));
  // لا نُعيد ترتيب الحواشي في صفحات فيها جداول أو أشكال (حفاظاً على بنيتها)
  const hasTableOrImage = /\|.*\|/.test(text) || text.includes("![");
  if (!hasTableOrImage) text = separateFootnotes(text);
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  return { text, printedNumber };
}
