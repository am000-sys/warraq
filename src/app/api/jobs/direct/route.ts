// src/app/api/jobs/direct/route.ts
// رفع ومعالجة مباشرة قابلة للاستئناف (chunked) — مسار احتياطي عند غياب R2:
// - الصور: صفحة واحدة في طلب واحد.
// - PDF: يُنشأ السجلّ في الطلب الأوّل، ثمّ يعالج كلّ طلب ما يسعه الوقت من الصفحات
//   (بدءاً من processedPages المحفوظة) ويعيد done=false حتى تكتمل كلّ الصفحات.
//   يقود المتصفّحُ السلسلة بإعادة الاستدعاء مع jobId حتى done=true.
// التفريغ عبر طبقة OCR الموحّدة (Mistral أساسي / Claude بديل).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isOcrConfigured, isMistralConfigured, ocrImage, ocrPdfPage, ocrFullDocument } from "@/lib/ocr";
import { sendEmail, jobCompletedEmail } from "@/lib/email";
import { isImageFile, isPdfFile, imageBufferToPage } from "@/lib/pdf";
import { modelCredits } from "@/lib/models";
import type { ClaudeModel } from "@prisma/client";

export const maxDuration = 300;

// أقصى زمن نقضيه في معالجة الصفحات داخل طلب واحد قبل أن نعيد التحكّم للمتصفّح
const TIME_BUDGET_MS = 45_000;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (!isOcrConfigured) {
    return NextResponse.json(
      { error: "خدمة الـ OCR غير مُعَدّة بعد", configRequired: true },
      { status: 503 },
    );
  }

  let jobId: string | null = null;
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const model = (form.get("model") as string | null)?.toUpperCase() as ClaudeModel;
    const resumeJobId = (form.get("jobId") as string | null) || null;

    if (!file) return NextResponse.json({ error: "لا يوجد ملفّ" }, { status: 400 });
    if (!["HAIKU", "SONNET", "OPUS"].includes(model)) {
      return NextResponse.json({ error: "نموذج غير صالح" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 404 });

    const credits = modelCredits(model) || 1;
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: "الملفّ فارغ أو لم يكتمل رفعه" }, { status: 400 });
    }
    const isPdf = isPdfFile(file.name);
    const isImg = isImageFile(file.name);
    if (!isPdf && !isImg) {
      return NextResponse.json(
        { error: "صيغة غير مدعومة — استعمل PNG أو JPG أو PDF" },
        { status: 400 },
      );
    }

    // ===== صورة مفردة: طلب واحد =====
    if (isImg) {
      if (user.pagesBalance < credits) {
        return NextResponse.json(
          { error: "رصيد غير كافٍ", available: user.pagesBalance },
          { status: 402 },
        );
      }
      const job = await db.job.create({
        data: {
          userId: session.user.id,
          fileName: file.name,
          fileSize: buffer.length,
          fileChecksum: "direct",
          storageKey: "direct",
          totalPages: 1,
          model,
          status: "PROCESSING",
          startedAt: new Date(),
        },
      });
      jobId = job.id;
      const page = imageBufferToPage(buffer, file.name);
      const r = await ocrImage(page.base64, page.mediaType, model);
      await db.jobPage.create({
        data: {
          jobId: job.id,
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
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            processedPages: 1,
            pagesCharged: credits,
            inputTokens: r.inputTokens,
            outputTokens: r.outputTokens,
            completedAt: new Date(),
          },
        }),
      ]);
      if (user.email) {
        sendEmail({
          to: user.email,
          ...jobCompletedEmail(user.name ?? user.email, file.name, 1, job.id),
        }).catch(() => {});
      }
      return NextResponse.json({ jobId: job.id, processed: 1, total: 1, done: true });
    }

    // ===== PDF عبر Mistral: المستند كاملاً في نداء واحد (الأسرع والأضمن) =====
    if (isMistralConfigured) {
      if (user.pagesBalance < credits) {
        return NextResponse.json(
          { error: "رصيد غير كافٍ", available: user.pagesBalance },
          { status: 402 },
        );
      }
      const dataUri = `data:application/pdf;base64,${buffer.toString("base64")}`;
      const results = await ocrFullDocument({ dataUri, isImage: false });
      if (results.length === 0) throw new Error("لم يُستخرَج نصّ من المستند");

      const affordable = Math.floor(user.pagesBalance / credits);
      const toSave = results.slice(0, Math.max(0, affordable));
      if (toSave.length < 1) {
        return NextResponse.json(
          { error: "رصيد غير كافٍ", available: user.pagesBalance },
          { status: 402 },
        );
      }

      const job = await db.job.create({
        data: {
          userId: session.user.id,
          fileName: file.name,
          fileSize: buffer.length,
          fileChecksum: "direct",
          storageKey: "direct",
          totalPages: toSave.length,
          processedPages: 0,
          model,
          status: "PROCESSING",
          startedAt: new Date(),
        },
      });
      jobId = job.id;
      await db.jobPage.createMany({
        data: toSave.map((r, i) => ({
          jobId: job.id,
          sequentialNumber: i + 1,
          printedNumber: r.printedNumber,
          status: "COMPLETED" as const,
          textContent: r.text,
          inputTokens: 0,
          outputTokens: 0,
          processedAt: new Date(),
        })),
      });
      const charged = toSave.length * credits;
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { pagesBalance: { decrement: charged } },
        }),
        db.job.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            processedPages: toSave.length,
            pagesCharged: charged,
            completedAt: new Date(),
          },
        }),
      ]);
      if (user.email) {
        sendEmail({
          to: user.email,
          ...jobCompletedEmail(user.name ?? user.email, file.name, toSave.length, job.id),
        }).catch(() => {});
      }
      return NextResponse.json({
        jobId: job.id,
        processed: toSave.length,
        total: toSave.length,
        done: true,
      });
    }

    // ===== PDF عبر Claude (بديل): إنشاء/استئناف ثمّ معالجة دفعة ضمن ميزانيّة الوقت =====
    const { PDFDocument } = await import("pdf-lib");
    const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pdfTotal = src.getPageCount();
    if (pdfTotal === 0) throw new Error("ملفّ PDF فارغ أو تالف");

    let job;
    if (!resumeJobId) {
      const affordablePages = Math.floor(user.pagesBalance / credits);
      const totalPages = Math.min(pdfTotal, affordablePages);
      if (totalPages < 1) {
        return NextResponse.json(
          { error: "رصيد غير كافٍ", available: user.pagesBalance },
          { status: 402 },
        );
      }
      job = await db.job.create({
        data: {
          userId: session.user.id,
          fileName: file.name,
          fileSize: buffer.length,
          fileChecksum: "direct",
          storageKey: "direct",
          totalPages,
          processedPages: 0,
          model,
          status: "PROCESSING",
          startedAt: new Date(),
        },
      });
    } else {
      job = await db.job.findUnique({ where: { id: resumeJobId } });
      if (!job || job.userId !== session.user.id) {
        return NextResponse.json({ error: "وظيفة غير موجودة" }, { status: 404 });
      }
      if (job.status === "COMPLETED") {
        return NextResponse.json({
          jobId: job.id,
          processed: job.processedPages,
          total: job.totalPages,
          done: true,
        });
      }
    }
    jobId = job.id;

    const total = job.totalPages;
    let offset = job.processedPages; // الخادم هو المرجع — لا نثق بإزاحة العميل
    const start = Date.now();
    let processedThisCall = 0;
    let inTok = 0;
    let outTok = 0;

    while (offset < total && Date.now() - start < TIME_BUDGET_MS) {
      const doc = await PDFDocument.create();
      const [copied] = await doc.copyPages(src, [offset]);
      doc.addPage(copied);
      const pageB64 = Buffer.from(await doc.save()).toString("base64");

      const r = await ocrPdfPage(pageB64, model);
      inTok += r.inputTokens;
      outTok += r.outputTokens;

      await db.jobPage.create({
        data: {
          jobId: job.id,
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
      await db.job.update({
        where: { id: job.id },
        data: { processedPages: offset },
      });
    }

    const charged = processedThisCall * credits;
    const done = offset >= total;
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { pagesBalance: { decrement: charged } },
      }),
      db.job.update({
        where: { id: job.id },
        data: {
          pagesCharged: { increment: charged },
          inputTokens: { increment: inTok },
          outputTokens: { increment: outTok },
          processedPages: offset,
          ...(done ? { status: "COMPLETED", completedAt: new Date() } : {}),
        },
      }),
    ]);

    if (done && user.email) {
      sendEmail({
        to: user.email,
        ...jobCompletedEmail(user.name ?? user.email, file.name, offset, job.id),
      }).catch(() => {});
    }
    return NextResponse.json({ jobId: job.id, processed: offset, total, done });
  } catch (err) {
    const raw = (err as Error)?.message ?? "unknown";
    console.error("[jobs.direct]", err);
    if (jobId) {
      await db.job
        .update({
          where: { id: jobId },
          data: { status: "FAILED", errorMessage: raw.slice(0, 800) },
        })
        .catch(() => {});
    }
    return NextResponse.json(
      { error: `${friendlyError(raw)} — (${raw.slice(0, 160)})` },
      { status: 500 },
    );
  }
}

function friendlyError(raw: string): string {
  const msg = raw.toLowerCase();
  if (msg.includes("credit balance") || msg.includes("billing"))
    return "خدمة المعالجة متوقّفة مؤقّتاً (رصيد تشغيلي). حاول لاحقاً أو تواصل مع الدعم.";
  if (msg.includes("rate limit") || msg.includes("429") || msg.includes("overloaded"))
    return "الخدمة مزدحمة حالياً. حاول بعد دقيقة.";
  if (msg.includes("authentication") || msg.includes("x-api-key") || msg.includes("401"))
    return "خدمة المعالجة غير مهيّأة. يُرجى التواصل مع الدعم.";
  if (msg.includes("not found") || msg.includes("model"))
    return "تعذّر الوصول لنموذج المعالجة. تواصل مع الدعم.";
  return "تعذّرت معالجة الملفّ. تأكّد من وضوح الصورة/الملفّ وحاول مجدّداً.";
}
