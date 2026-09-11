// src/app/api/topup/route.ts — طلبات شحن الرصيد بالحوالة
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPackage, getFlexiblePackage } from "@/lib/packages";
import {
  queueEmail,
  newTopupForOwnerEmail,
  ownerNotifyEmails,
  URGENT_HEADERS,
} from "@/lib/email";

const schema = z.object({
  packageId: z.enum(["small", "medium", "large", "flex"]),
  // مطلوب فقط للباقة المرنة: عدد الصفحات (مضاعفات ٥٠)
  pages: z.number().int().positive().optional(),
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
    const pkg =
      data.packageId === "flex"
        ? getFlexiblePackage(data.pages ?? 0)
        : getPackage(data.packageId);
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
      select: { id: true, status: true, createdAt: true },
    });

    // إشعار عاجل للمالك بكلّ طلب شحن — إلى بريد المالك المضبوط وبُرُد مالكي النظام.
    // بُرُد بذور التطوير (نطاق .test ونحوه) تُستبعَد تلقائيّاً فلا يفشل الإرسال بلا طائل.
    const admins = await db.user.findMany({
      where: { systemRole: "SYSTEM_ADMIN" },
      select: { email: true },
    });
    const me = await db.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    const recipients = ownerNotifyEmails(admins.map((a) => a.email));
    const mail = newTopupForOwnerEmail({
      userEmail: me?.email ?? "مستخدم",
      senderName: data.senderName,
      pages: pkg.pages,
      amountHalala: Math.round(pkg.amountSar * 100),
      requestId: request.id,
      createdAt: request.createdAt,
    });
    for (const to of recipients) {
      queueEmail({ to, ...mail, headers: URGENT_HEADERS }, "topup-owner-notify");
    }

    return NextResponse.json({ request: { id: request.id, status: request.status } });
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
