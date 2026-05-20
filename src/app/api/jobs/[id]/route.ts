// src/app/api/jobs/[id]/route.ts — حالة وظيفة واحدة (للـ polling)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const job = await db.job.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      fileName: true,
      status: true,
      totalPages: true,
      processedPages: true,
      errorMessage: true,
    },
  });

  if (!job) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (job.userId !== session.user.id && session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });
  }

  return NextResponse.json({ job });
}
