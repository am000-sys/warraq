// src/app/(admin)/admin/page.tsx — مركز تحكّم المالك
import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, StatusPill } from "@/components/page-header";
import { ar } from "@/lib/utils";
import { modelName } from "@/lib/models";
import {
  Wallet,
  Users,
  FileText,
  TrendingUp,
  Clock,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalUsers,
    newUsersThisMonth,
    activeSubscriptions,
    jobsToday,
    jobsThisMonth,
    revenueThisMonth,
    revenueAllTime,
    pagesProcessedAllTime,
    pagesThisMonth,
    failedJobsToday,
    pendingTopups,
    recentTopups,
    recentUsers,
    recentJobs,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.subscription.count({ where: { status: "ACTIVE" } }),
    db.job.count({ where: { createdAt: { gte: startOfDay } } }),
    db.job.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.transaction.aggregate({
      where: { status: "SUCCEEDED", createdAt: { gte: startOfMonth }, type: { in: ["SUBSCRIPTION", "ONE_TIME"] } },
      _sum: { amountSar: true },
    }),
    db.transaction.aggregate({
      where: { status: "SUCCEEDED", type: { in: ["SUBSCRIPTION", "ONE_TIME"] } },
      _sum: { amountSar: true },
    }),
    db.job.aggregate({ where: { status: "COMPLETED" }, _sum: { processedPages: true } }),
    db.job.aggregate({
      where: { status: "COMPLETED", completedAt: { gte: startOfMonth } },
      _sum: { processedPages: true },
    }),
    db.job.count({ where: { status: "FAILED", createdAt: { gte: startOfDay } } }),
    db.topUpRequest.count({ where: { status: "PENDING" } }).catch(() => 0),
    db.topUpRequest
      .findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" }, take: 4 })
      .catch(() => []),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, pagesBalance: true, createdAt: true },
    }),
    db.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, fileName: true, status: true, model: true, totalPages: true, createdAt: true },
    }),
  ]);

  const revenueMonth = (revenueThisMonth._sum.amountSar ?? 0) / 100;
  const revenueTotal = (revenueAllTime._sum.amountSar ?? 0) / 100;

  // أسماء أصحاب طلبات الشحن المعلّقة
  const topupUserIds = [...new Set(recentTopups.map((t) => t.userId))];
  const topupUsers = topupUserIds.length
    ? await db.user.findMany({ where: { id: { in: topupUserIds } }, select: { id: true, email: true } })
    : [];
  const topupEmail = Object.fromEntries(topupUsers.map((u) => [u.id, u.email]));

  return (
    <div>
      <PageHeader title="مركز تحكّم المالك" subtitle="نظرة شاملة على وَرَّاق وأدوات الإدارة." />

      {/* تنبيه الطلبات المعلّقة */}
      {pendingTopups > 0 && (
        <Link
          href="/admin/topups"
          className="flex items-center justify-between no-underline mb-5"
          style={{
            background: "var(--orange-soft)",
            border: "1px solid rgba(246,146,81,0.3)",
            borderRadius: 14,
            padding: "16px 20px",
          }}
        >
          <div className="flex items-center gap-3">
            <Wallet size={20} color="var(--orange)" />
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>
              لديك {ar(pendingTopups)} طلب شحن بانتظار المراجعة
            </span>
          </div>
          <ArrowLeft size={18} color="var(--orange)" />
        </Link>
      )}

      {/* KPIs الرئيسيّة */}
      <div className="grid wq-grid-4" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 14 }}>
        <Kpi icon={TrendingUp} label="إيرادات الشهر" value={`${revenueMonth.toLocaleString("ar-SA")} ﷼`} accent />
        <Kpi icon={Wallet} label="إجمالي الإيرادات" value={`${revenueTotal.toLocaleString("ar-SA")} ﷼`} />
        <Kpi icon={Users} label="المستخدمون" value={ar(totalUsers)} sub={`+${ar(newUsersThisMonth)} هذا الشهر`} />
        <Kpi icon={FileText} label="صفحات مُعالَجة" value={ar(pagesProcessedAllTime._sum.processedPages ?? 0)} sub="الإجمالي" />
      </div>

      <div className="grid wq-grid-4" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        <Small label="اشتراكات نشطة" value={ar(activeSubscriptions)} />
        <Small label="صفحات هذا الشهر" value={ar(pagesThisMonth._sum.processedPages ?? 0)} />
        <Small label="وظائف اليوم" value={ar(jobsToday)} />
        <Small label="وظائف فاشلة اليوم" value={ar(failedJobsToday)} danger={failedJobsToday > 5} />
      </div>

      <div className="grid wq-grid-2" style={{ gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* طلبات الشحن المعلّقة */}
        <div className="card" style={{ borderRadius: 16 }}>
          <SectionHead title="طلبات الشحن المعلّقة" href="/admin/topups" />
          {recentTopups.length === 0 ? (
            <Empty text="لا طلبات معلّقة" icon={Wallet} />
          ) : (
            recentTopups.map((t, i) => (
              <div
                key={t.id}
                className="flex items-center justify-between"
                style={{ padding: "11px 4px", borderBottom: i < recentTopups.length - 1 ? "1px solid var(--border-sub)" : "none" }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>
                    {ar(t.pages)} صفحة · {ar(Math.round(t.amountSar / 100))} ﷼
                  </div>
                  <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
                    {topupEmail[t.userId] ?? t.senderName}
                  </div>
                </div>
                <StatusPill status="بانتظار" variant="processing" />
              </div>
            ))
          )}
        </div>

        {/* آخر المستخدمين */}
        <div className="card" style={{ borderRadius: 16 }}>
          <SectionHead title="أحدث المستخدمين" href="/admin/users" />
          {recentUsers.map((u, i) => (
            <div
              key={u.id}
              className="flex items-center justify-between"
              style={{ padding: "11px 4px", borderBottom: i < recentUsers.length - 1 ? "1px solid var(--border-sub)" : "none" }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>
                  {u.name || u.email.split("@")[0]}
                </div>
                <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Inter, sans-serif", direction: "ltr", textAlign: "right" }}>
                  {u.email}
                </div>
              </div>
              <span style={{ fontSize: 11, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
                {ar(u.pagesBalance)} صفحة
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* آخر الوظائف على المنصّة */}
      <div className="card" style={{ borderRadius: 16, marginTop: 18 }}>
        <SectionHead title="آخر الوظائف على المنصّة" href="/admin/jobs" />
        {recentJobs.length === 0 ? (
          <Empty text="لا وظائف بعد" icon={FileText} />
        ) : (
          recentJobs.map((j, i) => (
            <div
              key={j.id}
              className="flex items-center justify-between"
              style={{ padding: "11px 4px", borderBottom: i < recentJobs.length - 1 ? "1px solid var(--border-sub)" : "none" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <FileText size={16} color="var(--stone)" style={{ flexShrink: 0 }} />
                <div className="min-w-0">
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>
                    {j.fileName}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
                    {ar(j.totalPages)} صفحة · {modelName(j.model)}
                  </div>
                </div>
              </div>
              <JobPill status={j.status} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        background: accent ? "var(--slate)" : "var(--snow)",
        borderRadius: 16,
        padding: 20,
        border: accent ? "1px solid rgba(246,146,81,0.25)" : "1px solid var(--border-sub)",
        boxShadow: accent ? "0 8px 32px rgba(36,36,51,0.18)" : "var(--shadow-card)",
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
        <Icon size={15} color={accent ? "var(--orange)" : "var(--pebble)"} />
        <span style={{ fontSize: 12, color: accent ? "rgba(255,255,255,0.5)" : "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
          {label}
        </span>
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 300,
          color: accent ? "var(--orange)" : "var(--carbon)",
          fontFamily: "Tajawal, sans-serif",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: accent ? "rgba(255,255,255,0.4)" : "var(--pebble)", fontFamily: "Tajawal, sans-serif", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Small({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="card" style={{ borderRadius: 14, padding: "16px 18px" }}>
      <div style={{ fontSize: 11, color: "var(--stone)", fontFamily: "Tajawal, sans-serif", marginBottom: 6 }}>{label}</div>
      <div className="flex items-center gap-1.5">
        {danger && <AlertTriangle size={14} color="var(--rose)" />}
        <span style={{ fontSize: 22, fontWeight: 400, color: danger ? "var(--rose)" : "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function SectionHead({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>{title}</span>
      <Link href={href} className="no-underline flex items-center gap-1" style={{ fontSize: 12, color: "var(--orange)", fontFamily: "Tajawal, sans-serif" }}>
        عرض الكل <ArrowLeft size={13} />
      </Link>
    </div>
  );
}

function Empty({ text, icon: Icon }: { text: string; icon: React.ElementType }) {
  return (
    <div className="text-center" style={{ padding: "28px 0", color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
      <Icon size={26} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
      <p style={{ fontSize: 13 }}>{text}</p>
    </div>
  );
}

function JobPill({ status }: { status: string }) {
  const map: Record<string, { l: string; v: "success" | "processing" | "danger" | "neutral" }> = {
    COMPLETED: { l: "مكتملة", v: "success" },
    PROCESSING: { l: "معالجة", v: "processing" },
    FAILED: { l: "فشلت", v: "danger" },
    PENDING: { l: "بانتظار", v: "neutral" },
  };
  const e = map[status] || { l: status, v: "neutral" as const };
  return <StatusPill status={e.l} variant={e.v} />;
}
