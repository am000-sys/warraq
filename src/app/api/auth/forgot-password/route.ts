// src/app/api/auth/forgot-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { sendEmail, passwordResetEmail, APP_URL } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

export async function POST(req: NextRequest) {
  try {
    const { email } = schema.parse(await req.json());

    const user = await db.user.findUnique({ where: { email } });

    // ردّ موحَّد سواء وُجد المستخدم أم لا (لمنع تعداد الحسابات)
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600 * 1000); // ساعة

    await db.passwordReset.create({
      data: { email, token, expires },
    });

    const url = `${APP_URL}/reset-password?token=${token}`;
    await sendEmail({
      to: email,
      ...passwordResetEmail(user.name ?? "مستخدم", url),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}
