// src/app/api/jobs/direct/route.ts
// رفع ومعالجة مباشرة. الصور: صفحة واحدة. PDF: يُقسَّم صفحة-صفحة
// مع حفظ التقدّم تدريجياً وخصم الرصيد لكلّ صفحة.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isClaudeConfigured,
  extractTextFromImage,
  extractTextFromPdfPage,
} from "@/lib/claude";
import { isImageFile, isPdfFile, imageBufferToPage, splitPdfPages } from "@/lib/pdf";
import { modelCredits } from "@/lib/models";
import type { ClaudeModel } from "@prisma/client";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (!isClaudeConfigured) {
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

    if (!file) return NextResponse.json({ error: "لا يوجد ملفّ" }, { status: 400 });
    if (!["HAIKU", "SONNET", "OPUS"].includes(model)) {
      return NextResponse.json({ error: "نموذج غير صالح" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) return NextResponse.json({ error: "مستخدم غير موجود" }, { status: 404 });
    if (user.pagesBalance < 1) {
      return NextResponse.json(
        { error: "رصيد غير كافٍ", available: user.pagesBalance },
        { status: 402 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // تحضير صفحات الإدخال
    let pdfPages: string[] = [];
    const isPdf = isPdfFile(file.name);
    if (isPdf) {
      pdfPages = await splitPdfPages(buffer);
      if (pdfPages.length === 0) throw new Error("ملفّ PDF فارغ أو تالف");
    } else if (!isImageFile(file.name)) {
      return NextResponse.json(
        { error: "صيغة غير مدعومة — استعمل PNG أو JPG أو PDF" },
        { status: 400 },
      );
    }

    const totalPages = isPdf ? pdfPages.length : 1;

    // معامل الاستهلاك بحسب النموذج (فائق يستهلك أكثر)
    const credits = modelCredits(model);
    // أقصى عدد صفحات يسمح به الرصيد الحالي
    const affordablePages = Math.floor(user.pagesBalance / credits);
    const pagesToProcess = Math.min(totalPages, affordablePages);
    if (pagesToProcess < 1) {
      return NextResponse.json(
        { error: "رصيد غير كافٍ لهذا النموذج", available: user.pagesBalance },
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
        totalPages: pagesToProcess,
        model,
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });
    jobId = job.id;

    let inputTokens = 0;
    let outputTokens = 0;
    let processed = 0;

    for (let i = 0; i < pagesToProcess; i++) {
      const r = isPdf
        ? await extractTextFromPdfPage(pdfPages[i], model)
        : await extractTextFromImage(
            imageBufferToPage(buffer, file.name).base64,
            imageBufferToPage(buffer, file.name).mediaType,
            model,
          );
      inputTokens += r.inputTokens;
      outputTokens += r.outputTokens;

      await db.jobPage.create({
        data: {
          jobId: job.id,
          sequentialNumber: i + 1,
          printedNumber: r.printedPageNumber,
          status: "COMPLETED",
          textContent: r.text,
          inputTokens: r.inputTokens,
          outputTokens: r.outputTokens,
          processedAt: new Date(),
        },
      });

      processed++;
      // تحديث التقدّم تدريجياً (يظهر في صفحة الوظيفة عبر polling)
      await db.job.update({
        where: { id: job.id },
        data: { processedPages: processed },
      });
    }

    // خصم الرصيد (صفحات × معامل النموذج) + إنهاء الوظيفة
    const charged = processed * credits;
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { pagesBalance: { decrement: charged } },
      }),
      db.job.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          processedPages: processed,
          pagesCharged: charged,
          inputTokens,
          outputTokens,
          completedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ jobId: job.id, pages: processed, charged });
  } catch (err) {
    const raw = (err as Error)?.message ?? "unknown";
    console.error("[jobs.direct]", err);
    // نسجّل الخطأ الخام في الوظيفة (يراه المالك)، ونُظهر رسالة ودودة للمستخدم
    if (jobId) {
      await db.job
        .update({
          where: { id: jobId },
          data: { status: "FAILED", errorMessage: raw.slice(0, 800) },
        })
        .catch(() => {});
    }
    return NextResponse.json({ error: friendlyError(raw) }, { status: 500 });
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
