// src/app/(app)/organization/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function OrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: orgId } = await params;
  const user = (await getCurrentUser())!;

  const member = await db.orgMember.findUnique({
    where: { userId_orgId: { userId: user.id, orgId } },
  });
  if (!member) notFound();

  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: { select: { members: true, jobs: true } },
      subscription: { include: { plan: true } },
    },
  });
  if (!org) notFound();

  const isAdmin = member.role === "OWNER" || member.role === "ADMIN";

  // وظائف المؤسسة الأخيرة
  const recentJobs = await db.job.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: { select: { name: true } } },
  });

  return (
    <div>
      <Link href="/organization" className="text-sm text-gray-600">
        ← المؤسسات
      </Link>

      <div className="flex justify-between items-start mt-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-sm text-gray-500 mt-1">دورك: {roleLabel(member.role)}</p>
        </div>
        {isAdmin && (
          <Link
            href={`/organization/members?orgId=${org.id}`}
            className="text-sm bg-[#0A2E54] text-white px-4 py-2 rounded-full"
          >
            إدارة الأعضاء
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card label="رصيد الصفحات" value={org.pagesBalance.toLocaleString("ar-SA")} accent />
        <Card label="الأعضاء" value={org._count.members.toString()} />
        <Card label="الوظائف" value={org._count.jobs.toString()} />
      </div>

      {/* Subscription */}
      {org.subscription ? (
        <div className="bg-white border rounded-2xl p-5 mb-6">
          <h2 className="font-bold mb-2">الاشتراك</h2>
          <p className="text-sm">
            خطّة <strong>{org.subscription.plan.nameAr}</strong>
          </p>
          <p className="text-xs text-gray-500 mt-1">
            تجديد:{" "}
            {new Date(org.subscription.currentPeriodEnd).toLocaleDateString("ar-SA")}
          </p>
        </div>
      ) : (
        isAdmin && (
          <Link
            href={`/billing?orgId=${org.id}`}
            className="block bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6 text-center"
          >
            <p className="font-medium text-[#0A2E54]">اشترك في خطّة شهرية</p>
            <p className="text-sm text-gray-600 mt-1">
              لتفعيل ميّزات المؤسسات وتقاسم رصيد الصفحات
            </p>
          </Link>
        )
      )}

      {/* Recent jobs */}
      <h2 className="font-bold mb-3">آخر الوظائف</h2>
      {recentJobs.length === 0 ? (
        <p className="text-sm text-gray-500 bg-white border rounded-xl p-6 text-center">
          لا توجد وظائف بعد.
        </p>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          {recentJobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block px-4 py-3 border-b last:border-b-0 hover:bg-gray-50"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-medium text-sm">{job.fileName}</p>
                  <p className="text-xs text-gray-500">
                    رفعه {job.user.name} · {job.totalPages} صفحة
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

function Card({
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

function roleLabel(role: string) {
  return ({ OWNER: "المالك", ADMIN: "مدير", MEMBER: "عضو" } as any)[role] ?? role;
}
