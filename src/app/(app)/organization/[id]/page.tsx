// src/app/(app)/organization/[id]/page.tsx — تفاصيل المؤسسة
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ar } from "@/lib/utils";
import { ArrowRight, Users, FileText } from "lucide-react";

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

  const recentJobs = await db.job.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div>
      <Link
        href="/organization"
        className="inline-flex items-center gap-1.5 mb-4 no-underline"
        style={{
          fontSize: 13,
          color: "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
        }}
      >
        <ArrowRight size={14} />
        المؤسسات
      </Link>

      {/* Header */}
      <div className="flex justify-between items-start" style={{ marginBottom: 28 }}>
        <div>
          <h1
            style={{
              fontFamily: "Tajawal, sans-serif",
              fontSize: 28,
              fontWeight: 400,
              color: "var(--carbon)",
              marginBottom: 6,
            }}
          >
            {org.name}
          </h1>
          <p
            className="font-light"
            style={{
              fontSize: 13,
              color: "var(--stone)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            دورك: {roleLabel(member.role)}
          </p>
        </div>
        {isAdmin && (
          <Link
            href={`/organization/members?orgId=${org.id}`}
            className="btn-primary no-underline"
            style={{ fontSize: 13 }}
          >
            <Users size={14} strokeWidth={2} /> إدارة الأعضاء
          </Link>
        )}
      </div>

      {/* Stats */}
      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 24 }}
      >
        <Card label="رصيد الصفحات" value={ar(org.pagesBalance)} accent />
        <Card label="الأعضاء" value={ar(org._count.members)} />
        <Card label="الوظائف" value={ar(org._count.jobs)} />
      </div>

      {/* Subscription banner */}
      {org.subscription ? (
        <div className="card mb-6" style={{ borderRadius: 16 }}>
          <h2
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: "var(--carbon)",
              fontFamily: "Tajawal, sans-serif",
              marginBottom: 4,
            }}
          >
            الاشتراك
          </h2>
          <p
            className="font-light"
            style={{
              fontSize: 14,
              color: "var(--stone)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            خطّة <strong style={{ color: "var(--carbon)" }}>{org.subscription.plan.nameAr}</strong>
          </p>
          <p
            className="font-light mt-1"
            style={{
              fontSize: 12,
              color: "var(--pebble)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            تجديد: {new Date(org.subscription.currentPeriodEnd).toLocaleDateString("ar-SA")}
          </p>
        </div>
      ) : (
        isAdmin && (
          <Link
            href={`/billing?orgId=${org.id}`}
            className="block mb-6 no-underline text-center transition-all"
            style={{
              background: "var(--orange-soft)",
              border: "1px solid rgba(246,146,81,0.25)",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <p
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--orange)",
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              اشترك في خطّة شهرية
            </p>
            <p
              className="font-light mt-1"
              style={{
                fontSize: 13,
                color: "var(--stone)",
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              لتفعيل ميّزات المؤسسات وتقاسم رصيد الصفحات
            </p>
          </Link>
        )
      )}

      {/* Recent jobs */}
      <h2
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--carbon)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 12,
        }}
      >
        آخر الوظائف
      </h2>

      {recentJobs.length === 0 ? (
        <div
          className="card text-center"
          style={{
            padding: "40px 20px",
            color: "var(--pebble)",
            fontFamily: "Tajawal, sans-serif",
            fontSize: 14,
          }}
        >
          لا توجد وظائف بعد.
        </div>
      ) : (
        <div className="card" style={{ borderRadius: 16, padding: "8px 16px" }}>
          {recentJobs.map((job, i) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center gap-3 cursor-pointer transition-colors no-underline hover:bg-fog"
              style={{
                padding: "12px 10px",
                borderRadius: 10,
                borderBottom: i < recentJobs.length - 1 ? "1px solid var(--border-sub)" : "none",
              }}
            >
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 36,
                  height: 36,
                  background: "var(--fog)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                }}
              >
                <FileText size={16} color="var(--stone)" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="truncate"
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--carbon)",
                    fontFamily: "Tajawal, sans-serif",
                    marginBottom: 2,
                  }}
                >
                  {job.fileName}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--pebble)",
                    fontFamily: "Tajawal, sans-serif",
                  }}
                >
                  رفعه {job.user.name || job.user.email} · {ar(job.totalPages)} صفحة
                </p>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--pebble)",
                  fontFamily: "Tajawal, sans-serif",
                  whiteSpace: "nowrap",
                }}
              >
                {new Date(job.createdAt).toLocaleDateString("ar-SA")}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: accent ? "var(--slate)" : "var(--snow)",
        borderRadius: 16,
        padding: "20px 22px",
        border: accent ? "1px solid rgba(246,146,81,0.25)" : "1px solid var(--border-sub)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: accent ? "rgba(255,255,255,0.5)" : "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 300,
          fontFamily: "Tajawal, sans-serif",
          color: accent ? "var(--orange)" : "var(--carbon)",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function roleLabel(role: string) {
  return ({ OWNER: "المالك", ADMIN: "مدير", MEMBER: "عضو" } as Record<string, string>)[role] ?? role;
}
