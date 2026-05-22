// src/app/api/account/delete/route.ts — حذف الحساب نهائياً
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  // مالك النظام لا يُحذف من هنا (حماية)
  if (session.user.systemRole === "SYSTEM_ADMIN") {
    return NextResponse.json(
      { error: "لا يمكن حذف حساب المالك من هنا." },
      { status: 403 },
    );
  }

  const userId = session.user.id;

  // حذف البيانات المرتبطة ثمّ المستخدم
  await db.$transaction([
    db.jobPage.deleteMany({ where: { job: { userId } } }),
    db.job.deleteMany({ where: { userId } }),
    db.apiKey.deleteMany({ where: { userId } }),
    db.transaction.deleteMany({ where: { userId } }),
    db.topUpRequest.deleteMany({ where: { userId } }),
    db.session.deleteMany({ where: { userId } }),
    db.account.deleteMany({ where: { userId } }),
    db.user.delete({ where: { id: userId } }),
  ]);

  return NextResponse.json({ ok: true });
}
