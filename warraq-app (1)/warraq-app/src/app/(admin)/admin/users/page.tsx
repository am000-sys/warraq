// src/app/(admin)/admin/users/page.tsx
import { db } from "@/lib/db";

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
      <h1 className="text-2xl font-bold mb-4">المستخدمون</h1>

      <form action="/admin/users" method="get" className="mb-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="بحث بالاسم أو البريد..."
          className="border rounded-lg px-3 py-2 w-full max-w-md"
        />
      </form>

      <p className="text-sm text-gray-500 mb-4">
        المجموع: {total.toLocaleString("ar-SA")} مستخدم
      </p>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-right p-3">الاسم</th>
              <th className="text-right p-3">البريد</th>
              <th className="text-right p-3">الدور</th>
              <th className="text-right p-3">الخطّة</th>
              <th className="text-right p-3">الرصيد</th>
              <th className="text-right p-3">الوظائف</th>
              <th className="text-right p-3">انضمّ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{u.name}</td>
                <td className="p-3 text-gray-600">{u.email}</td>
                <td className="p-3">
                  {u.systemRole === "SYSTEM_ADMIN" ? (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                      مالك
                    </span>
                  ) : (
                    "مستخدم"
                  )}
                </td>
                <td className="p-3">{u.subscription?.plan.nameAr ?? "—"}</td>
                <td className="p-3">{u.pagesBalance.toLocaleString("ar-SA")}</td>
                <td className="p-3">{u._count.jobs}</td>
                <td className="p-3 text-xs text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString("ar-SA")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
