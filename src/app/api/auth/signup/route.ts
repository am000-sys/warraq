// src/app/api/auth/signup/route.ts
// ─────────────────────────
// تسجيل مستخدم جديد — يُنشأ الحساب **غير مفعَّل** ويُرسَل رمز تحقّق إلى بريده.
// لا دخول قبل التفعيل: authorize في auth.ts يرفض الحساب غير المفعَّل.
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
import { queueEmail, verificationCodeEmail } from "@/lib/email";
import { issueCode, sendLimitReached, CODE_TTL_MINUTES } from "@/lib/verification";
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

    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });

    // حساب قائم ومفعَّل: لا إنشاء ولا رمز — وجّهه للدخول
    if (existing?.emailVerified) {
      return NextResponse.json({ error: "البريد الإلكتروني مسجّل مسبقاً" }, { status: 409 });
    }

    if (await sendLimitReached(email)) {
      return NextResponse.json(
        { error: "أُرسلت رموز كثيرة لهذا البريد. انتظر قليلاً ثمّ أعد المحاولة." },
        { status: 429 },
      );
    }

    const passwordHash = await hashPassword(password);

    // حساب قائم لكنّه غير مفعَّل (سجّل ولم يُكمل): نُحدّث بياناته بدل رفضه —
    // فلا يعلق البريد محجوزاً بحساب لم يُستعمل قطّ.
    const user = existing
      ? await db.user.update({
          where: { id: existing.id },
          data: { name, passwordHash },
          select: { id: true, email: true, name: true },
        })
      : await db.user.create({
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

    // رمز التفعيل (رسالة الترحيب تُرسَل بعد التفعيل، لا قبله)
    const code = await issueCode(email, user.id);
    queueEmail(
      { to: email, ...verificationCodeEmail(user.name ?? "", code, CODE_TTL_MINUTES) },
      "verify-code",
    );

    return NextResponse.json({ verificationRequired: true, email });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: err.errors },
        { status: 400 },
      );
    }
    console.error("[signup]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}
