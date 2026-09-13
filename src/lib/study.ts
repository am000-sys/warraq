// src/lib/study.ts — الملخّص الدراسي الذكيّ (ميزة مستقلّة عن التفريغ النصّي)
// يولّد ملخّصاً أكاديمياً للمذاكرة عبر Claude من مستند مفرّغ أو نصّ يرفعه المستخدم،
// بخيارات تركيز يحدّدها المستخدم (تعاريف/تعدادات/مفاهيم/مقارنات/أقوال/أسئلة).
//
// آليّة التنفيذ: «دفعة واحدة» عبر Batches API — المهمة تُسلَّم كاملة وتُعالَج على
// خوادم Anthropic بخصم ٥٠٪ على كلّ التوكنات، دون تقطيع ولا إعادة سياق ولا حدود
// مدّة serverless، ثمّ نستلم الناتج كاملاً ونُعلم المستخدم بالبريد عند الاكتمال.
// (تكتمل عادةً خلال دقائق، وبحدّ أقصى ساعة في الازدحام.)
//
// التسعير بحجم المصدر، والإعداد كلّه في SystemSetting بمفاتيح study_*.
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import type { StudyDepth, StudyFocus } from "@/lib/study-options";
import {
  isQwenConfigured,
  isQwenModel,
  submitQwenBatch,
  checkQwenBatch,
  cancelQwenBatch,
  type QwenMessage,
} from "@/lib/qwen";
import {
  isKimiConfigured,
  isKimiModel,
  submitKimiBatch,
  checkKimiBatch,
  cancelKimiBatch,
  kimiContextWindow,
  type KimiMessage,
} from "@/lib/kimi";

// الثوابت المشتركة مع الواجهة (خيارات/تسعير) في ملفّ نقيّ بلا اعتماد على الخادم
export {
  FOCUS_OPTIONS,
  DEPTH_OPTIONS,
  FOCUS_IDS,
  DEPTH_IDS,
  CHARS_PER_PAGE,
  STUDY_MAX_SUMMARY_CHARS,
  DEPTH_OUTPUT_RATIO,
  maxCoveredPages,
  billedPages,
  estimateSourcePages,
  calcStudyCost,
} from "@/lib/study-options";
export type { StudyFocus, StudyDepth, StudyPricing } from "@/lib/study-options";

const apiKey = process.env.ANTHROPIC_API_KEY;
const isAnthropicConfigured = Boolean(
  apiKey && apiKey !== "sk-ant-stub-temp" && apiKey.startsWith("sk-ant-"),
);
// الخدمة مهيّأة إن توفّر أيّ مزوّد: Claude أو Qwen أو Kimi (يضبطه المالك).
export const isStudyConfigured = isAnthropicConfigured || isQwenConfigured || isKimiConfigured;

// مفتاح الإيقاف اليدويّ: الميزة مفتوحة متى توفّر مزوّد مهيّأ، وتُغلق صراحةً بـ
// STUDY_ENABLED="0" (يحجب الواجهة وقبول طلبات جديدة، ولا يمسّ تسوية المهامّ
// الجارية في study-poll حتى لا تبقى معلّقة بلا نهاية).
// كان المنطق مقلوباً (مغلقة ما لم تُفتح بـ "1") أيّام تعطّل مزوّد Qwen.
export const STUDY_ENABLED = process.env.STUDY_ENABLED !== "0";
export const STUDY_TRIAL_MESSAGE =
  "الملخّص الدراسي قيد التجربة الداخليّة الآن، وسيُفتح للجميع بعد اكتمالها.";
export const STUDY_OFF_MESSAGE =
  "الملخّص الدراسي قيد التطوير وسيتاح قريباً. بقيّة خدمات المنصّة تعمل كالمعتاد.";
const client = isAnthropicConfigured ? new Anthropic({ apiKey }) : null;

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
  premiumEnabled: boolean; // إتاحة «الدقّة القصوى» للمستخدمين (سلاح تحكّم بالتكلفة)
  ownerOnly: boolean; // تجربة داخليّة: الميزة للمالك وحده، وللبقيّة «قريباً»
};

// معرّف نموذج مقبول: claude-* أو qwen-* أو kimi-*/moonshot-* — التوجيه حسب البادئة.
export function isSupportedStudyModel(v: unknown): v is string {
  return (
    typeof v === "string" &&
    (v.startsWith("claude-") || v.startsWith("qwen-") || isKimiModel(v))
  );
}

// قراءة معرّف نموذج من البيئة مع التحقّق — معرّف مجهول البادئة يُتجاهَل بدل أن
// يُعطّل الميزة صامتاً عند أوّل نداء.
function envModel(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return isSupportedStudyModel(v) ? v : undefined;
}

// النموذج عند غياب ضبطٍ صريح: يتبع المفتاح الموجود فعلاً في البيئة.
// kimi-k3 أوّلاً لسعة نافذته (مليون توكن) — وحده يسع كتاباً كاملاً في نداء واحد،
// وهو ما تتطلّبه بنية الملخّص الهرميّة المتّبعة لترتيب الكتاب.
function fallbackModel(): string {
  if (isKimiConfigured) return "kimi-k3";
  return "qwen-plus-latest";
}

const DEFAULTS: StudyConfig = {
  enabled: true,
  rate: 1.5,
  minCost: 15,
  ratePremium: 4.5,
  minCostPremium: 45,
  // النموذج الافتراضي: من البيئة إن ضُبط (لا توجد واجهة لتحرير SystemSetting)،
  // وإلّا حسب المزوّد المهيّأ فعلاً — فلا تبقى الميزة تشير إلى مزوّد بلا مفتاح.
  model: envModel("STUDY_DEFAULT_MODEL") ?? fallbackModel(),
  modelPremium: envModel("STUDY_DEFAULT_MODEL_PREMIUM") ?? fallbackModel(),
  maxChars: 800_000,
  premiumEnabled: true,
  // مغلقة على المالك افتراضاً حتى تُجرَّب جودة المزوّد على مستندات حقيقيّة.
  // تُفتح للجميع من زرّ في لوحة المالك (أو بـ STUDY_OWNER_ONLY="0").
  ownerOnly: process.env.STUDY_OWNER_ONLY !== "0",
};

export const STUDY_KEYS = {
  enabled: "study_enabled",
  rate: "study_rate",
  minCost: "study_min_cost",
  ratePremium: "study_rate_premium",
  minCostPremium: "study_min_cost_premium",
  model: "study_model",
  modelPremium: "study_model_premium",
  maxChars: "study_max_chars",
  premiumEnabled: "study_premium_enabled",
  ownerOnly: "study_owner_only",
} as const;

// اسم مختصر داخل الملفّ
const KEYS = STUDY_KEYS;

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
    const okModel = isSupportedStudyModel;
    const m = map.get(KEYS.model);
    if (okModel(m)) cfg.model = m;
    const mp = map.get(KEYS.modelPremium);
    if (okModel(mp)) cfg.modelPremium = mp;
    cfg.maxChars = num(KEYS.maxChars, 10_000) ?? cfg.maxChars;
    if (map.has(KEYS.premiumEnabled)) cfg.premiumEnabled = Boolean(map.get(KEYS.premiumEnabled));
    if (map.has(KEYS.ownerOnly)) cfg.ownerOnly = Boolean(map.get(KEYS.ownerOnly));

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

// علامة إتمام يضعها النموذج آخر الملخّص — تساعده على الإقفال المنظّم وتُحذف من الناتج
export const STUDY_END_MARK = "[انتهى الملخّص]";

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
6. أتبِع كلّ نقل حرفيّ برقم صفحته المطبوع كما ورد في علامات [صفحة N] في المادّة، هكذا: «النصّ المنقول» [صفحة ١٢٣]. وإن لم تجد للنصّ علامة صفحة في المادّة فاترك الرقم ولا تُقدّره.
7. المادّة مفرّغة آليّاً من كتاب مصوَّر، فقد يقع فيها تلف أو رموز مشوّهة. لا تُرمّم النصّ التالف بالتخمين ولا تُكمله من معرفتك — اكتب مكانه [نصّ تالف في الأصل] وامضِ.
</citation_rules>

<formatting_spec>
- أخرج الملخّص بصيغة Markdown نقيّة، وابدأ مباشرة بالمحتوى دون أيّ مقدّمة أو تعليق خارج الملخّص.
- استعمل عناوين هرميّة واضحة: # لعنوان الملخّص، ## للمحاور الكبرى، ### للأقسام الفرعيّة.
- التعاريف بصيغة: «المصطلح: شرحه» مع جعل المصطلح بخطّ غامق.
- التعدادات والتقسيمات مرقّمة لا مدمجة في فقرة.
- أقوال الفرق والمذاهب موحّدة الصيغة: **القائل** + «نصّه الحرفي إن وُجد» [صفحة N] أو معناه + بيان معنى القول.
- صناديق التحليل اقتباسات Markdown (>) تُعنون بـ **خلاصة** أو **مربط الفهم**.
- جداول المقارنة بصيغة جداول Markdown بأعمدة: الوجه / الموقف الأوّل / الموقف الثاني.
- نثر متدفّق في الشرح، وقوائم في التعداد فقط.
- عند إتمام الملخّص كاملاً (آخر محاور المادّة) اختمه بسطر أخير منفرد نصّه: ${STUDY_END_MARK}
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
2. أنّ كلّ رقم صفحة/جزء مأخوذٌ من علامات [صفحة N] في المادّة لا مُقدَّراً، وأنّ كلّ نقل حرفيّ مقرونٌ بصفحته متى وُجدت.
3. أنّ كلّ قول منسوبٌ إلى قائله ومصدره الصحيح.
4. أنّ البنية الهرميّة تعكس ترتيب المادّة، وأنّ محاور التركيز المختارة ظاهرة ومنظّمة للمذاكرة.
5. أنّك لم تُسقط مسألةً جوهريّةً اختصاراً.
</success_criteria>`;
}

// ─── حدود الإخراج حسب العمق (للدفعة الكاملة) ────────────────
// السقف سخيّ عمداً: المحاسبة على ما يُكتب فعلاً لا على السقف، وملخّص وافٍ
// لمقرّر كبير قد يطول. نماذج الدقّة القصوى تفكّر دوماً وتوكنات تفكيرها
// تُحسب من max_tokens فتأخذ هامشاً إضافياً (سقف النموذج ١٢٨ ألفاً).
// وإن بُلغ السقف رغم ذلك، تُرسل دفعة متابعة تُكمل من نقطة التوقّف.
export function maxTokensForBatch(depth: StudyDepth, premium: boolean): number {
  const base = depth === "concise" ? 32768 : depth === "deep" ? 98304 : 65536;
  return premium ? Math.min(131072, Math.round(base * 1.5)) : base;
}

// توجيه دفعات المتابعة (عند بلوغ سقف الإخراج): يتسلّم المنجَز ويُكمل منه
const CONTINUE_INSTRUCTION =
  "تابِع الملخّص من النقطة التي توقّف عندها نصّك السابق تماماً — أكمل حتى من منتصف الجملة أو الجدول إن كان مقطوعاً — دون أيّ تكرار لما سبق ولا مقدّمات ولا تعليق. " +
  `التزم التعليمات والبنية نفسها، وعند إتمام الملخّص كاملاً اختمه بسطر أخير منفرد: ${STUDY_END_MARK}`;

// ─── واجهة الدفعات (مزوّد قابل للتبديل: Claude افتراضاً، Qwen عند ضبطه) ─────
function buildUserContent(context: string): string {
  return `=== المادّة العلميّة ===\n\n${context}\n\n=== نهاية المادّة ===\n\nلخّص المادّة أعلاه وفق تعليماتك.`;
}

// رسائل الحوار المشتركة بين المزوّدين (بلا رسالة النظام — تُحقن حسب المزوّد).
// مع checkpoint: دفعة «متابعة» — المنجَز يُمرَّر دورَ assistant سابقاً
// (آخر دور يبقى user، فلا يُعدّ prefill المحظور على النماذج الحديثة).
type DialogMsg = { role: "user" | "assistant"; content: string };
function buildDialogMessages(context: string, checkpoint?: string): DialogMsg[] {
  const messages: DialogMsg[] = [{ role: "user", content: buildUserContent(context) }];
  if (checkpoint && checkpoint.trim()) {
    messages.push({ role: "assistant", content: checkpoint });
    messages.push({ role: "user", content: CONTINUE_INSTRUCTION });
  }
  return messages;
}

// رسائل Kimi — ترتيب مقصود يخالف بقيّة المزوّدين:
// Moonshot يطابق **بادئة** الرسائل لإصابة الكاش، ويوصي بوضع السياق الكبير الثابت
// في أوّل المصفوفة قبل رسالة التعليمات. فنضع الكتاب أوّلاً ثمّ التعليمات ثمّ سطر
// إطلاق قصير — فتبقى البادئة متطابقة حرفاً بين النداء الأوّل ودفعة المتابعة، وهي
// موضع إعادة إرسال الكتاب كاملاً. أيّ إقحام متغيّر (وقت/معرّف) في البادئة يُبطلها.
const KIMI_TRIGGER = "لخّص المادّة أعلاه وفق تعليماتك.";

function buildKimiMessages(system: string, context: string, checkpoint?: string): KimiMessage[] {
  const messages: KimiMessage[] = [
    { role: "system", content: `=== المادّة العلميّة ===\n\n${context}\n\n=== نهاية المادّة ===` },
    { role: "system", content: system },
    { role: "user", content: KIMI_TRIGGER },
  ];
  if (checkpoint && checkpoint.trim()) {
    messages.push({ role: "assistant", content: checkpoint });
    messages.push({ role: "user", content: CONTINUE_INSTRUCTION });
  }
  return messages;
}

// يسلّم المهمة كاملة دفعةً واحدة ويعيد معرّف الدفعة للمتابعة.
// التوجيه حسب بادئة معرّف النموذج: kimi-*/moonshot-* ⇒ Kimi (المعرّف يُبدَأ بـ
// "kimi:")، وqwen-* ⇒ Qwen ("qwen:")، وإلّا ⇒ Anthropic Batches (المعرّف يبقى كما
// هو — توافق رجعيّ للسجلّات الجارية).
// لا تبديل مزوّد تلقائيّاً: تعذُّر المزوّد المضبوط يُسلَّم كخطأ واضح (استرداد + رسالة).
export async function submitStudyBatch(opts: {
  model: string;
  system: string;
  context: string;
  maxTokens: number;
  checkpoint?: string;
  budgetMs?: number; // ما تبقّى من مهلة الدالّة (للمزوّد المتزامن وحده)
}): Promise<string> {
  // فرع Kimi يبني رسائله بترتيبه الخاصّ، فلا يُركَّب له سياق الحوار المشترك.
  if (isKimiModel(opts.model)) {
    const messages = buildKimiMessages(opts.system, opts.context, opts.checkpoint);
    const id = await submitKimiBatch({
      model: opts.model,
      messages,
      maxTokens: opts.maxTokens,
      budgetMs: opts.budgetMs,
    });
    return `kimi:${id}`;
  }

  const dialog = buildDialogMessages(opts.context, opts.checkpoint);

  if (isQwenModel(opts.model)) {
    // Qwen (متوافق مع OpenAI): رسالة النظام دور مستقلّ ضمن المصفوفة
    const messages: QwenMessage[] = [{ role: "system", content: opts.system }, ...dialog];
    const id = await submitQwenBatch({ model: opts.model, messages, maxTokens: opts.maxTokens });
    return `qwen:${id}`;
  }

  if (!client) throw new Error("ANTHROPIC_NOT_CONFIGURED");
  const batch = await client.messages.batches.create({
    requests: [
      {
        custom_id: "study",
        params: {
          // معرّفات النماذج تأتي من SystemSetting وقد تسبق أنواع SDK
          model: opts.model as Parameters<typeof client.messages.create>[0]["model"],
          max_tokens: opts.maxTokens,
          system: opts.system,
          messages: dialog,
        },
      },
    ],
  });
  return batch.id;
}

export type StudyBatchStatus =
  | { state: "processing" }
  | {
      state: "succeeded";
      markdown: string;
      inputTokens: number;
      outputTokens: number;
      truncated: boolean; // بلغ سقف الإخراج (نادر — يُسلَّم مع تنبيه)
    }
  | { state: "refused" } // رفض نموذج الفئة الأعلى — يُحوَّل للدقّة العالية
  | { state: "failed"; message: string };

// يفحص حالة الدفعة، ويستخرج الناتج عند الاكتمال
export async function checkStudyBatch(batchId: string): Promise<StudyBatchStatus> {
  // بادئة المعرّف تحدّد المزوّد؛ بلا بادئة ⇒ Anthropic (توافق رجعيّ للسجلّات الجارية)
  if (batchId.startsWith("kimi:")) return checkKimiBatch(batchId.slice(5), STUDY_END_MARK);
  if (batchId.startsWith("qwen:")) return checkQwenBatch(batchId.slice(5), STUDY_END_MARK);
  if (!client) throw new Error("ANTHROPIC_NOT_CONFIGURED");
  const batch = await client.messages.batches.retrieve(batchId);
  if (batch.processing_status !== "ended") return { state: "processing" };

  for await (const entry of await client.messages.batches.results(batchId)) {
    const r = entry.result;
    if (r.type === "succeeded") {
      const msg = r.message;
      if ((msg.stop_reason as string) === "refusal") return { state: "refused" };
      const text = msg.content
        .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
        .map((b) => b.text)
        .join("")
        .trim();
      if (!text) return { state: "failed", message: "أعاد النموذج ردّاً فارغاً" };
      return {
        state: "succeeded",
        markdown: text.split(STUDY_END_MARK).join("").trimEnd(),
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
        truncated: msg.stop_reason === "max_tokens",
      };
    }
    if (r.type === "errored") {
      return { state: "failed", message: "تعذّرت المعالجة لدى مزوّد الذكاء الاصطناعي — أعد المحاولة" };
    }
    return {
      state: "failed",
      message: r.type === "expired" ? "انتهت مهلة المعالجة — أعد المحاولة" : "أُلغيت المعالجة",
    };
  }
  return { state: "failed", message: "نتيجة غير متوقّعة من المعالجة" };
}

// إلغاء دفعة (عند حذف ملخّص قيد المعالجة) — لإيقاف أيّ كلفة متبقّية
export async function cancelStudyBatch(batchId: string): Promise<void> {
  if (batchId.startsWith("kimi:")) return cancelKimiBatch();
  if (batchId.startsWith("qwen:")) return cancelQwenBatch(batchId.slice(5));
  if (!client) return;
  await client.messages.batches.cancel(batchId).catch(() => {});
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

// يبني سياق المادّة من مصدر الملخّص (وظيفة مفرّغة أو نصّ مستقلّ).
// مشترك بين الإرسال والتسوية (فحص النقول يحتاج المصدر نفسه).
export async function buildStudyContext(rec: {
  sourceJobId: string | null;
  sourceText: string | null;
}): Promise<string | null> {
  if (rec.sourceJobId) {
    const pages = await db.jobPage.findMany({
      where: { jobId: rec.sourceJobId },
      orderBy: { sequentialNumber: "asc" },
      select: { sequentialNumber: true, printedNumber: true, textContent: true },
    });
    if (pages.length === 0) return null;
    return pages
      .map((p) => `[صفحة ${p.printedNumber || p.sequentialNumber}]\n${p.textContent ?? ""}`)
      .join("\n\n");
  }
  return rec.sourceText ?? null;
}

// ─── تشخيص المزوّد (للوحة المالك) ──────────────────────────
// يُجيب عن السؤال الذي يتكرّر عند كلّ تبديل مزوّد: أيّ نموذج يعمل الآن؟ وهل
// مفتاحه مضبوط أصلاً؟ وهل يسع حدُّ الحروف المسموح به نافذةَ ذلك النموذج؟
// قراءة خالصة بلا نداء شبكة — تُفتح مع لوحة النظام فلا تُضيف كلفة ولا زمناً.
export type StudyProvider = "claude" | "qwen" | "kimi";

// من أين جاء النموذج العامل؟ الترتيب: صفّ SystemSetting ⇐ متغيّر البيئة ⇐ الافتراضيّ.
// بيانه في اللوحة يختصر تشخيصاً طويلاً: «ضبطتُ البيئة ولم يتغيّر شيء» سببه صفٌّ
// قديم في القاعدة يتقدّم عليها.
export type StudyModelSource = "db" | "env" | "auto";

// حال متغيّر بيئة بلا كشف قيمته: موجود / موجود لكنّه قصير على نحوٍ مريب / مفقود.
// «قصير» مهمّ: isKimiConfigured يشترط طولاً معقولاً، فمفتاح ملصوق ناقصاً يُقرأ
// كأنّه غير مضبوط — وهذا يبدو في اللوحة كأنّ المفتاح لم يُضَف أصلاً.
export type EnvKeyState = "set" | "short" | "missing";

export function envKeyState(...names: string[]): EnvKeyState {
  for (const n of names) {
    const v = process.env[n]?.trim();
    if (v) return v.length > 10 ? "set" : "short";
  }
  return "missing";
}

export type StudyDiagnostic = {
  enabled: boolean; // STUDY_ENABLED — الميزة معروضة للمستخدمين؟
  configuredEnabled: boolean; // study_enabled في الإعداد
  provider: StudyProvider;
  providerReady: boolean; // مفتاح المزوّد المختار مضبوط؟
  model: string;
  modelPremium: string;
  premiumEnabled: boolean;
  ownerOnly: boolean;
  maxChars: number;
  modelSource: StudyModelSource;
  contextWindow: number | null; // للنماذج التي نعرف نافذتها (Kimi)
  estimatedPromptTokens: number | null; // تقدير المُدخَل عند بلوغ maxChars
  fits: boolean | null; // هل يسع المُدخَل الأقصى نافذةَ النموذج؟
  keys: { claude: boolean; qwen: boolean; kimi: boolean };
  // حال متغيّرات البيئة بالاسم — للإجابة عن «أضفت المفتاح ولا أثر له»:
  // إمّا أنّه في بيئة نشر أخرى، أو لم يُعَد النشر بعد إضافته.
  envKeys: { moonshot: EnvKeyState; kimi: EnvKeyState; qwen: EnvKeyState; claude: EnvKeyState };
  deployEnv: string | null;
  commit: string | null; // أوّل ٧ خانات — للتأكّد أنّ النشر الجاري يحمل هذا الكود
};

export function studyProviderOf(model: string): StudyProvider {
  if (isKimiModel(model)) return "kimi";
  if (isQwenModel(model)) return "qwen";
  return "claude";
}

// هل مفتاح المزوّد الذي سيُنادى فعلاً مضبوط؟ الفرق عن isStudyConfigured جوهريّ:
// ذاك يصدق متى تهيّأ **أيّ** مزوّد، فتُفتح الميزة على نموذج بلا مفتاح وتفشل كلّ
// مهمّة (مع استرداد الرصيد). هذا يفحص مزوّد النموذج المضبوط وحده.
export function studyProviderReady(model: string): boolean {
  const provider = studyProviderOf(model);
  if (provider === "kimi") return isKimiConfigured;
  if (provider === "qwen") return isQwenConfigured;
  return isAnthropicConfigured;
}

export async function getStudyDiagnostics(): Promise<StudyDiagnostic> {
  const cfg = await getStudyConfig();
  const dbRow = await db.systemSetting
    .findUnique({ where: { key: KEYS.model } })
    .catch(() => null);
  const modelSource: StudyModelSource = isSupportedStudyModel(dbRow?.value)
    ? "db"
    : envModel("STUDY_DEFAULT_MODEL")
      ? "env"
      : "auto";
  const provider = studyProviderOf(cfg.model);
  const ready = studyProviderReady(cfg.model);

  // تقدير المُدخَل عند الحدّ الأقصى: حروف المادّة + نحو ٦ آلاف حرف للتعليمات،
  // بنفس نسبة kimi.ts المحافظة (٣ أحرف/توكن) فيبقى التقدير أعلى من الحقيقة.
  const estimatedPromptTokens =
    provider === "kimi" ? Math.ceil((cfg.maxChars + 6_000) / 3) : null;
  const contextWindow = provider === "kimi" ? kimiContextWindow(cfg.model) : null;

  return {
    enabled: STUDY_ENABLED,
    configuredEnabled: cfg.enabled,
    provider,
    providerReady: ready,
    model: cfg.model,
    modelPremium: cfg.modelPremium,
    modelSource,
    premiumEnabled: cfg.premiumEnabled,
    ownerOnly: cfg.ownerOnly,
    maxChars: cfg.maxChars,
    contextWindow,
    estimatedPromptTokens,
    fits:
      contextWindow !== null && estimatedPromptTokens !== null
        ? estimatedPromptTokens + 8192 <= contextWindow
        : null,
    keys: { claude: isAnthropicConfigured, qwen: isQwenConfigured, kimi: isKimiConfigured },
    envKeys: {
      moonshot: envKeyState("MOONSHOT_API_KEY"),
      kimi: envKeyState("KIMI_API_KEY"),
      qwen: envKeyState("QWEN_API_KEY", "DASHSCOPE_API_KEY"),
      claude: envKeyState("ANTHROPIC_API_KEY"),
    },
    deployEnv: process.env.VERCEL_ENV ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };
}
