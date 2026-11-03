// src/app/api/admin/survey/send/route.ts — إرسال الاستبيان بالبريد إلى شريحة (للمالك)
//
// كلّ مستخدمٍ رسالته منفردةً برابطٍ شخصيّ موقَّع. كانت دفعةً واحدة، فرفضها Resend كلّها
// (HTTP 422) لأنّ الدفعة تسقط إن فشل عنصرٌ واحد فيها؛ والآن العنوان المرفوض لا يمنع
// غيره، ويُسجَّل بسببه. وبين كلّ رسالتين مهلةٌ تحترم حدّ Resend (طلبان في الثانية)،
// وسقفٌ لكلّ نقرة يُبقي النداء داخل مهلة الدالّة — ويُكمَل الباقون بنقرةٍ تالية، لأنّ من
// سُجّلت له الرسالة لا تُعاد إليه.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendEmail, surveyInviteEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import {
  SURVEY_ID,
  SURVEY_SENT_ACTION,
  SURVEY_FAILED_ACTION,
  SURVEY_SEGMENTS,
  getSurveyAudience,
  surveyToken,
} from "@/lib/survey";

export const maxDuration = 60;

const PER_REQUEST = 40;
const PACE_MS = 600;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "للمالك فقط" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { segment?: unknown };
  const segment = SURVEY_SEGMENTS.find((s) => s.v === body.segment)?.v;
  if (!segment) {
    return NextResponse.json({ error: "شريحة غير صالحة" }, { status: 400 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "البريد غير مهيّأ (RESEND_API_KEY)" }, { status: 503 });
  }
  if (!surveyToken("check")) {
    return NextResponse.json({ error: "تعذّر إنشاء الروابط: AUTH_SECRET غير مضبوط" }, { status: 503 });
  }

  const audience = await getSurveyAudience(segment);
  const batch = audience.slice(0, PER_REQUEST);
  let sent = 0;
  const failed: { userId: string; email: string; error: string }[] = [];

  for (const [i, u] of batch.entries()) {
    if (i > 0) await sleep(PACE_MS);
    const url = `${SITE_URL}/survey?t=${encodeURIComponent(surveyToken(u.id) ?? "")}`;
    const { subject, html } = surveyInviteEmail(u.name, url);
    try {
      await sendEmail({ to: u.email, subject, html });
      sent++;
      // يُسجَّل فور الإرسال: لو انقطع النداء بعده لم تُعَد الرسالة إليه في النقرة التالية
      await db.auditLog.create({
        data: { userId: u.id, action: SURVEY_SENT_ACTION, entity: "survey", entityId: SURVEY_ID },
      });
    } catch (err) {
      failed.push({ userId: u.id, email: u.email, error: (err as Error).message || "تعذّر الإرسال" });
      // فشلٌ متتابع قبل أيّ نجاح يدلّ على خللٍ في الإعداد لا في العناوين (المُرسِل أو
      // المفتاح مثلاً): نتوقّف ولا نُسجّل أحداً مرفوضاً، فلا تحترق الشريحة بخللٍ عندنا.
      if (sent === 0 && failed.length >= 2) {
        return NextResponse.json({ error: failed[0].error }, { status: 502 });
      }
    }
  }

  // ما دام أحدٌ قد وصلته الرسالة فالرفض خاصٌّ بعناوين بعينها: يُسجَّل فلا تُعاد إليها
  if (sent > 0 && failed.length) {
    await db.auditLog.createMany({
      data: failed.map((f) => ({
        userId: f.userId,
        action: SURVEY_FAILED_ACTION,
        entity: "survey",
        entityId: SURVEY_ID,
        metadata: { email: f.email, error: f.error },
      })),
    });
  } else if (sent === 0 && failed.length) {
    return NextResponse.json({ error: failed[0].error }, { status: 502 });
  }

  await db.auditLog
    .create({
      data: {
        userId: session.user.id,
        action: "survey.dispatched",
        entity: "survey",
        entityId: SURVEY_ID,
        metadata: { segment, sent, failed: failed.length },
      },
    })
    .catch(() => {});

  return NextResponse.json({
    data: { sent, failed: failed.length, remaining: audience.length - batch.length },
  });
}
