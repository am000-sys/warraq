// src/app/api/stripe/checkout/route.ts — إنشاء جلسة دفع Stripe
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, isStripeConfigured, PAYG_PRICE_HALALA } from "@/lib/stripe";

const schema = z.object({
  type: z.enum(["payg", "subscription"]),
  pages: z.number().int().positive().optional(),
  planSlug: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (!isStripeConfigured || !stripe) {
    return NextResponse.json(
      {
        error: "الدفع عبر Stripe غير مُعَدّ بعد",
        details: "يحتاج المالك ضبط STRIPE_SECRET_KEY على Vercel.",
        configRequired: true,
      },
      { status: 503 },
    );
  }

  try {
    const data = schema.parse(await req.json());
    const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "";

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 404 });

    if (data.type === "payg") {
      const pages = data.pages ?? 100;
      const amount = pages * PAYG_PRICE_HALALA; // بالهللات
      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: "sar",
              product_data: { name: `وَرَّاق — ${pages} صفحة` },
              unit_amount: amount,
            },
            quantity: 1,
          },
        ],
        metadata: { userId: user.id, type: "payg", pages: String(pages) },
        success_url: `${origin}/billing/return?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/billing`,
      });
      return NextResponse.json({ url: checkout.url });
    }

    // اشتراك
    const plan = await db.plan.findUnique({ where: { slug: data.planSlug ?? "" } });
    if (!plan?.stripePriceMonthlyId) {
      return NextResponse.json(
        { error: "هذه الخطّة غير مرتبطة بـ Stripe بعد" },
        { status: 400 },
      );
    }
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: user.email,
      line_items: [{ price: plan.stripePriceMonthlyId, quantity: 1 }],
      metadata: { userId: user.id, type: "subscription", planId: plan.id },
      success_url: `${origin}/billing/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing`,
    });
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("[stripe.checkout]", err);
    return NextResponse.json({ error: "خطأ في إنشاء جلسة الدفع" }, { status: 500 });
  }
}
