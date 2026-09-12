// src/lib/verification.ts — رمز تحقّق البريد لتفعيل الحسابات الجديدة
//
// يستعمل جدول VerificationToken القائم (identifier/token/expires) — **بلا جداول
// جديدة ولا تغيير في المخطّط**. الرمز نفسه لا يُخزَّن قطّ: نخزّن بصمته (SHA-256 مع
// البريد) فلا يُقرأ من قاعدة البيانات ولا يتصادم بين المستخدمين رغم قِصَره، ولأنّ
// حقل token فريد فالتصادم بين حسابين على نفس الرمز مستحيل.
//
// حدود المحاولات والإرسال تُحتسب من AuditLog (موجود ومفهرَس على action وcreatedAt)
// — لا حاجة لتخزين عدّادات جديدة.
import { createHash, randomInt, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { CODE_LENGTH } from "@/lib/verification-shared";

export { CODE_LENGTH };
export const CODE_TTL_MINUTES = 15;

// حدود مضادّة للتخمين وللإغراق — رمز من ٦ خانات يحتاج حماية من المحاولات المتكرّرة
const MAX_ATTEMPTS = 6; // محاولات فاشلة لكلّ بريد
const ATTEMPT_WINDOW_MIN = 15;
const MAX_SENDS = 5; // رسائل رمز لكلّ بريد
const SEND_WINDOW_MIN = 60;

export const ACTIONS = {
  sent: "auth.verify_sent",
  failed: "auth.verify_failed",
  verified: "auth.verify_ok",
} as const;

// رمز عشوائيّ آمن تشفيريّاً (randomInt وليس Math.random)
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

// البصمة تربط الرمز ببريده، فرمز صالح لبريدٍ لا يصلح لغيره
function fingerprint(email: string, code: string): string {
  return createHash("sha256").update(`${email.toLowerCase().trim()}:${code}`).digest("hex");
}

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60_000);
}

async function countSince(action: string, email: string, since: Date): Promise<number> {
  return db.auditLog.count({
    where: { action, entity: "email", entityId: email.toLowerCase().trim(), createdAt: { gte: since } },
  });
}

async function log(action: string, email: string, userId?: string | null): Promise<void> {
  await db.auditLog
    .create({
      data: {
        userId: userId ?? null,
        action,
        entity: "email",
        entityId: email.toLowerCase().trim(),
      },
    })
    .catch(() => {});
}

// هل تجاوز هذا البريد حدّ الإرسال؟ (إغراق صندوق الوارد / استنزاف حصّة البريد)
export async function sendLimitReached(email: string): Promise<boolean> {
  return (await countSince(ACTIONS.sent, email, minutesAgo(SEND_WINDOW_MIN))) >= MAX_SENDS;
}

// هل تجاوز هذا البريد حدّ المحاولات الفاشلة؟ (تخمين الرمز)
export async function attemptLimitReached(email: string): Promise<boolean> {
  return (await countSince(ACTIONS.failed, email, minutesAgo(ATTEMPT_WINDOW_MIN))) >= MAX_ATTEMPTS;
}

// يُصدر رمزاً جديداً ويُبطل ما سبقه لنفس البريد — فلا يبقى إلّا آخر رمز صالحاً.
export async function issueCode(email: string, userId?: string | null): Promise<string> {
  const identifier = email.toLowerCase().trim();
  const code = generateCode();
  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: {
      identifier,
      token: fingerprint(identifier, code),
      expires: new Date(Date.now() + CODE_TTL_MINUTES * 60_000),
    },
  });
  await log(ACTIONS.sent, identifier, userId);
  return code;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "too_many" };

// يتحقّق من الرمز ويستهلكه عند النجاح (استعمال واحد فقط).
// المقارنة بزمن ثابت (timingSafeEqual) فلا تُسرّب بصمة الرمز عبر فروق التوقيت.
export async function verifyCode(email: string, code: string): Promise<VerifyResult> {
  const identifier = email.toLowerCase().trim();
  if (await attemptLimitReached(identifier)) return { ok: false, reason: "too_many" };

  const rows = await db.verificationToken.findMany({ where: { identifier } });
  const expected = fingerprint(identifier, code.trim());
  const expectedBuf = Buffer.from(expected, "hex");
  const match = rows.find((r) => {
    const buf = Buffer.from(r.token, "hex");
    return buf.length === expectedBuf.length && timingSafeEqual(buf, expectedBuf);
  });

  if (!match) {
    await log(ACTIONS.failed, identifier);
    return { ok: false, reason: "invalid" };
  }
  if (match.expires.getTime() < Date.now()) {
    await db.verificationToken.deleteMany({ where: { identifier } });
    await log(ACTIONS.failed, identifier);
    return { ok: false, reason: "expired" };
  }

  // استهلاك: يُحذف الرمز فور نجاحه فلا يُعاد استعماله
  await db.verificationToken.deleteMany({ where: { identifier } });
  await log(ACTIONS.verified, identifier);
  return { ok: true };
}
