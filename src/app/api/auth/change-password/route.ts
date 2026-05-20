// src/app/api/auth/change-password/route.ts — تغيير كلمة المرور
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "كلمة المرور الجديدة ٨ أحرف على الأقل"),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  try {
    const body = schema.parse(await req.json());

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: "لا توجد كلمة مرور للحساب" },
        { status: 400 },
      );
    }

    // تحقّق من كلمة المرور الحاليّة
    const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "كلمة المرور الحاليّة غير صحيحة" },
        { status: 400 },
      );
    }

    // hash جديد للكلمة الجديدة
    const newHash = await bcrypt.hash(body.newPassword, 10);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 },
      );
    }
    console.error("[change-password]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}
