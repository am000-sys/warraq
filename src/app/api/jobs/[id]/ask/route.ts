// src/app/api/jobs/[id]/ask/route.ts — خدمة "اسأل المستند" (Claude Add-on، مدفوعة)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isClaudeConfigured, askDocument } from "@/lib/claude";
import { isMistralConfigured, askDocumentMistral } from "@/lib/mistral";
import {
  getClaudeAccess,
  trackClaudeUsage,
  claudeMonthlyUsage,
} from "@/lib/claude-addon";

export const maxDuration = 60;

const schema = z.object({ question: z.string().min(1).max(2000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (!isMistralConfigured && !isClaudeConfigured) {
    return NextResponse.json(
      { error: "خدمة الذكاء الاصطناعي غير مهيّأة", configRequired: true },
      { status: 503 },
    );
  }

  let question: string;
  try {
    question = schema.parse(await req.json()).question;
  } catch {
    return NextResponse.json({ error: "سؤال غير صالح" }, { status: 400 });
  }

  const job = await db.job.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });
  if (!job) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (job.userId !== session.user.id && session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });
  }
  if (job.status !== "COMPLETED") {
    return NextResponse.json({ error: "المستند غير جاهز بعد" }, { status: 409 });
  }

  // بوّابة الأهليّة (add-on مدفوع)
  const access = await getClaudeAccess(session.user.id);
  if (!access.eligible) {
    return NextResponse.json(
      { error: "هذه ميزة إضافيّة مدفوعة (Claude). رقِّ خطّتك أو فعّل الإضافة.", upsell: true },
      { status: 403 },
    );
  }
  if (access.monthlyLimit > 0) {
    const used = await claudeMonthlyUsage(session.user.id);
    if (used >= access.monthlyLimit) {
      return NextResponse.json(
        { error: "بلغت الحدّ الشهريّ لخدمات Claude في خطّتك.", upsell: true },
        { status: 403 },
      );
    }
  }

  // بناء سياق المستند من نصوص الصفحات
  const pages = await db.jobPage.findMany({
    where: { jobId: id },
    orderBy: { sequentialNumber: "asc" },
    select: { sequentialNumber: true, printedNumber: true, textContent: true },
  });
  if (pages.length === 0) {
    return NextResponse.json({ error: "لا يوجد نصّ في المستند" }, { status: 409 });
  }
  const context = pages
    .map((p) => `[صفحة ${p.printedNumber || p.sequentialNumber}]\n${p.textContent ?? ""}`)
    .join("\n\n");

  try {
    const answer = isMistralConfigured
      ? await askDocumentMistral(context, question)
      : (await askDocument(context, question, access.textModel)).text;
    await trackClaudeUsage(session.user.id, "ask", {
      jobId: id,
      mode: access.mode,
      costPerAction: access.costPerAction,
    });
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("[jobs.ask]", err);
    return NextResponse.json({ error: "تعذّر تنفيذ السؤال. حاول مجدّداً." }, { status: 500 });
  }
}
