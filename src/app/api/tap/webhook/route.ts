// src/app/api/tap/webhook/route.ts — استقبال أحداث Tap
import { NextRequest, NextResponse } from "next/server";
import { retrieveTapCharge, isTapConfigured } from "@/lib/tap";
import { creditTransaction, markTransactionFailed } from "@/lib/payments";

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

    if (status === "CAPTURED") {
      await creditTransaction(txId);
    } else if (status === "FAILED" || status === "DECLINED") {
      await markTransactionFailed(txId);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[tap.webhook]", err);
    return NextResponse.json({ error: "خطأ" }, { status: 500 });
  }
}
