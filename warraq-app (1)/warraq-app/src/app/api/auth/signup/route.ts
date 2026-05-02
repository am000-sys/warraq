// src/app/api/auth/signup/route.ts
// ─────────────────────────
// تسجيل مستخدم جديد
// ─────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(2).max(80),
});

const FREE_INITIAL_PAGES = 10;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = signupSchema.parse(body);

    // فحص عدم وجود الحساب مسبقاً
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مسجّل مسبقاً" },
        { status: 409 }
      );
    }

    // إنشاء الحساب
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        pagesBalance: FREE_INITIAL_PAGES,
      },
      select: { id: true, email: true, name: true, pagesBalance: true },
    });

    // تسجيل في AuditLog
    await db.auditLog.create({
      data: {
        userId: user.id,
        action: "user.signup",
        entity: "user",
        entityId: user.id,
        ipAddress: req.headers.get("x-forwarded-for") ?? null,
      },
    });

    return NextResponse.json({ user });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json(
        { error: "بيانات غير صالحة", details: err.errors },
        { status: 400 }
      );
    }
    console.error("[signup]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}
