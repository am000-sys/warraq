// src/app/api/admin/init/route.ts
// تهيئة الجداول الإضافيّة (TopUpRequest, TrialUsage, StudySummary) — للمالك فقط.
// يحلّ مشكلة الجداول المفقودة دون الحاجة لتشغيل SQL يدوياً في Supabase.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function runInit() {
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

  // جدول الملخّص الدراسي — متوافق مع مخطّط Prisma (مع DEFAULT احتياطيّ على
  // updatedAt). enum "JobStatus" موجود سلفاً لأنّ جدول Job يستعمله منذ البداية.
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "StudySummary" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "sourceJobId" TEXT,
      "sourceText" TEXT,
      "sourcePages" INTEGER NOT NULL DEFAULT 0,
      "focus" TEXT[],
      "depth" TEXT NOT NULL DEFAULT 'balanced',
      "model" TEXT NOT NULL,
      "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
      "markdown" TEXT,
      "verification" JSONB,
      "pagesCharged" INTEGER NOT NULL DEFAULT 0,
      "inputTokens" INTEGER NOT NULL DEFAULT 0,
      "outputTokens" INTEGER NOT NULL DEFAULT 0,
      "errorMessage" TEXT,
      "startedAt" TIMESTAMP(3),
      "completedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StudySummary_pkey" PRIMARY KEY ("id")
    );
  `);
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "StudySummary_userId_createdAt_idx" ON "StudySummary"("userId", "createdAt");`,
  );
  await db.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "StudySummary_status_idx" ON "StudySummary"("status");`,
  );
  // ربط المستخدم بحذف تتابعي — يُضاف مرّة واحدة فقط
  await db.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'StudySummary_userId_fkey'
      ) THEN
        ALTER TABLE "StudySummary"
          ADD CONSTRAINT "StudySummary_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "User"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
}

async function handle(): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "ممنوع — للمالك فقط" }, { status: 403 });
  }
  try {
    await runInit();
    return NextResponse.json({ ok: true, message: "تمّ تجهيز الجداول بنجاح ✓" });
  } catch (err) {
    console.error("[admin.init]", err);
    return NextResponse.json(
      { error: "فشل التجهيز: " + (err as Error).message?.slice(0, 200) },
      { status: 500 },
    );
  }
}

// يمكن استدعاؤها بـ GET (فتح الرابط مباشرةً) أو POST (الزرّ)
export async function GET() {
  return handle();
}

export async function POST() {
  return handle();
}

