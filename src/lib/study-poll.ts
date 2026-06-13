// src/lib/study-poll.ts — تسوية دفعات الملخّص الدراسي المعلّقة
// يفحص السجلّات قيد المعالجة (دفعة مُرسَلة إلى Anthropic) ويُقفل ما انتهى:
// نجاح → حفظ + فحص نقول + بريد إشعار. رفضُ نموذجِ الفئة الأعلى → إعادة
// إرسال بالدقّة العالية مع ردّ فرق السعر. فشل → استرداد كامل + FAILED.
//
// آمن للتوازي (الصفحة + مؤقّت العميل + cron قد تتزامن): كلّ أثرٍ جانبيّ
// (بريد/استرداد) خلف مطالبة ذرّية updateMany — جهة واحدة فقط تفوز بها.
import { db } from "@/lib/db";
import { queueEmail, APP_URL } from "@/lib/email";
import {
  buildStudyContext,
  calcStudyCost,
  cancelStudyBatch,
  checkStudyBatch,
  getStudyConfig,
  isStudyConfigured,
  maxTokensForBatch,
  buildStudySystemPrompt,
  submitStudyBatch,
  verifyQuotes,
  type StudyDepth,
  type StudyFocus,
} from "@/lib/study";

// أقصى عمر لسجلّ PROCESSING بلا معرّف دفعة (انهار الإرسال قبل الحفظ)
const SUBMIT_STALE_MS = 10 * 60 * 1000;

type PendingMeta = { batchId?: string } | null;

function batchIdOf(verification: unknown): string | null {
  if (verification && typeof verification === "object" && "batchId" in verification) {
    const v = (verification as { batchId?: unknown }).batchId;
    return typeof v === "string" && v ? v : null;
  }
  return null;
}

function studyCompletedEmail(name: string, title: string) {
  return {
    subject: `ملخّصك الدراسي جاهز: "${title}" — وَرَّاق`,
    html: `
      <div style="font-family: 'Tajawal', sans-serif; direction: rtl; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="font-weight: 500; color: #181825;">مرحباً ${name}،</h2>
        <p style="color: #484758; line-height: 1.8;">
          اكتمل توليد ملخّصك الدراسي بنجاح وهو جاهز للمذاكرة والتنزيل بصيغة Word.
        </p>
        <div style="background: #f7f7f7; border-radius: 16px; padding: 20px 24px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 500; color: #181825;">${title}</p>
        </div>
        <a href="${APP_URL}/study"
           style="display: inline-block; background: #f69251; color: #000; padding: 12px 28px; border-radius: 28px; text-decoration: none; font-weight: 500; margin: 8px 0;">
          عرض الملخّص
        </a>
      </div>
    `,
  };
}

// استرداد مبلغ لسجلّ معيّن — يُستدعى فقط بعد الفوز بمطالبة ذرّية
async function refund(recId: string, userId: string, amount: number) {
  if (amount <= 0) return;
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { pagesBalance: { increment: amount } } }),
    db.studySummary.update({ where: { id: recId }, data: { pagesCharged: { decrement: amount } } }),
  ]);
}

export type SettleResult = { checked: number; settled: number };

// يفحص الدفعات المعلّقة (لمستخدم بعينه أو للجميع) ويُقفل ما انتهى
export async function settleStudyBatches(userId?: string): Promise<SettleResult> {
  if (!isStudyConfigured) return { checked: 0, settled: 0 };

  const pendings = await db.studySummary.findMany({
    where: { status: "PROCESSING", ...(userId ? { userId } : {}) },
    orderBy: { createdAt: "asc" },
    take: 10,
    include: { user: { select: { email: true, name: true } } },
  });
  if (pendings.length === 0) return { checked: 0, settled: 0 };

  const cfg = await getStudyConfig();
  let settled = 0;

  for (const rec of pendings) {
    try {
      const batchId = batchIdOf(rec.verification);

      // سجلّ بلا معرّف دفعة: انهار الإرسال قبل حفظه — بعد مهلة كافية
      // يُعاد للمستخدم ماله وحالته ليُعيد المحاولة بضغطة واحدة.
      if (!batchId) {
        if (Date.now() - rec.updatedAt.getTime() < SUBMIT_STALE_MS) continue;
        const claimed = await db.studySummary.updateMany({
          where: { id: rec.id, status: "PROCESSING" },
          data: {
            status: "FAILED",
            errorMessage: "انقطع إرسال المهمة — أعد المحاولة، لم يُخصم من رصيدك شيء.",
          },
        });
        if (claimed.count > 0) {
          await refund(rec.id, rec.userId, rec.pagesCharged);
          settled++;
        }
        continue;
      }

      const status = await checkStudyBatch(batchId);
      if (status.state === "processing") continue;

      if (status.state === "succeeded") {
        let markdown = status.markdown;
        if (status.truncated) {
          markdown += "\n\n> ⚠ **تنبيه:** بلغ الملخّص سقف الحجم المسموح فاعتُمد عند هذا الحدّ.";
        }
        const context = await buildStudyContext(rec);
        const verification = context
          ? verifyQuotes(markdown, context)
          : { total: 0, verified: 0, missing: [] };

        const claimed = await db.studySummary.updateMany({
          where: { id: rec.id, status: "PROCESSING" },
          data: {
            status: "COMPLETED",
            markdown,
            verification,
            inputTokens: { increment: status.inputTokens },
            outputTokens: { increment: status.outputTokens },
            completedAt: new Date(),
            errorMessage: null,
          },
        });
        if (claimed.count === 0) continue; // جهة أخرى أقفلته قبلنا

        settled++;
        await db.auditLog
          .create({
            data: {
              userId: rec.userId,
              action: "study.generate",
              entity: "study_summary",
              entityId: rec.id,
              metadata: {
                sourcePages: rec.sourcePages,
                charged: rec.pagesCharged,
                model: rec.model,
                batch: true,
              },
            },
          })
          .catch(() => {});
        if (rec.user?.email) {
          queueEmail(
            {
              to: rec.user.email,
              ...studyCompletedEmail(rec.user.name || "عزيزي الباحث", rec.title),
            },
            "study.completed",
          );
        }
        continue;
      }

      if (status.state === "refused" && rec.model === cfg.modelPremium) {
        // رفضُ نموذج الفئة الأعلى → أعد الإرسال بالدقّة العالية وردّ الفرق
        const context = await buildStudyContext(rec);
        if (!context) {
          await failRecord(rec.id, rec.userId, rec.pagesCharged, "المصدر لم يعد متاحاً");
          settled++;
          continue;
        }
        const system = buildStudySystemPrompt(
          rec.focus as StudyFocus[],
          rec.depth as StudyDepth,
        );
        const newBatchId = await submitStudyBatch({
          model: cfg.model,
          system,
          context,
          maxTokens: maxTokensForBatch(rec.depth as StudyDepth, false),
        });
        const claimed = await db.studySummary.updateMany({
          where: { id: rec.id, status: "PROCESSING" },
          data: { model: cfg.model, verification: { batchId: newBatchId } },
        });
        if (claimed.count === 0) {
          await cancelStudyBatch(newBatchId);
          continue;
        }
        const standardCost = calcStudyCost(rec.sourcePages, false, cfg);
        const diff = rec.pagesCharged - standardCost;
        if (diff > 0) await refund(rec.id, rec.userId, diff);
        continue;
      }

      // فشل نهائي (أو رفضٌ بالدقّة العالية نفسها)
      const message =
        status.state === "refused"
          ? "اعتذر النموذج عن معالجة هذا المحتوى — راجع المادّة أو تواصل مع الدعم."
          : status.message;
      const claimed = await db.studySummary.updateMany({
        where: { id: rec.id, status: "PROCESSING" },
        data: { status: "FAILED", errorMessage: message },
      });
      if (claimed.count > 0) {
        await refund(rec.id, rec.userId, rec.pagesCharged);
        settled++;
        await db.auditLog
          .create({
            data: {
              userId: rec.userId,
              action: "study.failed",
              entity: "study_summary",
              entityId: rec.id,
              metadata: { refunded: rec.pagesCharged },
            },
          })
          .catch(() => {});
      }
    } catch (err) {
      // خطأ عابر في فحص دفعة واحدة لا يوقف البقيّة — تُفحص في الجولة التالية
      console.error("[study.settle]", rec.id, err);
    }
  }

  return { checked: pendings.length, settled };
}

async function failRecord(id: string, userId: string, charged: number, message: string) {
  const claimed = await db.studySummary.updateMany({
    where: { id, status: "PROCESSING" },
    data: { status: "FAILED", errorMessage: message },
  });
  if (claimed.count > 0) await refund(id, userId, charged);
}
