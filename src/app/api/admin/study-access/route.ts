// src/app/api/admin/study-access/route.ts — فتح الملخّص الدراسي للجميع أو قصره على المالك
//
// وضع التجربة الداخليّة: الميزة تعمل للمالك وحده ويرى غيرُه «قريباً». الفتح قرارٌ
// يُتّخذ بعد تجربة الجودة على مستندات حقيقيّة، فيُتاح بنقرة من اللوحة بدل تعديل
// متغيّر بيئة وإعادة نشر.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { STUDY_KEYS } from "@/lib/study";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "للمالك فقط" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { ownerOnly?: unknown };
  if (typeof body.ownerOnly !== "boolean") {
    return NextResponse.json({ error: "قيمة غير صالحة" }, { status: 400 });
  }
  const ownerOnly = body.ownerOnly;

  await db.systemSetting.upsert({
    where: { key: STUDY_KEYS.ownerOnly },
    create: {
      key: STUDY_KEYS.ownerOnly,
      value: ownerOnly,
      description: "الملخّص الدراسي: تجربة داخليّة للمالك وحده",
    },
    update: { value: ownerOnly },
  });
  await db.auditLog
    .create({
      data: {
        userId: session.user.id,
        action: ownerOnly ? "study.closed_to_owner" : "study.opened_to_all",
        entity: "system_setting",
        entityId: STUDY_KEYS.ownerOnly,
      },
    })
    .catch(() => {});

  return NextResponse.json({ ownerOnly });
}
