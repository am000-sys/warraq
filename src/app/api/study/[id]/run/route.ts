// src/app/api/study/[id]/run/route.ts — تشغيل توليد الملخّص الدراسي (بثّ SSE)
// الضمانات (على نهج §10.7):
//  - الخصم مشروط وذرّي داخل معاملة المطالبة بالتشغيل، ولا رصيد سالباً أبداً.
//  - الفشل = استرداد كامل تلقائيّ + حالة FAILED برسالة واضحة (إعادة المحاولة تخصم من جديد).
//  - تعذّر نموذج الدقّة القصوى = تحويل تلقائيّ للدقّة العالية مع ردّ فرق السعر.
//  - لا اقتطاع صامتاً للمدخل — المادّة الأكبر من الحدّ تُرفض برسالة صريحة.
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { chargeBalance, InsufficientBalanceError, insufficientUpfrontMessage, currentBalance } from "@/lib/billing";
import {
  buildStudySystemPrompt,
  calcStudyCost,
  getStudyConfig,
  isStudyConfigured,
  maxTokensFor,
  runStudySummary,
  StudyModelRefusal,
  verifyQuotes,
  type StudyDepth,
  type StudyFocus,
} from "@/lib/study";

export const runtime = "nodejs";
export const maxDuration = 300; // التوليد بنموذج قويّ على مقرّر كامل يستغرق دقائق

const STALE_MS = 10 * 60 * 1000; // معالجة أقدم من ١٠ دقائق تُعدّ عالقة ويُسمح بإعادتها

function userError(err: unknown): string {
  if (err instanceof StudyModelRefusal) {
    return "اعتذر النموذج عن معالجة هذا المحتوى. جرّب الدقّة العالية أو عدّل المادّة.";
  }
  if (err instanceof Anthropic.APIError) {
    if (err.status === 429 || err.status === 529) {
      return "الخدمة مزدحمة حالياً — أعد المحاولة بعد دقائق. لم يُخصم من رصيدك شيء.";
    }
    if (err.status === 401 || err.status === 403) {
      return "تهيئة خدمة الذكاء الاصطناعي غير صحيحة — راجع إدارة المنصّة.";
    }
  }
  return "تعذّر توليد الملخّص. أعد المحاولة — لم يُخصم من رصيدك شيء.";
}

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
    return NextResponse.json({ error: "الملخّص مكتمل بالفعل" }, { status: 409 });
  }

  // ─── بناء سياق المادّة (قراءة فقط — قبل أيّ خصم) ─────────
  let context: string;
  if (rec.sourceJobId) {
    const pages = await db.jobPage.findMany({
      where: { jobId: rec.sourceJobId },
      orderBy: { sequentialNumber: "asc" },
      select: { sequentialNumber: true, printedNumber: true, textContent: true },
    });
    if (pages.length === 0) {
      return NextResponse.json(
        { error: "المستند الأصلي لم يعد متاحاً (حُذف أو انتهت صلاحيّته)" },
        { status: 409 },
      );
    }
    context = pages
      .map((p) => `[صفحة ${p.printedNumber || p.sequentialNumber}]\n${p.textContent ?? ""}`)
      .join("\n\n");
  } else {
    context = rec.sourceText ?? "";
  }
  if (context.trim().length < 200) {
    return NextResponse.json({ error: "لا يوجد نصّ كافٍ في المصدر" }, { status: 409 });
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
  const standardCost = isAdmin ? 0 : calcStudyCost(rec.sourcePages, false, cfg);

  // ─── المطالبة بالتشغيل + الخصم — معاملة واحدة ذرّية ───────
  // تمنع التشغيل المتوازي (شرط الحالة) ولا تخصم مرّتين (شرط pagesCharged).
  const staleBefore = new Date(Date.now() - STALE_MS);
  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.studySummary.updateMany({
        where: {
          id,
          OR: [
            { status: { in: ["PENDING", "FAILED"] } },
            { status: "PROCESSING", startedAt: { lt: staleBefore } },
            { status: "PROCESSING", startedAt: null },
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
      return NextResponse.json({ error: "الملخّص قيد المعالجة الآن" }, { status: 409 });
    }
    throw err;
  }

  const charged = rec.pagesCharged > 0 ? rec.pagesCharged : cost;
  const system = buildStudySystemPrompt(rec.focus as StudyFocus[], rec.depth as StudyDepth);

  // استرداد جزئي/كامل — خارج مسار النجاح فقط
  const refund = async (amount: number) => {
    if (amount <= 0) return;
    await db.$transaction([
      db.user.update({
        where: { id: rec.userId },
        data: { pagesBalance: { increment: amount } },
      }),
      db.studySummary.update({
        where: { id },
        data: { pagesCharged: { decrement: amount } },
      }),
    ]);
  };

  // ─── بثّ SSE: deltas حيّة + ping أثناء صمت التفكير ────────
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* العميل أغلق الاتصال — نُكمل التوليد والحفظ على أيّ حال */
        }
      };

      // تجميع صغير للدفقات كي لا نرسل حدثاً لكلّ توكن
      let buf = "";
      const flush = () => {
        if (!buf) return;
        send({ type: "delta", t: buf });
        buf = "";
      };
      const flusher = setInterval(flush, 200);
      const ping = setInterval(() => send({ type: "ping" }), 15_000);

      let activeModel = rec.model;
      let activeCharged = charged;

      try {
        send({ type: "start", cost: activeCharged, model: activeModel });

        const run = (model: string, maxTokens: number) =>
          runStudySummary({
            model,
            system,
            context,
            maxTokens,
            onDelta: (t) => {
              buf += t;
              if (buf.length > 400) flush();
            },
          });

        let result;
        try {
          result = await run(
            activeModel,
            maxTokensFor(rec.depth as StudyDepth, premium),
          );
        } catch (err) {
          // تعذّر نموذج الدقّة القصوى (رفض/إعداد/عدم توفّر) → تحويل تلقائيّ
          // إلى الدقّة العالية مع ردّ فرق السعر — بدل إفشال الطلب كاملاً.
          const recoverable =
            err instanceof StudyModelRefusal ||
            (err instanceof Anthropic.APIError && [400, 403, 404].includes(err.status ?? 0));
          if (premium && recoverable) {
            send({
              type: "notice",
              message:
                "تعذّر نموذج الدقّة القصوى — جرى التحويل تلقائياً إلى الدقّة العالية وردّ فرق السعر إلى رصيدك.",
            });
            const diff = activeCharged - standardCost;
            if (!isAdmin && diff > 0) await refund(diff);
            activeCharged = Math.min(activeCharged, standardCost);
            activeModel = cfg.model;
            buf = "";
            result = await run(activeModel, maxTokensFor(rec.depth as StudyDepth, false));
          } else {
            throw err;
          }
        }

        flush();

        // فحص النقول الحرفيّة «...» مقابل المصدر — محليّ وبلا تكلفة
        const verification = verifyQuotes(result.markdown, context);

        await db.studySummary.update({
          where: { id },
          data: {
            status: "COMPLETED",
            markdown: result.markdown,
            verification,
            model: activeModel,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            completedAt: new Date(),
            errorMessage: null,
          },
        });

        await db.auditLog
          .create({
            data: {
              userId: rec.userId,
              action: "study.generate",
              entity: "study_summary",
              entityId: id,
              metadata: {
                sourcePages: rec.sourcePages,
                charged: activeCharged,
                model: activeModel,
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
              },
            },
          })
          .catch(() => {});

        send({
          type: "done",
          id,
          verification,
          pagesCharged: activeCharged,
          model: activeModel,
        });
      } catch (err) {
        console.error("[study.run]", err);
        // فشل نهائيّ: استرداد كامل + حالة واضحة — إعادة المحاولة تخصم من جديد
        if (!isAdmin && activeCharged > 0) {
          await refund(activeCharged).catch((e) => console.error("[study.refund]", e));
        }
        const message = userError(err);
        await db.studySummary
          .update({
            where: { id },
            data: { status: "FAILED", errorMessage: message },
          })
          .catch(() => {});
        await db.auditLog
          .create({
            data: {
              userId: rec.userId,
              action: "study.failed",
              entity: "study_summary",
              entityId: id,
              metadata: { refunded: activeCharged },
            },
          })
          .catch(() => {});
        send({ type: "error", message });
      } finally {
        clearInterval(flusher);
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          /* أُغلق سلفاً */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
