// src/app/api/topup/route.ts — طلبات شحن الرصيد بالحوالة
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPackage } from "@/lib/packages";

const schema = z.object({
  packageId: z.enum(["small", "medium", "large"]),
  senderName: z.string().min(2).max(120),
  // صورة الإيصال كـ data URL base64 (يُحدّ حجمها في الواجهة)
  receiptImage: z.string().startsWith("data:image/").max(8_000_000),
});

// POST: إنشاء طلب شحن
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  try {
    const data = schema.parse(await req.json());
    const pkg = getPackage(data.packageId);
    if (!pkg) return NextResponse.json({ error: "باقة غير صالحة" }, { status: 400 });

    const request = await db.topUpRequest.create({
      data: {
        userId: session.user.id,
        packageId: pkg.id,
        pages: pkg.pages,
        amountSar: Math.round(pkg.amountSar * 100), // هللات
        senderName: data.senderName,
        receiptImage: data.receiptImage,
        status: "PENDING",
      },
      select: { id: true, status: true },
    });

    return NextResponse.json({ request });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "بيانات غير صالحة — تأكّد من رفع صورة الإيصال" },
        { status: 400 },
      );
    }
    console.error("[topup.POST]", err);
    return NextResponse.json({ error: "خطأ داخلي" }, { status: 500 });
  }
}

// GET: المالك يرى كلّ الطلبات؛ المستخدم يرى طلباته فقط
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  const isAdmin = session.user.systemRole === "SYSTEM_ADMIN";

  const requests = await db.topUpRequest.findMany({
    where: isAdmin ? {} : { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    // المالك يحتاج الصورة؛ المستخدم لا
    select: {
      id: true,
      userId: true,
      packageId: true,
      pages: true,
      amountSar: true,
      senderName: true,
      status: true,
      note: true,
      createdAt: true,
      receiptImage: isAdmin,
    },
  });

  // أسماء/بُرُد المستخدمين للمالك
  let userMap: Record<string, { email: string; name: string | null }> = {};
  if (isAdmin && requests.length) {
    const users = await db.user.findMany({
      where: { id: { in: [...new Set(requests.map((r) => r.userId))] } },
      select: { id: true, email: true, name: true },
    });
    userMap = Object.fromEntries(users.map((u) => [u.id, { email: u.email, name: u.name }]));
  }

  return NextResponse.json({ requests, isAdmin, userMap });
}
