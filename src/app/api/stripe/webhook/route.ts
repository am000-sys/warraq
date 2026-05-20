// src/app/api/stripe/webhook/route.ts — استقبال أحداث Stripe
import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { db } from "@/lib/db";

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
      payment_intent?: string;
    };
    const meta = s.metadata ?? {};
    const userId = meta.userId;
    if (userId) {
      if (meta.type === "payg") {
        const pages = parseInt(meta.pages ?? "0");
        await db.$transaction([
          db.user.update({
            where: { id: userId },
            data: { pagesBalance: { increment: pages } },
          }),
          db.transaction.create({
            data: {
              userId,
              amountSar: s.amount_total ?? 0,
              pagesGranted: pages,
              type: "ONE_TIME",
              status: "SUCCEEDED",
              gateway: "STRIPE",
              externalId: s.id,
            },
          }),
        ]);
      } else if (meta.type === "subscription") {
        await db.transaction.create({
          data: {
            userId,
            amountSar: s.amount_total ?? 0,
            type: "SUBSCRIPTION",
            status: "SUCCEEDED",
            gateway: "STRIPE",
            externalId: s.id,
          },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
