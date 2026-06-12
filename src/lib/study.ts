// src/lib/study.ts — الملخّص الدراسي الذكيّ (ميزة مستقلّة عن التفريغ النصّي)
// يولّد ملخّصاً أكاديمياً للمذاكرة عبر Claude من مستند مفرّغ أو نصّ يرفعه المستخدم،
// بخيارات تركيز يحدّدها المستخدم (تعاريف/تعدادات/مفاهيم/مقارنات/أقوال/أسئلة).
// التسعير بحجم المصدر، والإعداد كلّه في SystemSetting بمفاتيح study_* (بلا تكويد صلب).
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import type { StudyDepth, StudyFocus } from "@/lib/study-options";

// الثوابت المشتركة مع الواجهة (خيارات/تسعير) في ملفّ نقيّ بلا اعتماد على الخادم
export {
  FOCUS_OPTIONS,
  DEPTH_OPTIONS,
  FOCUS_IDS,
  DEPTH_IDS,
  CHARS_PER_PAGE,
  estimateSourcePages,
  calcStudyCost,
} from "@/lib/study-options";
export type { StudyFocus, StudyDepth, StudyPricing } from "@/lib/study-options";

const apiKey = process.env.ANTHROPIC_API_KEY;
export const isStudyConfigured = Boolean(
  apiKey && apiKey !== "sk-ant-stub-temp" && apiKey.startsWith("sk-ant-"),
);
const client = isStudyConfigured ? new Anthropic({ apiKey }) : null;

// ─── الإعداد (SystemSetting بمفاتيح study_*) ───────────────
export type StudyConfig = {
  enabled: boolean;
  rate: number; // صفحات رصيد لكلّ صفحة مصدر — الدقّة العالية
  minCost: number;
  ratePremium: number; // — الدقّة القصوى
  minCostPremium: number;
  model: string; // معرّف نموذج الدقّة العالية
  modelPremium: string; // معرّف نموذج الدقّة القصوى
  maxChars: number; // أقصى حجم للمدخل (حروف) — لا اقتطاع صامتاً أبداً
};

const DEFAULTS: StudyConfig = {
  enabled: true,
  rate: 1.5,
  minCost: 15,
  ratePremium: 4.5,
  minCostPremium: 45,
  model: "claude-opus-4-8",
  modelPremium: "claude-fable-5",
  maxChars: 800_000,
};

const KEYS = {
  enabled: "study_enabled",
  rate: "study_rate",
  minCost: "study_min_cost",
  ratePremium: "study_rate_premium",
  minCostPremium: "study_min_cost_premium",
  model: "study_model",
  modelPremium: "study_model_premium",
  maxChars: "study_max_chars",
} as const;

export async function getStudyConfig(): Promise<StudyConfig> {
  try {
    const rows = await db.systemSetting.findMany({
      where: { key: { in: Object.values(KEYS) } },
    });
    const map = new Map(rows.map((r) => [r.key, r.value as unknown]));
    const cfg: StudyConfig = { ...DEFAULTS };

    if (map.has(KEYS.enabled)) cfg.enabled = Boolean(map.get(KEYS.enabled));
    const num = (k: string, min = 0) => {
      const v = Number(map.get(k));
      return Number.isFinite(v) && v >= min ? v : undefined;
    };
    cfg.rate = num(KEYS.rate, 0.1) ?? cfg.rate;
    cfg.minCost = num(KEYS.minCost) ?? cfg.minCost;
    cfg.ratePremium = num(KEYS.ratePremium, 0.1) ?? cfg.ratePremium;
    cfg.minCostPremium = num(KEYS.minCostPremium) ?? cfg.minCostPremium;
    const m = map.get(KEYS.model);
    if (typeof m === "string" && m.startsWith("claude-")) cfg.model = m;
    const mp = map.get(KEYS.modelPremium);
    if (typeof mp === "string" && mp.startsWith("claude-")) cfg.modelPremium = mp;
    cfg.maxChars = num(KEYS.maxChars, 10_000) ?? cfg.maxChars;

    return cfg;
  } catch {
    return { ...DEFAULTS };
  }
}

// ─── بناء البرومت ──────────────────────────────────────────
// التعليمة الأساسيّة (المنهجيّة الأكاديميّة وقواعد العزو) ثابتة، وتعليمات
// التركيز والعمق تُحقن حسب اختيار المستخدم.
const FOCUS_INSTRUCTIONS: Record<StudyFocus, string> = {
  definitions:
    "أبرز كلّ تعريف ومصطلح في موضعه بصيغة «المصطلح: شرحه»، واجمع في نهاية كلّ محور قائمة بمصطلحاته الأساسيّة.",
  enumerations:
    "أظهر كلّ تعداد وتقسيم (أركان، شروط، أقسام، أنواع، مراتب) في قوائم مرقّمة بارزة لا مدمجة في الفقرات، وحافظ على عدد البنود كما ورد في المادّة.",
  concepts:
    "قدّم لكلّ محور صندوق «مربط الفهم»: الفكرة الجامعة وعلاقته ببقيّة المحاور، وافتتح الملخّص بفقرة تبيّن الخيط الناظم للمادّة كلّها.",
  comparisons:
    "استخرج جداول مقارنة حيثما كانت المادّة قابلة للمقارنة (فرق، مذاهب، أقوال متقابلة) بأعمدة: الوجه / الموقف الأوّل / الموقف الثاني.",
  positions:
    "اعتنِ عناية خاصّة بأقوال المذاهب والفرق: القائل (بخطّ غامق) + نصّ قوله الحرفيّ بين «...» إن وُجد أو معناه بدونهما + بيان معنى القول، مع دليله ووجه الاستدلال إن ذُكرا في المادّة.",
  questions:
    "اختم كلّ محور بأسئلة مراجعة قصيرة (سؤال ثمّ جواب موجز) تغطّي مسائله الجوهريّة وتصلح للاختبار الذاتي.",
};

const DEPTH_INSTRUCTIONS: Record<StudyDepth, string> = {
  concise:
    "اجعل الملخّص مكثّفاً (نحو ربع حجم المادّة أو أقلّ): اقتصر على التعاريف والتقسيمات وأمّهات المسائل، واحذف الاستطراد والأمثلة الثانويّة — دون إسقاط مسألة جوهريّة.",
  balanced:
    "وازن بين الإيجاز والعمق: ملخّص وافٍ يصلح للمذاكرة الكاملة دون استطراد، لا يُسقط أقوال الأصحاب ولا أمّهات الأدلّة.",
  deep:
    "توسّع في الشرح: أورد الأدلّة ووجوه الاستدلال والمناقشات والاعتراضات المذكورة في المادّة، مع بقاء البنية الهرميّة واضحة.",
};

export function buildStudySystemPrompt(focus: StudyFocus[], depth: StudyDepth): string {
  const focusBlock = focus
    .map((f) => `- ${FOCUS_INSTRUCTIONS[f]}`)
    .join("\n");

  return `<role>
أنت مساعد أكاديمي متخصّص في تلخيص المقرّرات والكتب العلميّة — ولا سيّما الدراسات الإسلاميّة والشرعيّة — وتنسيقها للمذاكرة. تجيد العمل على النصوص المفرّغة من كتاب واحد أو مجموعة كتب، وتلتزم بصرامةٍ بقواعد النقل والعزو العلمي.
</role>

<context>
المستخدم طالب أو باحث يقدّم مادّة علميّة (نصّاً مفرّغاً) ويريد ملخّصاً منظّماً للمذاكرة. المادّة قد تكون فصلاً من كتاب واحد أو مقرّراً مجمّعاً من عدّة مصادر. التركيز على الفهم لا الحفظ الأصمّ. اللغة عربيّة والاتّجاه من اليمين إلى اليسار (RTL).

المادّة المرفقة تحفظ ترقيم الصفحات بعلامات مثل (## صفحة N) أو [صفحة N]، والعناوين الهرميّة، والاقتباسات الحرفيّة بين «...»، والإحالات المرقّمة (١)(٢) مع حواشيها. تعامل مع هذه العلامات بوصفها بنية دلاليّة لا مجرّد تنسيق.
</context>

<task>
لخّص المادّة المرفقة ونسّقها للمذاكرة وفق الخطوات التالية:
1. اقرأ النصّ كاملاً أوّلاً، وحدّد بنيته (الأبواب/الفصول/المطالب) ومصادره.
2. نظّم الملخّص هرمياً: قسّم المادّة إلى محاور كبرى، وكلّ محور إلى أقسام وعناوين فرعيّة، بترتيب المادّة نفسها.
3. ركّز على ما يخدم المذاكرة: التعاريف، والتقسيمات، والتعدادات المرقّمة، وأقوال أصحاب المذاهب والفرق على هيئة (القائل + نصّ قوله + معنى قوله).
4. أضِف صناديق "خلاصة/مربط الفهم" عند المسائل المحوريّة لتثبيت الفكرة الجامعة.
5. استخرج الجداول المقارنة حيثما كانت المادّة قابلة للمقارنة (فرق، مذاهب، أقوال متقابلة).
6. اختم بفهرس للمحاور إن كان الملخّص طويلاً.
</task>

<focus_directives>
اختار الطالب محاور التركيز التالية — قدّمها وأبرزها على ما سواها:
${focusBlock}
</focus_directives>

<depth>
${DEPTH_INSTRUCTIONS[depth]}
</depth>

<citation_rules>
هذه القواعد مقدَّمة على كلّ تعليمات التنسيق والاختصار، ولا يُعتذر عن مخالفتها:
1. لا تضع نصّاً بين قوسي الزخرفة «...» إلا إذا كان منقولاً حرفاً بحرف من المادّة المرفقة في هذه الجلسة. معرفتك السابقة لا تُجيز النقل الحرفي.
2. لا تذكر رقم صفحة أو جزء (مثل: ١/١٥٥، ص٣٣) إلا إذا ورد في المادّة المرفقة نفسها. لا تُخمّن الترقيم ولا تستعمل ما هو "شائع في الإحالات".
3. ميّز بين الإحالة بالمعنى (يُعبَّر عنها: «ذكر فلانٌ أنّ...» بلا قوسي زخرفة) والنقل الحرفي (بين «...»). إذا كان مصدرك يقول "ينظر/انظر" فهو إحالة بالمعنى لا نقل حرفي.
4. انسب كلّ قول إلى قائله ومصدره كما ورد في المادّة، ولا تنسب محتوى إلى كتابٍ غير موجود فيها.
5. عند الشكّ، اكتب المعنى صراحةً ولا تختلق نصّاً ثمّ تُلصقه برقم صفحة.
</citation_rules>

<formatting_spec>
- أخرج الملخّص بصيغة Markdown نقيّة، وابدأ مباشرة بالمحتوى دون أيّ مقدّمة أو تعليق خارج الملخّص.
- استعمل عناوين هرميّة واضحة: # لعنوان الملخّص، ## للمحاور الكبرى، ### للأقسام الفرعيّة.
- التعاريف بصيغة: «المصطلح: شرحه» مع جعل المصطلح بخطّ غامق.
- التعدادات والتقسيمات مرقّمة لا مدمجة في فقرة.
- أقوال الفرق والمذاهب موحّدة الصيغة: **القائل** + «نصّه الحرفي إن وُجد» أو معناه + بيان معنى القول.
- صناديق التحليل اقتباسات Markdown (>) تُعنون بـ **خلاصة** أو **مربط الفهم**.
- جداول المقارنة بصيغة جداول Markdown بأعمدة: الوجه / الموقف الأوّل / الموقف الثاني.
- نثر متدفّق في الشرح، وقوائم في التعداد فقط.
</formatting_spec>

<constraints>
- التزم بمحتوى المادّة المرفقة فقط؛ لا تُضِف نقولاً أو أمثلة أو أرقام صفحات من خارجها.
- إذا كانت المادّة مجمّعة من عدّة كتب، اذكر مصدر كلّ قسم عند وجوده فيها.
- إن لم يتيسّر تحقيق نقلٍ ما، صرّح بذلك بدل اختلاقه.
- حافظ على المصطلحات الشرعيّة الدقيقة، ولا تُبسّطها تبسيطاً يُخلّ بالمعنى.
- وازن بين الإيجاز والعمق: لا تختصر اختصاراً مُخلّاً يُسقط أقوال الأصحاب وأدلّتهم.
</constraints>

<success_criteria>
قبل التسليم، تحقّق من:
1. أنّ كلّ نصٍّ بين «...» موجودٌ حرفياً في المادّة المرفقة.
2. أنّ كلّ رقم صفحة/جزء مأخوذٌ من المادّة لا مُقدَّراً.
3. أنّ كلّ قول منسوبٌ إلى قائله ومصدره الصحيح.
4. أنّ البنية الهرميّة تعكس ترتيب المادّة، وأنّ محاور التركيز المختارة ظاهرة ومنظّمة للمذاكرة.
5. أنّك لم تُسقط مسألةً جوهريّةً اختصاراً.
</success_criteria>`;
}

// ─── حدود الإخراج حسب العمق ────────────────────────────────
// نماذج الدقّة القصوى تفكّر دوماً وتُحسب توكنات تفكيرها من max_tokens،
// فنمنحها هامشاً مضاعفاً كي لا يُقتطع الملخّص.
export function maxTokensFor(depth: StudyDepth, premium: boolean): number {
  const base = depth === "concise" ? 8192 : depth === "deep" ? 24576 : 16384;
  return premium ? base * 2 : base;
}

// ─── استدعاء Claude (بثّ) ──────────────────────────────────
// يُرمى عندما يرفض النموذج المعالجة (stop_reason: refusal) — يلتقطه المسار
// ليجرّب نموذج الدقّة العالية بدلاً من القصوى.
export class StudyModelRefusal extends Error {
  constructor() {
    super("رفض النموذج معالجة هذا المحتوى");
    this.name = "StudyModelRefusal";
  }
}

export type StudyRunResult = {
  markdown: string;
  inputTokens: number;
  outputTokens: number;
};

export async function runStudySummary(opts: {
  model: string;
  system: string;
  context: string;
  maxTokens: number;
  onDelta?: (text: string) => void;
}): Promise<StudyRunResult> {
  if (!client) throw new Error("ANTHROPIC_NOT_CONFIGURED");

  const stream = client.messages.stream({
    // معرّفات النماذج تأتي من SystemSetting وقد تسبق أنواع SDK — نمرّرها كما هي
    model: opts.model as Parameters<typeof client.messages.create>[0]["model"],
    max_tokens: opts.maxTokens,
    system: opts.system,
    messages: [
      {
        role: "user",
        content: `=== المادّة العلميّة ===\n\n${opts.context}\n\n=== نهاية المادّة ===\n\nلخّص المادّة أعلاه وفق تعليماتك.`,
      },
    ],
  });

  if (opts.onDelta) stream.on("text", opts.onDelta);

  const final = await stream.finalMessage();

  // نماذج الفئة الأعلى قد ترفض عبر stop_reason (وليس خطأ HTTP)
  if ((final.stop_reason as string) === "refusal") throw new StudyModelRefusal();

  const markdown = final.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
  if (!markdown) throw new Error("أعاد النموذج ردّاً فارغاً");

  return {
    markdown,
    inputTokens: final.usage.input_tokens,
    outputTokens: final.usage.output_tokens,
  };
}

// ─── فحص النقول الحرفيّة (محليّ، بلا تكلفة) ─────────────────
// يتحقّق أنّ كلّ نصّ وضعه النموذج بين «...» موجود حرفياً في المصدر —
// تنفيذ آليّ لبند success_criteria الأوّل. المقارنة بعد تطبيع التشكيل
// والمسافات حتى لا تفشل المطابقة لفروق رسمٍ لا تغيّر الحرف.
export type QuoteVerification = {
  total: number; // عدد النقول «...» المفحوصة
  verified: number; // ما ثبت وجوده حرفياً في المصدر
  missing: string[]; // عيّنة مما لم يثبت (للمراجعة)
};

function normalizeArabic(s: string): string {
  return s
    .replace(/[ً-ْٰـ]/g, "") // التشكيل والتطويل
    .replace(/[«»"""]/g, "") // أقواس اقتباس متداخلة
    .replace(/\s+/g, " ")
    .trim();
}

export function verifyQuotes(markdown: string, source: string): QuoteVerification {
  const normSource = normalizeArabic(source);
  // نفحص النقول ذات الدلالة (١٢ حرفاً فأكثر) — القصيرة غالباً مصطلحات لا نقول
  const quotes = [...markdown.matchAll(/«([^»]{12,600})»/g)].map((m) => m[1]);
  const missing: string[] = [];
  let verified = 0;
  for (const q of quotes) {
    if (normSource.includes(normalizeArabic(q))) verified++;
    else if (missing.length < 20) {
      missing.push(q.length > 140 ? q.slice(0, 140) + "…" : q);
    }
  }
  return { total: quotes.length, verified, missing };
}
