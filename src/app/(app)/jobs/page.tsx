// src/app/(app)/jobs/page.tsx — قائمة الوظائف (مع تصفية بالحالة)
import Link from "next/link";
import type { JobStatus } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, StatusPill } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ar } from "@/lib/utils";
import { modelName } from "@/lib/models";
import { FileText, Image as ImageIcon, Plus, Upload, SearchX } from "lucide-react";

export const metadata = { title: "الوظائف — ورّاق" };

// شرائح التصفية: كلّ شريحة تجمع حالات ذات دلالة واحدة للمستخدم
const FILTERS: { k: string; l: string; statuses?: JobStatus[] }[] = [
  { k: "all", l: "الكل" },
  { k: "completed", l: "مكتملة", statuses: ["COMPLETED"] },
  { k: "processing", l: "قيد المعالجة", statuses: ["PROCESSING", "PENDING"] },
  { k: "failed", l: "فشلت", statuses: ["FAILED", "CANCELED"] },
];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = (await getCurrentUser())!;

  const active = FILTERS.find((f) => f.k === status) ?? FILTERS[0];

  const [jobs, grouped] = await Promise.all([
    db.job.findMany({
      where: {
        userId: user.id,
        ...(active.statuses ? { status: { in: active.statuses } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        fileName: true,
        totalPages: true,
        processedPages: true,
        status: true,
        model: true,
        createdAt: true,
      },
    }),
    // أعداد الحالات لعرضها على شرائح التصفية
    db.job.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _count: true,
    }),
  ]);

  const countByStatus = Object.fromEntries(grouped.map((g) => [g.status, g._count]));
  const totalCount = grouped.reduce((sum, g) => sum + g._count, 0);
  const countFor = (f: (typeof FILTERS)[number]) =>
    f.statuses
      ? f.statuses.reduce((sum, s) => sum + (countByStatus[s] ?? 0), 0)
      : totalCount;

  return (
    <div>
      <PageHeader
        title="الوظائف"
        subtitle={`${ar(totalCount)} وظيفة`}
        action={
          <Link href="/upload" className="btn-primary no-underline" style={{ fontSize: 13 }}>
            <Plus size={14} strokeWidth={2} /> رفع جديد
          </Link>
        }
      />

      {/* شرائح التصفية بالحالة */}
      {totalCount > 0 && (
        <div className="flex flex-wrap" style={{ gap: 8, marginBottom: 18 }}>
          {FILTERS.map((f) => {
            const isActive = f.k === active.k;
            const count = countFor(f);
            return (
              <Link
                key={f.k}
                href={f.k === "all" ? "/jobs" : `/jobs?status=${f.k}`}
                className="no-underline inline-flex items-center transition-all"
                style={{
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: "var(--r-badge)",
                  fontSize: 12.5,
                  fontFamily: "Tajawal, sans-serif",
                  fontWeight: isActive ? 500 : 400,
                  background: isActive ? "var(--midnight)" : "var(--snow)",
                  color: isActive ? "var(--snow)" : "var(--stone)",
                  border: `1px solid ${isActive ? "var(--midnight)" : "var(--border)"}`,
                }}
              >
                {f.l}
                <span style={{ fontSize: 11, opacity: isActive ? 0.75 : 0.6 }}>
                  {ar(count)}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="card" style={{ borderRadius: 16 }}>
          {totalCount === 0 ? (
            <EmptyState
              icon={Upload}
              title="لا توجد وظائف بعد"
              description="ارفع أوّل ملفّ PDF أو صورة، وستجد هنا كلّ وظائفك مع حالتها ونتائجها."
              action={
                <Link
                  href="/upload"
                  className="btn-primary no-underline"
                  style={{ fontSize: 13, padding: "10px 22px" }}
                >
                  <Plus size={14} strokeWidth={2} /> رفع أوّل ملف
                </Link>
              }
            />
          ) : (
            <EmptyState
              icon={SearchX}
              title="لا توجد وظائف بهذه الحالة"
              description="جرّب شريحة تصفية أخرى، أو اعرض الكلّ."
              action={
                <Link
                  href="/jobs"
                  className="btn-ghost no-underline"
                  style={{ fontSize: 13, padding: "9px 20px" }}
                >
                  عرض الكل
                </Link>
              }
              compact
            />
          )}
        </div>
      ) : (
        <div className="card" style={{ borderRadius: 16, padding: "8px 16px" }}>
          {jobs.map((job, i) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center gap-3.5 cursor-pointer transition-colors no-underline hover:bg-fog"
              style={{
                padding: "14px 10px",
                borderRadius: 10,
                borderBottom: i < jobs.length - 1 ? "1px solid var(--border-sub)" : "none",
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
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--carbon)",
                    fontFamily: "Tajawal, sans-serif",
                    marginBottom: 3,
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
                  {ar(job.totalPages)} صفحة · {modelName(job.model)} ·{" "}
                  {new Date(job.createdAt).toLocaleString("ar-SA", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </div>
              </div>
              {job.status === "PROCESSING" && (
                <div className="flex flex-col" style={{ gap: 4, minWidth: 120 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--orange)",
                      fontFamily: "Tajawal, sans-serif",
                      textAlign: "left",
                    }}
                  >
                    {ar(job.processedPages)}/{ar(job.totalPages)}
                  </div>
                  <div style={{ height: 4, background: "var(--fog)", borderRadius: 2 }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(job.processedPages / Math.max(1, job.totalPages)) * 100}%`,
                        background: "var(--orange)",
                        borderRadius: 2,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                </div>
              )}
              <JobStatusPill status={job.status} />
            </Link>
          ))}
        </div>
      )}
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
    CANCELED: { l: "ملغاة", v: "neutral" },
  };
  const e = map[status] || { l: status, v: "neutral" as const };
  return <StatusPill status={e.l} variant={e.v} />;
}
