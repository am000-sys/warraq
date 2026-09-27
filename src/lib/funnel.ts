// src/lib/funnel.ts — مسار التحويل: أين يتوقّف المستخدمون بين التسجيل والشراء
//
// كلّه قراءةٌ من الجداول القائمة (بلا جداول جديدة). المرحلة الوحيدة التي تحتاج
// تتبّعاً هي «فتح صفحة الشحن»، وتُسجَّل في AuditLog بالحدث BILLING_VIEW_ACTION.
import { db } from "@/lib/db";
import { FREE_INITIAL_PAGES } from "@/lib/billing";

export const BILLING_VIEW_ACTION = "billing.view";

// «رصيدٌ أوشك على النفاد»: ما لا يكفي كتيّباً صغيراً — هنا يُقرَّر الشراء
export const LOW_BALANCE = 10;

export type FunnelStage = { key: string; label: string; count: number };

export type FunnelUser = {
  id: string;
  name: string | null;
  email: string;
  createdAt: Date;
  verified: boolean;
  jobs: number;
  completedJobs: number;
  failedJobs: number;
  pagesUsed: number;
  balance: number;
  lastJobAt: Date | null;
  billingViews: number;
  topups: { pending: number; approved: number; rejected: number };
  paid: boolean;
  // الخطوة التالية المقترحة للمالك مع هذا المستخدم
  hint: { tone: "hot" | "warn" | "idle"; text: string };
};

function hintFor(u: Omit<FunnelUser, "hint">): FunnelUser["hint"] {
  if (u.topups.pending > 0) return { tone: "hot", text: "طلب شحنٍ بانتظار اعتمادك" };
  if (u.paid || u.topups.approved > 0) return { tone: "idle", text: "عميلٌ دافع" };
  if (!u.verified) return { tone: "warn", text: "لم يفعّل بريده — لا يستطيع الدخول" };
  if (u.jobs === 0) return { tone: "warn", text: "لم يرفع ملفّاً بعد" };
  if (u.completedJobs === 0 && u.failedJobs > 0) return { tone: "hot", text: "فشلت معالجته — تواصل معه قبل أن يغادر" };
  if (u.balance <= LOW_BALANCE && u.billingViews > 0) return { tone: "hot", text: "نفد رصيده وفتح صفحة الشحن ولم يشترِ" };
  if (u.balance <= LOW_BALANCE) return { tone: "hot", text: "رصيده أوشك على النفاد — مرشّحٌ للشراء" };
  return { tone: "idle", text: "جرّب وما زال في رصيده المجانيّ" };
}

export async function getFunnel() {
  // المستخدمون فقط — لا حساب المالك
  const users = await db.user.findMany({
    where: { systemRole: "USER" },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, name: true, email: true, createdAt: true, emailVerified: true, pagesBalance: true },
  });
  const ids = users.map((u) => u.id);

  const [jobAgg, completedAgg, failedAgg, views, topups, paidTx, trial] = await Promise.all([
    db.job.groupBy({
      by: ["userId"],
      where: { userId: { in: ids } },
      _count: { _all: true },
      _sum: { processedPages: true },
      _max: { createdAt: true },
    }),
    db.job.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: "COMPLETED" }, _count: { _all: true } }),
    db.job.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: "FAILED" }, _count: { _all: true } }),
    db.auditLog.groupBy({ by: ["userId"], where: { action: BILLING_VIEW_ACTION, userId: { in: ids } }, _count: { _all: true } }),
    db.topUpRequest.groupBy({ by: ["userId", "status"], where: { userId: { in: ids } }, _count: { _all: true } }),
    db.transaction.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: "SUCCEEDED" }, _count: { _all: true } }),
    db.trialUsage.aggregate({ _count: { _all: true }, _sum: { count: true } }).catch(() => null),
  ]);

  const by = <T extends { userId: string | null }>(rows: T[]) => new Map(rows.map((r) => [r.userId, r]));
  const jobsM = by(jobAgg), doneM = by(completedAgg), failM = by(failedAgg), viewM = by(views), paidM = by(paidTx);

  const rows: FunnelUser[] = users.map((u) => {
    const t = { pending: 0, approved: 0, rejected: 0 };
    for (const r of topups) {
      if (r.userId !== u.id) continue;
      if (r.status === "PENDING") t.pending += r._count._all;
      else if (r.status === "APPROVED") t.approved += r._count._all;
      else if (r.status === "REJECTED") t.rejected += r._count._all;
    }
    const base = {
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      verified: !!u.emailVerified,
      jobs: jobsM.get(u.id)?._count._all ?? 0,
      completedJobs: doneM.get(u.id)?._count._all ?? 0,
      failedJobs: failM.get(u.id)?._count._all ?? 0,
      pagesUsed: jobsM.get(u.id)?._sum.processedPages ?? 0,
      balance: u.pagesBalance,
      lastJobAt: jobsM.get(u.id)?._max.createdAt ?? null,
      billingViews: viewM.get(u.id)?._count._all ?? 0,
      topups: t,
      paid: (paidM.get(u.id)?._count._all ?? 0) > 0,
    };
    return { ...base, hint: hintFor(base) };
  });

  const count = (f: (u: FunnelUser) => boolean) => rows.filter(f).length;
  const stages: FunnelStage[] = [
    { key: "signup", label: "سجّل", count: rows.length },
    { key: "verified", label: "فعّل بريده", count: count((u) => u.verified) },
    { key: "uploaded", label: "رفع ملفّاً", count: count((u) => u.jobs > 0) },
    { key: "completed", label: "اكتمل له تفريغ", count: count((u) => u.completedJobs > 0) },
    { key: "low", label: `بقي له ≤ ${LOW_BALANCE} صفحات`, count: count((u) => u.balance <= LOW_BALANCE) },
    { key: "billing", label: "فتح صفحة الشحن", count: count((u) => u.billingViews > 0) },
    { key: "topup", label: "طلب شحناً", count: count((u) => u.topups.pending + u.topups.approved + u.topups.rejected > 0) },
    { key: "paid", label: "دفع", count: count((u) => u.paid || u.topups.approved > 0) },
  ];

  return {
    stages,
    rows,
    freePages: FREE_INITIAL_PAGES,
    trial: trial ? { visitors: trial._count._all, uses: trial._sum.count ?? 0 } : null,
  };
}

// تسجيل فتح صفحة الشحن — مرّةً كلّ نصف ساعة للمستخدم، فلا ينتفخ السجلّ بالتحديث
export async function trackBillingView(userId: string) {
  try {
    const recent = await db.auditLog.findFirst({
      where: { userId, action: BILLING_VIEW_ACTION, createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } },
      select: { id: true },
    });
    if (!recent) await db.auditLog.create({ data: { userId, action: BILLING_VIEW_ACTION } });
  } catch {
    // التتبّع لا يُفشل الصفحة أبداً
  }
}
