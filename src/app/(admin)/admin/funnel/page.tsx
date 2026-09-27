// src/app/(admin)/admin/funnel/page.tsx — مسار التحويل: من التسجيل إلى الشراء، ومن توقّف أين
import { PageHeader } from "@/components/page-header";
import { getFunnel, type FunnelUser } from "@/lib/funnel";
import { ar } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TONE: Record<FunnelUser["hint"]["tone"], { bg: string; fg: string }> = {
  hot: { bg: "var(--orange-soft)", fg: "var(--orange)" },
  warn: { bg: "var(--fog)", fg: "var(--carbon)" },
  idle: { bg: "var(--fog)", fg: "var(--stone)" },
};

export default async function FunnelPage() {
  const { stages, rows, freePages, trial } = await getFunnel();
  const top = Math.max(1, stages[0].count);

  return (
    <div>
      <PageHeader
        title="مسار التحويل"
        subtitle="أين يتوقّف المستخدمون بين التسجيل والشراء — ومن يستحقّ رسالةً منك اليوم."
      />

      {/* المراحل */}
      <div className="card mb-5" style={{ borderRadius: 16, padding: 20 }}>
        {trial && (
          <p style={{ fontSize: 13, color: "var(--stone)", marginBottom: 14 }}>
            قبل التسجيل: صفحة «جرّب» استُعملت {ar(trial.uses)} مرّة من {ar(trial.visitors)} عنوانٍ مختلف.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {stages.map((s, i) => {
            const prev = i > 0 ? stages[i - 1].count : s.count;
            const drop = i > 0 && prev > 0 ? Math.round((1 - s.count / prev) * 100) : 0;
            return (
              <div key={s.key} className="flex items-center gap-3" style={{ fontSize: 13 }}>
                <span style={{ width: 150, flexShrink: 0, color: "var(--carbon)" }}>{s.label}</span>
                <div style={{ flex: 1, background: "var(--fog)", borderRadius: 100, height: 22, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${(s.count / top) * 100}%`,
                      minWidth: s.count ? 28 : 0,
                      height: "100%",
                      background: "var(--orange)",
                      borderRadius: 100,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      paddingInline: 10,
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    {s.count ? ar(s.count) : ""}
                  </div>
                </div>
                <span style={{ width: 70, flexShrink: 0, fontSize: 11, color: drop >= 50 ? "var(--orange)" : "var(--pebble)" }}>
                  {i > 0 && prev > 0 ? `فقدٌ ${ar(drop)}٪` : ""}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 11, color: "var(--pebble)", marginTop: 14 }}>
          الرصيد المجانيّ عند التسجيل {ar(freePages)} صفحة. «فتح صفحة الشحن» يُحصى منذ تفعيل هذا التتبّع لا قبله.
        </p>
      </div>

      {/* كلّ مستخدم: أين وقف، وما الخطوة التالية */}
      <div className="card overflow-hidden" style={{ borderRadius: 16, padding: 0 }}>
        <table className="w-full" style={{ fontSize: 13, fontFamily: "Tajawal, sans-serif" }}>
          <thead>
            <tr style={{ background: "var(--fog)", color: "var(--stone)" }}>
              <Th>المستخدم</Th>
              <Th>سجّل</Th>
              <Th>ملفّات</Th>
              <Th>صفحات فُرّغت</Th>
              <Th>الرصيد</Th>
              <Th>آخر رفع</Th>
              <Th>الخطوة التالية</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: "center", color: "var(--pebble)" }}>
                  لا مستخدمين بعد.
                </td>
              </tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} style={{ borderTop: "1px solid var(--border-sub)" }}>
                <Td>
                  <div style={{ fontWeight: 700 }}>{u.name || "—"}</div>
                  <a
                    href={`mailto:${u.email}`}
                    style={{ direction: "ltr", fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--stone)" }}
                  >
                    {u.email}
                  </a>
                </Td>
                <Td muted>{new Date(u.createdAt).toLocaleDateString("ar-SA")}</Td>
                <Td>
                  {ar(u.jobs)}
                  {u.failedJobs > 0 && (
                    <span style={{ fontSize: 11, color: "var(--orange)" }}> ({ar(u.failedJobs)} فشل)</span>
                  )}
                </Td>
                <Td>{ar(u.pagesUsed)}</Td>
                <Td>{ar(u.balance)}</Td>
                <Td muted>{u.lastJobAt ? new Date(u.lastJobAt).toLocaleDateString("ar-SA") : "—"}</Td>
                <Td>
                  <span
                    style={{
                      fontSize: 12,
                      background: TONE[u.hint.tone].bg,
                      color: TONE[u.hint.tone].fg,
                      padding: "3px 10px",
                      borderRadius: "var(--r-badge)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {u.hint.text}
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
  return <th style={{ textAlign: "start", padding: "12px 16px", fontWeight: 500 }}>{children}</th>;
}

function Td({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <td style={{ padding: "12px 16px", color: muted ? "var(--pebble)" : "var(--carbon)", fontSize: muted ? 12 : 13 }}>
      {children}
    </td>
  );
}
