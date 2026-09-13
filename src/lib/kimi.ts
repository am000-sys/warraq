// src/lib/kimi.ts — مزوّد Kimi (Moonshot AI) للملخّص الدراسي عبر واجهة الدردشة
// المتوافقة مع OpenAI.
//
// يُفعَّل عندما يضبط المالك `study_model`/`study_model_premium` — أو متغيّري البيئة
// STUDY_DEFAULT_MODEL/STUDY_DEFAULT_MODEL_PREMIUM — على معرّف يبدأ بـ `kimi-` أو
// `moonshot-`. مسارا Claude وQwen يبقيان كما هما؛ التوجيه في study.ts حسب البادئة.
//
// لماذا نداء متزامن؟ لنفس سبب Qwen: مهمّة الملخّص واحدة وتفاعليّة، فالنداء المتزامن
// يعود في ثوانٍ وموثوق، ويُضمَّن ناتجه في معرّف وهميّ (inline:) يفكّه الاستطلاع —
// فتبقى ضمانات الرصيد في study-poll.ts سليمة بلا تعديل.
import {
  chatFetchWithRetry,
  decodeInline,
  encodeInline,
  parseChatResponse,
  stripEndMark,
  INLINE_PREFIX,
  type ChatMessage,
} from "@/lib/openai-compat";
import type { StudyBatchStatus } from "@/lib/study";

const apiKey = process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY || "";

// القاعدة العالميّة افتراضاً؛ تُبدَّل لقاعدة الصين (api.moonshot.cn) عبر متغيّر
// البيئة عند الحاجة. تُنظَّف الشرطة الأخيرة ليُركَّب المسار بأمان.
const BASE_URL = (
  process.env.MOONSHOT_BASE_URL || "https://api.moonshot.ai/v1"
).replace(/\/$/, "");

// سقف الإخراج — يُضبط من البيئة عند الحاجة. القيمة الافتراضيّة هي افتراضيّ Moonshot
// نفسه (131072). والسقف الفعليّ لدى المزوّد = نافذة النموذج ناقص توكنات المُدخَل، فنموذج
// بنافذة ٢٥٦ ألفاً مع كتاب كبير يبقى له أقلّ من ذلك — لذا يُخفَّض من البيئة عند استعمال
// نموذج ذي نافذة أضيق. منطق المتابعة في study-poll.ts يُكمل تلقائيّاً إن بُلغ الحدّ.
const MAX_OUTPUT = Math.max(512, Number(process.env.KIMI_MAX_OUTPUT) || 131072);

// مستوى التفكير: نماذج kimi-k3 تفكّر دوماً (لا يمكن إيقافه)، وتوكنات التفكير
// تُطيل زمن النداء — وهو نداء متزامن محكوم بمهلة الدالّة. فالافتراضيّ لها "low":
// كافٍ لمهمّة تلخيص واستخراج، وأقصر زمناً وأقلّ كلفة. يُبدَّل من البيئة
// (KIMI_REASONING_EFFORT="high" مثلاً)، و"off" يمنع إرسال الحقل أصلاً لنموذج
// لا يدعمه. وتبديله في منتصف العمل يُبطل إصابة الكاش البادئ.
const REASONING_ENV = (process.env.KIMI_REASONING_EFFORT || "").trim();

function reasoningEffortFor(model: string): string {
  if (REASONING_ENV === "off") return "";
  if (REASONING_ENV) return REASONING_ENV;
  return model.startsWith("kimi-k3") ? "low" : "";
}

// ميزانيّة النداء المتزامن. مسارات Study عند maxDuration=300ث، ومع تقسيم الإخراج
// إلى مقاطع (أدناه) يكتمل المقطع الواحد في دقيقتين عادةً — فسقف ١٢٠ ثانية يكفي
// ويترك للاستطلاع مجالاً لتسلسل عدّة مقاطع في النداء الواحد.
const BUDGET_MS = Math.max(30_000, Number(process.env.KIMI_TIMEOUT_MS) || 120_000);

// ─── تقسيم الإخراج إلى مقاطع ───────────────────────────────
// النداء متزامن ومحكوم بمهلة الدالّة، فملخّص كتابٍ كامل في نداء واحد يتجاوزها
// مهما ضُبطت المعاملات. الحلّ: يُخرج كلّ نداء مقطعاً محدوداً فيبلغ سقفه سريعاً،
// وتتولّى آليّة المتابعة القائمة في study-poll.ts وصلَ المقاطع من نقطة التوقّف.
// وبادئة الرسائل ثابتة (انظر buildKimiMessages) فيُصيب كلّ مقطعٍ كاشَ Moonshot
// ولا تتضاعف كلفة إعادة إرسال الكتاب.
const CHUNK_TOKENS = Math.max(2048, Number(process.env.KIMI_CHUNK_TOKENS) || 16_384);

// ─── نافذة السياق وحساب ميزانيّة الإخراج ───────────────────
// لدى Moonshot: أقصى إخراج = نافذة النموذج **ناقص** توكنات المُدخَل. فطلب سقف
// ثابت مع كتاب كبير = 400 من المزوّد. نحسبها هنا قبل النداء.
const KNOWN_WINDOWS: [prefix: string, window: number][] = [["kimi-k3", 1_048_576]];

// الافتراضي محافظ عمداً: نماذج Moonshot الحاليّة عدا k3 بنافذة ٢٥٦ ألفاً، فلا
// نفترض سعةً أكبر لنموذج لا نعرفه. يُضبط من البيئة عند إضافة نموذج أوسع.
const DEFAULT_WINDOW = Math.max(8192, Number(process.env.KIMI_CONTEXT_WINDOW) || 262_144);

export function kimiContextWindow(model: string): number {
  for (const [prefix, window] of KNOWN_WINDOWS) {
    if (model.startsWith(prefix)) return window;
  }
  return DEFAULT_WINDOW;
}

// تقدير محلّيّ لتوكنات المُدخَل. لا رقم رسميّ منشور لنسبة العربيّة لدى Moonshot،
// فنُقدّر بثلاثة أحرف لكلّ توكن — **أقلّ** من النسبة الواقعيّة (٣٫٥–٤) فيأتي
// التقدير أعلى من الحقيقة، والخطأ في جانب الأمان: نطلب إخراجاً أقلّ لا أكثر.
export function estimateKimiPromptTokens(messages: KimiMessage[]): number {
  const chars = messages.reduce((n, m) => n + m.content.length + 8, 0);
  return Math.ceil(chars / 3);
}

// هامش أمان فوق التقدير، وأرضيّة لا يُرسَل تحتها طلب أصلاً (ملخّص أقصر منها بلا فائدة).
const SAFETY_MARGIN = 4096;
const MIN_USEFUL_OUTPUT = 8192;

export class KimiContextOverflowError extends Error {
  constructor(readonly needed: number, readonly window: number) {
    super(
      `KIMI_CONTEXT_OVERFLOW: المادّة أكبر من نافذة النموذج (تقدير المُدخَل ${needed} توكن من أصل ${window}). قسّم المادّة أو اختر نموذجاً بنافذة أوسع.`,
    );
    this.name = "KimiContextOverflowError";
  }
}

// ميزانيّة الإخراج الفعليّة: الأصغر بين المطلوب، وسقف البيئة، والمتبقّي من النافذة.
export function kimiOutputBudget(opts: {
  model: string;
  messages: KimiMessage[];
  maxTokens: number;
}): number {
  const window = kimiContextWindow(opts.model);
  const prompt = estimateKimiPromptTokens(opts.messages);
  const available = window - prompt - SAFETY_MARGIN;
  if (available < MIN_USEFUL_OUTPUT) throw new KimiContextOverflowError(prompt, window);
  return Math.min(opts.maxTokens, MAX_OUTPUT, CHUNK_TOKENS, available);
}

export type KimiMessage = ChatMessage;

export const isKimiConfigured = Boolean(apiKey && apiKey.length > 10);

// معرّفات Moonshot تأتي بصيغتين: kimi-* (مثل kimi-k2) وmoonshot-* (مثل moonshot-v1-128k)
export function isKimiModel(model: string): boolean {
  return model.startsWith("kimi-") || model.startsWith("moonshot-");
}

// يُجري النداء المتزامن ويعيد معرّفاً وهميّاً يحمل الناتج المُرمَّز.
// أخطاء النقل الصلبة تُرمى ليتولّاها المسار (استرداد الرصيد + FAILED).
//
// ⚠️ لا تُضِف معاملات العيّنة (temperature وtop_p وn وpresence/frequency_penalty):
// Moonshot يثبّتها على قيمها الافتراضيّة ويردّ 400 على أيّ قيمة تُمرَّر صراحةً.
// أمانة النقل الحرفيّ تُضمن بالتعليمات والتحقّق البرمجيّ، لا بخفض temperature.
export async function submitKimiBatch(opts: {
  model: string;
  messages: KimiMessage[];
  maxTokens: number;
}): Promise<string> {
  if (!isKimiConfigured) throw new Error("KIMI_NOT_CONFIGURED");
  const effort = reasoningEffortFor(opts.model);
  const res = await chatFetchWithRetry({
    url: `${BASE_URL}/chat/completions`,
    apiKey,
    providerLabel: "Kimi",
    body: {
      model: opts.model,
      messages: opts.messages,
      // `max_completion_tokens` هو الحقل المعتمد لدى Moonshot، و`max_tokens` مهجور.
      max_completion_tokens: kimiOutputBudget(opts),
      ...(effort ? { reasoning_effort: effort } : {}),
    },
    totalBudgetMs: BUDGET_MS,
  });
  // بلا قصّ لعلامة النهاية هنا؛ القصّ يتمّ عند الاستطلاع بالعلامة الفعليّة.
  return encodeInline(parseChatResponse(await res.text(), ""));
}

// يفحص الحالة ويستخرج الناتج — بنفس StudyBatchStatus.
// كلّ معرّفات Kimi وهميّة (inline:) لأنّ النداء متزامن؛ غيرها حالة غير متوقّعة.
export async function checkKimiBatch(batchId: string, endMark: string): Promise<StudyBatchStatus> {
  if (batchId.startsWith(INLINE_PREFIX)) {
    return stripEndMark(decodeInline(batchId), endMark);
  }
  return { state: "failed", message: "معرّف معالجة غير معروف — أعد المحاولة" };
}

// لا شيء يُلغى لدى المزوّد: النداء متزامن وانتهى قبل حفظ المعرّف.
export async function cancelKimiBatch(): Promise<void> {}
