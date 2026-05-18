// src/app/(admin)/admin/jobs/page.tsx — وظائف المنصّة
import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader, StatusPill } from "@/components/page-header";
import { ar } from "@/lib/utils";
import type { JobStatus } from "@prisma/client";

const FILTERS = ["PROCESSING", "COMPLETED", "FAILED"] as const;
const FILTER_LABELS: Record<string, string> = {
  PROCESSING: "قيد المعالجة",
  COMPLETED: "مكتملة",
  FAILED: "فشلت",
};

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const where = status ? { status: status as JobStatus } : {};
  const jobs = await db.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { email: true, name: true } },
      organization: { select: { name: true } },
    },
  });

  return (
    <div>
      <PageHeader title="الوظائف" subtitle={`${ar(jobs.length)} وظيفة`} />

      {/* Filters */}
      <div className="flex gap-2 mb-5">
        <FilterPill href="/admin/jobs" active={!status} label="الكل" />
        {FILTERS.map((s) => (
          <FilterPill
            key={s}
            href={`/admin/jobs?status=${s}`}
            active={status === s}
            label={FILTER_LABELS[s]}
          />
        ))}
      </div>

      <div className="card overflow-hidden" style={{ borderRadius: 16, padding: 0 }}>
        <table className="w-full" style={{ fontSize: 13, fontFamily: "Tajawal, sans-serif" }}>
          <thead>
            <tr style={{ background: "var(--fog)", color: "var(--stone)" }}>
              <Th>الملف</Th>
              <Th>المستخدم</Th>
              <Th>المؤسسة</Th>
              <Th>الصفحات</Th>
              <Th>الحالة</Th>
              <Th>التكلفة</Th>
              <Th>التاريخ</Th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr
                key={j.id}
                className="hover:bg-fog transition-colors"
                style={{ borderTop: "1px solid var(--border-sub)" }}
              >
                <td style={{ padding: "14px 16px", maxWidth: 240 }}>
                  <div className="truncate" style={{ fontWeight: 500, color: "var(--carbon)" }}>
                    {j.fileName}
                  </div>
                </td>
                <td style={{ padding: "14px 16px", direction: "ltr", fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--stone)" }}>
                  {j.user.email}
                </td>
                <td style={{ padding: "14px 16px", color: "var(--stone)" }}>
                  {j.organization?.name ?? "—"}
                </td>
                <td style={{ padding: "14px 16px", color: "var(--carbon)" }}>{ar(j.totalPages)}</td>
                <td style={{ padding: "14px 16px" }}>
                  <JobPill status={j.status} />
                </td>
                <td style={{ padding: "14px 16px", fontSize: 11, fontFamily: "Inter, sans-serif", color: "var(--stone)" }}>
                  ${Number(j.costUsd).toFixed(4)}
                </td>
                <td style={{ padding: "14px 16px", fontSize: 11, color: "var(--pebble)" }}>
                  {new Date(j.createdAt).toLocaleDateString("ar-SA")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="no-underline transition-all"
      style={{
        padding: "8px 18px",
        borderRadius: "var(--r-badge)",
        fontSize: 13,
        fontWeight: active ? 500 : 400,
        background: active ? "var(--orange)" : "var(--snow)",
        color: active ? "#fff" : "var(--stone)",
        border: active ? "1px solid var(--orange)" : "1px solid var(--border)",
        fontFamily: "Tajawal, sans-serif",
      }}
    >
      {label}
    </Link>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "right",
        padding: "12px 16px",
        fontSize: 11,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </th>
  );
}

function JobPill({ status }: { status: string }) {
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
