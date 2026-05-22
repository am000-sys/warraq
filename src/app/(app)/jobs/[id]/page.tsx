// src/app/(app)/jobs/[id]/page.tsx — تفاصيل الوظيفة + النص المستخرج
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ar } from "@/lib/utils";
import { modelName } from "@/lib/models";
import { ArrowRight, Download } from "lucide-react";
import { JobAutoRefresh } from "@/components/job-auto-refresh";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await getCurrentUser())!;

  const job = await db.job.findUnique({
    where: { id },
    include: {
      pages: {
        orderBy: { sequentialNumber: "asc" },
        select: {
          id: true,
          sequentialNumber: true,
          printedNumber: true,
          status: true,
          textContent: true,
        },
      },
    },
  });

  if (!job) notFound();

  // التحقّق من الصلاحيات
  if (job.userId !== user.id && user.systemRole !== "SYSTEM_ADMIN") {
    if (!job.orgId) notFound();
    const member = await db.orgMember.findUnique({
      where: { userId_orgId: { userId: user.id, orgId: job.orgId } },
    });
    if (!member) notFound();
  }

  const completedPages = job.pages.filter((p) => p.status === "COMPLETED");
  const pct = (job.processedPages / Math.max(1, job.totalPages)) * 100;

  return (
    <div>
      {(job.status === "PROCESSING" || job.status === "PENDING") && (
        <JobAutoRefresh jobId={job.id} />
      )}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 mb-4 no-underline transition-colors"
        style={{
          fontSize: 13,
          color: "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
        }}
      >
        <ArrowRight size={14} />
        الوظائف
      </Link>

      {/* Header */}
      <div className="flex justify-between items-start" style={{ marginBottom: 28 }}>
        <div>
          <h1
            style={{
              fontFamily: "Tajawal, sans-serif",
              fontSize: 26,
              fontWeight: 400,
              color: "var(--carbon)",
              marginBottom: 6,
              wordBreak: "break-word",
            }}
          >
            {job.fileName}
          </h1>
          <p
            className="font-light"
            style={{
              fontSize: 13,
              color: "var(--stone)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            {ar(job.totalPages)} صفحة · {modelName(job.model)} · {statusLabel(job.status)}
            {job.status === "PROCESSING" && ` · ${ar(job.processedPages)}/${ar(job.totalPages)}`}
          </p>
        </div>

        {job.status === "COMPLETED" && (
          <div className="flex gap-2">
            {[
              { f: "txt", l: "TXT" },
              { f: "md", l: "MD" },
              { f: "docx", l: "Word" },
              { f: "json", l: "JSON" },
            ].map((x) => (
              <a
                key={x.f}
                href={`/api/jobs/${job.id}/export?format=${x.f}`}
                className="btn-ghost no-underline"
                style={{ fontSize: 12, padding: "8px 14px", gap: 6 }}
              >
                <Download size={13} />
                {x.l}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Status banners */}
      {job.status === "PROCESSING" && (
        <div
          className="mb-5"
          style={{
            background: "var(--orange-soft)",
            border: "1px solid rgba(246,146,81,0.2)",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: "var(--orange)" }}
            />
            <p
              style={{
                fontSize: 13,
                color: "var(--orange)",
                fontFamily: "Tajawal, sans-serif",
                fontWeight: 500,
              }}
            >
              جارٍ المعالجة... ستحدّث الصفحة تلقائياً عند الاكتمال.
            </p>
          </div>
          <div style={{ height: 6, background: "rgba(246,146,81,0.15)", borderRadius: 3 }}>
            <div
              style={{
                height: "100%",
                width: `${pct}%`,
                background: "var(--orange)",
                borderRadius: 3,
                transition: "width 0.4s",
              }}
            />
          </div>
        </div>
      )}

      {job.status === "FAILED" && job.errorMessage && (
        <div
          className="mb-5"
          style={{
            background: "rgba(201,123,132,0.10)",
            border: "1px solid rgba(201,123,132,0.20)",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <p
            style={{
              fontSize: 13,
              color: "var(--rose)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            فشلت المعالجة: {job.errorMessage}
          </p>
        </div>
      )}

      {/* Pages */}
      {completedPages.length > 0 && (
        <div className="flex flex-col" style={{ gap: 16 }}>
          {completedPages.slice(0, 10).map((page) => (
            <div key={page.id} className="card" style={{ borderRadius: 16, padding: 28 }}>
              <div
                className="flex justify-between mb-3.5"
                style={{
                  fontSize: 11,
                  color: "var(--pebble)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                <span>صفحة {page.printedNumber || "—"}</span>
                <span>تسلسلي: {ar(page.sequentialNumber)}</span>
              </div>
              <pre
                dir="rtl"
                style={{
                  whiteSpace: "pre-wrap",
                  fontSize: 14,
                  lineHeight: 2,
                  fontFamily: "Tajawal, sans-serif",
                  color: "var(--midnight)",
                  margin: 0,
                }}
              >
                {page.textContent}
              </pre>
            </div>
          ))}
          {completedPages.length > 10 && (
            <p
              className="text-center mt-2"
              style={{
                fontSize: 13,
                color: "var(--pebble)",
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              عُرضت أوّل ١٠ صفحات. حمّل الملف للحصول على الكل.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "في الانتظار",
    PROCESSING: "قيد المعالجة",
    COMPLETED: "مكتملة",
    FAILED: "فشلت",
    CANCELED: "ملغاة",
    QUEUED: "بالطابور",
  };
  return map[status] ?? status;
}
