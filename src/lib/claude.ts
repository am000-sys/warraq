// src/lib/claude.ts — تكامل Claude Vision لاستخراج النصّ العربي
import Anthropic from "@anthropic-ai/sdk";
import type { ClaudeModel } from "@prisma/client";

const apiKey = process.env.ANTHROPIC_API_KEY;

export const isClaudeConfigured = Boolean(
  apiKey && apiKey !== "sk-ant-stub-temp" && apiKey.startsWith("sk-ant-"),
);

const client = isClaudeConfigured ? new Anthropic({ apiKey }) : null;

// ربط enum المخطّط بمعرّفات النماذج الفعليّة
const MODEL_IDS: Record<ClaudeModel, string> = {
  HAIKU: "claude-haiku-4-5-20251001",
  SONNET: "claude-sonnet-4-6",
  OPUS: "claude-opus-4-7",
};

const OCR_PROMPT = `أنت خبير في قراءة النصوص العربية المصوّرة (OCR). استخرج النصّ الكامل من هذه الصورة بدقّة عالية.

التعليمات:
١. انسخ النصّ العربي حرفياً كما يظهر، مع الحفاظ على التشكيل إن وُجد.
٢. حافظ على فواصل الأسطر والفقرات كما في الأصل.
٣. إذا ظهر رقم صفحة مطبوع داخل الصورة، استخرجه بدقّة.
٤. لا تُضف أيّ تعليق أو شرح أو ترجمة — فقط النصّ المستخرج.
٥. إن كانت الصورة غير واضحة أو فارغة، أعِد نصّاً فارغاً.

أعِد ردّك بصيغة JSON فقط بهذا الشكل:
{"text": "النص المستخرج كاملاً", "printedPageNumber": "رقم الصفحة المطبوع أو null"}`;

export type OcrResult = {
  text: string;
  printedPageNumber: string | null;
  inputTokens: number;
  outputTokens: number;
};

// استخراج النصّ من صورة واحدة (base64)
export async function extractTextFromImage(
  imageBase64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp",
  model: ClaudeModel,
): Promise<OcrResult> {
  if (!client) throw new Error("ANTHROPIC_NOT_CONFIGURED");

  const response = await client.messages.create({
    model: MODEL_IDS[model],
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          { type: "text", text: OCR_PROMPT },
        ],
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";

  let text = raw;
  let printedPageNumber: string | null = null;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      text = parsed.text ?? raw;
      printedPageNumber =
        parsed.printedPageNumber && parsed.printedPageNumber !== "null"
          ? String(parsed.printedPageNumber)
          : null;
    }
  } catch {
    // إن فشل التحليل، نستخدم النصّ الخام كما هو
  }

  return {
    text: text.trim(),
    printedPageNumber,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// استخراج النصّ من صفحة PDF مفردة (مستند بصفحة واحدة)
export async function extractTextFromPdfPage(
  pdfBase64: string,
  model: ClaudeModel,
): Promise<OcrResult> {
  if (!client) throw new Error("ANTHROPIC_NOT_CONFIGURED");

  const response = await client.messages.create({
    model: MODEL_IDS[model],
    max_tokens: 8192,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          { type: "text", text: OCR_PROMPT },
        ],
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";
  let text = raw;
  let printedPageNumber: string | null = null;
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      const parsed = JSON.parse(m[0]);
      text = parsed.text ?? raw;
      printedPageNumber =
        parsed.printedPageNumber && parsed.printedPageNumber !== "null"
          ? String(parsed.printedPageNumber)
          : null;
    }
  } catch {
    /* استخدم النصّ الخام */
  }
  return {
    text: text.trim(),
    printedPageNumber,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// استخراج النصّ من مستند PDF كامل (يقرأ Claude كلّ الصفحات)
const PDF_PROMPT = `أنت خبير في قراءة الكتب العربية المصوّرة (OCR). استخرج النصّ الكامل من هذا المستند صفحةً صفحة.

التعليمات:
١. انسخ النصّ العربي حرفياً، مع الحفاظ على التشكيل والفقرات.
٢. افصل بين الصفحات بسطر يحوي: ---PAGE--- متبوعاً برقم الصفحة المطبوع إن وُجد.
٣. لا تُضف أيّ تعليق أو ترجمة — فقط النصّ المستخرج.

ابدأ مباشرة بنصّ الصفحة الأولى.`;

export type PdfOcrResult = {
  pages: { text: string; printedPageNumber: string | null }[];
  inputTokens: number;
  outputTokens: number;
};

export async function extractTextFromPdf(
  pdfBase64: string,
  model: ClaudeModel,
): Promise<PdfOcrResult> {
  if (!client) throw new Error("ANTHROPIC_NOT_CONFIGURED");

  const response = await client.messages.create({
    model: MODEL_IDS[model],
    max_tokens: 16384,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: pdfBase64 },
          },
          { type: "text", text: PDF_PROMPT },
        ],
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";

  // تقسيم على فواصل الصفحات
  const parts = raw.split(/---PAGE---\s*/g).filter((p) => p.trim());
  const pages = parts.map((part) => {
    const numMatch = part.match(/^\s*([٠-٩\d]+)/);
    return {
      text: part.replace(/^\s*[٠-٩\d]+\s*\n?/, "").trim() || part.trim(),
      printedPageNumber: numMatch ? numMatch[1] : null,
    };
  });

  return {
    pages: pages.length ? pages : [{ text: raw.trim(), printedPageNumber: null }],
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
