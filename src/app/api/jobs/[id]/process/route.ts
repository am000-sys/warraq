// src/app/api/jobs/[id]/process/route.ts — معالجة OCR على دفعات قابلة للاستئناف
// يُنزّل الملفّ من R2 (مرّة لكلّ طلب)، ويعالج ما يسعه الوقت من الصفحات بدءاً من
// processedPages، ويعيد done=false حتى تكتمل كلّ الصفحات. يقود المتصفّحُ السلسلة
// باستدعاء هذا المسار مراراً (دون إعادة رفع الملفّ).
// التفريغ صفحةً صفحة عبر طبقة OCR الموحّدة (Mistral أساسي / Claude بديل) لتفادي
// فشل المستندات متعدّدة الصفحات.
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

export const maxDuration = 300;
const TIME_BUDGET_MS = 45_000;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (!isStorageConfigured) {
    return NextResponse.json(
      { error: "تخزين R2 غير مُعَدّ", configRequired: true },
      { status: 503 },
    );
  }
  if (!isOcrConfigured) {
    return NextResponse.json(
      { error: "خدمة المعالجة غير مهيّأة", configRequired: true },
      { status: 503 },
    );
  }

  const job = await db.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
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
    if (job.status === "PENDING") {
      await db.job.update({
        where: { id },
        data: { status: "PROCESSING", startedAt: new Date() },
      });
    }

    // تنزيل الملفّ من R2 (مع التحقّق من اكتمال الرفع)
    const url = await getDownloadUrl(job.storageKey);
    const res = await fetch(url);
    if (!res.ok) throw new Error("تعذّر تنزيل الملفّ من التخزين");
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) {
      throw new Error("الملفّ لم يكتمل رفعه — أعد المحاولة");
    }

    const user = await db.user.findUnique({ where: { id: job.userId } });
    if (!user) throw new Error("مستخدم غير موجود");
    const credits = modelCredits(job.model) || 1;

    // ===== صورة مفردة =====
    if (isImageFile(job.fileName)) {
      if (user.pagesBalance < credits) {
        return NextResponse.json(
          { error: "رصيد غير كافٍ", available: user.pagesBalance },
          { status: 402 },
        );
      }
      const page = imageBufferToPage(buffer, job.fileName);
      const r = await ocrImage(page.base64, page.mediaType, job.model);
      await db.jobPage.deleteMany({ where: { jobId: id } });
      await db.jobPage.create({
        data: {
          jobId: id,
          sequentialNumber: 1,
          printedNumber: r.printedNumber,
          status: "COMPLETED",
          textContent: r.text,
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
          processedAt: new Date(),
        },
      });
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { pagesBalance: { decrement: credits } },
        }),
        db.job.update({
          where: { id },
          data: {
            status: "COMPLETED",
            totalPages: 1,
            processedPages: 1,
            pagesCharged: credits,
            inputTokens: r.inputTokens,
            outputTokens: r.outputTokens,
            completedAt: new Date(),
          },
        }),
      ]);
      return NextResponse.json({ ok: true, processed: 1, total: 1, done: true });
    }

    if (!isPdfFile(job.fileName)) {
      throw new Error("صيغة ملفّ غير مدعومة");
    }

    // ===== PDF عبر Mistral: على دفعات بنطاقات صفحات (قابل للاستئناف، لا يتجاوز المهلة) =====
    if (isMistralConfigured) {
      // عدد صفحات المستند (رخيص وموثوق — لا يُعيد بناء الصفحات)
      const { PDFDocument } = await import("pdf-lib");
      const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pdfTotal = src.getPageCount();
      if (pdfTotal === 0) throw new Error("ملفّ PDF فارغ أو تالف");

      // احسب الإجمالي (بحدود الرصيد) واحفظه مرّة واحدة
      let total = job.totalPages;
      if (!total || total < 1) {
        const affordable = Math.floor(user.pagesBalance / credits);
        total = Math.min(pdfTotal, affordable);
        if (total < 1) {
          return NextResponse.json(
            { error: "رصيد غير كافٍ", available: user.pagesBalance },
            { status: 402 },
          );
        }
        await db.job.update({ where: { id }, data: { totalPages: total } });
        await db.jobPage.deleteMany({ where: { jobId: id } });
      }

      // الدفعات الصغيرة تبقى نداءً واحداً؛ الكبيرة تُعالَج على دفعات قابلة للاستئناف
      const CHUNK = 30;
      const offset = job.processedPages;
      const end = Math.min(total, offset + CHUNK);
      const pageIdx = Array.from({ length: end - offset }, (_, i) => offset + i);

      let results;
      try {
        results = await ocrFullDocument({ url, isImage: false }, pageIdx);
      } catch (e) {
        console.error("[process] url OCR failed, retrying with bytes:", (e as Error).message);
        const dataUri = `data:application/pdf;base64,${buffer.toString("base64")}`;
        results = await ocrFullDocument({ dataUri, isImage: false }, pageIdx);
      }
      if (results.length === 0) throw new Error("لم يُستخرَج نصّ من المستند");

      await db.jobPage.createMany({
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
      });

      const processedNow = offset + results.length;
      const charged = results.length * credits;
      const done = processedNow >= total;
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { pagesBalance: { decrement: charged } },
        }),
        db.job.update({
          where: { id },
          data: {
            processedPages: processedNow,
            pagesCharged: { increment: charged },
            ...(done ? { status: "COMPLETED", completedAt: new Date() } : {}),
          },
        }),
      ]);
      return NextResponse.json({ ok: true, processed: processedNow, total, done });
    }

    // ===== PDF عبر Claude (بديل): معالجة على دفعات (صفحة صفحة) =====
    const { PDFDocument } = await import("pdf-lib");
    const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pdfTotal = src.getPageCount();
    if (pdfTotal === 0) throw new Error("ملفّ PDF فارغ أو تالف");

    // احسب إجمالي الصفحات مرّة واحدة (بحدود الرصيد) واحفظه
    let total = job.totalPages;
    if (!total || total < 1) {
      const affordable = Math.floor(user.pagesBalance / credits);
      total = Math.min(pdfTotal, affordable);
      if (total < 1) {
        return NextResponse.json(
          { error: "رصيد غير كافٍ", available: user.pagesBalance },
          { status: 402 },
        );
      }
      await db.job.update({ where: { id }, data: { totalPages: total } });
    }

    let offset = job.processedPages;
    const start = Date.now();
    let processedThisCall = 0;
    let inTok = 0;
    let outTok = 0;

    while (offset < total && Date.now() - start < TIME_BUDGET_MS) {
      const doc = await PDFDocument.create();
      const [copied] = await doc.copyPages(src, [offset]);
      doc.addPage(copied);
      const pageB64 = Buffer.from(await doc.save()).toString("base64");

      const r = await ocrPdfPage(pageB64, job.model);
      inTok += r.inputTokens;
      outTok += r.outputTokens;

      await db.jobPage.create({
        data: {
          jobId: id,
          sequentialNumber: offset + 1,
          printedNumber: r.printedNumber,
          status: "COMPLETED",
          textContent: r.text,
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
          processedAt: new Date(),
        },
      });

      offset++;
      processedThisCall++;
      await db.job.update({ where: { id }, data: { processedPages: offset } });
    }

    const charged = processedThisCall * credits;
    const done = offset >= total;
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { pagesBalance: { decrement: charged } },
      }),
      db.job.update({
        where: { id },
        data: {
          pagesCharged: { increment: charged },
          inputTokens: { increment: inTok },
          outputTokens: { increment: outTok },
          processedPages: offset,
          ...(done ? { status: "COMPLETED", completedAt: new Date() } : {}),
        },
      }),
    ]);

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
      .catch(() => {});
    return NextResponse.json(
      { error: (err as Error).message ?? "فشلت المعالجة" },
      { status: 500 },
    );
  }
}
