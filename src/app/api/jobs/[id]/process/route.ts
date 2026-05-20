// src/app/api/jobs/[id]/process/route.ts — معالجة وظيفة OCR
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDownloadUrl, isStorageConfigured } from "@/lib/storage";
import {
  isClaudeConfigured,
  extractTextFromImage,
  extractTextFromPdf,
} from "@/lib/claude";
import { isImageFile, isPdfFile, imageBufferToPage } from "@/lib/pdf";

// مدّة أطول للمعالجة (Vercel Pro). على Hobby الحدّ ٦٠ ثانية.
export const maxDuration = 300;

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
  if (!isClaudeConfigured) {
    return NextResponse.json(
      { error: "مفتاح Anthropic غير مُعَدّ", configRequired: true },
      { status: 503 },
    );
  }

  const job = await db.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (job.userId !== session.user.id) {
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });
  }
  if (job.status === "PROCESSING" || job.status === "COMPLETED") {
    return NextResponse.json({ ok: true, status: job.status });
  }

  await db.job.update({
    where: { id },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  try {
    // تنزيل الملفّ من R2
    const url = await getDownloadUrl(job.storageKey);
    const res = await fetch(url);
    if (!res.ok) throw new Error("تعذّر تنزيل الملفّ من التخزين");
    const buffer = Buffer.from(await res.arrayBuffer());

    let totalInput = 0;
    let totalOutput = 0;
    const savedPages: { seq: number; text: string; printed: string | null }[] = [];

    if (isPdfFile(job.fileName)) {
      const result = await extractTextFromPdf(buffer.toString("base64"), job.model);
      totalInput += result.inputTokens;
      totalOutput += result.outputTokens;
      result.pages.forEach((p, i) =>
        savedPages.push({ seq: i + 1, text: p.text, printed: p.printedPageNumber }),
      );
    } else if (isImageFile(job.fileName)) {
      const page = imageBufferToPage(buffer, job.fileName);
      const result = await extractTextFromImage(page.base64, page.mediaType, job.model);
      totalInput += result.inputTokens;
      totalOutput += result.outputTokens;
      savedPages.push({ seq: 1, text: result.text, printed: result.printedPageNumber });
    } else {
      throw new Error("صيغة ملفّ غير مدعومة");
    }

    // حفظ الصفحات
    await db.jobPage.deleteMany({ where: { jobId: id } });
    await db.jobPage.createMany({
      data: savedPages.map((p) => ({
        jobId: id,
        sequentialNumber: p.seq,
        printedNumber: p.printed,
        status: "COMPLETED" as const,
        textContent: p.text,
        inputTokens: 0,
        outputTokens: 0,
        processedAt: new Date(),
      })),
    });

    const pageCount = savedPages.length;

    // خصم الصفحات من رصيد المستخدم
    await db.user.update({
      where: { id: job.userId },
      data: { pagesBalance: { decrement: pageCount } },
    });

    await db.job.update({
      where: { id },
      data: {
        status: "COMPLETED",
        totalPages: pageCount,
        processedPages: pageCount,
        pagesCharged: pageCount,
        inputTokens: totalInput,
        outputTokens: totalOutput,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, pages: pageCount });
  } catch (err) {
    console.error("[process]", err);
    await db.job.update({
      where: { id },
      data: {
        status: "FAILED",
        errorMessage: (err as Error).message?.slice(0, 500) ?? "خطأ غير معروف",
      },
    });
    return NextResponse.json(
      { error: (err as Error).message ?? "فشلت المعالجة" },
      { status: 500 },
    );
  }
}
