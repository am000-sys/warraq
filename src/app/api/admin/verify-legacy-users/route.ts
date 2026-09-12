// src/app/api/admin/verify-legacy-users/route.ts — تفعيل الحسابات السابقة (للمالك فقط)
//
// لماذا؟ قبل إضافة تفعيل البريد لم يكن أيّ مسار يضبط emailVerified (عدا حساب
// المالك في prisma/seed.ts)، فكلّ من سجّل عبر الموقع بقي حقله فارغاً — وبعد
// تفعيل الميزة صار محجوباً عن الدخول. هذا المنفذ يُعلّم تلك الحسابات مفعَّلةً
// مرّة واحدة، فيبقى التحقّق سارياً على الحسابات الجديدة وحدها.
//
// GET  = عرض العدد فقط (بلا أيّ تعديل) — للاطّلاع قبل التنفيذ.
// POST = التنفيذ. مقصور على الحسابات المُنشأة قبل لحظة القطع، فلا يُفعِّل حساباً
//        جديداً سجّل بعدها ولم يُدخل رمزه.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// لحظة القطع: نشر ميزة التحقّق. تُضبط من البيئة عند الحاجة، وإلّا فالافتراضيّ
// تاريخ دمج الميزة — أيّ حساب أُنشئ قبلها كان بلا تحقّق ممكن أصلاً.
function cutoff(): Date {
  const raw = process.env.EMAIL_VERIFY_CUTOFF;
  const parsed = raw ? new Date(raw) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date("2026-09-12T14:00:00Z");
}

async function requireOwner() {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "SYSTEM_ADMIN") return null;
  return session.user;
}

export async function GET() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "للمالك فقط" }, { status: 403 });
  }
  const before = cutoff();
  const [pending, sample] = await Promise.all([
    db.user.count({ where: { emailVerified: null, createdAt: { lt: before } } }),
    db.user.findMany({
      where: { emailVerified: null, createdAt: { lt: before } },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { email: true, createdAt: true },
    }),
  ]);
  return NextResponse.json({
    cutoff: before.toISOString(),
    pending,
    sample,
    hint: pending
      ? "أرسل POST إلى نفس المسار لتفعيلها. الحسابات المُنشأة بعد لحظة القطع لا تتأثّر."
      : "لا توجد حسابات سابقة غير مفعّلة.",
  });
}

export async function POST(req: NextRequest) {
  const owner = await requireOwner();
  if (!owner) {
    return NextResponse.json({ error: "للمالك فقط" }, { status: 403 });
  }

  const before = cutoff();
  // updateMany مشروط بـ emailVerified: null — فتكراره لا يمسّ من فُعِّل أصلاً
  const result = await db.user.updateMany({
    where: { emailVerified: null, createdAt: { lt: before } },
    data: { emailVerified: new Date() },
  });

  await db.auditLog
    .create({
      data: {
        userId: owner.id,
        action: "admin.verify_legacy_users",
        entity: "user",
        metadata: { verified: result.count, cutoff: before.toISOString() },
        ipAddress: req.headers.get("x-forwarded-for") ?? null,
      },
    })
    .catch(() => {});

  return NextResponse.json({ verified: result.count, cutoff: before.toISOString() });
}
