// src/lib/pdf.ts — تحويل ملفّات الإدخال إلى صفحات صور (base64) للـ OCR
//
// الاستراتيجية (متوافقة مع بيئة Vercel serverless):
// - الصور (PNG/JPG/WEBP): تُمرَّر مباشرة كصفحة واحدة.
// - PDF: يُرسَل مباشرة إلى Claude (نماذج Claude الحديثة تقبل PDF عبر
//   مصدر "document"). نقسّمه افتراضياً لصفحة منطقيّة واحدة لكلّ ملف،
//   ويتولّى Claude قراءة كلّ الصفحات داخل المستند.
//
// ملاحظة: لتقسيم PDF لصور فرديّة عالية الدقّة (لكلّ صفحة سجلّ مستقلّ)،
// يُوصى بتشغيل خدمة منفصلة (Inngest + poppler) — انظر CLAUDE.md القسم ٧.

export type InputPage = {
  base64: string;
  mediaType: "image/png" | "image/jpeg" | "image/webp";
};

const IMAGE_TYPES: Record<string, "image/png" | "image/jpeg" | "image/webp"> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export function isImageFile(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return ext in IMAGE_TYPES;
}

export function isPdfFile(fileName: string): boolean {
  return fileName.toLowerCase().endsWith(".pdf");
}

// يحوّل buffer لصورة لصفحة إدخال واحدة
export function imageBufferToPage(buffer: Buffer, fileName: string): InputPage {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "png";
  const mediaType = IMAGE_TYPES[ext] ?? "image/png";
  return { base64: buffer.toString("base64"), mediaType };
}
