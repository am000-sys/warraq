// src/app/api/tap/checkout/route.ts — إنشاء عمليّة دفع Tap
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTapCharge, isTapConfigured } from "@/lib/tap";
import { PAYG_PRICE_HALALA } from "@/lib/stripe";

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
  if (!isTapConfigured) {
    return NextResponse.json(
      {
        error: "الدفع عبر Tap غير مُعَدّ بعد",
        details: "يحتاج المالك ضبط TAP_SECRET_KEY على Vercel.",
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

    let amountSar: number;
    let description: string;
    let pagesGranted = 0;

    if (data.type === "payg") {
      const pages = data.pages ?? 100;
      pagesGranted = pages;
      amountSar = (pages * PAYG_PRICE_HALALA) / 100; // تحويل هللات لريال
      description = `وَرَّاق — ${pages} صفحة`;
    } else {
      const plan = await db.plan.findUnique({ where: { slug: data.planSlug ?? "" } });
      if (!plan) return NextResponse.json({ error: "خطّة غير موجودة" }, { status: 400 });
      amountSar = plan.monthlyPriceSar / 100;
      description = `وَرَّاق — اشتراك ${plan.nameAr}`;
    }

    // سجلّ معاملة معلّقة
    const tx = await db.transaction.create({
      data: {
        userId: user.id,
        amountSar: Math.round(amountSar * 100),
        pagesGranted,
        type: data.type === "payg" ? "ONE_TIME" : "SUBSCRIPTION",
        status: "PENDING",
        gateway: "TAP",
      },
    });

    const charge = await createTapCharge({
      amountSar,
      description,
      customer: { email: user.email, name: user.name },
      redirectUrl: `${origin}/billing/return?tx=${tx.id}`,
      metadata: { userId: user.id, txId: tx.id, type: data.type, pages: String(pagesGranted) },
    });

    await db.transaction.update({
      where: { id: tx.id },
      data: { externalId: charge.id },
    });

    return NextResponse.json({ url: charge.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("[tap.checkout]", err);
    return NextResponse.json({ error: (err as Error).message ?? "خطأ" }, { status: 500 });
  }
}
