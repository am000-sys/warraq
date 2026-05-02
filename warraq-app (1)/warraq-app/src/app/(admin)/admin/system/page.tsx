// src/app/(admin)/admin/system/page.tsx
import { db } from "@/lib/db";

export default async function AdminSystemPage() {
  const recentLogs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const settings = await db.systemSetting.findMany();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">النظام</h1>

      <h2 className="font-bold mb-3">الإعدادات</h2>
      <div className="bg-white border rounded-2xl p-4 mb-6">
        {settings.length === 0 ? (
          <p className="text-sm text-gray-500">لا توجد إعدادات.</p>
        ) : (
          <dl className="space-y-2 text-sm">
            {settings.map((s) => (
              <div key={s.key} className="flex justify-between">
                <dt className="text-gray-600">{s.key}</dt>
                <dd className="font-mono text-xs">{JSON.stringify(s.value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <h2 className="font-bold mb-3">سجلّ النشاط</h2>
      <div className="bg-white border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-right p-3">الإجراء</th>
              <th className="text-right p-3">المستخدم</th>
              <th className="text-right p-3">المورد</th>
              <th className="text-right p-3">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((log) => (
              <tr key={log.id} className="border-t">
                <td className="p-3 font-mono text-xs">{log.action}</td>
                <td className="p-3 text-xs text-gray-600">{log.userId ?? "—"}</td>
                <td className="p-3 text-xs">
                  {log.entity}/{log.entityId}
                </td>
                <td className="p-3 text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString("ar-SA")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
