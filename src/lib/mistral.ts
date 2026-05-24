// src/lib/mistral.ts — تكامل Mistral OCR (خدمة التفريغ النصّي الأساسيّة)
// يستخرج النصّ من PDF/الصور عبر واجهة Mistral OCR. مستند واحد = نداء واحد يعيد كلّ الصفحات.
const apiKey = process.env.MISTRAL_API_KEY;

export const isMistralConfigured = Boolean(apiKey && apiKey.length > 10);

const OCR_ENDPOINT = "https://api.mistral.ai/v1/ocr";
const OCR_MODEL = "mistral-ocr-latest";

export type MistralOcrPage = {
  index: number; // ترتيب الصفحة (يبدأ من 0)
  text: string; // النصّ (markdown) مع تضمين الصور/الأشكال كـ data URI
};

type DocSource = {
  // أحد الاثنين: رابط موقّع (R2) أو data URI بصيغة base64
  url?: string;
  dataUri?: string;
  isImage?: boolean;
};

// يدمج الصور/الأشكال المستخرَجة داخل الـ markdown (يستبدل مرجع الصورة بـ data URI)
function inlineImages(
  markdown: string,
  images: { id?: string; image_base64?: string }[] | undefined,
): string {
  if (!images || images.length === 0) return markdown;
  let out = markdown;
  for (const img of images) {
    if (!img.id || !img.image_base64) continue;
    const dataUri = img.image_base64.startsWith("data:")
      ? img.image_base64
      : `data:image/jpeg;base64,${img.image_base64}`;
    const escaped = img.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // مرجع الصورة في markdown: ](id)
    out = out.replace(new RegExp(`\\]\\(${escaped}\\)`, "g"), `](${dataUri})`);
  }
  return out;
}

// يستخرج نصّ المستند كاملاً عبر Mistral OCR (بأقصى دقّة: جداول كـ markdown + أشكال مضمّنة)
export async function ocrDocument(source: DocSource): Promise<{ pages: MistralOcrPage[] }> {
  if (!apiKey) throw new Error("MISTRAL_NOT_CONFIGURED");
  const ref = source.url ?? source.dataUri;
  if (!ref) throw new Error("لا يوجد مصدر للمستند");

  const document = source.isImage
    ? { type: "image_url", image_url: ref }
    : { type: "document_url", document_url: ref };

  const res = await fetch(OCR_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: OCR_MODEL,
      document,
      include_image_base64: true, // التقاط الأشكال/المخطّطات لإعادة بنائها
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Mistral OCR ${res.status}: ${t.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    pages?: {
      index?: number;
      markdown?: string;
      text?: string;
      images?: { id?: string; image_base64?: string }[];
    }[];
  };
  const pages: MistralOcrPage[] = (data.pages ?? []).map((p, i) => ({
    index: typeof p.index === "number" ? p.index : i,
    text: inlineImages((p.markdown ?? p.text ?? "").trim(), p.images),
  }));
  return { pages };
}
