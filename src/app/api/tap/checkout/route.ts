// src/app/api/tap/checkout/route.ts — إنشاء عمليّة دفع Tap (مدى + Apple Pay سعودي + STC Pay)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTapCharge, isTapConfigured, tapKeyMode, tapBlockReason } from "@/lib/tap";
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

  // حارس: لا نأخذ مالاً حقيقيّاً بمفتاح لا يُسوّى إلى حساب التاجر
  const blocked = tapBlockReason();
  if (blocked) {
    console.error("[tap.checkout] محجوب:", blocked);
    return NextResponse.json({ error: blocked, configRequired: true }, { status: 503 });
  }

  try {
    const data = schema.parse(await req.json());
    const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "";
    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 404 });

    let amountSar: number;
    let description: string;
    let pagesGranted = 0;

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
      pagesGranted = pkg.pages;
      amountSar = pkg.amountSar;
      description = `وَرَّاق — ${pkg.nameAr} (${pkg.pages} صفحة)`;
    } else {
      const plan = await db.plan.findUnique({ where: { slug: data.planSlug ?? "" } });
      if (!plan) return NextResponse.json({ error: "خطّة غير موجودة" }, { status: 400 });
      amountSar = plan.monthlyPriceSar / 100;
      description = `وَرَّاق — اشتراك ${plan.nameAr}`;
    }

    // سجلّ معاملة معلّقة (تُحدَّث من الـ webhook عند CAPTURED)
    const tx = await db.transaction.create({
      data: {
        userId: user.id,
        amountSar: Math.round(amountSar * 100),
        pagesGranted,
        type: data.type === "package" ? "ONE_TIME" : "SUBSCRIPTION",
        status: "PENDING",
        gateway: "TAP",
      },
    });

    // قاعدة الموقع: من الطلب أوّلاً، وإلّا من الإعداد — يلزم لرابطي العودة والإشعار
    const baseUrl = origin || process.env.NEXTAUTH_URL || "";
    const charge = await createTapCharge({
      amountSar,
      description,
      customer: { email: user.email, name: user.name },
      redirectUrl: `${baseUrl}/billing/return?tx=${tx.id}`,
      // Tap ترسل الإشعار إلى post.url الخاصّ بالشحنة — بدونه لا يصل webhook أصلاً
      webhookUrl: process.env.TAP_WEBHOOK_URL || (baseUrl ? `${baseUrl}/api/tap/webhook` : undefined),
      metadata: { userId: user.id, txId: tx.id, type: data.type, pages: String(pagesGranted) },
    });

    // حفظ وضع الشحنة (مباشر/اختباريّ) — شحنة اختباريّة تنجح في التطبيق لكنّها
    // لا تُحصّل مالاً ولا تظهر في لوحة Tap المباشرة، فنُبقي الأثر للتشخيص لاحقاً.
    await db.transaction.update({
      where: { id: tx.id },
      data: {
        externalId: charge.id,
        metadata: { liveMode: charge.liveMode, keyMode: tapKeyMode() },
      },
    });

    if (charge.liveMode === false || tapKeyMode() === "test") {
      console.warn(
        `[tap.checkout] شحنة بوضع اختباريّ (${charge.id}) — لن تُحصَّل أموال حقيقيّة. راجع TAP_SECRET_KEY.`,
      );
    }

    return NextResponse.json({ url: charge.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    console.error("[tap.checkout]", err);
    return NextResponse.json({ error: (err as Error).message ?? "خطأ" }, { status: 500 });
  }
}
