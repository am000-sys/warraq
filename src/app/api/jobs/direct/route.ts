// src/app/api/jobs/direct/route.ts
// رفع ومعالجة مباشرة (بدون R2) — للصور و PDF الصغيرة.
// يقبل الملفّ مباشرةً، يستخرج النصّ بـ Claude، ويحفظ الوظيفة.
// مناسب للبدء السريع بمفتاح Anthropic وحده.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isClaudeConfigured,
  extractTextFromImage,
  extractTextFromPdf,
} from "@/lib/claude";
import { isImageFile, isPdfFile, imageBufferToPage } from "@/lib/pdf";
import type { ClaudeModel } from "@prisma/client";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (!isClaudeConfigured) {
    return NextResponse.json(
      {
        error: "خدمة الـ OCR غير مُعَدّة بعد",
        details: "يحتاج المالك ضبط ANTHROPIC_API_KEY الحقيقي على Vercel.",
        configRequired: true,
      },
      { status: 503 },
    );
  }

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

    // إنشاء سجلّ الوظيفة
    const job = await db.job.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileSize: buffer.length,
        fileChecksum: "direct",
        storageKey: "direct",
        totalPages: 0,
        model,
        status: "PROCESSING",
        startedAt: new Date(),
      },
    });

    try {
      const savedPages: { seq: number; text: string; printed: string | null }[] = [];
      let inputTokens = 0;
      let outputTokens = 0;

      if (isPdfFile(file.name)) {
        const result = await extractTextFromPdf(buffer.toString("base64"), model);
        inputTokens = result.inputTokens;
        outputTokens = result.outputTokens;
        result.pages.forEach((p, i) =>
          savedPages.push({ seq: i + 1, text: p.text, printed: p.printedPageNumber }),
        );
      } else if (isImageFile(file.name)) {
        const page = imageBufferToPage(buffer, file.name);
        const r = await extractTextFromImage(page.base64, page.mediaType, model);
        inputTokens = r.inputTokens;
        outputTokens = r.outputTokens;
        savedPages.push({ seq: 1, text: r.text, printed: r.printedPageNumber });
      } else {
        throw new Error("صيغة غير مدعومة — استعمل PNG أو JPG أو PDF");
      }

      await db.jobPage.createMany({
        data: savedPages.map((p) => ({
          jobId: job.id,
          sequentialNumber: p.seq,
          printedNumber: p.printed,
          status: "COMPLETED" as const,
          textContent: p.text,
          processedAt: new Date(),
        })),
      });

      const pageCount = savedPages.length;
      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { pagesBalance: { decrement: pageCount } },
        }),
        db.job.update({
          where: { id: job.id },
          data: {
            status: "COMPLETED",
            totalPages: pageCount,
            processedPages: pageCount,
            pagesCharged: pageCount,
            inputTokens,
            outputTokens,
            completedAt: new Date(),
          },
        }),
      ]);

      return NextResponse.json({ jobId: job.id, pages: pageCount });
    } catch (procErr) {
      await db.job.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: (procErr as Error).message?.slice(0, 500),
        },
      });
      throw procErr;
    }
  } catch (err) {
    console.error("[jobs.direct]", err);
    return NextResponse.json({ error: friendlyError(err) }, { status: 500 });
  }
}

// تحويل أخطاء مزوّد الذكاء إلى رسائل واضحة للمستخدم (دون كشف المزوّد)
function friendlyError(err: unknown): string {
  const msg = (err as Error)?.message?.toLowerCase() ?? "";
  if (msg.includes("credit balance") || msg.includes("billing")) {
    return "خدمة المعالجة متوقّفة مؤقّتاً (انتهى الرصيد التشغيلي). يُرجى المحاولة لاحقاً أو التواصل مع الدعم.";
  }
  if (msg.includes("rate limit") || msg.includes("429") || msg.includes("overloaded")) {
    return "الخدمة مزدحمة حالياً. حاول بعد دقيقة.";
  }
  if (msg.includes("authentication") || msg.includes("x-api-key") || msg.includes("401")) {
    return "خدمة المعالجة غير مهيّأة حالياً. يُرجى التواصل مع الدعم.";
  }
  return "تعذّرت معالجة الملفّ. تأكّد من وضوح الصورة وحاول مجدّداً.";
}
