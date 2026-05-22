// src/app/api/topup/[id]/route.ts — اعتماد/رفض طلب شحن (المالك فقط)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail, topupApprovedEmail } from "@/lib/email";

const schema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().max(300).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });
  }

  try {
    const { action, note } = schema.parse(await req.json());
    const request = await db.topUpRequest.findUnique({ where: { id } });
    if (!request) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
    if (request.status !== "PENDING") {
      return NextResponse.json({ error: "الطلب مُعالَج مسبقاً" }, { status: 409 });
    }

    if (action === "approve") {
      // إضافة الصفحات لرصيد المستخدم + تحديث الطلب + سجلّ معاملة
      await db.$transaction([
        db.user.update({
          where: { id: request.userId },
          data: { pagesBalance: { increment: request.pages } },
        }),
        db.topUpRequest.update({
          where: { id },
          data: { status: "APPROVED", reviewedAt: new Date(), note },
        }),
        db.transaction.create({
          data: {
            userId: request.userId,
            amountSar: request.amountSar,
            pagesGranted: request.pages,
            type: "ONE_TIME",
            status: "SUCCEEDED",
            gateway: "TAP", // حوالة يدويّة — نسجّلها كدفعة ناجحة
            description: `شحن يدوي (حوالة) — ${request.pages} صفحة`,
          },
        }),
      ]);

      // إشعار المستخدم بالاعتماد (يُتجاهَل إن لم يُضبط Resend)
      const u = await db.user.findUnique({
        where: { id: request.userId },
        select: { email: true, name: true },
      });
      if (u) {
        sendEmail({ to: u.email, ...topupApprovedEmail(u.name ?? "", request.pages) }).catch(
          () => {},
        );
      }
    } else {
      await db.topUpRequest.update({
        where: { id },
        data: { status: "REJECTED", reviewedAt: new Date(), note },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("[topup.review]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}
