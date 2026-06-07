// src/app/api/stripe/webhook/route.ts — استقبال أحداث Stripe
import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { db } from "@/lib/db";
import { creditTransaction } from "@/lib/payments";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  if (!isStripeConfigured || !stripe || !webhookSecret) {
    return NextResponse.json({ error: "غير مُعَدّ" }, { status: 503 });
  }

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err) {
    console.error("[stripe.webhook] توقيع غير صالح", err);
    return NextResponse.json({ error: "توقيع غير صالح" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const s = event.data.object as {
      id: string;
      amount_total: number | null;
      metadata: Record<string, string> | null;
    };
    const meta = s.metadata ?? {};

    if (meta.txId) {
      // شحن رصيد بباقة — تحديث المعاملة وإضافة الصفحات (آمن ضدّ التكرار)
      await creditTransaction(meta.txId);
    } else if (meta.userId && meta.type === "subscription") {
      // اشتراك خطّة
      await db.transaction.create({
        data: {
          userId: meta.userId,
          amountSar: s.amount_total ?? 0,
          type: "SUBSCRIPTION",
          status: "SUCCEEDED",
          gateway: "STRIPE",
          externalId: s.id,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
