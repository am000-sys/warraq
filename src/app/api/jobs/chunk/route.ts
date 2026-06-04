// src/app/api/jobs/chunk/route.ts — معالجة الكتب الكبيرة على أجزاء يقسّمها المتصفّح
// كلّ جزء PDF صغير (بضع صفحات) يُرسَل هنا → Mistral (بايتات) → يُلحَق بالوظيفة.
// يتجاوز حدّ جسم الطلب (كلّ جزء صغير) ولا يعتمد على Blob.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ocrFullDocument } from "@/lib/ocr";
import { modelCredits } from "@/lib/models";
import { isMistralConfigured } from "@/lib/mistral";
import { sendEmail, jobCompletedEmail } from "@/lib/email";
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

    // أوّل جزء: أنشئ الوظيفة
    if (!jobId) {
      if (user.pagesBalance < credits) {
        return NextResponse.json(
          { error: "رصيد غير كافٍ", available: user.pagesBalance },
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
    }

    // فرّغ الجزء عبر Mistral (بايتات)
    const buf = Buffer.from(await chunk.arrayBuffer());
    const dataUri = `data:application/pdf;base64,${buf.toString("base64")}`;
    const results = await ocrFullDocument({ dataUri, isImage: false });

    // احفظ صفحات الجزء بدءاً من offset
    if (results.length > 0) {
      await db.jobPage.createMany({
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
      });
    }

    const processedNow = offset + results.length;
    const charged = results.length * credits;
    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: { pagesBalance: { decrement: charged } },
      }),
      db.job.update({
        where: { id: jobId },
        data: {
          processedPages: processedNow,
          pagesCharged: { increment: charged },
          ...(isFinal
            ? { status: "COMPLETED", totalPages: processedNow, completedAt: new Date() }
            : {}),
        },
      }),
    ]);

    if (isFinal && user.email) {
      sendEmail({
        to: user.email,
        ...jobCompletedEmail(user.name ?? user.email, fileName, processedNow, jobId!),
      }).catch((err) => console.error("[email] job-completed:", err));
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
