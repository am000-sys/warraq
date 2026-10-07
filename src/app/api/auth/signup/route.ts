// src/app/api/auth/signup/route.ts
// ─────────────────────────
// تسجيل مستخدم جديد — يُنشأ الحساب ويدخل صاحبه فوراً بلا رمز تفعيل
// (اشتراط الرمز كان يُسرّب مستخدمين عند هذه الخطوة).
// يبقى emailVerified فارغاً لأنّ ملكيّة البريد لم تُثبَت — وعليه يقوم حارس
// ربط Google في auth.ts (events.signIn).
// ─────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/password";
import { db } from "@/lib/db";
import {
  hitRateLimit,
  clientIp,
  LIMITS,
  TOO_MANY_MESSAGE,
} from "@/lib/rate-limit";
import {
  verifyTurnstile,
  isTurnstileConfigured,
  TURNSTILE_FAILED_MESSAGE,
} from "@/lib/turnstile";
import { queueEmail, welcomeEmail } from "@/lib/email";
import { FREE_INITIAL_PAGES } from "@/lib/billing";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(2).max(80),
  // رمز التحدّي البشريّ — اختياريّ في المخطّط لأنّ الميزة قد تكون موقوفة
  turnstileToken: z.string().optional(),
});


export async function POST(req: NextRequest) {
  // حدّ المعدّل حسب الـ IP — أوّل شيء، قبل أيّ عمل مكلِف
  // (تجزئة كلمة المرور، الكتابة في القاعدة، إرسال البريد)
  if (await hitRateLimit(req, LIMITS.signup)) {
    return NextResponse.json({ error: TOO_MANY_MESSAGE }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = signupSchema.parse(body);

    // التحدّي البشريّ — بعد حدّ المعدّل وقبل التجزئة والكتابة والإرسال.
    // لا أثر له إطلاقاً ما لم يُضبط مفتاحاه (isTurnstileConfigured).
    if (isTurnstileConfigured) {
      const check = await verifyTurnstile(parsed.turnstileToken, clientIp(req));
      if (!check.ok) {
        return NextResponse.json({ error: TURNSTILE_FAILED_MESSAGE }, { status: 400 });
      }
    }

    const email = parsed.email.toLowerCase().trim();
    const { password, name } = parsed;

    // أيّ حساب قائم — مفعَّلاً أو لا — يُرفض: الحساب غير المفعَّل صار حساباً
    // مستعمَلاً يدخله صاحبه، فالكتابة فوق كلمة مروره استيلاءٌ عليه.
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجّل مسبقاً" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: { email, name, passwordHash, pagesBalance: FREE_INITIAL_PAGES },
      select: { id: true, email: true, name: true },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "user.signup",
        entity: "user",
        entityId: user.id,
        ipAddress: req.headers.get("x-forwarded-for") ?? null,
      },
    });

    queueEmail({ to: email, ...welcomeEmail(user.name ?? "") }, "welcome");

    return NextResponse.json({ ok: true, email });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: err.errors },
        { status: 400 },
      );
    }
    // طلبان متزامنان على البريد نفسه: الثاني يصطدم بالقيد الفريد
    if ((err as { code?: string })?.code === "P2002") {
      return NextResponse.json({ error: "البريد الإلكتروني مسجّل مسبقاً" }, { status: 409 });
    }
    console.error("[signup]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}
