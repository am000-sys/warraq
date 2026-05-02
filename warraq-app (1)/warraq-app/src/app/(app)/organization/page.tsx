// src/app/(app)/organization/page.tsx
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function OrganizationPage() {
  const user = (await getCurrentUser())!;

  const memberships = await db.orgMember.findMany({
    where: { userId: user.id },
    include: {
      organization: {
        include: {
          _count: { select: { members: true, jobs: true } },
        },
      },
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">المؤسسات</h1>
        <Link
          href="/organization/new"
          className="bg-[#0A2E54] text-white px-5 py-2 rounded-full text-sm"
        >
          إنشاء مؤسسة
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="bg-white border rounded-2xl p-12 text-center">
          <p className="text-gray-600 mb-4">
            أنشئ مؤسسة للعمل ضمن فريق وتقاسم رصيد الصفحات.
          </p>
          <Link
            href="/organization/new"
            className="inline-block bg-[#0A2E54] text-white px-6 py-2 rounded-full"
          >
            إنشاء مؤسسة جديدة
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberships.map((m) => (
            <Link
              key={m.organization.id}
              href={`/organization/${m.organization.id}`}
              className="bg-white border rounded-2xl p-5 hover:border-[#0A2E54]"
            >
              <h3 className="font-bold">{m.organization.name}</h3>
              <p className="text-xs text-gray-500 mt-1">دورك: {roleLabel(m.role)}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <Stat label="أعضاء" value={m.organization._count.members} />
                <Stat label="وظائف" value={m.organization._count.jobs} />
                <Stat label="رصيد" value={m.organization.pagesBalance} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-bold">{value.toLocaleString("ar-SA")}</p>
    </div>
  );
}

function roleLabel(role: string) {
  const map: Record<string, string> = {
    OWNER: "المالك",
    ADMIN: "مدير",
    MEMBER: "عضو",
  };
  return map[role] ?? role;
}
