// src/app/api/admin/stats/route.ts
// ─────────────────────────
// إحصائيات لوحة المالك
// ─────────────────────────

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 403 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalUsers,
    newUsersThisMonth,
    totalOrgs,
    activeSubscriptions,
    jobsToday,
    jobsThisMonth,
    revenueThisMonth,
    pagesProcessedThisMonth,
    failedJobsToday,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.organization.count(),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.job.count({ where: { createdAt: { gte: startOfDay } } }),
    db.job.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.transaction.aggregate({
      where: {
        status: "SUCCEEDED",
        createdAt: { gte: startOfMonth },
        type: { in: ["SUBSCRIPTION", "ONE_TIME"] },
      },
      _sum: { amountSar: true },
    }),
    db.job.aggregate({
      where: { status: "COMPLETED", completedAt: { gte: startOfMonth } },
      _sum: { processedPages: true },
    }),
    db.job.count({
      where: { status: "FAILED", createdAt: { gte: startOfDay } },
    }),
  ]);

  return NextResponse.json({
    users: { total: totalUsers, newThisMonth: newUsersThisMonth },
    orgs: { total: totalOrgs },
    subscriptions: { active: activeSubscriptions },
    jobs: {
      today: jobsToday,
      thisMonth: jobsThisMonth,
      failedToday: failedJobsToday,
    },
    revenue: {
      thisMonthHalala: revenueThisMonth._sum.amountSar ?? 0,
      thisMonthSar: ((revenueThisMonth._sum.amountSar ?? 0) / 100).toFixed(2),
    },
    pagesProcessed: {
      thisMonth: pagesProcessedThisMonth._sum.processedPages ?? 0,
    },
  });
}
