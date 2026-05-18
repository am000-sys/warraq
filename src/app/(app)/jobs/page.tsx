// src/app/(app)/jobs/page.tsx — قائمة الوظائف
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, StatusPill } from "@/components/page-header";
import { ar } from "@/lib/utils";
import { FileText, Image as ImageIcon, Plus } from "lucide-react";

export default async function JobsPage() {
  const user = (await getCurrentUser())!;
  const jobs = await db.job.findMany({
    where: { userId: user.id },
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
  });

  return (
    <div>
      <PageHeader
        title="الوظائف"
        subtitle={`${ar(jobs.length)} وظيفة`}
        action={
          <Link href="/upload" className="btn-primary no-underline" style={{ fontSize: 13 }}>
            <Plus size={14} strokeWidth={2} /> رفع جديد
          </Link>
        }
      />

      {jobs.length === 0 ? (
        <div
          className="card text-center"
          style={{
            padding: "80px 20px",
            color: "var(--pebble)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.3 }}>◫</div>
          <p style={{ fontSize: 15 }}>لا توجد وظائف بعد. ابدأ برفع ملف.</p>
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
                  {ar(job.totalPages)} صفحة · {job.model} ·{" "}
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
