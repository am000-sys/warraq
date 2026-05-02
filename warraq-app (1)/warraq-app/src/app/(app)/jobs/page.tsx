// src/app/(app)/jobs/page.tsx
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function JobsPage() {
  const user = (await getCurrentUser())!;
  const jobs = await db.job.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">الوظائف</h1>
        <Link
          href="/upload"
          className="bg-[#0A2E54] text-white px-5 py-2 rounded-full text-sm"
        >
          رفع جديد
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center text-gray-500">
          لا توجد وظائف بعد.
        </div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{job.fileName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {job.totalPages} صفحة · {statusLabel(job.status)}
                    {job.status === "PROCESSING" &&
                      ` · ${job.processedPages}/${job.totalPages}`}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {new Date(job.createdAt).toLocaleString("ar-SA", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </Link>
          ))}
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
  };
  return map[status] ?? status;
}
