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
    };
    const meta = s.metadata ?? {};

    // ── شحن رصيد بباقة: حدِّث المعاملة المعلّقة وأضِف الصفحات (idempotent) ──
    if (meta.txId) {
      const tx = await db.transaction.findUnique({ where: { id: meta.txId } });
      if (tx && tx.status !== "SUCCEEDED") {
        await db.$transaction([
          db.transaction.update({
            where: { id: tx.id },
            data: { status: "SUCCEEDED", externalId: s.id },
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
      }
    } else if (meta.userId && meta.type === "subscription") {
      // ── اشتراك خطّة ──
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
