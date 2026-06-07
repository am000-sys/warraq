// src/app/api/stripe/checkout/route.ts — إنشاء جلسة دفع Stripe (بطاقات + Apple/Google Pay)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { getPackage, getFlexiblePackage } from "@/lib/packages";

const schema = z.object({
  type: z.enum(["package", "subscription"]).default("package"),
  // باقة شحن الرصيد (بنفس أسعار التحويل البنكيّ)
  packageId: z.enum(["small", "medium", "large", "flex"]).optional(),
  pages: z.number().int().positive().optional(), // للباقة المرنة فقط
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

    // ── شحن الرصيد بباقة (تظهر Apple Pay / مدى / البطاقات تلقائيّاً في Checkout) ──
    if (data.type === "package") {
      const pkg =
        data.packageId === "flex"
          ? getFlexiblePackage(data.pages ?? 0)
          : data.packageId
            ? getPackage(data.packageId)
            : undefined;
      if (!pkg) {
        return NextResponse.json(
          {
            error:
              data.packageId === "flex"
                ? "عدد صفحات غير صالح — استخدم مضاعفات ٥٠"
                : "باقة غير صالحة",
          },
          { status: 400 },
        );
      }

      // معاملة معلّقة تُحدَّث من الـ webhook عند نجاح الدفع
      const tx = await db.transaction.create({
        data: {
          userId: user.id,
          amountSar: Math.round(pkg.amountSar * 100),
          pagesGranted: pkg.pages,
          type: "ONE_TIME",
          status: "PENDING",
          gateway: "STRIPE",
        },
      });

      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [
          {
            price_data: {
              currency: "sar",
              product_data: { name: `وَرَّاق — ${pkg.nameAr} (${pkg.pages} صفحة)` },
              unit_amount: Math.round(pkg.amountSar * 100),
            },
            quantity: 1,
          },
        ],
        // لا نحدّد payment_method_types كي تظهر محافظ Apple/Google Pay تلقائيّاً حسب إعداد اللوحة
        metadata: { userId: user.id, txId: tx.id, pages: String(pkg.pages) },
        success_url: `${origin}/billing/return?tx=${tx.id}`,
        cancel_url: `${origin}/billing`,
      });

      await db.transaction.update({
        where: { id: tx.id },
        data: { externalId: checkout.id },
      });

      return NextResponse.json({ url: checkout.url });
    }

    // ── اشتراك خطّة ──
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
