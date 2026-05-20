// src/app/api/jobs/route.ts — إنشاء وقائمة الوظائف
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const createSchema = z.object({
  storageKey: z.string().min(1),
  fileName: z.string().min(1).max(500),
  fileSize: z.number().int().positive(),
  model: z.enum(["HAIKU", "SONNET", "OPUS"]),
  orgId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  try {
    const data = createSchema.parse(await req.json());

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { pagesBalance: true },
    });
    if (!user) {
      return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 404 });
    }

    // تقدير عدد الصفحات (سيُحدَّث عند المعالجة)
    const estimatedPages = 1;
    if (user.pagesBalance < estimatedPages) {
      return NextResponse.json(
        {
          error: "رصيد غير كافٍ",
          required: estimatedPages,
          available: user.pagesBalance,
        },
        { status: 402 },
      );
    }

    const checksum = "pending"; // يُحسَب عند المعالجة الفعليّة
    const job = await db.job.create({
      data: {
        userId: session.user.id,
        orgId: data.orgId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileChecksum: checksum,
        storageKey: data.storageKey,
        totalPages: 0, // يُحسَب بعد PDF→images
        model: data.model,
        status: "PENDING",
      },
      select: { id: true, fileName: true, status: true },
    });

    return NextResponse.json({ job });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "بيانات غير صالحة" },
        { status: 400 },
      );
    }
    console.error("[jobs.POST]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 100);

  const jobs = await db.job.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      fileName: true,
      totalPages: true,
      processedPages: true,
      status: true,
      model: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ jobs });
}
