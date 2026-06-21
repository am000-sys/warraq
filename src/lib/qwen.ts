// src/lib/qwen.ts — مزوّد Qwen (Alibaba) للملخّص الدراسي عبر Batch API المتوافق مع OpenAI
//
// بديل مجانيّ/أرخص لـ Claude في ميزة الملخّص الدراسي فقط. يُفعَّل عندما يضبط
// المالك `study_model`/`study_model_premium` على معرّف يبدأ بـ `qwen-`. مسار Claude
// يبقى كما هو تماماً — التوجيه يتمّ في study.ts حسب بادئة معرّف النموذج.
//
// لماذا Batch؟ ليطابق بنية Study غير المتزامنة (إرسال → استطلاع → تسوية) فتبقى
// ضمانات الرصيد في study-poll.ts سليمةً بلا تعديل: الوحدة هنا توفّر submit/check/cancel
// بنفس عقد دوالّ Claude (نفس نوع StudyBatchStatus).
//
// العقد القياسيّ (OpenAI-compatible): رفع ملفّ JSONL → إنشاء دفعة → استطلاع → تنزيل الناتج.
import type { StudyBatchStatus } from "@/lib/study";

const apiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || "";
// القاعدة الدوليّة (سنغافورة) افتراضاً؛ تُبدَّل لقاعدة الصين عبر متغيّر البيئة عند الحاجة.
const BASE_URL = (
  process.env.QWEN_BASE_URL || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
).replace(/\/$/, "");
// سقف إخراج Qwen أقصر من Claude — نقصّه هنا فلا يُرفض النداء؛ منطق المتابعة في
// study-poll.ts يُكمل تلقائيّاً إن بُلغ الحدّ (نفس مظلّة الأمان الموجودة).
const MAX_OUTPUT = Math.max(
  512,
  Number(process.env.QWEN_MAX_OUTPUT) || 8192,
);
// مسار الدردشة داخل الدفعة (ثابت متوافق مع OpenAI) — مُجمَّع ليسهل تعديله لو لزم.
const CHAT_PATH = "/v1/chat/completions";

export const isQwenConfigured = Boolean(apiKey && apiKey.length > 10);
export function isQwenModel(model: string): boolean {
  return model.startsWith("qwen-");
}

// ─── أدوات نقيّة (قابلة للاختبار محليّاً بلا شبكة) ─────────────
export type QwenMessage = { role: "system" | "user" | "assistant"; content: string };

// يبني سطر JSONL واحداً لطلب الدفعة وفق عقد OpenAI Batch.
export function buildBatchLine(opts: {
  customId: string;
  model: string;
  messages: QwenMessage[];
  maxTokens: number;
}): string {
  return JSON.stringify({
    custom_id: opts.customId,
    method: "POST",
    url: CHAT_PATH,
    body: {
      model: opts.model,
      messages: opts.messages,
      max_tokens: Math.min(opts.maxTokens, MAX_OUTPUT),
      temperature: 0.2,
    },
  });
}

// يحوّل finish_reason إلى دلالة موحّدة: length=بلغ السقف، content_filter=رفض.
export function classifyFinish(reason: string | null | undefined): "stop" | "truncated" | "refused" {
  if (reason === "length") return "truncated";
  if (reason === "content_filter") return "refused";
  return "stop";
}

// يحلّل محتوى ملفّ ناتج الدفعة (JSONL، عادةً سطر واحد لطلبنا الوحيد) إلى حالة موحّدة.
export function parseBatchOutput(jsonl: string, endMark: string): StudyBatchStatus {
  const line = jsonl
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return { state: "failed", message: "نتيجة دفعة فارغة من المزوّد" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return { state: "failed", message: "تعذّر تحليل نتيجة الدفعة" };
  }

  const rec = parsed as {
    response?: {
      status_code?: number;
      body?: {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
    };
    error?: unknown;
  };

  if (rec.error || (rec.response?.status_code && rec.response.status_code >= 400)) {
    return { state: "failed", message: "تعذّرت معالجة الطلب لدى المزوّد — أعد المحاولة" };
  }

  const choice = rec.response?.body?.choices?.[0];
  const finish = classifyFinish(choice?.finish_reason);
  if (finish === "refused") return { state: "refused" };

  const content = (choice?.message?.content ?? "").trim();
  if (!content) return { state: "failed", message: "أعاد النموذج ردّاً فارغاً" };

  const usage = rec.response?.body?.usage;
  return {
    state: "succeeded",
    markdown: content.split(endMark).join("").trimEnd(),
    inputTokens: usage?.prompt_tokens ?? 0,
    outputTokens: usage?.completion_tokens ?? 0,
    truncated: finish === "truncated",
  };
}

// ─── نداءات HTTP (مع إعادة محاولة للأخطاء العابرة ٤٢٩/٥xx) ──────
async function qwenFetch(path: string, init: RequestInit): Promise<Response> {
  let last = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${apiKey}`, ...(init.headers ?? {}) },
    });
    if (res.ok) return res;
    last = `Qwen ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`;
    if (res.status !== 429 && res.status < 500) break;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw new Error(last || "Qwen request failed");
}

// رفع ملفّ JSONL (غرض=batch) وإرجاع معرّف الملفّ.
async function uploadInputFile(jsonl: string): Promise<string> {
  const form = new FormData();
  form.append("purpose", "batch");
  form.append("file", new Blob([jsonl], { type: "application/jsonl" }), "study-batch.jsonl");
  const res = await qwenFetch("/files", { method: "POST", body: form });
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Qwen: لم يُعد معرّف الملفّ");
  return data.id;
}

// ─── واجهة المزوّد (مطابقة لدوالّ Claude في study.ts) ──────────
// تبني المهمّة (رفع + إنشاء دفعة) وتعيد معرّف الدفعة الخام (يُلصق به البادئة في study.ts).
export async function submitQwenBatch(opts: {
  model: string;
  messages: QwenMessage[];
  maxTokens: number;
}): Promise<string> {
  if (!isQwenConfigured) throw new Error("QWEN_NOT_CONFIGURED");
  const jsonl = buildBatchLine({
    customId: "study",
    model: opts.model,
    messages: opts.messages,
    maxTokens: opts.maxTokens,
  });
  const inputFileId = await uploadInputFile(jsonl);
  const res = await qwenFetch("/batches", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input_file_id: inputFileId,
      endpoint: CHAT_PATH,
      completion_window: "24h",
    }),
  });
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Qwen: لم يُعد معرّف الدفعة");
  return data.id;
}

// يفحص حالة الدفعة، ويستخرج الناتج عند الاكتمال — بنفس StudyBatchStatus.
export async function checkQwenBatch(batchId: string, endMark: string): Promise<StudyBatchStatus> {
  if (!isQwenConfigured) throw new Error("QWEN_NOT_CONFIGURED");
  const res = await qwenFetch(`/batches/${batchId}`, { method: "GET" });
  const batch = (await res.json()) as {
    status?: string;
    output_file_id?: string | null;
    error_file_id?: string | null;
  };

  const status = batch.status ?? "";
  if (["validating", "in_progress", "finalizing", "cancelling"].includes(status)) {
    return { state: "processing" };
  }
  if (status === "failed" || status === "expired" || status === "cancelled") {
    return {
      state: "failed",
      message:
        status === "expired" ? "انتهت مهلة المعالجة — أعد المحاولة" : "تعذّرت المعالجة — أعد المحاولة",
    };
  }
  if (status !== "completed") return { state: "processing" };

  if (!batch.output_file_id) {
    return { state: "failed", message: "اكتملت الدفعة دون ناتج — أعد المحاولة" };
  }
  const out = await qwenFetch(`/files/${batch.output_file_id}/content`, { method: "GET" });
  const jsonl = await out.text();
  return parseBatchOutput(jsonl, endMark);
}

// إلغاء دفعة (عند حذف ملخّص قيد المعالجة) — يتجاهل الأخطاء كنظيره في Claude.
export async function cancelQwenBatch(batchId: string): Promise<void> {
  if (!isQwenConfigured) return;
  await qwenFetch(`/batches/${batchId}/cancel`, { method: "POST" }).catch(() => {});
}
