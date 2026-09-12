// src/app/api/auth/resend-code/route.ts — إعادة إرسال رمز التفعيل
//
// يُعيد الردّ نفسه دائماً أيّاً كانت حال البريد (غير مسجّل / مفعَّل / غير مفعَّل)،
// فلا يكشف أيّ بريد مسجّل في المنصّة لمن يجرّب العناوين.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  hitRateLimit,
  LIMITS,
  TOO_MANY_MESSAGE,
} from "@/lib/rate-limit";
import { queueEmail, verificationCodeEmail } from "@/lib/email";
import { issueCode, sendLimitReached, CODE_TTL_MINUTES } from "@/lib/verification";

const schema = z.object({ email: z.string().email() });

// ردّ محايد موحّد — لا يفرّق بين الحالات
const NEUTRAL = {
  sent: true,
  message: "إن كان البريد مسجّلاً وغير مفعَّل، فقد أُرسل إليه رمز جديد.",
};

export async function POST(req: NextRequest) {
  // حدّ المعدّل حسب الـ IP — أوّل شيء، قبل أيّ عمل مكلِف
  // (تجزئة كلمة المرور، الكتابة في القاعدة، إرسال البريد)
  if (await hitRateLimit(req, LIMITS.resendCode)) {
    return NextResponse.json({ error: TOO_MANY_MESSAGE }, { status: 429 });
  }

  try {
    const { email: rawEmail } = schema.parse(await req.json());
    const email = rawEmail.toLowerCase().trim();

    const user = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, emailVerified: true },
    });

    // لا حساب، أو مفعَّل أصلاً، أو بلغ حدّ الإرسال ⇒ نفس الردّ بلا إرسال
    if (!user || user.emailVerified || (await sendLimitReached(email))) {
      return NextResponse.json(NEUTRAL);
    }

    const code = await issueCode(email, user.id);
    queueEmail(
      { to: email, ...verificationCodeEmail(user.name ?? "", code, CODE_TTL_MINUTES) },
      "verify-code-resend",
    );
    return NextResponse.json(NEUTRAL);
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "بريد غير صالح" }, { status: 400 });
    }
    console.error("[resend-code]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}
