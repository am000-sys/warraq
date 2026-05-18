// src/app/(admin)/admin/users/page.tsx — قائمة المستخدمين
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ar } from "@/lib/utils";
import { Search } from "lucide-react";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page = "1" } = await searchParams;
  const PAGE_SIZE = 50;
  const skip = (parseInt(page) - 1) * PAGE_SIZE;

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
      include: {
        _count: { select: { jobs: true } },
        subscription: { include: { plan: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return (
    <div>
      <PageHeader
        title="المستخدمون"
        subtitle={`${ar(total)} مستخدم`}
      />

      {/* Search */}
      <form
        action="/admin/users"
        method="get"
        className="card mb-5"
        style={{ borderRadius: 16, padding: "12px 16px" }}
      >
        <div className="flex items-center gap-2">
          <Search size={16} color="var(--pebble)" />
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="بحث بالاسم أو البريد..."
            className="flex-1"
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              fontFamily: "Tajawal, sans-serif",
            }}
          />
        </div>
      </form>

      {/* Table */}
      <div
        className="card overflow-hidden"
        style={{ borderRadius: 16, padding: 0 }}
      >
        <table className="w-full" style={{ fontSize: 13, fontFamily: "Tajawal, sans-serif" }}>
          <thead>
            <tr style={{ background: "var(--fog)", color: "var(--stone)" }}>
              <Th>الاسم</Th>
              <Th>البريد</Th>
              <Th>الدور</Th>
              <Th>الخطّة</Th>
              <Th>الرصيد</Th>
              <Th>الوظائف</Th>
              <Th>انضمّ</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr
                key={u.id}
                className="hover:bg-fog transition-colors"
                style={{
                  borderTop: i === 0 ? "1px solid var(--border-sub)" : "1px solid var(--border-sub)",
                }}
              >
                <Td bold>{u.name || "—"}</Td>
                <Td>
                  <span style={{ direction: "ltr", fontFamily: "Inter, sans-serif", fontSize: 12 }}>
                    {u.email}
                  </span>
                </Td>
                <Td>
                  {u.systemRole === "SYSTEM_ADMIN" ? (
                    <span
                      style={{
                        fontSize: 11,
                        background: "var(--orange-soft)",
                        color: "var(--orange)",
                        padding: "2px 10px",
                        borderRadius: "var(--r-badge)",
                        fontFamily: "Tajawal, sans-serif",
                        border: "1px solid rgba(246,146,81,0.2)",
                      }}
                    >
                      مالك
                    </span>
                  ) : (
                    <span style={{ color: "var(--stone)" }}>مستخدم</span>
                  )}
                </Td>
                <Td>{u.subscription?.plan.nameAr ?? "—"}</Td>
                <Td>{ar(u.pagesBalance)}</Td>
                <Td>{ar(u._count.jobs)}</Td>
                <Td>
                  <span style={{ fontSize: 11, color: "var(--pebble)" }}>
                    {new Date(u.createdAt).toLocaleDateString("ar-SA")}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "right",
        padding: "12px 16px",
        fontSize: 11,
        fontWeight: 500,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}
    >
      {children}
    </th>
  );
}
function Td({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <td
      style={{
        padding: "14px 16px",
        color: "var(--carbon)",
        fontWeight: bold ? 500 : 400,
      }}
    >
      {children}
    </td>
  );
}
