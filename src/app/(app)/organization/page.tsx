// src/app/(app)/organization/page.tsx — قائمة المؤسسات
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ar } from "@/lib/utils";
import { Plus, Building2, Users } from "lucide-react";

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
      <PageHeader
        title="المؤسسات"
        subtitle="مساحة عمل لفريقك مع رصيد مشترك."
        action={
          <Link
            href="/organization/new"
            className="btn-primary no-underline"
            style={{ fontSize: 13 }}
          >
            <Plus size={14} strokeWidth={2} /> إنشاء مؤسسة
          </Link>
        }
      />

      {memberships.length === 0 ? (
        <div className="card text-center" style={{ padding: "60px 20px" }}>
          <Building2
            size={36}
            color="var(--pebble)"
            style={{ margin: "0 auto 16px", opacity: 0.5 }}
          />
          <p
            style={{
              fontSize: 15,
              color: "var(--stone)",
              fontFamily: "Tajawal, sans-serif",
              marginBottom: 18,
              fontWeight: 300,
            }}
          >
            أنشئ مؤسسة للعمل ضمن فريق وتقاسم رصيد الصفحات.
          </p>
          <Link
            href="/organization/new"
            className="btn-primary inline-flex no-underline"
            style={{ fontSize: 14 }}
          >
            إنشاء مؤسسة جديدة
          </Link>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {memberships.map((m) => (
            <Link
              key={m.organization.id}
              href={`/organization/${m.organization.id}`}
              className="card no-underline transition-all"
              style={{ borderRadius: 16 }}
            >
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 40,
                    height: 40,
                    background: "var(--orange-soft)",
                    border: "1px solid rgba(246,146,81,0.2)",
                    borderRadius: 10,
                  }}
                >
                  <Building2 size={18} color="var(--orange)" />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 500,
                      color: "var(--carbon)",
                      fontFamily: "Tajawal, sans-serif",
                      marginBottom: 2,
                    }}
                  >
                    {m.organization.name}
                  </h3>
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--pebble)",
                      fontFamily: "Tajawal, sans-serif",
                    }}
                  >
                    دورك: {roleLabel(m.role)}
                  </p>
                </div>
              </div>
              <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Stat label="أعضاء" value={ar(m.organization._count.members)} />
                <Stat label="وظائف" value={ar(m.organization._count.jobs)} />
                <Stat label="رصيد" value={ar(m.organization.pagesBalance)} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        style={{
          fontSize: 11,
          color: "var(--pebble)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 2,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: "var(--carbon)",
          fontFamily: "Tajawal, sans-serif",
        }}
      >
        {value}
      </p>
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
