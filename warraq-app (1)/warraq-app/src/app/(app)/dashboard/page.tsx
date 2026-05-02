// src/app/(app)/dashboard/page.tsx
// ─────────────────────────
// لوحة المستخدم الرئيسية
// ─────────────────────────

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;

  const [recentJobs, totalJobs, monthlyPages] = await Promise.all([
    db.job.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
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
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">مرحباً، {user.name}</h1>
      <p className="text-gray-600 mb-8">إليك نظرة سريعة على نشاطك.</p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="رصيد الصفحات"
          value={user.pagesBalance.toLocaleString("ar-SA")}
          accent
        />
        <StatCard label="إجمالي الوظائف" value={totalJobs.toString()} />
        <StatCard
          label="صفحات هذا الشهر"
          value={(monthlyPages._sum.processedPages ?? 0).toLocaleString("ar-SA")}
        />
      </div>

      {/* CTA */}
      <Link
        href="/upload"
        className="block bg-[#0A2E54] text-white text-center py-4 rounded-2xl mb-8 font-medium"
      >
        رفع ملف PDF جديد ←
      </Link>

      {/* Recent jobs */}
      <h2 className="text-lg font-bold mb-3">آخر الوظائف</h2>
      {recentJobs.length === 0 ? (
        <div className="bg-white border rounded-2xl p-8 text-center text-gray-500">
          لا توجد وظائف بعد. ابدأ برفع ملف.
        </div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          {recentJobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{job.fileName}</p>
                  <p className="text-xs text-gray-500">
                    {job.totalPages} صفحة · {job.status}
                  </p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(job.createdAt).toLocaleDateString("ar-SA")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-4 rounded-2xl border ${
        accent ? "bg-[#0A2E54] text-white" : "bg-white"
      }`}
    >
      <p className={`text-sm ${accent ? "text-white/70" : "text-gray-500"}`}>
        {label}
      </p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
