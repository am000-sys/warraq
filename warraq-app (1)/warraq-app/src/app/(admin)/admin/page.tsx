// src/app/(admin)/admin/page.tsx
import { db } from "@/lib/db";

export default async function AdminDashboardPage() {
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

  const revenueSar = ((revenueThisMonth._sum.amountSar ?? 0) / 100).toFixed(2);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">لوحة المالك</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <BigStat
          label="إيرادات هذا الشهر"
          value={`${parseInt(revenueSar).toLocaleString("ar-SA")} ﷼`}
          accent
        />
        <BigStat label="الاشتراكات النشطة" value={activeSubscriptions.toLocaleString("ar-SA")} />
        <BigStat
          label="الصفحات هذا الشهر"
          value={(pagesProcessedThisMonth._sum.processedPages ?? 0).toLocaleString("ar-SA")}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <SmallStat label="المستخدمون" value={totalUsers} />
        <SmallStat label="جدد هذا الشهر" value={newUsersThisMonth} />
        <SmallStat label="المؤسسات" value={totalOrgs} />
        <SmallStat label="وظائف اليوم" value={jobsToday} />
      </div>

      <div className="bg-white border rounded-2xl p-4 mb-6">
        <h2 className="font-bold mb-3">صحّة النظام</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-500">وظائف فاشلة اليوم</p>
            <p className={`font-bold ${failedJobsToday > 5 ? "text-red-600" : ""}`}>
              {failedJobsToday}
            </p>
          </div>
          <div>
            <p className="text-gray-500">إجمالي وظائف الشهر</p>
            <p className="font-bold">{jobsThisMonth.toLocaleString("ar-SA")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-5 rounded-2xl border ${
        accent ? "bg-[#0A2E54] text-white" : "bg-white"
      }`}
    >
      <p className={`text-sm ${accent ? "text-white/70" : "text-gray-500"}`}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border rounded-xl p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-bold">{value.toLocaleString("ar-SA")}</p>
    </div>
  );
}
