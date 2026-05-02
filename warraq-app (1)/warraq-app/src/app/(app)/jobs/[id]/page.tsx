// src/app/(app)/jobs/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

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
  if (job.userId !== user.id && (user as any).systemRole !== "SYSTEM_ADMIN") {
    if (!job.orgId) notFound();
    const member = await db.orgMember.findUnique({
      where: { userId_orgId: { userId: user.id, orgId: job.orgId } },
    });
    if (!member) notFound();
  }

  const completedPages = job.pages.filter((p) => p.status === "COMPLETED");

  return (
    <div>
      <Link href="/jobs" className="text-sm text-gray-600">
        ← الوظائف
      </Link>

      <div className="flex justify-between items-start mt-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">{job.fileName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {job.totalPages} صفحة · {statusLabel(job.status)}
            {job.status === "PROCESSING" &&
              ` (${job.processedPages}/${job.totalPages})`}
          </p>
        </div>

        {job.status === "COMPLETED" && (
          <div className="flex gap-2">
            <ExportButton jobId={job.id} format="txt" label="TXT" />
            <ExportButton jobId={job.id} format="md" label="Markdown" />
            <ExportButton jobId={job.id} format="docx" label="Word" />
          </div>
        )}
      </div>

      {job.status === "PROCESSING" && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-900">
            جارٍ المعالجة... سيتم تحديث الصفحة تلقائياً.
          </p>
          <div className="mt-3 bg-blue-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#0A2E54] h-full transition-all"
              style={{
                width: `${(job.processedPages / job.totalPages) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {job.status === "FAILED" && job.errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-red-900">فشلت المعالجة: {job.errorMessage}</p>
        </div>
      )}

      {/* Pages */}
      {completedPages.length > 0 && (
        <div className="space-y-4">
          {completedPages.slice(0, 10).map((page) => (
            <div key={page.id} className="bg-white border rounded-2xl p-6">
              <div className="flex justify-between text-xs text-gray-500 mb-3">
                <span>صفحة {page.printedNumber ?? "—"}</span>
                <span>تسلسلي: {page.sequentialNumber}</span>
              </div>
              <pre
                dir="rtl"
                className="whitespace-pre-wrap text-sm leading-loose font-sans"
              >
                {page.textContent}
              </pre>
            </div>
          ))}
          {completedPages.length > 10 && (
            <p className="text-center text-sm text-gray-500">
              عُرضت أوّل ١٠ صفحات. حمّل الملف للحصول على الكل.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ExportButton({
  jobId,
  format,
  label,
}: {
  jobId: string;
  format: string;
  label: string;
}) {
  return (
    <a
      href={`/api/jobs/${jobId}/export?format=${format}`}
      className="text-sm border px-3 py-1.5 rounded-full hover:bg-gray-50"
    >
      {label}
    </a>
  );
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: "في الانتظار",
    PROCESSING: "قيد المعالجة",
    COMPLETED: "مكتملة",
    FAILED: "فشلت",
    CANCELED: "ملغاة",
  };
  return map[status] ?? status;
}
