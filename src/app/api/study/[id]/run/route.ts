// src/app/api/study/[id]/run/route.ts — إرسال مهمّة الملخّص دفعةً واحدة
//
// المهمة تُسلَّم كاملة إلى Batches API (خصم ٥٠٪ على كلّ التوكنات) وتُعالَج على
// خوادم Anthropic دون قيود مدّة serverless ودون تقطيع أو إعادة سياق، ثمّ
// تُستلم كاملة عبر مسار المطالعة /api/study/poll الذي يُقفلها ويُرسل بريداً.
//
// ضمانات الرصيد (على نهج §10.7):
//  - خصم واحد ذرّي مشروط مع المطالبة بالإرسال — لا رصيد سالباً ولا خصم مكرّراً.
//  - فشل الإرسال أو المعالجة = استرداد كامل تلقائيّ + FAILED برسالة واضحة.
//  - تعذّر نموذج الدقّة القصوى = إعادة إرسال بالدقّة العالية مع ردّ فرق السعر.
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  chargeBalance,
  InsufficientBalanceError,
  insufficientUpfrontMessage,
  currentBalance,
} from "@/lib/billing";
import {
  buildStudyContext,
  buildStudySystemPrompt,
  calcStudyCost,
  getStudyConfig,
  isStudyConfigured,
  maxTokensForBatch,
  submitStudyBatch,
  type StudyDepth,
  type StudyFocus,
} from "@/lib/study";
import { settleStudyBatches } from "@/lib/study-poll";

export const runtime = "nodejs";
export const maxDuration = 60; // الإرسال نفسه سريع — المعالجة كلّها لدى المزوّد

// سجلّ «قيد المعالجة» بلا معرّف دفعة (انهار الإرسال قبل الحفظ) يُسترجع بعدها
const SUBMIT_STALE_MS = 90 * 1000;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (!isStudyConfigured) {
    return NextResponse.json({ error: "خدمة الملخّص الدراسي غير مهيّأة" }, { status: 503 });
  }

  const userId = session.user.id;
  const isAdmin = session.user.systemRole === "SYSTEM_ADMIN";
  const cfg = await getStudyConfig();

  const rec = await db.studySummary.findUnique({ where: { id } });
  if (!rec || (rec.userId !== userId && !isAdmin)) {
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  }
  if (rec.status === "COMPLETED") {
    return NextResponse.json({ completed: true });
  }

  // ─── بناء سياق المادّة (قراءة فقط — قبل أيّ خصم) ─────────
  const context = await buildStudyContext(rec);
  if (!context || context.trim().length < 200) {
    return NextResponse.json(
      { error: "المصدر لم يعد متاحاً أو لا يحوي نصّاً كافياً" },
      { status: 409 },
    );
  }
  if (context.length > cfg.maxChars) {
    return NextResponse.json(
      {
        error: `المادّة أكبر من الحدّ المسموح (${Math.round(cfg.maxChars / 1000)} ألف حرف). قسّمها إلى أجزاء ولخّص كلّ جزء على حدة.`,
      },
      { status: 413 },
    );
  }

  const premium = rec.model === cfg.modelPremium;
  const cost = isAdmin ? 0 : calcStudyCost(rec.sourcePages, premium, cfg);

  // ─── المطالبة بالإرسال + الخصم (أوّل مرّة فقط) — معاملة ذرّية ──
  const staleBefore = new Date(Date.now() - SUBMIT_STALE_MS);
  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.studySummary.updateMany({
        where: {
          id,
          OR: [
            { status: { in: ["PENDING", "FAILED"] } },
            // إرسال سابق انهار قبل حفظ معرّف الدفعة — يُسترجع بعد مهلة
            {
              status: "PROCESSING",
              verification: { equals: Prisma.AnyNull },
              updatedAt: { lt: staleBefore },
            },
          ],
        },
        data: { status: "PROCESSING", startedAt: new Date(), errorMessage: null },
      });
      if (claimed.count === 0) throw new Error("ALREADY_RUNNING");
      if (rec.pagesCharged === 0 && cost > 0) {
        await chargeBalance(tx, rec.userId, cost);
        await tx.studySummary.update({ where: { id }, data: { pagesCharged: cost } });
      }
    });
  } catch (err) {
    if (err instanceof InsufficientBalanceError) {
      const balance = await currentBalance(rec.userId);
      return NextResponse.json(
        { error: insufficientUpfrontMessage(cost, balance), required: cost, available: balance },
        { status: 402 },
      );
    }
    if (err instanceof Error && err.message === "ALREADY_RUNNING") {
      // دفعة قيد المعالجة فعلاً — جرّب تسويتها الآن ثمّ أخبر العميل بالمتابعة
      await settleStudyBatches(rec.userId).catch(() => {});
      const cur = await db.studySummary.findUnique({
        where: { id },
        select: { status: true },
      });
      if (cur?.status === "COMPLETED") return NextResponse.json({ completed: true });
      if (cur?.status === "FAILED") {
        return NextResponse.json(
          { error: "فشلت المعالجة السابقة — اضغط «إعادة» للمحاولة من جديد" },
          { status: 409 },
        );
      }
      return NextResponse.json({ queued: true, pending: true });
    }
    throw err;
  }

  // ─── الإرسال دفعةً واحدة ──────────────────────────────────
  const charged = rec.pagesCharged > 0 ? rec.pagesCharged : cost;
  try {
    const system = buildStudySystemPrompt(rec.focus as StudyFocus[], rec.depth as StudyDepth);
    const batchId = await submitStudyBatch({
      model: rec.model,
      system,
      context,
      maxTokens: maxTokensForBatch(rec.depth as StudyDepth, premium),
    });
    // معرّف الدفعة يُحفظ في حقل verification مؤقّتاً حتى الاكتمال
    // (يستبدله فحص النقول النهائي) — بلا أيّ تغيير على المخطّط.
    await db.studySummary.update({
      where: { id },
      data: { verification: { batchId } },
    });
    return NextResponse.json({ queued: true, cost: charged });
  } catch (err) {
    console.error("[study.submit]", err);
    // فشل الإرسال نفسه: استرداد كامل + حالة واضحة
    if (!isAdmin && charged > 0) {
      await db
        .$transaction([
          db.user.update({
            where: { id: rec.userId },
            data: { pagesBalance: { increment: charged } },
          }),
          db.studySummary.update({ where: { id }, data: { pagesCharged: 0 } }),
        ])
        .catch((e) => console.error("[study.refund]", e));
    }
    await db.studySummary
      .update({
        where: { id },
        data: { status: "FAILED", errorMessage: "تعذّر إرسال المهمة — أعد المحاولة بعد قليل." },
      })
      .catch(() => {});
    return NextResponse.json(
      { error: "تعذّر إرسال المهمة — أعد المحاولة بعد قليل. لم يُخصم من رصيدك شيء." },
      { status: 500 },
    );
  }
}
