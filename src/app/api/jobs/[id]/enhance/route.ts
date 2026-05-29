// src/app/api/jobs/[id]/enhance/route.ts
// تحسين الدقّة والتنسيق عبر Mistral (Add-on مدفوع): يصحّح أخطاء القراءة وينسّق
// ويفصل الحواشي ويضبط رقم الصفحة. يعمل على دفعات يقودها المتصفّح (offset)، ويُحتسب
// كعمليّة واحدة (الخصم/التتبّع عند offset=0 فقط).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isMistralConfigured, refinePageMistral } from "@/lib/mistral";
import { getClaudeAccess, trackClaudeUsage, claudeMonthlyUsage } from "@/lib/claude-addon";

export const maxDuration = 300;
const TIME_BUDGET_MS = 45_000;

const schema = z.object({ offset: z.number().int().min(0).optional() });

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
      { error: "خدمة التحسين غير مهيّأة", configRequired: true },
      { status: 503 },
    );
  }

  let offset = 0;
  try {
    offset = schema.parse(await req.json().catch(() => ({}))).offset ?? 0;
  } catch {
    offset = 0;
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

  // الخصم/التتبّع عند بداية العمليّة فقط (تُحتسب تحسيناً واحداً للمستند)
  if (offset === 0) {
    if (access.monthlyLimit > 0) {
      const used = await claudeMonthlyUsage(session.user.id);
      if (used >= access.monthlyLimit) {
        return NextResponse.json(
          { error: "بلغت الحدّ الشهريّ للخدمات الإضافيّة في خطّتك.", upsell: true },
          { status: 403 },
        );
      }
    }
    await trackClaudeUsage(session.user.id, "proofread", {
      jobId: id,
      mode: access.mode,
      costPerAction: access.costPerAction,
    });
  }

  const pages = await db.jobPage.findMany({
    where: { jobId: id },
    orderBy: { sequentialNumber: "asc" },
    select: { id: true, textContent: true },
  });
  const total = pages.length;
  if (total === 0) {
    return NextResponse.json({ error: "لا يوجد نصّ" }, { status: 409 });
  }

  try {
    let i = offset;
    const start = Date.now();
    while (i < total && Date.now() - start < TIME_BUDGET_MS) {
      const page = pages[i];
      const original = page.textContent ?? "";
      if (original.trim()) {
        // تدقيق + تنسيق + فصل الحواشي + رقم الصفحة عبر Mistral
        const r = await refinePageMistral(original);
        if (r.text && r.text.trim()) {
          await db.jobPage.update({
            where: { id: page.id },
            data: {
              textContent: r.text,
              ...(r.printedNumber ? { printedNumber: r.printedNumber } : {}),
            },
          });
        }
      }
      i++;
    }
    const done = i >= total;
    return NextResponse.json({ ok: true, processed: i, total, done });
  } catch (err) {
    console.error("[jobs.enhance]", err);
    return NextResponse.json({ error: "تعذّر تحسين الدقّة. حاول مجدّداً." }, { status: 500 });
  }
}
