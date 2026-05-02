// src/app/(admin)/admin/revenue/page.tsx
import { db } from "@/lib/db";

export default async function AdminRevenuePage() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [thisMonthAgg, prevMonthAgg, recent] = await Promise.all([
    db.transaction.aggregate({
      where: {
        status: "SUCCEEDED",
        createdAt: { gte: startOfMonth },
        type: { in: ["SUBSCRIPTION", "ONE_TIME"] },
      },
      _sum: { amountSar: true },
      _count: true,
    }),
    db.transaction.aggregate({
      where: {
        status: "SUCCEEDED",
        createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
        type: { in: ["SUBSCRIPTION", "ONE_TIME"] },
      },
      _sum: { amountSar: true },
      _count: true,
    }),
    db.transaction.findMany({
      where: { status: "SUCCEEDED" },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        user: { select: { email: true, name: true } },
      },
    }),
  ]);

  const thisMonth = (thisMonthAgg._sum.amountSar ?? 0) / 100;
  const prevMonth = (prevMonthAgg._sum.amountSar ?? 0) / 100;
  const change = prevMonth > 0 ? ((thisMonth - prevMonth) / prevMonth) * 100 : 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">الإيرادات</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card label="هذا الشهر" value={`${thisMonth.toLocaleString("ar-SA")} ﷼`} />
        <Card label="الشهر الماضي" value={`${prevMonth.toLocaleString("ar-SA")} ﷼`} />
        <Card
          label="التغيّر"
          value={`${change > 0 ? "+" : ""}${change.toFixed(1)}%`}
          accent={change > 0}
        />
      </div>

      <h2 className="text-lg font-bold mb-3">آخر المعاملات</h2>
      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right p-3">المستخدم</th>
              <th className="text-right p-3">النوع</th>
              <th className="text-right p-3">المبلغ</th>
              <th className="text-right p-3">البوّابة</th>
              <th className="text-right p-3">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-3 text-xs">{t.user?.email ?? "—"}</td>
                <td className="p-3">{t.type === "ONE_TIME" ? "دفعة واحدة" : "اشتراك"}</td>
                <td className="p-3 font-medium">
                  {(t.amountSar / 100).toLocaleString("ar-SA")} ﷼
                </td>
                <td className="p-3">{t.gateway}</td>
                <td className="p-3 text-xs text-gray-500">
                  {new Date(t.createdAt).toLocaleString("ar-SA")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    <div className="bg-white border rounded-2xl p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${accent ? "text-green-600" : ""}`}>
        {value}
      </p>
    </div>
  );
}
