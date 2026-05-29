// src/lib/ocr.ts — طبقة تفريغ موحّدة (Mistral أساسي، Claude بديل)
// تعالج صفحةً صفحة عبر إرسال البايتات مباشرةً (data URI) — لا تعتمد على جلب
// الخدمة الخارجيّة لرابط R2، فتتجنّب فشل المستندات متعدّدة الصفحات.
import { isMistralConfigured, ocrDocument } from "@/lib/mistral";
import {
  isClaudeConfigured,
  extractTextFromImage,
  extractTextFromPdfPage,
} from "@/lib/claude";
import { formatOcrPage } from "@/lib/ocr-format";
import type { ClaudeModel } from "@prisma/client";

export const isOcrConfigured = isMistralConfigured || isClaudeConfigured;
export { isMistralConfigured };

export type OcrPageResult = {
  text: string;
  printedNumber: string | null;
  inputTokens: number;
  outputTokens: number;
};

// تفريغ مستند عبر Mistral. pageRange اختياريّ (0-indexed) لمعالجة الكتب الكبيرة
// على دفعات قابلة للاستئناف (لا تتجاوز أيّ مهلة تنفيذ).
export async function ocrFullDocument(
  source: { url?: string; dataUri?: string; isImage: boolean },
  pageRange?: number[],
): Promise<OcrPageResult[]> {
  const { pages } = await ocrDocument(source, false, pageRange);
  return pages.map((p) => {
    const f = formatOcrPage(p.text ?? "");
    return { text: f.text, printedNumber: f.printedNumber, inputTokens: 0, outputTokens: 0 };
  });
}

// تفريغ صورة مفردة (base64)
export async function ocrImage(
  base64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp",
  model: ClaudeModel,
): Promise<OcrPageResult> {
  if (isMistralConfigured) {
    const { pages } = await ocrDocument({
      dataUri: `data:${mediaType};base64,${base64}`,
      isImage: true,
    });
    const f = formatOcrPage(pages[0]?.text ?? "");
    return { text: f.text, printedNumber: f.printedNumber, inputTokens: 0, outputTokens: 0 };
  }
  const r = await extractTextFromImage(base64, mediaType, model);
  return {
    text: r.text,
    printedNumber: r.printedPageNumber,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
  };
}

// تفريغ صفحة PDF مفردة (base64 لمستند بصفحة واحدة)
export async function ocrPdfPage(
  pageBase64: string,
  model: ClaudeModel,
): Promise<OcrPageResult> {
  if (isMistralConfigured) {
    const { pages } = await ocrDocument({
      dataUri: `data:application/pdf;base64,${pageBase64}`,
      isImage: false,
    });
    const f = formatOcrPage(pages[0]?.text ?? "");
    return { text: f.text, printedNumber: f.printedNumber, inputTokens: 0, outputTokens: 0 };
  }
  const r = await extractTextFromPdfPage(pageBase64, model);
  return {
    text: r.text,
    printedNumber: r.printedPageNumber,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
  };
}
