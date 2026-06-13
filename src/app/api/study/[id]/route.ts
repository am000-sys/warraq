// src/app/api/study/[id]/route.ts — جلب ملخّص واحد (بمتنه) + حذفه
// الحذف قبل الاكتمال يستردّ ما خُصم تلقائياً (لا خصم بلا ملخّص مُسلَّم).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancelStudyBatch } from "@/lib/study";

export const runtime = "nodejs";

async function ownedSummary(id: string, userId: string, isAdmin: boolean) {
  const rec = await db.studySummary.findUnique({ where: { id } });
  if (!rec) return null;
  if (rec.userId !== userId && !isAdmin) return "forbidden" as const;
  return rec;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  const rec = await ownedSummary(id, session.user.id, session.user.systemRole === "SYSTEM_ADMIN");
  if (!rec) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (rec === "forbidden") return NextResponse.json({ error: "ممنوع" }, { status: 403 });

  // لا نعيد sourceText (قد يكون ضخماً) — يكفي المتن الناتج وبياناته
  const { sourceText: _omit, ...rest } = rec;
  return NextResponse.json({ summary: rest });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  const rec = await ownedSummary(id, session.user.id, session.user.systemRole === "SYSTEM_ADMIN");
  if (!rec) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (rec === "forbidden") return NextResponse.json({ error: "ممنوع" }, { status: 403 });

  // إن كانت دفعة قيد المعالجة لدى المزوّد، ألغِها (إيقاف أيّ كلفة متبقّية)
  if (rec.status === "PROCESSING") {
    const v = rec.verification;
    const batchId =
      v && typeof v === "object" && "batchId" in v ? String((v as { batchId?: unknown }).batchId ?? "") : "";
    if (batchId) await cancelStudyBatch(batchId);
  }

  // استرداد ما خُصم إن لم يُسلَّم الملخّص (فشل أو عالق) — داخل معاملة واحدة
  const refund = rec.status !== "COMPLETED" ? rec.pagesCharged : 0;
  await db.$transaction(async (tx) => {
    if (refund > 0) {
      await tx.user.update({
        where: { id: rec.userId },
        data: { pagesBalance: { increment: refund } },
      });
    }
    await tx.studySummary.delete({ where: { id } });
  });

  await db.auditLog
    .create({
      data: {
        userId: session.user.id,
        action: "study.deleted",
        entity: "study_summary",
        entityId: id,
        metadata: { refunded: refund },
      },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true, refunded: refund });
}
