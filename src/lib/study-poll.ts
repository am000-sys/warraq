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
  STUDY_MAX_SUMMARY_CHARS,
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
// حدود أمان لدفعات المتابعة (عند بلوغ سقف الإخراج) — تمنع انفلات التكلفة.
// السقف الحاكم هو حجم الملخّص المتراكم لا عدد المقاطع: المزوّد المتزامن يُخرج
// مقطعاً محدوداً في كلّ نداء (ليبقى داخل مهلة الدالّة)، فملخّص وافٍ يلزمه مقاطع
// كثيرة — وحصرُها في ثلاثة كان يقطعه في أوّله.
const MAX_CONTINUATIONS = Math.max(1, Number(process.env.STUDY_MAX_CONTINUATIONS) || 14);
// سقف حجم الملخّص المتراكم — مشترك مع الواجهة (يُبنى عليه سقف التغطية المعروض
// قبل التوليد والمحتسَب في السعر). فلا يُغيَّر في موضع دون الآخر.
const HARD_TOTAL_CHARS = STUDY_MAX_SUMMARY_CHARS;

// مهلة دالّة الاستطلاع (maxDuration=300) وما نحجزه منها للتسوية بعد آخر مقطع.
const POLL_MAX_MS = 300_000;
const RESERVE_MS = 25_000;
// أقلّ زمنٍ يستحقّ بدء مقطع جديد: أقصر منه لا يُنتج شيئاً ويُهدر نداءً. وما لم
// يُبدأ هنا تلتقطه القفزة التالية من السلسلة — لا شيء يضيع.
const MIN_ROUND_MS = Math.max(20_000, Number(process.env.STUDY_MIN_ROUND_MS) || 60_000);
// حدّ أعلى لعدد المقاطع في النداء الواحد — حارسٌ ثانٍ لا يعتمد على الساعة وحدها.
const MAX_ROUNDS = 8;

type PendingMeta = { batchId?: string } | null;

function batchIdOf(verification: unknown): string | null {
  if (verification && typeof verification === "object" && "batchId" in verification) {
    const v = (verification as { batchId?: unknown }).batchId;
    return typeof v === "string" && v ? v : null;
  }
  return null;
}

function continuationsOf(verification: unknown): number {
  if (verification && typeof verification === "object" && "cont" in verification) {
    const c = (verification as { cont?: unknown }).cont;
    return typeof c === "number" && c >= 0 ? c : 0;
  }
  return 0;
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

// advanced: أُرسل مقطع متابعة فعلاً في هذه الجولة — إشارة «ما زال ثمّة عمل
// يتقدّم»، تُقرّر بها سلسلة الاستدعاء الذاتيّة هل تُطلق قفزةً أخرى.
export type SettleResult = { checked: number; settled: number; advanced: number };

// يفحص الدفعات المعلّقة (لمستخدم بعينه أو للجميع) ويُقفل ما انتهى
export async function settleStudyBatches(userId?: string): Promise<SettleResult> {
  if (!isStudyConfigured) return { checked: 0, settled: 0, advanced: 0 };

  const pendings = await db.studySummary.findMany({
    where: { status: "PROCESSING", ...(userId ? { userId } : {}) },
    orderBy: { createdAt: "asc" },
    take: 10,
    include: { user: { select: { email: true, name: true } } },
  });
  if (pendings.length === 0) return { checked: 0, settled: 0, advanced: 0 };

  const cfg = await getStudyConfig();
  const startedAt = Date.now();
  let settled = 0;
  let advanced = 0;

  for (const first of pendings) {
    let rec = first;
    try {
      // سلسلة المقاطع: المزوّد المتزامن يُخرج مقطعاً محدوداً في كلّ نداء
      // (انظر CHUNK_TOKENS في kimi.ts)، فنَصِل المقاطع هنا ما دام الوقت يسمح.
      let rounds = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        rounds++;
        const batchId = batchIdOf(rec.verification);

        // سجلّ بلا معرّف دفعة: انهار الإرسال قبل حفظه — بعد مهلة كافية
        // يُعاد للمستخدم ماله وحالته ليُعيد المحاولة بضغطة واحدة.
        if (!batchId) {
          if (Date.now() - rec.updatedAt.getTime() < SUBMIT_STALE_MS) break;
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
          break;
        }

        const status = await checkStudyBatch(batchId);
        if (status.state === "processing") break;

        if (status.state === "succeeded") {
          // المنجَز المتراكم = ما حُفظ من مقاطع سابقة + ناتج هذه الدفعة
          const prior = rec.markdown ?? "";
          const accumulated = prior + status.markdown;
          const cont = continuationsOf(rec.verification);

          // بلغ سقف الإخراج ولم يُنهِ → دفعة متابعة تُكمل من المنجَز،
          // ضمن حدود أمان صارمة (عدد المتابعات + سقف الحجم الكلّي).
          if (
            status.truncated &&
            cont < MAX_CONTINUATIONS &&
            accumulated.length < HARD_TOTAL_CHARS
          ) {
            const context = await buildStudyContext(rec);
            if (context) {
              const system = buildStudySystemPrompt(
                rec.focus as StudyFocus[],
                rec.depth as StudyDepth,
              );
              // تعذُّر إرسال المتابعة لا يُعلّق السجلّ في PROCESSING إلى الأبد:
              // نسقط إلى التسوية أدناه فيُسلَّم المنجَز مع تنبيه الاقتطاع — وهو
              // عين ما يحدث عند بلوغ سقف المتابعات. (مثاله: نفاد نافذة النموذج
              // بعد تراكم المنجَز، فإعادة المحاولة بنفس المُدخَل لن تنجح أبداً.)
              try {
                const newBatchId = await submitStudyBatch({
                  model: rec.model,
                  system,
                  context,
                  maxTokens: maxTokensForBatch(
                    rec.depth as StudyDepth,
                    rec.model === cfg.modelPremium,
                  ),
                  checkpoint: accumulated,
                  // ما تبقّى فعلاً من مهلة هذه الدالّة — لا سقفاً ثابتاً.
                  budgetMs: POLL_MAX_MS - (Date.now() - startedAt) - RESERVE_MS,
                });
                const claimed = await db.studySummary.updateMany({
                  where: { id: rec.id, status: "PROCESSING" },
                  data: {
                    markdown: accumulated, // نقطة حفظ للمقطع التالي
                    verification: { batchId: newBatchId, cont: cont + 1 },
                    inputTokens: { increment: status.inputTokens },
                    outputTokens: { increment: status.outputTokens },
                  },
                });
                if (claimed.count === 0) {
                  await cancelStudyBatch(newBatchId);
                  break;
                }
                advanced++;
                // المزوّد المتزامن يعيد المقطع فوراً، فلا ننتظر جولة استطلاع
                // جديدة لكلّ مقطع: نُكمل هنا ما دام الوقت يسمح. وإلّا فالجولة
                // التالية تستأنف من نقطة الحفظ — لا شيء يضيع.
                const refreshed =
                  POLL_MAX_MS - (Date.now() - startedAt) - RESERVE_MS >= MIN_ROUND_MS &&
                  rounds < MAX_ROUNDS
                    ? await db.studySummary.findUnique({
                        where: { id: rec.id },
                        include: { user: { select: { email: true, name: true } } },
                      })
                    : null;
                if (!refreshed || refreshed.status !== "PROCESSING") break;
                rec = refreshed;
                continue;
              } catch (err) {
                console.error("[study.continue]", rec.id, err);
              }
            }
          }

          let markdown = accumulated;
          if (status.truncated) {
            markdown +=
              "\n\n> ⚠ **تنبيه:** بلغ الملخّص الحدّ الأقصى للطول فاعتُمد عند هذا الحدّ، **ولم تُحتسب في السعر إلّا الصفحات المغطّاة**. لتغطية الباقي: لخّص الجزء المتبقّي على حدة، أو أعِد التلخيص بعمقٍ أقلّ ليتّسع للمادّة كلّها.";
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
          if (claimed.count === 0) break; // جهة أخرى أقفلته قبلنا

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
          break;
        }

        if (status.state === "refused" && rec.model === cfg.modelPremium) {
          // رفضُ نموذج الفئة الأعلى → أعد الإرسال بالدقّة العالية وردّ الفرق
          const context = await buildStudyContext(rec);
          if (!context) {
            await failRecord(rec.id, rec.userId, rec.pagesCharged, "المصدر لم يعد متاحاً");
            settled++;
            break;
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
            break;
          }
          const standardCost = calcStudyCost(rec.sourcePages, false, cfg, rec.depth as StudyDepth);
          const diff = rec.pagesCharged - standardCost;
          if (diff > 0) await refund(rec.id, rec.userId, diff);
          break;
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
        break; // انتهى هذا السجلّ — لا مقطع تالٍ
      }
    } catch (err) {
      // خطأ عابر في فحص دفعة واحدة لا يوقف البقيّة — تُفحص في الجولة التالية
      console.error("[study.settle]", rec.id, err);
    }
  }

  return { checked: pendings.length, settled, advanced };
}

async function failRecord(id: string, userId: string, charged: number, message: string) {
  const claimed = await db.studySummary.updateMany({
    where: { id, status: "PROCESSING" },
    data: { status: "FAILED", errorMessage: message },
  });
  if (claimed.count > 0) await refund(id, userId, charged);
}
