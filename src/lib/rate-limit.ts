// src/lib/rate-limit.ts — حدّ المعدّل حسب عنوان الـ IP لمسارات المصادقة
//
// لماذا؟ كلّ حدود المشروع السابقة كانت **حسب البريد**، فمهاجم يُبدّل العنوان في
// كلّ طلب لا يصطدم بشيء. وكلّ طلب تسجيل يُكلّف — قبل أيّ رمز تحقّق — تجزئةَ كلمة
// مرور (bcrypt، بطيئة عمداً)، وصفّاً في القاعدة، ورسالةَ بريد من الحصّة. وإغراق
// عناوين لا تُفتح يحرق سمعة النطاق فيذهب البريد كلّه إلى المزعج.
//
// التنفيذ يستعمل AuditLog القائم (مفهرَس على action وcreatedAt) — **بلا جداول
// جديدة** ولا مخزن في الذاكرة (لا يصمد عبر دوالّ serverless المتعدّدة أصلاً).
//
// ترتيب الاستدعاء مقصود: يُنادى **أوّل** المسار، قبل أيّ عمل مكلِف.
import { NextRequest } from "next/server";
import { db } from "@/lib/db";

// حدود مُعايَرة: تسمح للاستعمال الطبيعيّ (بيت أو مكتب خلف عنوان واحد) وتُوقف
// الإغراق. المهاجم يحتاج آلاف الطلبات ليؤذي، والمستخدم الصادق يحتاج طلباً أو اثنين.
export const LIMITS = {
  signup: { action: "rl.signup", max: 10, windowMin: 60 },
  resendCode: { action: "rl.resend_code", max: 8, windowMin: 60 },
  verifyEmail: { action: "rl.verify_email", max: 30, windowMin: 15 },
  forgotPassword: { action: "rl.forgot_password", max: 8, windowMin: 60 },
} as const;

export type LimitSpec = { action: string; max: number; windowMin: number };

export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// يفحص الحدّ ويُسجّل المحاولة. يعيد true إن تجاوز الحدّ (فيُرفض الطلب).
//
// عند التجاوز **لا نُسجّل** صفّاً جديداً: النافذة تحوي ما يكفي لمواصلة الرفض،
// فلا ينتفخ AuditLog تحت هجوم مستمرّ. وتنتهي النافذة من تلقائها.
export async function hitRateLimit(
  req: NextRequest,
  spec: LimitSpec,
): Promise<boolean> {
  const ip = clientIp(req);
  // عنوان مجهول: لا نحجب المستخدمين الصادقين بسببه (بيئات لا تُمرّر الترويسة)
  if (ip === "unknown") return false;

  const since = new Date(Date.now() - spec.windowMin * 60_000);
  try {
    const count = await db.auditLog.count({
      where: { action: spec.action, ipAddress: ip, createdAt: { gte: since } },
    });
    if (count >= spec.max) return true;

    await db.auditLog.create({
      data: { action: spec.action, entity: "ip", entityId: ip, ipAddress: ip },
    });
    return false;
  } catch {
    // تعذّر الفحص (قاعدة غير متاحة) — لا نحجب المستخدم الصادق بسبب عطل لدينا
    return false;
  }
}

export const TOO_MANY_MESSAGE =
  "محاولات كثيرة من هذا الاتّصال. انتظر قليلاً ثمّ أعد المحاولة.";
