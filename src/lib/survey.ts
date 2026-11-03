// src/lib/survey.ts — استبيان المستخدمين: الأسئلة، والرابط الشخصيّ، والجمهور، والنتائج
//
// قرار المالك (2026-11-04): استبيانٌ قصير داخل الموقع يصل رابطه بالبريد، ويقيس حاجة
// المستخدم دون أن يذكر أنّه لم يرفع أو لم يشترِ. بلا جداول جديدة: كلّ إرسالٍ صفّ
// «survey.sent» وكلّ إجابةٍ صفّ «survey.response» (الأجوبة في metadata) في AuditLog.
import { createHash, createHmac, timingSafeEqual } from "crypto";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

// معرّف هذه الجولة — استبيانٌ لاحق بأسئلةٍ أخرى يأخذ معرّفاً جديداً فلا تختلط الأجوبة،
// ويصير الرابط القديم غير صالح للجولة الجديدة (المعرّف داخل التوقيع).
export const SURVEY_ID = "2026-11";
export const SURVEY_SENT_ACTION = "survey.sent";
export const SURVEY_RESPONSE_ACTION = "survey.response";
// عنوانٌ رفضه مزوّد البريد (غير صالح مثلاً): يُسجَّل بسببه فلا يُعاد إليه في كلّ نقرة
export const SURVEY_FAILED_ACTION = "survey.failed";

export type SurveyOption = { v: string; l: string };
export type SurveyQuestion =
  | { key: string; label: string; kind: "single" | "multi"; options: SurveyOption[] }
  | { key: string; label: string; kind: "text"; maxLength: number };

// الصياغة محايدة عمداً (طلب المالك): تسأل عن الحاجة والتجربة، ولا تقول «لم ترفع»
// ولا «لم تشترِ» ولا ما يُفهم منه أنّ ذلك أضرّ بنا.
export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  {
    key: "role",
    label: "ما أقرب وصفٍ لك؟",
    kind: "single",
    options: [
      { v: "researcher", l: "باحث أو طالب دراسات عليا" },
      { v: "editor", l: "محقّق تراث" },
      { v: "library", l: "مكتبة أو مركز أبحاث أو أرشيف" },
      { v: "publisher", l: "دار نشر" },
      { v: "other", l: "غير ذلك" },
    ],
  },
  {
    key: "material",
    label: "ما الذي تودّ تحويله إلى نصّ؟ (اختر كلّ ما ينطبق)",
    kind: "multi",
    options: [
      { v: "printed", l: "كتب مطبوعة" },
      { v: "heritage", l: "كتب تراث مصوّرة" },
      { v: "manuscripts", l: "مخطوطات بخطّ اليد" },
      { v: "theses", l: "رسائل وأبحاث علميّة" },
      { v: "periodicals", l: "مجلّات ومقالات" },
      { v: "other", l: "غير ذلك" },
    ],
  },
  {
    key: "size",
    label: "كم صفحة تقريباً فيما تحتاج تحويله الآن؟",
    kind: "single",
    options: [
      { v: "lt50", l: "أقلّ من ٥٠ صفحة" },
      { v: "50-200", l: "من ٥٠ إلى ٢٠٠ صفحة" },
      { v: "200-500", l: "من ٢٠٠ إلى ٥٠٠ صفحة" },
      { v: "gt500", l: "أكثر من ٥٠٠ صفحة" },
      { v: "none", l: "لا أحتاج الآن" },
    ],
  },
  {
    key: "frequency",
    label: "كم مرّة تحتاج خدمةً كهذه؟",
    kind: "single",
    options: [
      { v: "once", l: "مرّة واحدة" },
      { v: "yearly", l: "بضع مرّات في السنة" },
      { v: "monthly", l: "كلّ شهر تقريباً" },
      { v: "weekly", l: "كلّ أسبوع تقريباً" },
    ],
  },
  {
    key: "experience",
    label: "كيف كانت تجربتك مع وَرَّاق حتى الآن؟",
    kind: "single",
    options: [
      { v: "not_tried", l: "لم أرفع ملفّاً بعد" },
      { v: "below", l: "جرّبته والنتيجة دون ما توقّعت" },
      { v: "good", l: "جرّبته والنتيجة جيّدة" },
    ],
  },
  {
    key: "helps",
    label: "ما الذي يجعل وَرَّاق أنفع لك؟ (اختر كلّ ما ينطبق)",
    kind: "multi",
    options: [
      { v: "full_trial", l: "أن أجرّب كتابي كاملاً قبل أن أدفع" },
      { v: "card", l: "الدفع بمدى أو البطاقة أو Apple Pay" },
      { v: "lower_price", l: "أسعار أقلّ" },
      { v: "subscription", l: "اشتراك شهريّ ثابت" },
      { v: "manuscripts", l: "دقّة أعلى في المخطوطات" },
      { v: "guidance", l: "شرح أوضح لطريقة الاستعمال" },
      { v: "other", l: "غير ذلك" },
    ],
  },
  {
    key: "source",
    label: "كيف عرفت وَرَّاق؟",
    kind: "single",
    options: [
      { v: "google", l: "بحث في جوجل" },
      { v: "x", l: "منصّة X (تويتر)" },
      { v: "messaging", l: "واتساب أو تيليجرام" },
      { v: "referral", l: "صديق أو زميل" },
      { v: "other", l: "غير ذلك" },
    ],
  },
  {
    key: "comment",
    label: "هل من شيءٍ آخر تحبّ أن تخبرنا به؟ (اختياريّ)",
    kind: "text",
    maxLength: 1000,
  },
];

export type SurveyAnswers = Record<string, string | string[]>;

// ─── الرابط الشخصيّ ─────────────────────────────────────────
// معرّف المستخدم مع توقيعه، فيفتح الاستبيان بلا دخول ولا يُجاب به باسم غيره.
// المفتاح مشتقّ من AUTH_SECRET بلا متغيّر بيئة جديد، ولا يُشتقّ منه السرّ.
function surveyKey(): Buffer | null {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return createHash("sha256").update(`${secret}|survey`).digest();
}

export function surveyToken(userId: string): string | null {
  const key = surveyKey();
  if (!key) return null;
  const sig = createHmac("sha256", key)
    .update(`${SURVEY_ID}:${userId}`)
    .digest("base64url")
    .slice(0, 32);
  return `${userId}.${sig}`;
}

// يعيد معرّف المستخدم إن صحّ التوقيع، وإلا null
export function verifySurveyToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const expected = surveyToken(userId);
  if (!expected) return null;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? userId : null;
}

// ─── الأجوبة ────────────────────────────────────────────────
// لا يُقبل إلا خيارٌ معرَّف في الأسئلة. والسؤال الفرديّ مطلوب، والمتعدّد والنصّ اختياريّان.
export function parseSurveyAnswers(form: FormData): SurveyAnswers | null {
  const answers: SurveyAnswers = {};
  for (const q of SURVEY_QUESTIONS) {
    if (q.kind === "text") {
      const v = String(form.get(q.key) ?? "").trim().slice(0, q.maxLength);
      if (v) answers[q.key] = v;
      continue;
    }
    const allowed = new Set(q.options.map((o) => o.v));
    const picked = [...new Set(form.getAll(q.key).map(String))].filter((v) => allowed.has(v));
    if (q.kind === "single") {
      if (picked.length !== 1) return null;
      answers[q.key] = picked[0];
    } else if (picked.length) {
      answers[q.key] = picked;
    }
  }
  return answers;
}

export async function hasResponded(userId: string): Promise<boolean> {
  const row = await db.auditLog.findFirst({
    where: { userId, action: SURVEY_RESPONSE_ACTION, entityId: SURVEY_ID },
    select: { id: true },
  });
  return !!row;
}

// إجابة واحدة لكلّ مستخدم في الجولة — الإرسال الثاني لا يُكرّرها
export async function saveSurveyResponse(userId: string, answers: SurveyAnswers): Promise<void> {
  if (await hasResponded(userId)) return;
  await db.auditLog.create({
    data: {
      userId,
      action: SURVEY_RESPONSE_ACTION,
      entity: "survey",
      entityId: SURVEY_ID,
      metadata: answers as Prisma.InputJsonObject,
    },
  });
}

// ─── الجمهور ────────────────────────────────────────────────
export type SurveySegment = "not_uploaded" | "not_paid" | "all";

export const SURVEY_SEGMENTS: { v: SurveySegment; l: string }[] = [
  { v: "not_uploaded", l: "من سجّل ولم يرفع ملفّاً" },
  { v: "not_paid", l: "كلّ من لم يدفع" },
  { v: "all", l: "كلّ المستخدمين" },
];

export type SurveyRecipient = { id: string; name: string | null; email: string };

// من تصله الرسالة في الشريحة: المستخدمون وحدهم (لا المالك)، بلا من أُرسل إليه في
// هذه الجولة أو أجاب عنها أو رُفض عنوانه — فلا تصل الرسالة أحداً مرّتين.
export async function getSurveyAudience(segment: SurveySegment): Promise<SurveyRecipient[]> {
  const users = await db.user.findMany({
    where: { systemRole: "USER" },
    select: { id: true, name: true, email: true },
    orderBy: { createdAt: "asc" },
    take: 2000,
  });
  const ids = users.map((u) => u.id);

  const reached = await db.auditLog.findMany({
    where: {
      action: { in: [SURVEY_SENT_ACTION, SURVEY_RESPONSE_ACTION, SURVEY_FAILED_ACTION] },
      entityId: SURVEY_ID,
      userId: { in: ids },
    },
    select: { userId: true },
  });
  const exclude = new Set<string | null>(reached.map((r) => r.userId));

  if (segment === "not_uploaded") {
    const uploaded = await db.job.findMany({
      where: { userId: { in: ids } },
      select: { userId: true },
      distinct: ["userId"],
    });
    for (const r of uploaded) exclude.add(r.userId);
  } else if (segment === "not_paid") {
    // «دفع» كما في مسار التحويل: معاملة ناجحة أو شحنٌ معتمد
    const [paid, approved] = await Promise.all([
      db.transaction.findMany({
        where: { userId: { in: ids }, status: "SUCCEEDED" },
        select: { userId: true },
        distinct: ["userId"],
      }),
      db.topUpRequest.findMany({
        where: { userId: { in: ids }, status: "APPROVED" },
        select: { userId: true },
        distinct: ["userId"],
      }),
    ]);
    for (const r of [...paid, ...approved]) exclude.add(r.userId);
  }

  return users.filter((u) => !exclude.has(u.id));
}

// ─── النتائج ────────────────────────────────────────────────
export type SurveyResults = {
  sent: number;
  responded: number;
  counts: Record<string, Record<string, number>>;
  comments: { name: string | null; email: string; text: string; at: Date }[];
  failed: { email: string; error: string }[];
};

export async function getSurveyResults(): Promise<SurveyResults> {
  const [sent, rows, failedRows] = await Promise.all([
    db.auditLog.count({ where: { action: SURVEY_SENT_ACTION, entityId: SURVEY_ID } }),
    db.auditLog.findMany({
      where: { action: SURVEY_RESPONSE_ACTION, entityId: SURVEY_ID },
      orderBy: { createdAt: "desc" },
      select: { userId: true, metadata: true, createdAt: true },
    }),
    db.auditLog.findMany({
      where: { action: SURVEY_FAILED_ACTION, entityId: SURVEY_ID },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    }),
  ]);
  const failed = failedRows.map((r) => {
    const m = (r.metadata ?? {}) as { email?: unknown; error?: unknown };
    return { email: String(m.email ?? "—"), error: String(m.error ?? "") };
  });

  const userIds = rows.map((r) => r.userId).filter((id): id is string => !!id);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, systemRole: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));

  const counts: SurveyResults["counts"] = {};
  const comments: SurveyResults["comments"] = [];
  let responded = 0;

  for (const r of rows) {
    const user = r.userId ? byId.get(r.userId) : undefined;
    // معاينة المالك لا تُحتسب
    if (!user || user.systemRole !== "USER") continue;
    responded++;
    const answers = (r.metadata ?? {}) as unknown as SurveyAnswers;
    for (const q of SURVEY_QUESTIONS) {
      const value = answers[q.key];
      if (value == null) continue;
      if (q.kind === "text") {
        if (typeof value === "string") {
          comments.push({ name: user.name, email: user.email, text: value, at: r.createdAt });
        }
        continue;
      }
      const bucket = (counts[q.key] ??= {});
      for (const v of Array.isArray(value) ? value : [value]) bucket[v] = (bucket[v] ?? 0) + 1;
    }
  }

  return { sent, responded, counts, comments, failed };
}
