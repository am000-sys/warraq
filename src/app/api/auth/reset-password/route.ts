// src/app/api/auth/reset-password/route.ts

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(72),
});

export async function POST(req: NextRequest) {
  try {
    const { token, password } = schema.parse(await req.json());

    const reset = await db.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.used || reset.expires < new Date()) {
      return NextResponse.json({ error: "رابط غير صالح أو منتهي" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db.$transaction([
      db.user.update({
        where: { email: reset.email },
        data: { passwordHash },
      }),
      db.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}
