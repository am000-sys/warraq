// src/app/(app)/dashboard/page.tsx — لوحة التحكم
// مرجع: design-reference/warraq-v3.html (function Dashboard, section='home')
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusPill } from "@/components/page-header";
import { ar } from "@/lib/utils";
import { FileText, Image as ImageIcon, Plus } from "lucide-react";

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;

  const [recentJobs, totalJobs, monthlyAgg, processingJobs] = await Promise.all([
    db.job.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        fileName: true,
        totalPages: true,
        status: true,
        model: true,
        createdAt: true,
      },
    }),
    db.job.count({ where: { userId: user.id, status: "COMPLETED" } }),
    db.job.aggregate({
      where: {
        userId: user.id,
        completedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { processedPages: true },
    }),
    db.job.count({ where: { userId: user.id, status: "PROCESSING" } }),
  ]);

  const monthlyPages = monthlyAgg._sum.processedPages ?? 0;
  const greeting = greetingByHour();
  const firstName = (user.name || user.email).split(" ")[0];

  return (
    <>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontFamily: "Tajawal, sans-serif",
            fontSize: 28,
            fontWeight: 400,
            color: "var(--carbon)",
            letterSpacing: "-0.01em",
            marginBottom: 6,
          }}
        >
          {greeting}، {firstName} 👋
        </h1>
        <p
          className="font-light"
          style={{ fontSize: 14, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}
        >
          لديك{" "}
          <span style={{ color: "var(--orange)", fontWeight: 500 }}>
            {ar(user.pagesBalance)}
          </span>{" "}
          صفحة متبقية هذا الشهر
        </p>
      </div>

      {/* Stats */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}
      >
        <StatCard
          label="صفحات هذا الشهر"
          value={ar(monthlyPages)}
          sub="مكتملة"
        />
        <StatCard
          label="الوظائف المكتملة"
          value={ar(totalJobs)}
          sub="الإجمالي"
        />
        <StatCard
          label="الرصيد المتبقي"
          value={ar(user.pagesBalance)}
          sub="صفحة"
        />
        <StatCard
          label="قيد المعالجة"
          value={ar(processingJobs)}
          sub="وظيفة الآن"
        />
      </div>

      {/* Recent jobs */}
      <div className="card" style={{ borderRadius: 16 }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--carbon)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            آخر الوظائف
          </span>
          <Link
            href="/upload"
            className="btn-primary no-underline"
            style={{ fontSize: 12, padding: "8px 18px" }}
          >
            <Plus size={14} strokeWidth={2} /> رفع ملف
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div
            className="text-center"
            style={{
              padding: "48px 20px",
              color: "var(--pebble)",
              fontFamily: "Tajawal, sans-serif",
              fontSize: 14,
            }}
          >
            لا توجد وظائف بعد. ابدأ برفع ملف.
          </div>
        ) : (
          recentJobs.map((job, i) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center gap-3.5 cursor-pointer transition-colors no-underline hover:bg-fog"
              style={{
                padding: "11px 10px",
                borderRadius: 10,
                borderBottom: i < recentJobs.length - 1 ? "1px solid var(--border-sub)" : "none",
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 38,
                  height: 38,
                  background: "var(--fog)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                }}
              >
                {job.fileName.endsWith(".pdf") ? (
                  <FileText size={18} color="var(--stone)" />
                ) : (
                  <ImageIcon size={18} color="var(--stone)" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="truncate"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--carbon)",
                    fontFamily: "Tajawal, sans-serif",
                    marginBottom: 2,
                  }}
                >
                  {job.fileName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--pebble)",
                    fontFamily: "Tajawal, sans-serif",
                  }}
                >
                  {ar(job.totalPages)} صفحة · {job.model} ·{" "}
                  {new Date(job.createdAt).toLocaleDateString("ar-SA")}
                </div>
              </div>
              <JobStatusPill status={job.status} />
            </Link>
          ))
        )}
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card" style={{ borderRadius: 16, padding: "20px 22px" }}>
      <div
        style={{
          fontSize: 12,
          color: "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 300,
          fontFamily: "Tajawal, sans-serif",
          color: "var(--carbon)",
          letterSpacing: "-0.02em",
          marginBottom: 4,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
        {sub}
      </div>
    </div>
  );
}

function JobStatusPill({ status }: { status: string }) {
  const map: Record<string, { l: string; v: "success" | "processing" | "danger" | "neutral" }> = {
    COMPLETED: { l: "مكتملة", v: "success" },
    PROCESSING: { l: "معالجة", v: "processing" },
    FAILED: { l: "فشلت", v: "danger" },
    PENDING: { l: "بانتظار", v: "neutral" },
    QUEUED: { l: "بالطابور", v: "neutral" },
  };
  const e = map[status] || { l: status, v: "neutral" as const };
  return <StatusPill status={e.l} variant={e.v} />;
}

function greetingByHour() {
  const h = new Date().getHours();
  if (h < 5) return "ليلة هادئة";
  if (h < 12) return "صباح الخير";
  if (h < 17) return "مساء الخير";
  return "مساء الخير";
}
