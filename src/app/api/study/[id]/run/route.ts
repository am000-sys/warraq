// src/app/api/study/[id]/run/route.ts — تشغيل توليد الملخّص الدراسي (بثّ SSE)
//
// التوليد يجري على «خطوات» قابلة للاستئناف لأنّ serverless يقتل الدالّة عند
// حدّ المدّة (٦٠ ثانية على الخطط الأساسيّة) بينما مستند كبير يحتاج دقائق:
//  - كلّ خطوة تبثّ ضمن ميزانيّتها الزمنيّة ثمّ تتوقّف بأمان وتحفظ المنجَز،
//    وتعيد {paused} فيستدعي العميل المسار مجدّداً ليتابع من نقطة التوقّف.
//  - نقاط حفظ دوريّة أثناء البثّ تحمي المنجَز حتى من القتل القسري للدالّة،
//    وتعمل نبضاً (heartbeat): معالجة بلا نبض > ٩٠ ثانية تُعدّ عالقة وتُستأنف.
//
// ضمانات الرصيد (على نهج §10.7):
//  - خصم واحد ذرّي مشروط عند أوّل خطوة — لا رصيد سالباً ولا خصم مكرّراً للمتابعة.
//  - الفشل الحقيقي = استرداد كامل تلقائيّ + FAILED برسالة واضحة (المنجَز يبقى
//    نقطةَ حفظ، وإعادة المحاولة تخصم من جديد وتتابع منها).
//  - تعذّر نموذج الدقّة القصوى = تحويل تلقائيّ للدقّة العالية مع ردّ فرق السعر.
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  chargeBalance,
  InsufficientBalanceError,
  insufficientUpfrontMessage,
  currentBalance,
} from "@/lib/billing";
import {
  buildStudySystemPrompt,
  calcStudyCost,
  getStudyConfig,
  isStudyConfigured,
  maxTokensFor,
  runStudySummary,
  StudyModelRefusal,
  STUDY_END_MARK,
  verifyQuotes,
  type StudyDepth,
  type StudyFocus,
} from "@/lib/study";

export const runtime = "nodejs";
export const maxDuration = 300; // الخطوة تلتزم ميزانيّتها (study_step_seconds) دون هذا السقف

const HEARTBEAT_STALE_MS = 90 * 1000; // معالجة بلا نبض > ٩٠ ثانية = عالقة، تُستأنف
const CHECKPOINT_EVERY_MS = 6 * 1000; // حفظ دوريّ للمنجَز (يعمل نبضاً أيضاً)
const DONE_MIN_NEW_CHARS = 80; // خطوة أنهت بأقلّ من هذا بلا علامة إتمام = اكتمل فعلاً

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

// يزيل علامة الإتمام من المتن النهائي
function stripEndMark(s: string): string {
  return s.split(STUDY_END_MARK).join("").trimEnd();
}

// يقصّ ذيل الخطوة إلى آخر سطر مكتمل — وصلة نظيفة للمتابعة
function trimToLastLine(s: string): string {
  const i = s.lastIndexOf("\n");
  return i > 0 ? s.slice(0, i) : s;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const entryTime = Date.now();
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

  // ─── المطالبة بالخطوة + الخصم (أوّل مرّة فقط) — معاملة ذرّية ──
  // تمنع التشغيل المتوازي: لا تُنتزع معالجة جارية إلا إذا انقطع نبضُها.
  const staleBefore = new Date(Date.now() - HEARTBEAT_STALE_MS);
  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.studySummary.updateMany({
        where: {
          id,
          OR: [
            { status: { in: ["PENDING", "FAILED"] } },
            { status: "PROCESSING", updatedAt: { lt: staleBefore } },
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
      return NextResponse.json(
        { error: "الملخّص قيد المعالجة الآن — انتظر لحظات" },
        { status: 409 },
      );
    }
    throw err;
  }

  const charged = rec.pagesCharged > 0 ? rec.pagesCharged : cost;
  // نقطة الحفظ: ما أنجزته الخطوات السابقة (إن وُجد) — نتابع منها لا من الصفر
  const checkpoint = rec.markdown ?? "";
  const system = buildStudySystemPrompt(rec.focus as StudyFocus[], rec.depth as StudyDepth);
  // مهلة الخطوة من لحظة دخول الطلب، بهامش ٥ ثوانٍ للحفظ والإغلاق
  const deadline = entryTime + Math.max(15, cfg.stepSeconds - 5) * 1000;

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

  // ─── بثّ SSE: نقطة البدء + deltas + حفظ دوريّ + نتيجة الخطوة ──
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* العميل أغلق الاتصال — نُكمل الخطوة والحفظ على أيّ حال */
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

      // نصّ هذه الخطوة (يتراكم عبر onDelta) + حفظ دوريّ يعمل نبضاً
      let stepAcc = "";
      let savingCheckpoint = false;
      const checkpointSaver = setInterval(async () => {
        if (savingCheckpoint || !stepAcc) return;
        savingCheckpoint = true;
        try {
          await db.studySummary.update({
            where: { id },
            data: { markdown: checkpoint + stepAcc },
          });
        } catch {
          /* حفظ لاحق سيعوّضه */
        } finally {
          savingCheckpoint = false;
        }
      }, CHECKPOINT_EVERY_MS);

      let activeModel = rec.model;
      let activeCharged = charged;

      try {
        send({
          type: "start",
          cost: activeCharged,
          model: activeModel,
          resumed: Boolean(checkpoint),
        });
        // عند المتابعة: نمدّ العميل بالمنجَز السابق ليعرضه قبل ما سيُبثّ
        if (checkpoint) send({ type: "seed", text: checkpoint });

        const run = (model: string, maxTokens: number) =>
          runStudySummary({
            model,
            system,
            context,
            checkpoint,
            maxTokens,
            deadline,
            onDelta: (t) => {
              stepAcc += t;
              buf += t;
              if (buf.length > 400) flush();
            },
          });

        let result;
        try {
          result = await run(activeModel, maxTokensFor(rec.depth as StudyDepth, premium));
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
            await db.studySummary
              .update({ where: { id }, data: { model: activeModel } })
              .catch(() => {});
            stepAcc = "";
            buf = "";
            result = await run(activeModel, maxTokensFor(rec.depth as StudyDepth, false));
          } else {
            throw err;
          }
        }

        flush();
        clearInterval(checkpointSaver);

        const total = checkpoint + result.text;
        const hasEndMark = total.includes(STUDY_END_MARK);
        // اكتمال حقيقي: علامة الإتمام، أو نهاية طبيعيّة لم تضف شيئاً يُذكر
        // (نموذج اكتفى). غير ذلك — حتى end_turn مبكّر — نتابع بخطوة أخرى.
        const isDone =
          !result.paused &&
          (hasEndMark || result.text.trim().length < DONE_MIN_NEW_CHARS);

        if (!isDone) {
          // توقّف مؤقّت (مهلة الخطوة / سقف التوكنات / إنهاء مبكّر): احفظ
          // المنجَز عند آخر سطر مكتمل وأعد PENDING ليتابع العميل فوراً.
          const totalTrimmed = checkpoint + trimToLastLine(result.text);
          await db.studySummary.update({
            where: { id },
            data: {
              markdown: totalTrimmed,
              status: "PENDING",
              ...(result.inputTokens > 0
                ? {
                    inputTokens: { increment: result.inputTokens },
                    outputTokens: { increment: result.outputTokens },
                  }
                : {}),
            },
          });
          send({ type: "paused", progress: totalTrimmed.length });
          return;
        }

        const markdown = stripEndMark(total);
        // فحص النقول الحرفيّة «...» مقابل المصدر — محليّ وبلا تكلفة
        const verification = verifyQuotes(markdown, context);

        await db.studySummary.update({
          where: { id },
          data: {
            status: "COMPLETED",
            markdown,
            verification,
            model: activeModel,
            inputTokens: { increment: result.inputTokens },
            outputTokens: { increment: result.outputTokens },
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
        clearInterval(checkpointSaver);
        // فشل حقيقي: استرداد كامل + حالة واضحة. المنجَز يبقى نقطةَ حفظ،
        // وإعادة المحاولة تخصم من جديد وتتابع منها.
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
        clearInterval(checkpointSaver);
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
