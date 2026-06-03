// src/app/(app)/jobs/[id]/page.tsx — تفاصيل الوظيفة + النص المستخرج
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ar } from "@/lib/utils";
import { modelName } from "@/lib/models";
import { ArrowRight, Download, ChevronRight, ChevronLeft } from "lucide-react";
import { JobAutoRefresh } from "@/components/job-auto-refresh";
import { ClaudePanel } from "@/components/claude-panel";
import { JobRetry } from "@/components/job-retry";
import { MarkdownView } from "@/components/markdown-view";
import { getClaudeAccess } from "@/lib/claude-addon";
import { PageJump } from "@/components/page-jump";
import { scorePageQuality, extractFootnotes } from "@/lib/page-quality";

const PER_PAGE = 10;

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string; q?: string }>;
}) {
  const { id } = await params;
  const { p, q } = await searchParams;
  const user = (await getCurrentUser())!;

  // نجلب معلومات الوظيفة بدون محتوى الصفحات أوّلاً (خفيف)
  const job = await db.job.findUnique({
    where: { id },
    select: {
      id: true,
      fileName: true,
      totalPages: true,
      processedPages: true,
      status: true,
      model: true,
      errorMessage: true,
      storageKey: true,
      userId: true,
      orgId: true,
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

  // عدد الصفحات المكتملة (للتنقّل)
  const totalCompleted = await db.jobPage.count({
    where: { jobId: id, status: "COMPLETED" },
  });

  const totalPagesCount = Math.ceil(totalCompleted / PER_PAGE);

  // البحث بالرقم المطبوع
  let jumpSeq: number | null = null;
  if (q) {
    const found = await db.jobPage.findFirst({
      where: { jobId: id, status: "COMPLETED", printedNumber: q },
      select: { sequentialNumber: true },
    });
    if (found) {
      jumpSeq = found.sequentialNumber;
    }
  }

  // الصفحة الحاليّة من الترقيم
  let currentPage = Math.max(1, parseInt(p ?? "1") || 1);
  if (jumpSeq !== null) {
    currentPage = Math.ceil(jumpSeq / PER_PAGE);
  }
  currentPage = Math.min(currentPage, Math.max(1, totalPagesCount));

  const skip = (currentPage - 1) * PER_PAGE;

  // نجلب فقط صفحات هذا الجزء
  const pages = await db.jobPage.findMany({
    where: { jobId: id, status: "COMPLETED" },
    orderBy: { sequentialNumber: "asc" },
    skip,
    take: PER_PAGE,
    select: {
      id: true,
      sequentialNumber: true,
      printedNumber: true,
      textContent: true,
    },
  });

  const pct = (job.processedPages / Math.max(1, job.totalPages)) * 100;

  // أهليّة خدمات Claude الإضافيّة
  const claudeAccess =
    job.status === "COMPLETED" ? await getClaudeAccess(user.id) : null;

  const baseUrl = `/jobs/${id}`;

  return (
    <div>
      {(job.status === "PROCESSING" || job.status === "PENDING") && (
        <JobAutoRefresh jobId={job.id} />
      )}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 mb-4 no-underline transition-colors"
        style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}
      >
        <ArrowRight size={14} />
        الوظائف
      </Link>

      {/* Header */}
      <div className="flex justify-between items-start flex-wrap" style={{ marginBottom: 28, gap: 12 }}>
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
            style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}
          >
            {ar(job.totalPages)} صفحة · {modelName(job.model)} · {statusLabel(job.status)}
            {job.status === "PROCESSING" && ` · ${ar(job.processedPages)}/${ar(job.totalPages)}`}
          </p>
        </div>

        {job.status === "COMPLETED" && (
          <div className="flex gap-2 flex-wrap">
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
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--orange)" }} />
            <p style={{ fontSize: 13, color: "var(--orange)", fontFamily: "Tajawal, sans-serif", fontWeight: 500 }}>
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
          <p style={{ fontSize: 13, color: "var(--rose)", fontFamily: "Tajawal, sans-serif" }}>
            فشلت المعالجة: {job.errorMessage}
          </p>
          {job.storageKey !== "direct" && <JobRetry jobId={job.id} />}
        </div>
      )}

      {/* Pages */}
      {totalCompleted > 0 && (
        <>
          {/* شريط التنقّل + البحث */}
          <div
            className="flex items-center justify-between flex-wrap"
            style={{ marginBottom: 16, gap: 10 }}
          >
            <p style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
              {ar(totalCompleted)} صفحة مكتملة
              {totalPagesCount > 1 && ` · جزء ${ar(currentPage)} من ${ar(totalPagesCount)}`}
            </p>
            <PageJump baseUrl={baseUrl} />
          </div>

          <div className="flex flex-col" style={{ gap: 16 }}>
            {pages.map((page) => {
              const quality = scorePageQuality(page.textContent ?? "");
              const { main, footnotes } = extractFootnotes(page.textContent ?? "");
              const qualityColor =
                quality.label === "high"
                  ? "#16a34a"
                  : quality.label === "medium"
                  ? "#ca8a04"
                  : "#dc2626";
              const qualityBg =
                quality.label === "high"
                  ? "rgba(22,163,74,0.08)"
                  : quality.label === "medium"
                  ? "rgba(202,138,4,0.08)"
                  : "rgba(220,38,38,0.08)";
              const qualityLabel =
                quality.label === "high"
                  ? "جودة ممتازة"
                  : quality.label === "medium"
                  ? "جودة متوسّطة"
                  : "قد تحتاج مراجعة";

              return (
                <div
                  key={page.id}
                  id={`page-${page.sequentialNumber}`}
                  className="card"
                  style={{ borderRadius: 16, padding: 28 }}
                >
                  {/* رأس البطاقة: أرقام الصفحة + مؤشّر الجودة */}
                  <div
                    className="flex justify-between items-center mb-3.5 flex-wrap"
                    style={{ gap: 8 }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--pebble)",
                        fontFamily: "Tajawal, sans-serif",
                        display: "flex",
                        gap: 12,
                      }}
                    >
                      <span>صفحة {page.printedNumber || "—"}</span>
                      <span>تسلسلي: {ar(page.sequentialNumber)}</span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontFamily: "Tajawal, sans-serif",
                        color: qualityColor,
                        background: qualityBg,
                        borderRadius: 100,
                        padding: "3px 10px",
                        fontWeight: 500,
                      }}
                    >
                      {qualityLabel} · {ar(quality.score)}٪
                    </span>
                  </div>

                  {/* المتن */}
                  <MarkdownView content={main} />

                  {/* الحواشي (مطوية افتراضياً) */}
                  {footnotes && (
                    <details
                      style={{
                        marginTop: 16,
                        borderTop: "1px solid var(--border)",
                        paddingTop: 14,
                      }}
                    >
                      <summary
                        style={{
                          fontSize: 11,
                          color: "var(--stone)",
                          fontFamily: "Tajawal, sans-serif",
                          cursor: "pointer",
                          userSelect: "none",
                          listStyle: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 13 }}>📎</span>
                        الحواشي
                      </summary>
                      <div style={{ marginTop: 10 }}>
                        <MarkdownView content={footnotes} />
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </div>

          {/* أزرار التنقّل بين الأجزاء */}
          {totalPagesCount > 1 && (
            <div className="flex justify-between items-center" style={{ marginTop: 24 }}>
              <Link
                href={currentPage > 1 ? `${baseUrl}?p=${currentPage - 1}` : "#"}
                className={`btn-ghost no-underline flex items-center gap-1.5 ${currentPage <= 1 ? "opacity-30 pointer-events-none" : ""}`}
                style={{ fontSize: 13, padding: "9px 18px" }}
              >
                <ChevronRight size={15} />
                السابق
              </Link>

              <span style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
                {ar(currentPage)} / {ar(totalPagesCount)}
              </span>

              <Link
                href={currentPage < totalPagesCount ? `${baseUrl}?p=${currentPage + 1}` : "#"}
                className={`btn-ghost no-underline flex items-center gap-1.5 ${currentPage >= totalPagesCount ? "opacity-30 pointer-events-none" : ""}`}
                style={{ fontSize: 13, padding: "9px 18px" }}
              >
                التالي
                <ChevronLeft size={15} />
              </Link>
            </div>
          )}
        </>
      )}

      {/* مساعد المستند الذكي */}
      {claudeAccess && totalCompleted > 0 && (
        <ClaudePanel
          jobId={job.id}
          access={{
            enabled: claudeAccess.enabled,
            eligible: claudeAccess.eligible,
            mode: claudeAccess.mode,
            costPerAction: claudeAccess.costPerAction,
            balance: claudeAccess.balance,
          }}
        />
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
