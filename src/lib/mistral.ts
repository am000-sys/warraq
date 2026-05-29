// src/lib/mistral.ts — تكامل Mistral OCR (خدمة التفريغ النصّي الأساسيّة)
// يستخرج النصّ من PDF/الصور عبر واجهة Mistral OCR. مستند واحد = نداء واحد يعيد كلّ الصفحات.
const apiKey = process.env.MISTRAL_API_KEY;

export const isMistralConfigured = Boolean(apiKey && apiKey.length > 10);

const OCR_ENDPOINT = "https://api.mistral.ai/v1/ocr";
const OCR_MODEL = "mistral-ocr-latest";
const CHAT_ENDPOINT = "https://api.mistral.ai/v1/chat/completions";
const CHAT_MODEL = "mistral-large-latest"; // متعدّد اللغات — قويّ للعربيّة وسريع
const MAX_CONTEXT_CHARS = 60_000; // حدّ أمان لطول السياق المرسَل للدردشة

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

// يستخرج نصّ المستند كاملاً عبر Mistral OCR (جداول كـ markdown).
// withImages=false افتراضياً للموثوقيّة: تضمين الأشكال base64 يضخّم الاستجابة لعدّة
// ميغابايت فيتسبّب فشلاً على بيئات serverless. يُفعَّل عند الحاجة فقط.
export async function ocrDocument(
  source: DocSource,
  withImages = false,
): Promise<{ pages: MistralOcrPage[] }> {
  if (!apiKey) throw new Error("MISTRAL_NOT_CONFIGURED");
  const ref = source.url ?? source.dataUri;
  if (!ref) throw new Error("لا يوجد مصدر للمستند");

  const document = source.isImage
    ? { type: "image_url", image_url: ref }
    : { type: "document_url", document_url: ref };

  const body = JSON.stringify({
    model: OCR_MODEL,
    document,
    include_image_base64: withImages,
  });

  // إعادة محاولة عند الأخطاء العابرة (٤٢٩/٥xx) — لا نفشل لمجرّد ازدحام مؤقّت
  let res: Response | null = null;
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    res = await fetch(OCR_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body,
    });
    if (res.ok) break;
    lastErr = `Mistral OCR ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`;
    // أعِد المحاولة فقط للأخطاء العابرة
    if (res.status !== 429 && res.status < 500) break;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  if (!res || !res.ok) {
    throw new Error(lastErr || "Mistral OCR فشل");
  }

  const data = (await res.json()) as {
    pages?: {
      index?: number;
      markdown?: string;
      text?: string;
      images?: { id?: string; image_base64?: string }[];
    }[];
  };
  const pages: MistralOcrPage[] = (data.pages ?? []).map((p, i) => {
    let text = (p.markdown ?? p.text ?? "").trim();
    if (withImages) {
      text = inlineImages(text, p.images);
    } else {
      // أزِل مراجع الصور المعلّقة حتى لا تظهر صوراً مكسورة
      text = text.replace(/!\[[^\]]*\]\((?!data:|https?:)[^)]*\)/g, "");
    }
    return { index: typeof p.index === "number" ? p.index : i, text };
  });
  return { pages };
}

// ─── دردشة Mistral (فهم المستند: سؤال / تقرير / تدقيق) — سريعة ───────────
export type ReportType =
  | "summary"
  | "executive-summary"
  | "key-points"
  | "structured";

async function mistralChat(system: string, user: string, maxTokens = 2048): Promise<string> {
  if (!apiKey) throw new Error("MISTRAL_NOT_CONFIGURED");
  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Mistral chat ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

// سؤال حول المستند المستخرَج
export async function askDocumentMistral(documentText: string, question: string): Promise<string> {
  const ctx = documentText.slice(0, MAX_CONTEXT_CHARS);
  const system =
    "أنت مساعد عربيّ خبير في تحليل النصوص والكتب. أجِب عن سؤال المستخدم اعتماداً على نصّ المستند المرفق فقط. " +
    "إن لم تجد الإجابة في المستند، قل ذلك بوضوح. أجب بالعربيّة الفصحى وبدقّة، مع الإشارة لرقم الصفحة إن أمكن.";
  return mistralChat(system, `=== نصّ المستند ===\n${ctx}\n\n=== السؤال ===\n${question}`, 2048);
}

const REPORT_INSTRUCTIONS: Record<ReportType, string> = {
  summary: "اكتب ملخّصاً عامّاً واضحاً للمستند في فقرات مترابطة.",
  "executive-summary":
    "اكتب ملخّصاً تنفيذياً موجزاً (نصف صفحة) يبرز الغرض والنتائج والتوصيات الأساسيّة.",
  "key-points": "استخرج أهمّ النقاط الرئيسيّة في المستند على شكل قائمة نقطيّة منظّمة.",
  structured:
    "أنشئ تقريراً منظّماً بعناوين وأقسام (مقدّمة، المحاور الرئيسيّة، الخلاصة) يغطّي محتوى المستند.",
};

// توليد تقرير عن المستند المستخرَج
export async function generateReportMistral(documentText: string, type: ReportType): Promise<string> {
  const ctx = documentText.slice(0, MAX_CONTEXT_CHARS);
  const system =
    "أنت محرّر عربيّ محترف. أنتج تقريراً عالي الجودة بالعربيّة الفصحى اعتماداً على نصّ المستند المرفق فقط، " +
    "دون إضافة معلومات من خارجه. " +
    REPORT_INSTRUCTIONS[type];
  return mistralChat(system, `=== نصّ المستند ===\n${ctx}`, 4096);
}

// تدقيق وتنسيق ذكيّ لصفحة: تصحيح أخطاء القراءة + تنسيق Markdown + فصل الحواشي +
// استخراج رقم الصفحة المطبوع. يعيد JSON: { text, printedNumber }.
export async function refinePageMistral(
  pageText: string,
): Promise<{ text: string; printedNumber: string | null }> {
  if (!apiKey) throw new Error("MISTRAL_NOT_CONFIGURED");
  const system =
    "أنت مدقّق ومنسّق نصوص عربيّة خبير في كتب التراث. أمامك نصّ صفحة من تفريغ ضوئيّ (OCR) قد يحوي أخطاء. مهمّتك:\n" +
    "١. صحّح أخطاء القراءة (الكلمات والحروف المشوّهة) وفق السياق العربيّ الصحيح، دون إضافة محتوى أو حذفه أو إعادة صياغته أو ترجمته.\n" +
    "٢. حسّن التنسيق بصيغة Markdown (عناوين/فقرات/قوائم)، وحافظ على الجداول والصور كما هي.\n" +
    "٣. افصل الحواشي عن المتن: ضعها في آخر الصفحة تحت عنوان «## الحواشي» مرقّمةً، إن وُجدت.\n" +
    "٤. استخرج رقم الصفحة المطبوع إن ظهر، وأزله من المتن.\n" +
    'أعِد ردّك بصيغة JSON فقط بهذا الشكل: {"text": "المتن المنسّق متبوعاً بالحواشي", "printedNumber": "رقم الصفحة أو null"}';

  const res = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.1,
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: pageText.slice(0, MAX_CONTEXT_CHARS) },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Mistral refine ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = (data.choices?.[0]?.message?.content ?? "").trim();
  try {
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : raw);
    const text = typeof parsed.text === "string" ? parsed.text.trim() : pageText;
    const pn =
      parsed.printedNumber && parsed.printedNumber !== "null"
        ? String(parsed.printedNumber)
        : null;
    return { text: text || pageText, printedNumber: pn };
  } catch {
    return { text: pageText, printedNumber: null };
  }
}
