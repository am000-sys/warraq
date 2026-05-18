// src/app/(admin)/admin/page.tsx — لوحة المالك الرئيسية
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ar } from "@/lib/utils";

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

  const revenueSar = (revenueThisMonth._sum.amountSar ?? 0) / 100;

  return (
    <div>
      <PageHeader
        title="لوحة المالك"
        subtitle="نظرة شاملة على المنصّة."
      />

      {/* Big stats */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 16 }}
      >
        <BigStat
          label="إيرادات هذا الشهر"
          value={`${revenueSar.toLocaleString("ar-SA")} ﷼`}
          accent
        />
        <BigStat label="الاشتراكات النشطة" value={ar(activeSubscriptions)} />
        <BigStat label="الصفحات المعالجة" value={ar(pagesProcessedThisMonth._sum.processedPages ?? 0)} />
      </div>

      {/* Small stats */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}
      >
        <SmallStat label="إجمالي المستخدمين" value={ar(totalUsers)} />
        <SmallStat label="جدد هذا الشهر" value={ar(newUsersThisMonth)} accent />
        <SmallStat label="المؤسسات" value={ar(totalOrgs)} />
        <SmallStat label="وظائف اليوم" value={ar(jobsToday)} />
      </div>

      {/* System health */}
      <div className="card" style={{ borderRadius: 16 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--carbon)",
            fontFamily: "Tajawal, sans-serif",
            marginBottom: 18,
          }}
        >
          صحّة النظام
        </h2>
        <div
          className="grid"
          style={{ gridTemplateColumns: "1fr 1fr", gap: 24 }}
        >
          <HealthRow
            label="وظائف فاشلة اليوم"
            value={ar(failedJobsToday)}
            danger={failedJobsToday > 5}
          />
          <HealthRow label="إجمالي وظائف الشهر" value={ar(jobsThisMonth)} />
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
      style={{
        background: accent ? "var(--slate)" : "var(--snow)",
        borderRadius: 16,
        padding: 22,
        border: accent ? "1px solid rgba(246,146,81,0.25)" : "1px solid var(--border-sub)",
        boxShadow: accent
          ? "0 8px 32px rgba(36,36,51,0.18)"
          : "var(--shadow-card)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: accent ? "rgba(255,255,255,0.5)" : "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 300,
          fontFamily: "Tajawal, sans-serif",
          color: accent ? "var(--orange)" : "var(--carbon)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SmallStat({
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
      className="card"
      style={{
        borderRadius: 14,
        padding: "16px 18px",
        border: accent ? "1px solid rgba(246,146,81,0.25)" : "1px solid var(--border-sub)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 400,
          fontFamily: "Tajawal, sans-serif",
          color: accent ? "var(--orange)" : "var(--carbon)",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function HealthRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p
        style={{
          fontSize: 12,
          color: "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 4,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 22,
          fontWeight: 500,
          color: danger ? "var(--rose)" : "var(--carbon)",
          fontFamily: "Tajawal, sans-serif",
        }}
      >
        {value}
      </p>
    </div>
  );
}
