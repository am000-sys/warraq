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

// تدقيق/تصحيح أخطاء القراءة في نصّ صفحة (تصحيح فقط، بلا إعادة صياغة)
export async function proofreadMistral(pageText: string): Promise<string> {
  const system =
    "أنت مدقّق نصوص عربيّة خبير. صحّح أخطاء القراءة الضوئيّة فقط في النصّ المرفق:\n" +
    "- صحّح الكلمات المقروءة خطأً والحروف المشوّهة بما يوافق السياق العربيّ الصحيح.\n" +
    "- حافظ حرفيّاً على المعنى والترتيب وفواصل الأسطر والتشكيل وأرقام الصفحات والحواشي وعلامات التنسيق (Markdown/الجداول/الصور).\n" +
    "- لا تُضِف ولا تحذف ولا تختصر ولا تُعِد الصياغة، ولا تترجم.\n" +
    "- أعِد النصّ المصحَّح فقط دون أيّ تعليق.";
  return mistralChat(system, pageText.slice(0, MAX_CONTEXT_CHARS), 8192);
}

// ─── أدوات نصّيّة إضافيّة عبر Mistral ───────────────────
export type TranslateLang = "en" | "fr" | "tr" | "ur" | "id" | "es";

const LANG_NAMES: Record<TranslateLang, string> = {
  en: "الإنجليزيّة",
  fr: "الفرنسيّة",
  tr: "التركيّة",
  ur: "الأرديّة",
  id: "الإندونيسيّة",
  es: "الإسبانيّة",
};

// الفهرسة الذكيّة: استخراج الأعلام والأماكن والمصطلحات والموضوعات من المستند
export async function extractIndexMistral(text: string): Promise<string> {
  const ctx = text.slice(0, MAX_CONTEXT_CHARS);
  const system =
    "أنت مفهرس خبير في الكتب العربيّة والتراثيّة. استخرج من نصّ المستند المرفق فقط فهرساً منظّماً يشمل الأقسام: " +
    "«الأعلام (الأشخاص)»، «الأماكن»، «المصطلحات والمفاهيم»، «الموضوعات الرئيسيّة». " +
    "رتّب كلّ قسم في قائمة نقطيّة، واذكر رقم الصفحة بين قوسين إن أمكن. " +
    "لا تُضِف ما ليس في المستند، واحذف القسم الذي لا عناصر له. أعِد الفهرس بصيغة Markdown فقط دون تعليق.";
  return mistralChat(system, ctx, 4096);
}

// الترجمة: ترجمة النصّ العربيّ إلى اللغة المطلوبة مع حفظ البنية
export async function translateMistral(text: string, lang: TranslateLang): Promise<string> {
  const ctx = text.slice(0, MAX_CONTEXT_CHARS);
  const langName = LANG_NAMES[lang] ?? LANG_NAMES.en;
  const system =
    `أنت مترجم محترف. ترجم النصّ العربيّ المرفق إلى ${langName} ترجمةً أمينةً وواضحة، ` +
    "مع الحفاظ على بنية الفقرات والعناوين والتنسيق (Markdown). أعِد الترجمة فقط دون تعليق.";
  return mistralChat(system, ctx, 8192);
}
