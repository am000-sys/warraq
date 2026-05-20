// src/app/api/tap/webhook/route.ts — استقبال أحداث Tap
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { retrieveTapCharge, isTapConfigured } from "@/lib/tap";

export async function POST(req: NextRequest) {
  if (!isTapConfigured) {
    return NextResponse.json({ error: "غير مُعَدّ" }, { status: 503 });
  }

  try {
    const body = await req.json();
    const chargeId = body?.id;
    if (!chargeId) return NextResponse.json({ error: "ناقص" }, { status: 400 });

    // التحقّق من حالة العمليّة مباشرة من Tap (أكثر أماناً من الوثوق بالـ payload)
    const charge = await retrieveTapCharge(chargeId);
    const status = charge?.status;
    const txId = charge?.metadata?.txId;

    if (!txId) return NextResponse.json({ received: true });

    const tx = await db.transaction.findUnique({ where: { id: txId } });
    if (!tx || tx.status === "SUCCEEDED") {
      return NextResponse.json({ received: true });
    }

    if (status === "CAPTURED") {
      await db.$transaction([
        db.transaction.update({
          where: { id: txId },
          data: { status: "SUCCEEDED" },
        }),
        ...(tx.pagesGranted > 0 && tx.userId
          ? [
              db.user.update({
                where: { id: tx.userId },
                data: { pagesBalance: { increment: tx.pagesGranted } },
              }),
            ]
          : []),
      ]);
    } else if (status === "FAILED" || status === "DECLINED") {
      await db.transaction.update({
        where: { id: txId },
        data: { status: "FAILED" },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[tap.webhook]", err);
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}
