// src/app/api/jobs/[id]/transform/route.ts
// أدوات الذكاء الإضافيّة (Add-on مدفوع، عبر Mistral):
//  - translate: ترجمة المستند إلى لغة مختارة
//  - index: فهرسة ذكيّة (أعلام/أماكن/مصطلحات/موضوعات)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  isMistralConfigured,
  translateMistral,
  extractIndexMistral,
  type TranslateLang,
} from "@/lib/mistral";
import {
  getClaudeAccess,
  trackClaudeUsage,
  claudeMonthlyUsage,
  type ClaudeActionType,
} from "@/lib/claude-addon";

export const maxDuration = 60;

const schema = z.object({
  type: z.enum(["translate", "index"]),
  lang: z.enum(["en", "fr", "tr", "ur", "id", "es"]).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (!isMistralConfigured) {
    return NextResponse.json(
      { error: "خدمة الذكاء الاصطناعي غير مهيّأة", configRequired: true },
      { status: 503 },
    );
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
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

  const access = await getClaudeAccess(session.user.id);
  if (!access.eligible) {
    return NextResponse.json(
      { error: "هذه ميزة إضافيّة مدفوعة. رقِّ خطّتك أو فعّل الإضافة.", upsell: true },
      { status: 403 },
    );
  }
  if (access.monthlyLimit > 0) {
    const used = await claudeMonthlyUsage(session.user.id);
    if (used >= access.monthlyLimit) {
      return NextResponse.json(
        { error: "بلغت الحدّ الشهريّ لخدمات الذكاء في خطّتك.", upsell: true },
        { status: 403 },
      );
    }
  }

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
    let result: string;
    let action: ClaudeActionType;
    if (body.type === "translate") {
      result = await translateMistral(context, (body.lang ?? "en") as TranslateLang);
      action = "translate";
    } else {
      result = await extractIndexMistral(context);
      action = "index";
    }
    await trackClaudeUsage(session.user.id, action, {
      jobId: id,
      mode: access.mode,
      costPerAction: access.costPerAction,
    });
    return NextResponse.json({ result, type: body.type });
  } catch (err) {
    console.error("[jobs.transform]", err);
    return NextResponse.json({ error: "تعذّر تنفيذ العمليّة. حاول مجدّداً." }, { status: 500 });
  }
}
