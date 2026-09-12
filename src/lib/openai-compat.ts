// src/lib/openai-compat.ts — أدوات مشتركة لمزوّدي الدردشة المتوافقين مع OpenAI
//
// يستعملها مزوّدا الملخّص الدراسي (Qwen وKimi). كلّها دوالّ نقيّة بلا شبكة،
// فيسهل اختبارها، ويبقى لكلّ مزوّد ملفّه بقاعدته ومفتاحه وخصوصيّاته.
//
// لماذا "inline:"؟ بنية Study غير متزامنة (إرسال → استطلاع → تسوية)، بينما النداء
// المتزامن يعود فوراً. فنُضمّن الناتج مُرمَّزاً في معرّف وهميّ يفكّه الاستطلاع في
// حينه — فتبقى ضمانات الرصيد في study-poll.ts سليمة بلا أيّ تعديل.
import type { StudyBatchStatus } from "@/lib/study";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export const INLINE_PREFIX = "inline:";

// يحوّل finish_reason إلى دلالة موحّدة: length=بلغ السقف، content_filter=رفض.
export function classifyFinish(reason: string | null | undefined): "stop" | "truncated" | "refused" {
  if (reason === "length") return "truncated";
  if (reason === "content_filter") return "refused";
  return "stop";
}

// يحلّل ردّ الدردشة المتزامن (JSON متوافق مع OpenAI) إلى حالة موحّدة.
export function parseChatResponse(json: string, endMark: string): StudyBatchStatus {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { state: "failed", message: "تعذّر تحليل ردّ المزوّد" };
  }
  const rec = parsed as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: unknown;
  };
  if (rec.error) {
    return { state: "failed", message: "تعذّرت معالجة الطلب لدى المزوّد — أعد المحاولة" };
  }
  const choice = rec.choices?.[0];
  const finish = classifyFinish(choice?.finish_reason);
  if (finish === "refused") return { state: "refused" };

  const content = (choice?.message?.content ?? "").trim();
  if (!content) return { state: "failed", message: "أعاد النموذج ردّاً فارغاً" };

  // علامة النهاية تُفكّ عند الاستطلاع (حيث تُعرف)؛ لا نقصّها إن لم تُمرَّر.
  return {
    state: "succeeded",
    markdown: endMark ? content.split(endMark).join("").trimEnd() : content,
    inputTokens: rec.usage?.prompt_tokens ?? 0,
    outputTokens: rec.usage?.completion_tokens ?? 0,
    truncated: finish === "truncated",
  };
}

// ترميز/فكّ الناتج المتزامن داخل المعرّف الوهميّ (لا جداول جديدة، بنفس عقد batchId).
export function encodeInline(status: StudyBatchStatus): string {
  return INLINE_PREFIX + Buffer.from(JSON.stringify(status), "utf8").toString("base64");
}

export function decodeInline(id: string): StudyBatchStatus {
  try {
    return JSON.parse(
      Buffer.from(id.slice(INLINE_PREFIX.length), "base64").toString("utf8"),
    ) as StudyBatchStatus;
  } catch {
    return { state: "failed", message: "تعذّر استرجاع الناتج — أعد المحاولة" };
  }
}

// يقصّ علامة النهاية من ناتج مُرمَّز سابقاً (رُمِّز قبل معرفة العلامة).
export function stripEndMark(status: StudyBatchStatus, endMark: string): StudyBatchStatus {
  if (status.state !== "succeeded" || !endMark) return status;
  return { ...status, markdown: status.markdown.split(endMark).join("").trimEnd() };
}

// خطأ المهلة: النداء المتزامن تجاوز الميزانيّة المتاحة للدالّة. يُميَّز عن بقيّة
// الأخطاء ليُترجَم إلى رسالة تدلّ على الحلّ بدل «أعد المحاولة» التي لا تُجدي.
export const CHAT_TIMEOUT = "CHAT_TIMEOUT";

// نداء HTTP مع إعادة محاولة للأخطاء العابرة (429 و5xx) بتراجع أسّي.
// حدود الطلبات على الحسابات الجديدة منخفضة فتكثر 429 العابرة.
//
// `totalBudgetMs`: سقف زمنيّ لكلّ المحاولات مجتمعةً. بلا سقف، نداءٌ متزامن طويل
// (نموذج يفكّر على كتاب كامل) تقتله بيئة التشغيل عند maxDuration فلا يُنفَّذ أيّ
// معالجة للخطأ — لا رسالة ولا استرداد فوريّ. بالسقف نقطع النداء بأنفسنا قبل ذلك
// فيمرّ الفشل في مساره الطبيعيّ.
export async function chatFetchWithRetry(opts: {
  url: string;
  apiKey: string;
  body: unknown;
  extraHeaders?: Record<string, string>;
  providerLabel: string;
  attempts?: number;
  totalBudgetMs?: number;
}): Promise<Response> {
  const attempts = opts.attempts ?? 4;
  const started = Date.now();
  const remaining = () =>
    opts.totalBudgetMs === undefined ? undefined : opts.totalBudgetMs - (Date.now() - started);
  let last = "";
  for (let attempt = 0; attempt < attempts; attempt++) {
    const left = remaining();
    if (left !== undefined && left <= 1000) {
      throw new Error(`${CHAT_TIMEOUT}: ${opts.providerLabel} تجاوز المهلة المتاحة`);
    }
    let res: Response;
    try {
      res = await fetch(opts.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${opts.apiKey}`,
          "content-type": "application/json",
          ...(opts.extraHeaders ?? {}),
        },
        body: JSON.stringify(opts.body),
        ...(left !== undefined ? { signal: AbortSignal.timeout(left) } : {}),
      });
    } catch (err) {
      // قطعُ المهلة لا يُعاد معه المحاولة: النداء التالي سيتجاوزها كذلك.
      if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
        throw new Error(`${CHAT_TIMEOUT}: ${opts.providerLabel} تجاوز المهلة المتاحة`);
      }
      throw err;
    }
    if (res.ok) return res;
    last = `${opts.providerLabel} ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`;
    if (res.status !== 429 && res.status < 500) break;
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
  throw new Error(last || `${opts.providerLabel} request failed`);
}
