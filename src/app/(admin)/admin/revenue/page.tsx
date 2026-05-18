// src/app/(admin)/admin/revenue/page.tsx — الإيرادات
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { ar } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

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
  const positive = change >= 0;

  return (
    <div>
      <PageHeader title="الإيرادات" subtitle="الأداء المالي للمنصّة." />

      <div
        className="grid"
        style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 32 }}
      >
        <Card label="هذا الشهر" value={`${thisMonth.toLocaleString("ar-SA")} ﷼`} accent />
        <Card label="الشهر الماضي" value={`${prevMonth.toLocaleString("ar-SA")} ﷼`} />
        <ChangeCard change={change} positive={positive} />
      </div>

      <h2
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--carbon)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 12,
        }}
      >
        آخر المعاملات
      </h2>

      <div className="card overflow-hidden" style={{ borderRadius: 16, padding: 0 }}>
        <table className="w-full" style={{ fontSize: 13, fontFamily: "Tajawal, sans-serif" }}>
          <thead>
            <tr style={{ background: "var(--fog)", color: "var(--stone)" }}>
              <Th>المستخدم</Th>
              <Th>النوع</Th>
              <Th>المبلغ</Th>
              <Th>البوّابة</Th>
              <Th>التاريخ</Th>
            </tr>
          </thead>
          <tbody>
            {recent.map((t) => (
              <tr key={t.id} style={{ borderTop: "1px solid var(--border-sub)" }}>
                <td style={{ padding: "14px 16px", direction: "ltr", fontFamily: "Inter, sans-serif", fontSize: 12, color: "var(--stone)" }}>
                  {t.user?.email ?? "—"}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  {t.type === "ONE_TIME" ? "دفعة واحدة" : t.type === "SUBSCRIPTION" ? "اشتراك" : "استرداد"}
                </td>
                <td style={{ padding: "14px 16px", fontWeight: 500, color: "var(--carbon)" }}>
                  {(t.amountSar / 100).toLocaleString("ar-SA")} ﷼
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span
                    className="badge"
                    style={{ fontSize: 11, padding: "3px 10px" }}
                  >
                    {t.gateway === "STRIPE" ? "Stripe" : "Tap"}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 11, color: "var(--pebble)" }}>
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

function Card({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: accent ? "var(--slate)" : "var(--snow)",
        borderRadius: 16,
        padding: 22,
        border: accent ? "1px solid rgba(246,146,81,0.25)" : "1px solid var(--border-sub)",
        boxShadow: accent ? "0 8px 32px rgba(36,36,51,0.18)" : "var(--shadow-card)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: accent ? "rgba(255,255,255,0.5)" : "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
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

function ChangeCard({ change, positive }: { change: number; positive: boolean }) {
  return (
    <div
      className="card"
      style={{ borderRadius: 16, padding: 22 }}
    >
      <div
        style={{
          fontSize: 12,
          color: "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 10,
        }}
      >
        التغيّر عن الشهر الماضي
      </div>
      <div className="flex items-center gap-2">
        {positive ? (
          <TrendingUp size={22} color="var(--orange)" />
        ) : (
          <TrendingDown size={22} color="var(--rose)" />
        )}
        <span
          style={{
            fontSize: 28,
            fontWeight: 300,
            fontFamily: "Tajawal, sans-serif",
            color: positive ? "var(--orange)" : "var(--rose)",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {change > 0 ? "+" : ""}
          {change.toFixed(1)}%
        </span>
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
