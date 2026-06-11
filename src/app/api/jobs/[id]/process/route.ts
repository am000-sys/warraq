// src/app/api/jobs/[id]/process/route.ts — معالجة OCR على دفعات قابلة للاستئناف
// يعالج الملفّ المخزّن (R2/Blob) على دفعات بدءاً من processedPages، ويعيد done=false
// حتى تكتمل كلّ الصفحات. يقود المتصفّحُ السلسلة باستدعاء هذا المسار مراراً
// (دون إعادة رفع الملفّ). فشل عابر في دفعة لا يُفقد الدفعات المكتملة قبله.
//
// Mistral (الأساسي): دفعات صفحات عبر pageRange — الكتاب الكبير لا يُرسل كلّه في
// نداء واحد، فلا يسقط على المهلة ولا يضيع المنجَز. Claude (البديل): صفحة صفحة.
//
// ضمانات الرصيد: فحص مسبق يغطّي المتبقّي كاملاً قبل أيّ تفريغ، وخصم ذرّي مشروط
// محسوب من الصفحات المحفوظة فعلاً (skipDuplicates) — لا خصم مكرّراً عند الإعادة.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDownloadUrl, isStorageConfigured } from "@/lib/storage";
import {
  isOcrConfigured,
  isMistralConfigured,
  ocrImage,
  ocrPdfPage,
  ocrFullDocument,
} from "@/lib/ocr";
import { isImageFile, isPdfFile, imageBufferToPage } from "@/lib/pdf";
import { modelCredits } from "@/lib/models";
import { queueEmail, jobCompletedEmail } from "@/lib/email";
import {
  InsufficientBalanceError,
  chargeBalance,
  currentBalance,
  insufficientUpfrontMessage,
  balanceExhaustedMessage,
} from "@/lib/billing";
import type { OcrPageResult } from "@/lib/ocr";

export const maxDuration = 300;
const TIME_BUDGET_MS = 45_000;
// حجم دفعة Mistral (صفحات لكلّ نداء) — صغير كفاية لينجو من المهل، كبير كفاية للسرعة
const MISTRAL_BATCH = 30;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (!isOcrConfigured) {
    return NextResponse.json(
      { error: "خدمة المعالجة غير مهيّأة", configRequired: true },
      { status: 503 },
    );
  }

  const job = await db.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  // الملفّ مخزّن إمّا برابط عامّ (Blob) أو مفتاح R2؛ نتأكّد أنّ أحدهما متاح
  const isUrlKey = /^https?:\/\//.test(job.storageKey);
  if (!isUrlKey && !isStorageConfigured) {
    return NextResponse.json(
      { error: "التخزين غير مُعَدّ", configRequired: true },
      { status: 503 },
    );
  }
  if (job.userId !== session.user.id) {
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });
  }
  if (job.status === "COMPLETED") {
    return NextResponse.json({
      ok: true,
      processed: job.processedPages,
      total: job.totalPages,
      done: true,
    });
  }

  try {
    if (job.status !== "PROCESSING") {
      // بداية أو إعادة محاولة بعد فشل: أعد الحالة إلى «قيد المعالجة»
      await db.job.update({
        where: { id },
        data: {
          status: "PROCESSING",
          errorMessage: null,
          ...(job.startedAt ? {} : { startedAt: new Date() }),
        },
      });
    }

    // رابط الملفّ المخزّن (Blob/R2). لا ننزّله إلّا عند الحاجة (Mistral يجلب الرابط بنفسه)
    const url = await getDownloadUrl(job.storageKey);

    const user = await db.user.findUnique({ where: { id: job.userId } });
    if (!user) throw new Error("مستخدم غير موجود");
    const credits = modelCredits(job.model) || 1;
    const isImg = isImageFile(job.fileName);
    if (!isImg && !isPdfFile(job.fileName)) {
      throw new Error("صيغة ملفّ غير مدعومة");
    }

    // تنزيل الملفّ عند الحاجة فقط (مرّة لكلّ طلب) — لعدّ الصفحات أو كاحتياط للبايتات
    let cachedBuffer: Buffer | null = null;
    async function fileBuffer(): Promise<Buffer> {
      if (cachedBuffer) return cachedBuffer;
      const res = await fetch(url);
      if (!res.ok) throw new Error("تعذّر تنزيل الملفّ من التخزين");
      cachedBuffer = Buffer.from(await res.arrayBuffer());
      if (cachedBuffer.length === 0) throw new Error("الملفّ لم يكتمل رفعه — أعد المحاولة");
      return cachedBuffer;
    }

    // ===== Mistral (الأساسي): دفعات pageRange قابلة للاستئناف =====
    if (isMistralConfigured) {
      // إجمالي الصفحات الحقيقي — يُحسب مرّة واحدة ويُحفظ على الوظيفة
      let total = job.totalPages;
      if (!total || total < 1) {
        if (isImg) {
          total = 1;
        } else {
          const { PDFDocument } = await import("pdf-lib");
          const src = await PDFDocument.load(await fileBuffer(), { ignoreEncryption: true });
          total = src.getPageCount();
          if (total === 0) throw new Error("ملفّ PDF فارغ أو تالف");
        }
        await db.job.update({ where: { id }, data: { totalPages: total } });
      }

      let offset = job.processedPages;
      // فحص مسبق: الرصيد يغطّي المتبقّي كاملاً قبل أيّ كلفة تفريغ — لا اقتطاع صامتاً
      const required = (total - offset) * credits;
      if (user.pagesBalance < required) {
        const msg = insufficientUpfrontMessage(required, user.pagesBalance);
        await db.job.update({
          where: { id },
          data: { status: "FAILED", errorMessage: msg },
        });
        return NextResponse.json(
          { error: msg, required, available: user.pagesBalance },
          { status: 402 },
        );
      }

      const start = Date.now();
      while (offset < total && Date.now() - start < TIME_BUDGET_MS) {
        const batchLen = Math.min(MISTRAL_BATCH, total - offset);
        const range = Array.from({ length: batchLen }, (_, i) => offset + i);

        let results: OcrPageResult[];
        try {
          results = isImg
            ? await ocrFullDocument({ url, isImage: true })
            : await ocrFullDocument({ url, isImage: false }, range);
        } catch (e) {
          // احتياط: إن تعذّر على Mistral جلب الرابط، نرسل البايتات مباشرة
          console.error("[process] url OCR failed, retrying with bytes:", (e as Error).message);
          const buf = await fileBuffer();
          const mime = isImg ? imageBufferToPage(buf, job.fileName).mediaType : "application/pdf";
          const dataUri = `data:${mime};base64,${buf.toString("base64")}`;
          results = isImg
            ? await ocrFullDocument({ dataUri, isImage: true })
            : await ocrFullDocument({ dataUri, isImage: false }, range);
        }
        if (results.length === 0) throw new Error("لم يُستخرَج نصّ من المستند");

        // حفظ الدفعة + الخصم في معاملة واحدة — الخصم للصفحات الجديدة فقط
        try {
          await db.$transaction(async (tx) => {
            const created = await tx.jobPage.createMany({
              data: results.map((r, i) => ({
                jobId: id,
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
            const charged = created.count * credits;
            await chargeBalance(tx, user.id, charged);
            await tx.job.update({
              where: { id },
              data: {
                processedPages: Math.min(total, offset + results.length),
                pagesCharged: { increment: charged },
              },
            });
          });
        } catch (err) {
          if (err instanceof InsufficientBalanceError) {
            // سباق نادر (إنفاق متزامن): الدفعات السابقة محفوظة، وهذه تراجعت كاملة
            const available = await currentBalance(user.id);
            const msg = balanceExhaustedMessage(offset, total);
            await db.job.update({
              where: { id },
              data: { status: "FAILED", errorMessage: msg },
            }).catch((e) => console.error("[process] status-update failed:", e));
            return NextResponse.json(
              { error: msg, available, processed: offset },
              { status: 402 },
            );
          }
          throw err;
        }
        offset = Math.min(total, offset + results.length);
        // دفعة أقصر من المطلوب = نهاية المستند الفعليّة (اختلاف عدّ نادر بين المكتبات)
        if (!isImg && results.length < batchLen) {
          total = offset;
          await db.job.update({ where: { id }, data: { totalPages: total } });
        }
      }

      const done = offset >= total;
      if (done) {
        await db.job.update({
          where: { id },
          data: { status: "COMPLETED", processedPages: offset, completedAt: new Date() },
        });
        if (user.email) {
          queueEmail({
            to: user.email,
            ...jobCompletedEmail(user.name ?? user.email, job.fileName, offset, id),
          }, "job-completed");
        }
      }
      return NextResponse.json({ ok: true, processed: offset, total, done });
    }

    // ===== Claude (بديل): يحتاج تنزيل الملفّ =====
    const buffer = await fileBuffer();

    // ===== صورة مفردة (Claude) =====
    if (isImg) {
      if (user.pagesBalance < credits) {
        const msg = insufficientUpfrontMessage(credits, user.pagesBalance);
        await db.job.update({ where: { id }, data: { status: "FAILED", errorMessage: msg } });
        return NextResponse.json(
          { error: msg, required: credits, available: user.pagesBalance },
          { status: 402 },
        );
      }
      const page = imageBufferToPage(buffer, job.fileName);
      const r = await ocrImage(page.base64, page.mediaType, job.model);
      await db.$transaction(async (tx) => {
        const created = await tx.jobPage.createMany({
          data: [{
            jobId: id,
            sequentialNumber: 1,
            printedNumber: r.printedNumber,
            status: "COMPLETED" as const,
            textContent: r.text,
            inputTokens: r.inputTokens,
            outputTokens: r.outputTokens,
            processedAt: new Date(),
          }],
          skipDuplicates: true,
        });
        await chargeBalance(tx, user.id, created.count * credits);
        await tx.job.update({
          where: { id },
          data: {
            status: "COMPLETED",
            totalPages: 1,
            processedPages: 1,
            pagesCharged: { increment: created.count * credits },
            inputTokens: r.inputTokens,
            outputTokens: r.outputTokens,
            completedAt: new Date(),
          },
        });
      });
      if (user.email) {
        queueEmail({
          to: user.email,
          ...jobCompletedEmail(user.name ?? user.email, job.fileName, 1, id),
        }, "job-completed");
      }
      return NextResponse.json({ ok: true, processed: 1, total: 1, done: true });
    }

    // ===== PDF عبر Claude (بديل): معالجة على دفعات (صفحة صفحة) =====
    const { PDFDocument } = await import("pdf-lib");
    const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pdfTotal = src.getPageCount();
    if (pdfTotal === 0) throw new Error("ملفّ PDF فارغ أو تالف");

    // احسب إجمالي الصفحات الحقيقي مرّة واحدة واحفظه
    let total = job.totalPages;
    if (!total || total < 1) {
      total = pdfTotal;
      await db.job.update({ where: { id }, data: { totalPages: total } });
    }

    let offset = job.processedPages;
    // فحص مسبق: الرصيد يغطّي المتبقّي كاملاً (لا نبدأ معالجة لن تكتمل)
    const required = (total - offset) * credits;
    if (user.pagesBalance < required) {
      const msg = insufficientUpfrontMessage(required, user.pagesBalance);
      await db.job.update({ where: { id }, data: { status: "FAILED", errorMessage: msg } });
      return NextResponse.json(
        { error: msg, required, available: user.pagesBalance },
        { status: 402 },
      );
    }

    const start = Date.now();
    let inTok = 0;
    let outTok = 0;

    try {
      while (offset < total && Date.now() - start < TIME_BUDGET_MS) {
        const doc = await PDFDocument.create();
        const [copied] = await doc.copyPages(src, [offset]);
        doc.addPage(copied);
        const pageB64 = Buffer.from(await doc.save()).toString("base64");

        const r = await ocrPdfPage(pageB64, job.model);
        inTok += r.inputTokens;
        outTok += r.outputTokens;

        // حفظ الصفحة + الخصم في معاملة واحدة (الخصم للصفحات الجديدة فقط)
        await db.$transaction(async (tx) => {
          const created = await tx.jobPage.createMany({
            data: [{
              jobId: id,
              sequentialNumber: offset + 1,
              printedNumber: r.printedNumber,
              status: "COMPLETED" as const,
              textContent: r.text,
              inputTokens: r.inputTokens,
              outputTokens: r.outputTokens,
              processedAt: new Date(),
            }],
            skipDuplicates: true,
          });
          const charged = created.count * credits;
          await chargeBalance(tx, user.id, charged);
          await tx.job.update({
            where: { id },
            data: { processedPages: offset + 1, pagesCharged: { increment: charged } },
          });
        });
        offset++;
      }
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        const available = await currentBalance(user.id);
        const msg = balanceExhaustedMessage(offset, total);
        await db.job.update({
          where: { id },
          data: {
            status: "FAILED",
            errorMessage: msg,
            inputTokens: { increment: inTok },
            outputTokens: { increment: outTok },
          },
        }).catch((e) => console.error("[process] status-update failed:", e));
        return NextResponse.json(
          { error: msg, available, processed: offset },
          { status: 402 },
        );
      }
      throw err;
    }

    const done = offset >= total;
    await db.job.update({
      where: { id },
      data: {
        inputTokens: { increment: inTok },
        outputTokens: { increment: outTok },
        processedPages: offset,
        ...(done ? { status: "COMPLETED", completedAt: new Date() } : {}),
      },
    });

    if (done && user.email) {
      queueEmail({
        to: user.email,
        ...jobCompletedEmail(user.name ?? user.email, job.fileName, offset, id),
      }, "job-completed");
    }
    return NextResponse.json({ ok: true, processed: offset, total, done });
  } catch (err) {
    console.error("[process]", err);
    await db.job
      .update({
        where: { id },
        data: {
          status: "FAILED",
          errorMessage: (err as Error).message?.slice(0, 800) ?? "خطأ غير معروف",
        },
      })
      .catch((err) => console.error("[jobs] status-update failed:", err));
    return NextResponse.json(
      { error: (err as Error).message ?? "فشلت المعالجة" },
      { status: 500 },
    );
  }
}
