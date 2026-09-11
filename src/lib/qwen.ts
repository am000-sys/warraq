// src/lib/qwen.ts — مزوّد Qwen (Alibaba) للملخّص الدراسي عبر واجهة الدردشة المتوافقة مع OpenAI
//
// بديل مجانيّ/أرخص لـ Claude في ميزة الملخّص الدراسي فقط. يُفعَّل عندما يضبط
// المالك `study_model`/`study_model_premium` على معرّف يبدأ بـ `qwen-`. مسار Claude
// يبقى كما هو تماماً — التوجيه يتمّ في study.ts حسب بادئة معرّف النموذج.
//
// لماذا نداء متزامن (وليس Batch)؟ دفعات DashScope (Batch API) مُصمَّمة للمعالجة
// الجماعيّة دون اتصال: تَصطفّ طويلاً وكثيراً ما تنتهي مهلتها أو تفشل، فتعلق مهمّة
// الملخّص «قيد المعالجة» مدّةً ثمّ تفشل. لمهمّة واحدة تفاعليّة، نداء الدردشة المتزامن
// يعود في ثوانٍ وموثوق. ولأنّ بنية Study غير متزامنة (إرسال → استطلاع → تسوية)،
// نُجري النداء عند الإرسال ونُضمّن الناتج في معرّف وهميّ مبدوء بـ "inline:" يفكّه
// الاستطلاع فوراً — فتبقى ضمانات الرصيد في study-poll.ts سليمةً بلا أيّ تعديل.
//
// توافق رجعيّ: السجلّات الجارية بمعرّف دفعة حقيقيّ (غير مبدوء بـ inline:) تُستكمل
// عبر مسار استطلاع الدفعة في checkQwenBatch.
import {
  chatFetchWithRetry,
  classifyFinish,
  decodeInline,
  encodeInline,
  parseChatResponse,
  stripEndMark,
  INLINE_PREFIX,
  type ChatMessage,
} from "@/lib/openai-compat";
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
// مسار الدردشة المتوافق مع OpenAI (نسبيّ إلى BASE_URL الذي ينتهي بـ /v1).
const CHAT_PATH = "/chat/completions";

export const isQwenConfigured = Boolean(apiKey && apiKey.length > 10);
export function isQwenModel(model: string): boolean {
  return model.startsWith("qwen-");
}

// ─── أدوات نقيّة (قابلة للاختبار محليّاً بلا شبكة) ─────────────
export type QwenMessage = ChatMessage;

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
// ٤ محاولات بتراجع أسّي (2s/4s/8s): حدود QPM على الحسابات المدفوعة حديثاً
// منخفضة فتكثر 429 العابرة — المهلة تتّسع لها (maxDuration=300 في المسارات).
// يُستعمل لمسار الدفعات القديم (GET/POST على /batches و/files) — التوافق الرجعيّ.
async function qwenFetch(path: string, init: RequestInit): Promise<Response> {
  let last = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${apiKey}`, ...(init.headers ?? {}) },
    });
    if (res.ok) return res;
    last = `Qwen ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`;
    if (res.status !== 429 && res.status < 500) break;
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
  throw new Error(last || "Qwen request failed");
}

// ─── واجهة المزوّد (مطابقة لدوالّ Claude في study.ts) ──────────
// تُجري النداء المتزامن وتعيد معرّفاً وهميّاً (inline:) يحمل الناتج المُرمَّز ليفكّه
// الاستطلاع فوراً. أخطاء النقل الصلبة تُرمى ليتولّاها المسار (استرداد + FAILED).
export async function submitQwenBatch(opts: {
  model: string;
  messages: QwenMessage[];
  maxTokens: number;
}): Promise<string> {
  if (!isQwenConfigured) throw new Error("QWEN_NOT_CONFIGURED");
  const res = await chatFetchWithRetry({
    url: `${BASE_URL}${CHAT_PATH}`,
    apiKey,
    providerLabel: "Qwen",
    // محاولة تعطيل فحص المحتوى (إنذارات كاذبة على النصوص التراثيّة). تُتجاهل
    // الترويسة إن لم يدعمها النموذج/الحساب فلا ضرر.
    extraHeaders: { "X-DashScope-DataInspection": "disable" },
    body: {
      model: opts.model,
      messages: opts.messages,
      max_tokens: Math.min(opts.maxTokens, MAX_OUTPUT),
      temperature: 0.2,
    },
  });
  // بلا قصّ لعلامة النهاية هنا (تُمرَّر "" )؛ القصّ يتمّ عند الاستطلاع بالعلامة الفعليّة.
  const status = parseChatResponse(await res.text(), "");
  return encodeInline(status);
}

// يفحص الحالة ويستخرج الناتج — بنفس StudyBatchStatus.
// المعرّف الوهميّ (inline:) يُفكّ فوراً؛ المعرّف الحقيقيّ = دفعة جارية (توافق رجعيّ).
export async function checkQwenBatch(batchId: string, endMark: string): Promise<StudyBatchStatus> {
  // فكّ علامة النهاية هنا حتى لا تظهر في الناتج (الناتج رُمّز بعلامة وسيطة).
  if (batchId.startsWith(INLINE_PREFIX)) return stripEndMark(decodeInline(batchId), endMark);
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
  // المعرّف الوهميّ (inline:) لا يقابله شيء على المزوّد — لا إلغاء.
  if (batchId.startsWith(INLINE_PREFIX) || !isQwenConfigured) return;
  await qwenFetch(`/batches/${batchId}/cancel`, { method: "POST" }).catch(() => {});
}
