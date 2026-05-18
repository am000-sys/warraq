// src/app/(admin)/admin/system/page.tsx — إعدادات النظام + سجلّ النشاط
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";

export default async function AdminSystemPage() {
  const [recentLogs, settings] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.systemSetting.findMany(),
  ]);

  return (
    <div>
      <PageHeader title="النظام" subtitle="إعدادات وسجلّ نشاط المنصّة." />

      {/* Settings */}
      <h2
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--carbon)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 12,
        }}
      >
        الإعدادات
      </h2>
      <div className="card mb-7" style={{ borderRadius: 16 }}>
        {settings.length === 0 ? (
          <p
            style={{
              fontSize: 14,
              color: "var(--pebble)",
              fontFamily: "Tajawal, sans-serif",
              textAlign: "center",
              padding: 24,
            }}
          >
            لا توجد إعدادات.
          </p>
        ) : (
          <dl className="flex flex-col" style={{ gap: 12 }}>
            {settings.map((s, i) => (
              <div
                key={s.key}
                className="flex justify-between items-center"
                style={{
                  paddingBottom: 12,
                  borderBottom:
                    i < settings.length - 1 ? "1px solid var(--border-sub)" : "none",
                }}
              >
                <dt
                  style={{
                    fontSize: 13,
                    color: "var(--stone)",
                    fontFamily: "Tajawal, sans-serif",
                  }}
                >
                  {s.key}
                </dt>
                <dd
                  style={{
                    fontSize: 12,
                    fontFamily: "ui-monospace, Menlo, monospace",
                    direction: "ltr",
                    color: "var(--carbon)",
                    background: "var(--fog)",
                    padding: "4px 10px",
                    borderRadius: 6,
                  }}
                >
                  {JSON.stringify(s.value)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Audit log */}
      <h2
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--carbon)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 12,
        }}
      >
        سجلّ النشاط
      </h2>
      <div className="card overflow-hidden" style={{ borderRadius: 16, padding: 0 }}>
        <table className="w-full" style={{ fontSize: 13, fontFamily: "Tajawal, sans-serif" }}>
          <thead>
            <tr style={{ background: "var(--fog)", color: "var(--stone)" }}>
              <Th>الإجراء</Th>
              <Th>المستخدم</Th>
              <Th>المورد</Th>
              <Th>التاريخ</Th>
            </tr>
          </thead>
          <tbody>
            {recentLogs.map((log) => (
              <tr key={log.id} style={{ borderTop: "1px solid var(--border-sub)" }}>
                <td
                  style={{
                    padding: "12px 16px",
                    fontFamily: "ui-monospace, Menlo, monospace",
                    fontSize: 11,
                    color: "var(--carbon)",
                    direction: "ltr",
                  }}
                >
                  {log.action}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    fontSize: 11,
                    color: "var(--pebble)",
                    fontFamily: "ui-monospace, Menlo, monospace",
                    direction: "ltr",
                  }}
                >
                  {log.userId ?? "—"}
                </td>
                <td
                  style={{
                    padding: "12px 16px",
                    fontSize: 11,
                    color: "var(--stone)",
                    fontFamily: "ui-monospace, Menlo, monospace",
                    direction: "ltr",
                  }}
                >
                  {log.entity}/{log.entityId}
                </td>
                <td style={{ padding: "12px 16px", fontSize: 11, color: "var(--pebble)" }}>
                  {new Date(log.createdAt).toLocaleString("ar-SA")}
                </td>
              </tr>
            ))}
            {recentLogs.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: "var(--pebble)",
                    fontFamily: "Tajawal, sans-serif",
                    fontSize: 14,
                  }}
                >
                  لا يوجد نشاط بعد.
                </td>
              </tr>
            )}
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
