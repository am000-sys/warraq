// src/app/api/jobs/chunk/route.ts — معالجة الكتب الكبيرة على أجزاء يقسّمها المتصفّح
// كلّ جزء PDF صغير (بضع صفحات) يُرسَل هنا → Mistral (بايتات) → يُلحَق بالوظيفة.
// يتجاوز حدّ جسم الطلب (كلّ جزء صغير) ولا يعتمد على Blob.
//
// ضمانات الرصيد:
// - فحص مسبق قبل إنشاء الوظيفة: الرصيد يغطّي المستند كاملاً (لا اقتطاع صامتاً).
// - فحص قبل تفريغ كلّ جزء: لا نتكبّد كلفة OCR لصفحات لا يمكن خصمها.
// - الخصم ذرّي ومشروط داخل معاملة واحدة مع حفظ الصفحات، ويُحسب من الصفحات
//   المحفوظة فعلاً (skipDuplicates) — إعادة إرسال جزء لا تُخصم مرّتين أبداً.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ocrFullDocument } from "@/lib/ocr";
import { modelCredits } from "@/lib/models";
import { isMistralConfigured } from "@/lib/mistral";
import { queueEmail, jobCompletedEmail } from "@/lib/email";
import {
  InsufficientBalanceError,
  chargeBalance,
  currentBalance,
  insufficientUpfrontMessage,
  balanceExhaustedMessage,
} from "@/lib/billing";
import type { ClaudeModel } from "@prisma/client";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (!isMistralConfigured) {
    return NextResponse.json(
      { error: "خدمة التفريغ غير مهيّأة (Mistral)", configRequired: true },
      { status: 503 },
    );
  }

  let jobId: string | null = null;
  try {
    const form = await req.formData();
    const chunk = form.get("chunk") as File | null;
    const fileName = (form.get("fileName") as string | null) ?? "document.pdf";
    const model = ((form.get("model") as string | null)?.toUpperCase() as ClaudeModel) || "OPUS";
    const offset = parseInt((form.get("offset") as string | null) ?? "0", 10) || 0;
    const totalPages = parseInt((form.get("totalPages") as string | null) ?? "0", 10) || 0;
    const isFinal = (form.get("final") as string | null) === "1";
    jobId = (form.get("jobId") as string | null) || null;

    if (!chunk) return NextResponse.json({ error: "لا يوجد جزء" }, { status: 400 });

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 404 });
    const credits = modelCredits(model) || 1;

    const buf = Buffer.from(await chunk.arrayBuffer());
    // عدد صفحات الجزء الفعليّ (الخادم هو المرجع — لا نثق بأرقام العميل في الخصم)
    const { PDFDocument } = await import("pdf-lib");
    const chunkDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const chunkPages = chunkDoc.getPageCount();
    if (chunkPages === 0) throw new Error("جزء PDF فارغ أو تالف");

    // أوّل جزء: فحص مسبق أنّ الرصيد يغطّي المستند كاملاً، ثمّ أنشئ الوظيفة
    if (!jobId) {
      const required = Math.max(totalPages, chunkPages) * credits;
      if (user.pagesBalance < required) {
        return NextResponse.json(
          {
            error: insufficientUpfrontMessage(required, user.pagesBalance),
            required,
            available: user.pagesBalance,
          },
          { status: 402 },
        );
      }
      const job = await db.job.create({
        data: {
          userId: session.user.id,
          fileName,
          fileSize: 0,
          fileChecksum: "chunked",
          storageKey: "chunked",
          totalPages: totalPages || 0,
          processedPages: 0,
          model,
          status: "PROCESSING",
          startedAt: new Date(),
        },
      });
      jobId = job.id;
    } else {
      const job = await db.job.findUnique({ where: { id: jobId } });
      if (!job || job.userId !== session.user.id) {
        return NextResponse.json({ error: "وظيفة غير موجودة" }, { status: 404 });
      }
      // استئناف بعد فشل عابر: أعد الحالة إلى «قيد المعالجة»
      if (job.status === "FAILED") {
        await db.job.update({
          where: { id: jobId },
          data: { status: "PROCESSING", errorMessage: null },
        });
      }
      // قبل تفريغ الجزء: تأكّد أنّ الرصيد يغطّيه (لا كلفة OCR بلا مقابل)
      if (user.pagesBalance < chunkPages * credits) {
        const msg = balanceExhaustedMessage(job.processedPages, totalPages || job.totalPages);
        await db.job.update({
          where: { id: jobId },
          data: { status: "FAILED", errorMessage: msg },
        });
        return NextResponse.json(
          {
            error: msg,
            required: chunkPages * credits,
            available: user.pagesBalance,
            jobId,
            processed: job.processedPages,
          },
          { status: 402 },
        );
      }
    }

    // فرّغ الجزء عبر Mistral (بايتات)
    const dataUri = `data:application/pdf;base64,${buf.toString("base64")}`;
    const results = await ocrFullDocument({ dataUri, isImage: false });

    // احفظ صفحات الجزء واخصم في معاملة واحدة — الخصم بعدد الصفحات الجديدة فقط
    let processedNow = offset + results.length;
    try {
      await db.$transaction(async (tx) => {
        let charged = 0;
        if (results.length > 0) {
          const created = await tx.jobPage.createMany({
            data: results.map((r, i) => ({
              jobId: jobId!,
              sequentialNumber: offset + i + 1,
              printedNumber: r.printedNumber,
              status: "COMPLETED" as const,
              textContent: r.text,
              inputTokens: 0,
              outputTokens: 0,
              processedAt: new Date(),
            })),
            skipDuplicates: true,
          });
          charged = created.count * credits;
          await chargeBalance(tx, user.id, charged);
        }
        processedNow = await tx.jobPage.count({ where: { jobId: jobId! } });
        await tx.job.update({
          where: { id: jobId! },
          data: {
            processedPages: processedNow,
            pagesCharged: { increment: charged },
            ...(isFinal
              ? { status: "COMPLETED", totalPages: processedNow, completedAt: new Date() }
              : {}),
          },
        });
      });
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        // سباق نادر (إنفاق متزامن): تراجعت المعاملة كاملة — لا صفحات ولا خصم
        const available = await currentBalance(user.id);
        const job = await db.job.findUnique({ where: { id: jobId }, select: { processedPages: true } });
        const msg = balanceExhaustedMessage(job?.processedPages ?? offset, totalPages || processedNow);
        await db.job.update({
          where: { id: jobId },
          data: { status: "FAILED", errorMessage: msg },
        }).catch((e) => console.error("[jobs.chunk] status-update failed:", e));
        return NextResponse.json(
          { error: msg, available, jobId, processed: job?.processedPages ?? offset },
          { status: 402 },
        );
      }
      throw err;
    }

    if (isFinal && user.email) {
      queueEmail({
        to: user.email,
        ...jobCompletedEmail(user.name ?? user.email, fileName, processedNow, jobId!),
      }, "job-completed");
    }
    return NextResponse.json({
      jobId,
      processed: processedNow,
      total: totalPages || processedNow,
      done: isFinal,
    });
  } catch (err) {
    const raw = (err as Error)?.message ?? "unknown";
    console.error("[jobs.chunk]", err);
    if (jobId) {
      await db.job
        .update({ where: { id: jobId }, data: { status: "FAILED", errorMessage: raw.slice(0, 800) } })
        .catch((err) => console.error("[jobs] status-update failed:", err));
    }
    return NextResponse.json({ error: `تعذّرت المعالجة — (${raw.slice(0, 160)})` }, { status: 500 });
  }
}
