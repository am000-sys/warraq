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

  // أنماط شائعة لرقم الصفحة: "32" · "- ٣٢ -" · "[32]" · "صفحة ٣٢" · "ص ٣٢" · "ص: ٣٢"
  const patterns = [
    new RegExp(`^[\\[\\(\\-—–\\s]*([${DIGITS}]{1,4})[\\]\\)\\-—–\\.\\s]*$`),
    new RegExp(`^(?:صفحة|ص)\\s*[:\\-]?\\s*([${DIGITS}]{1,4})$`),
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) return m[1];
  }
  return null;
}

// يلتقط رقم الصفحة من أوّل/آخر سطر غير فارغ (يُفضّل الأسفل في كتب التراث)
function extractPrintedNumber(lines: string[]): string | null {
  const firstIdx = lines.findIndex((l) => l.trim());
  let lastIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim()) {
      lastIdx = i;
      break;
    }
  }

  // الأسفل أوّلاً
  if (lastIdx >= 0) {
    const n = asPageNumber(lines[lastIdx]);
    if (n) {
      lines.splice(lastIdx, 1);
      return n;
    }
  }
  // ثمّ الأعلى
  if (firstIdx >= 0 && firstIdx !== lastIdx) {
    const n = asPageNumber(lines[firstIdx]);
    if (n) {
      lines.splice(firstIdx, 1);
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

export function formatOcrPage(raw: string): FormattedPage {
  if (!raw || !raw.trim()) return { text: "", printedNumber: null };

  const lines = raw.replace(/\r/g, "").split("\n");
  const printedNumber = extractPrintedNumber(lines);

  let text = lines.join("\n");
  // لا نُعيد ترتيب الحواشي في صفحات فيها جداول أو أشكال (حفاظاً على بنيتها)
  const hasTableOrImage = /\|.*\|/.test(text) || text.includes("![");
  if (!hasTableOrImage) text = separateFootnotes(text);
  text = text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

  return { text, printedNumber };
}
