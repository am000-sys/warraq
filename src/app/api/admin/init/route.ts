// src/app/api/admin/init/route.ts
// تهيئة الجداول الإضافيّة (TopUpRequest, TrialUsage) — للمالك فقط.
// يحلّ مشكلة الجداول المفقودة دون الحاجة لتشغيل SQL يدوياً في Supabase.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });
  }

  try {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TopUpRequest" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "packageId" TEXT NOT NULL,
        "pages" INTEGER NOT NULL,
        "amountSar" INTEGER NOT NULL,
        "senderName" TEXT NOT NULL,
        "receiptImage" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "note" TEXT,
        "reviewedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TopUpRequest_pkey" PRIMARY KEY ("id")
      );
    `);
    await db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "TopUpRequest_status_idx" ON "TopUpRequest"("status");`,
    );
    await db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "TopUpRequest_userId_idx" ON "TopUpRequest"("userId");`,
    );
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "TrialUsage" (
        "ip" TEXT NOT NULL,
        "count" INTEGER NOT NULL DEFAULT 0,
        "lastAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TrialUsage_pkey" PRIMARY KEY ("ip")
      );
    `);

    return NextResponse.json({ ok: true, message: "تمّ تجهيز الجداول بنجاح." });
  } catch (err) {
    console.error("[admin.init]", err);
    return NextResponse.json(
      { error: "فشل التجهيز: " + (err as Error).message?.slice(0, 200) },
      { status: 500 },
    );
  }
}
