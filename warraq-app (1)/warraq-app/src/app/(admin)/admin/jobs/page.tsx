// src/app/(admin)/admin/jobs/page.tsx
import Link from "next/link";
import { db } from "@/lib/db";

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  const where = status ? { status: status as any } : {};
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
      <h1 className="text-2xl font-bold mb-4">الوظائف</h1>

      <div className="flex gap-2 mb-4 text-sm">
        <Link
          href="/admin/jobs"
          className={`px-4 py-1.5 rounded-full ${!status ? "bg-[#0A2E54] text-white" : "bg-white border"}`}
        >
          الكل
        </Link>
        {["PROCESSING", "COMPLETED", "FAILED"].map((s) => (
          <Link
            key={s}
            href={`/admin/jobs?status=${s}`}
            className={`px-4 py-1.5 rounded-full ${
              status === s ? "bg-[#0A2E54] text-white" : "bg-white border"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right p-3">الملف</th>
              <th className="text-right p-3">المستخدم</th>
              <th className="text-right p-3">الصفحات</th>
              <th className="text-right p-3">الحالة</th>
              <th className="text-right p-3">التكلفة</th>
              <th className="text-right p-3">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t hover:bg-gray-50">
                <td className="p-3 max-w-xs truncate">{j.fileName}</td>
                <td className="p-3 text-gray-600 text-xs">{j.user.email}</td>
                <td className="p-3">{j.totalPages}</td>
                <td className="p-3">{j.status}</td>
                <td className="p-3 text-xs">${Number(j.costUsd).toFixed(4)}</td>
                <td className="p-3 text-xs text-gray-500">
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
