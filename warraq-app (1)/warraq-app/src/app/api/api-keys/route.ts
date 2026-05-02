// src/app/api/api-keys/route.ts
// ─────────────────────────
// إنشاء وإدارة مفاتيح API للمطوّرين
// ─────────────────────────

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { auth, requireOrgRole } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  name: z.string().min(2).max(60),
  orgId: z.string().optional(),
  expiresInDays: z.number().int().positive().optional(),
});

// ─── POST: إنشاء مفتاح ────────────────────────
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const userId = (session.user as any).id;

  try {
    const data = createSchema.parse(await req.json());

    if (data.orgId) {
      try {
        await requireOrgRole(userId, data.orgId, ["OWNER", "ADMIN"]);
      } catch {
        return NextResponse.json({ error: "ممنوع" }, { status: 403 });
      }
    }

    // توليد المفتاح: wq_pk_<32 bytes hex>
    const rawKey = `wq_pk_${randomBytes(32).toString("hex")}`;
    const keyHash = createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = rawKey.substring(0, 14); // wq_pk_xxxxxxxx

    const expiresAt = data.expiresInDays
      ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await db.apiKey.create({
      data: {
        name: data.name,
        keyHash,
        keyPrefix,
        userId: data.orgId ? null : userId,
        orgId: data.orgId,
        expiresAt,
      },
      select: { id: true, name: true, keyPrefix: true, expiresAt: true, createdAt: true },
    });

    // المفتاح الكامل يُرجَع مرّة واحدة فقط هنا
    return NextResponse.json({
      apiKey: { ...apiKey, key: rawKey },
      warning: "احفظ هذا المفتاح الآن — لن يُعرض مرّة أخرى.",
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("[create api-key]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}

// ─── GET: قائمة المفاتيح ──────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const userId = (session.user as any).id;
  const url = new URL(req.url);
  const orgId = url.searchParams.get("orgId");

  if (orgId) {
    try {
      await requireOrgRole(userId, orgId);
    } catch {
      return NextResponse.json({ error: "ممنوع" }, { status: 403 });
    }
  }

  const keys = await db.apiKey.findMany({
    where: orgId ? { orgId } : { userId },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      lastUsedAt: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ keys });
}

// ─── DELETE: إلغاء مفتاح ──────────────────────
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const userId = (session.user as any).id;
  const url = new URL(req.url);
  const keyId = url.searchParams.get("id");

  if (!keyId) return NextResponse.json({ error: "معرّف مفقود" }, { status: 400 });

  const key = await db.apiKey.findUnique({ where: { id: keyId } });
  if (!key) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  // التحقّق من الملكية
  if (key.userId === userId) {
    // المفتاح شخصي
  } else if (key.orgId) {
    try {
      await requireOrgRole(userId, key.orgId, ["OWNER", "ADMIN"]);
    } catch {
      return NextResponse.json({ error: "ممنوع" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });
  }

  await db.apiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
