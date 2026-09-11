// src/app/api/admin/tap-charge/route.ts — البيانات الخام لشحنة Tap (للمالك فقط)
// يفتحه المالك في المتصفّح: /api/admin/tap-charge?id=chg_XXXX
// أو بلا id فيُخرج آخر الشحنات المسجّلة عندنا.
// الغرض: الفصل القاطع حين تتناقض القرائن — هل الشحنة حقيقيّة (live_mode)؟ وأيّ بطاقة
// استُعملت (مُقنَّعة كما تُرسلها Tap)؟ وما مرجع المُصدِر؟ — هذه وحدها تحسم مع دعم Tap.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { retrieveTapCharge, isTapConfigured, tapKeyMode } from "@/lib/tap";

export const maxDuration = 30;

// الحقول الحاسمة في ردّ Tap — نُبرزها فوق الردّ الخام ليسهل قراءتها
function digest(charge: Record<string, unknown>) {
  const card = (charge?.card ?? {}) as Record<string, unknown>;
  const source = (charge?.source ?? {}) as Record<string, unknown>;
  const reference = (charge?.reference ?? {}) as Record<string, unknown>;
  const response = (charge?.response ?? {}) as Record<string, unknown>;
  const transaction = (charge?.transaction ?? {}) as Record<string, unknown>;
  return {
    status: charge?.status ?? null,
    live_mode: charge?.live_mode ?? null,
    amount: charge?.amount ?? null,
    currency: charge?.currency ?? null,
    // البطاقة: آخر أربعة أرقام وشبكتها — بطاقة اختباريّة تُعرف من رقمها
    card_last_four: card?.last_four ?? source?.payment_method ?? null,
    card_brand: card?.brand ?? source?.payment_type ?? null,
    card_scheme: card?.scheme ?? null,
    source_id: source?.id ?? null,
    // مرجع المُصدِر/الشبكة — لا يوجد إلّا لعمليّة مرّت بشبكة حقيقيّة
    reference_acquirer: reference?.acquirer ?? null,
    reference_payment: reference?.payment ?? null,
    reference_gateway: reference?.gateway ?? null,
    response_code: response?.code ?? null,
    response_message: response?.message ?? null,
    transaction_created: transaction?.created ?? null,
    captured: charge?.captured ?? null,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "للمالك فقط" }, { status: 403 });
  }
  if (!isTapConfigured) {
    return NextResponse.json({ error: "TAP_SECRET_KEY غير مضبوط في هذه البيئة" }, { status: 503 });
  }

  const env = {
    deployEnv: process.env.VERCEL_ENV ?? "local",
    tapKeyMode: tapKeyMode(), // live / test — دون كشف المفتاح
  };

  const id = req.nextUrl.searchParams.get("id");

  // بلا id: قائمة بآخر الشحنات المسجّلة عندنا لاختيار واحدة
  if (!id) {
    const recent = await db.transaction.findMany({
      where: { gateway: "TAP", externalId: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { externalId: true, amountSar: true, status: true, createdAt: true },
    });
    return NextResponse.json({
      env,
      hint: "أضِف ?id=chg_XXXX لعرض البيانات الخام لشحنة بعينها",
      recent: recent.map((t) => ({
        id: t.externalId,
        amountSar: t.amountSar / 100,
        localStatus: t.status,
        createdAt: t.createdAt,
      })),
    });
  }

  try {
    const charge = await retrieveTapCharge(id);
    return NextResponse.json({ env, id, digest: digest(charge), raw: charge });
  } catch (err) {
    return NextResponse.json(
      { env, id, error: (err as Error).message ?? "تعذّر الوصول إلى Tap" },
      { status: 502 },
    );
  }
}
