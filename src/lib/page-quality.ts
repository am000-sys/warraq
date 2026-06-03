// src/lib/page-quality.ts — تحليل جودة الصفحة المفرَّغة + استخراج الحواشي
// معالجة نصّية خالصة: لا استدعاء API، لا تكلفة إضافية

export type QualityLabel = "high" | "medium" | "low";

export interface PageQuality {
  score: number;       // 0–100
  label: QualityLabel;
}

/**
 * يُقدّر جودة النصّ المستخرَج من الصفحة.
 * المعايير: نسبة الحروف العربية، طول الكلمة المتوسّط، الرموز الغريبة.
 */
export function scorePageQuality(text: string): PageQuality {
  const trimmed = text?.trim() ?? "";
  if (trimmed.length < 15) return { score: 0, label: "low" };

  const noSpace = trimmed.replace(/\s+/g, "");
  const total = noSpace.length;
  if (total === 0) return { score: 0, label: "low" };

  // حروف عربية (نطاق Unicode الأساسي + الملحق)
  const arabicCount = (trimmed.match(/[؀-ۿݐ-ݿࢠ-ࣿ]/g) ?? []).length;
  // أرقام عربية ولاتينية، علامات ترقيم عربية
  const validExtra = (trimmed.match(/[\d٠-٩،؛؟\-\.\,\!\(\)\[\]«»""'']/g) ?? []).length;
  const goodRatio = (arabicCount + validExtra) / total;

  // طول الكلمة المتوسّط (الكلمة العربية عادةً 3–8 أحرف)
  const words = trimmed.split(/\s+/).filter(Boolean);
  const avgLen = words.reduce((s, w) => s + w.length, 0) / (words.length || 1);
  const lenScore = Math.min(1, avgLen / 5); // 5 حرف = درجة ممتازة

  const raw = goodRatio * 0.75 + lenScore * 0.25;
  const score = Math.round(raw * 100);

  return {
    score,
    label: score >= 80 ? "high" : score >= 55 ? "medium" : "low",
  };
}

export interface FootnoteResult {
  main: string;
  footnotes: string | null; // null = لا حواشي مكتشفة
}

/**
 * يفصل نصّ الحاشية عن متن الصفحة.
 * يبحث عن: خطوط فاصلة (--- أو ___) أو أرقام هامش عربية في نهاية الصفحة.
 */
export function extractFootnotes(text: string): FootnoteResult {
  if (!text || text.trim().length < 30) return { main: text ?? "", footnotes: null };

  // ١. فاصل أفقي صريح: سطر مؤلَّف من 3+ شرطات أو خطوط
  const hrPattern = /\n[ \t]*[\-—―_=▬]{3,}[ \t]*\n/;
  const hrMatch = text.match(hrPattern);
  if (hrMatch && hrMatch.index !== undefined) {
    const before = text.slice(0, hrMatch.index).trim();
    const after = text.slice(hrMatch.index + hrMatch[0].length).trim();
    if (before.length > 20 && after.length > 10) {
      return { main: before, footnotes: after };
    }
  }

  // ٢. أرقام هامش في نهاية الصفحة: سطور تبدأ بـ (١) أو ¹ أو [1] في الثلث الأخير
  const lines = text.split("\n");
  const searchFrom = Math.floor(lines.length * 0.6);
  let firstFootnoteLine = -1;

  for (let i = searchFrom; i < lines.length; i++) {
    const line = lines[i].trim();
    // أنماط شائعة لأرقام الحواشي
    if (/^[\(\(]?[١٢٣٤٥٦٧٨٩٠\d]+[\)\)]\s+\S/.test(line)) {
      if (firstFootnoteLine === -1) firstFootnoteLine = i;
    } else if (firstFootnoteLine !== -1 && line.length > 0) {
      // سطر غير هامش — أعِد تعيين (لضمان تسلسل الحواشي)
      firstFootnoteLine = -1;
    }
  }

  if (firstFootnoteLine !== -1) {
    const mainPart = lines.slice(0, firstFootnoteLine).join("\n").trim();
    const footPart = lines.slice(firstFootnoteLine).join("\n").trim();
    if (mainPart.length > 30 && footPart.length > 10) {
      return { main: mainPart, footnotes: footPart };
    }
  }

  return { main: text, footnotes: null };
}
