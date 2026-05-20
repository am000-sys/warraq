// src/app/api/api-keys/route.ts
// إنشاء وإدارة مفاتيح API — الإنشاء مقصور على مالك النظام فقط.
// المستخدم يشتري مفتاحاً من المالك (خارج النظام)، ثمّ يُنشئ له المالك مفتاحاً.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(2).max(60),
  userEmail: z.string().email(), // المستخدم الذي يُمنَح المفتاح
  expiresInDays: z.number().int().positive().optional(),
});

// ─── POST: إنشاء مفتاح (مالك النظام فقط) ──────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json(
      { error: "إنشاء المفاتيح متاح لمالك النظام فقط. تواصل مع الإدارة لشراء مفتاح." },
      { status: 403 },
    );
  }

  try {
    const data = createSchema.parse(await req.json());

    const targetUser = await db.user.findUnique({
      where: { email: data.userEmail.toLowerCase() },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "لا يوجد مستخدم بهذا البريد" }, { status: 404 });
    }

    const rawKey = `wq_pk_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.substring(0, 14);
    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await db.apiKey.create({
      data: {
        name: data.name,
        keyHash,
        keyPrefix,
        userId: targetUser.id,
        expiresAt,
      },
      select: { id: true, name: true, keyPrefix: true, expiresAt: true, createdAt: true },
    });

    return NextResponse.json({
      apiKey: { ...apiKey, key: rawKey, userEmail: targetUser.email },
      warning: "احفظ هذا المفتاح وسلّمه للمستخدم الآن — لن يُعرض ثانيةً.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("[create api-key]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}

// ─── GET: قائمة المفاتيح ──────────────────────────
// المالك يرى كلّ المفاتيح؛ المستخدم العادي يرى مفاتيحه فقط.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const isAdmin = session.user.systemRole === "SYSTEM_ADMIN";

  const keys = await db.apiKey.findMany({
    where: isAdmin ? {} : { userId: session.user.id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
      user: isAdmin ? { select: { email: true } } : false,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys, isAdmin });
}

// ─── DELETE: إلغاء مفتاح (المالك فقط) ─────────────
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });
  }

  const keyId = new URL(req.url).searchParams.get("id");
  if (!keyId) return NextResponse.json({ error: "معرّف مفقود" }, { status: 400 });

  await db.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
