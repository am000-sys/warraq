// src/app/api/admin/survey/send/route.ts — إرسال الاستبيان بالبريد إلى شريحة (للمالك)
//
// كلّ مستخدمٍ يأخذ رابطاً شخصيّاً موقَّعاً، ويُسجَّل «survey.sent» بعد قبول Resend
// للدفعة فقط — فلا يُحسب إرسالٌ لم يقع، ولا تصل الرسالة أحداً مرّتين.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { BATCH_LIMIT, sendEmailBatch, surveyInviteEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import {
  SURVEY_ID,
  SURVEY_SENT_ACTION,
  SURVEY_SEGMENTS,
  getSurveyAudience,
  surveyToken,
} from "@/lib/survey";

export const maxDuration = 60;

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
  if (!surveyToken("check")) {
    return NextResponse.json({ error: "تعذّر إنشاء الروابط: AUTH_SECRET غير مضبوط" }, { status: 503 });
  }

  const audience = await getSurveyAudience(segment);
  let sent = 0;
  try {
    for (let i = 0; i < audience.length; i += BATCH_LIMIT) {
      const chunk = audience.slice(i, i + BATCH_LIMIT);
      await sendEmailBatch(
        chunk.map((u) => {
          const url = `${SITE_URL}/survey?t=${encodeURIComponent(surveyToken(u.id) ?? "")}`;
          const { subject, html } = surveyInviteEmail(u.name, url);
          return { to: u.email, subject, html };
        }),
      );
      await db.auditLog.createMany({
        data: chunk.map((u) => ({
          userId: u.id,
          action: SURVEY_SENT_ACTION,
          entity: "survey",
          entityId: SURVEY_ID,
        })),
      });
      sent += chunk.length;
    }
  } catch (err) {
    const message = (err as Error).message || "تعذّر الإرسال";
    return NextResponse.json(
      { error: sent ? `أُرسل إلى ${sent} ثمّ توقّف: ${message}` : message },
      { status: 502 },
    );
  }

  await db.auditLog
    .create({
      data: {
        userId: session.user.id,
        action: "survey.dispatched",
        entity: "survey",
        entityId: SURVEY_ID,
        metadata: { segment, sent },
      },
    })
    .catch(() => {});

  return NextResponse.json({ data: { sent } });
}
