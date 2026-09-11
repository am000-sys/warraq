// src/components/payment-diagnostics.tsx — تشخيص بوّابات الدفع (وضع المفاتيح + آخر شحنة فعليّة)
// الغرض: كشف الحالة التي ينجح فيها الدفع في الموقع ولا تصل الأموال إلى حساب Tap —
// وسببها الأغلب مفتاح اختباريّ (sk_test_) يُرجع CAPTURED دون تحصيل حقيقيّ.
import { CreditCard } from "lucide-react";

export type GatewayDiagnostic = {
  name: string;
  configured: boolean;
  mode: "live" | "test" | "unknown" | null;
  webhookUrl: string | null;
  lastCharge?: {
    id: string;
    status: string | null;
    liveMode: boolean | null;
    amount: string | null;
    createdAt: Date;
    error?: string;
  } | null;
};

function Row({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div
      className="flex justify-between items-center flex-wrap"
      style={{ gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--border-sub)" }}
    >
      <dt style={{ fontSize: 13, color: "var(--stone)" }}>{label}</dt>
      <dd
        style={
          mono
            ? {
                fontSize: 12,
                fontFamily: "ui-monospace, Menlo, monospace",
                direction: "ltr",
                background: "var(--fog)",
                padding: "4px 10px",
                borderRadius: 6,
                wordBreak: "break-all",
              }
            : { fontSize: 13, fontWeight: 500 }
        }
      >
        {children}
      </dd>
    </div>
  );
}

function modeLabel(mode: GatewayDiagnostic["mode"]) {
  if (mode === "live") return { text: "مباشر (أموال حقيقيّة)", color: "var(--success)" };
  if (mode === "test") return { text: "اختباريّ — لا تُحصَّل أموال", color: "var(--rose)" };
  if (mode === "unknown") return { text: "صيغة مفتاح غير معروفة", color: "var(--rose)" };
  return { text: "غير مُعَدّ", color: "var(--pebble)" };
}

export function PaymentDiagnostics({ gateways }: { gateways: GatewayDiagnostic[] }) {
  // تحذير جامع: أيّ بوّابة مفعّلة بمفتاح اختباريّ، أو آخر شحنة بوضع اختباريّ
  const testGateways = gateways.filter(
    (g) => g.configured && (g.mode === "test" || g.lastCharge?.liveMode === false),
  );

  return (
    <div className="card mb-7" style={{ borderRadius: 16 }}>
      <div className="flex items-center" style={{ gap: 10, marginBottom: 16 }}>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, borderRadius: 10, background: "var(--orange-soft)" }}
        >
          <CreditCard size={15} color="var(--orange)" strokeWidth={1.8} />
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--carbon)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            تشخيص بوّابات الدفع
          </div>
          <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
            وضع المفاتيح المُشغَّلة فعلاً، وحالة آخر شحنة كما تراها البوّابة نفسها
          </div>
        </div>
      </div>

      {testGateways.length > 0 && (
        <div
          style={{
            background: "rgba(201,123,132,0.08)",
            border: "1px solid rgba(201,123,132,0.25)",
            borderRadius: 12,
            padding: 14,
            marginBottom: 16,
            fontFamily: "Tajawal, sans-serif",
            fontSize: 12.5,
            lineHeight: 1.9,
            color: "var(--carbon)",
          }}
        >
          <strong style={{ color: "var(--rose)" }}>
            تنبيه: {testGateways.map((g) => g.name).join("، ")} تعمل بوضع اختباريّ.
          </strong>{" "}
          الدفع ينجح في الموقع ويُضاف الرصيد للمستخدم، لكن لا مال يُحصَّل ولا تظهر العمليّة في
          لوحة البوّابة المباشرة. الحلّ: استبدل المفتاح بمفتاح الإنتاج (يبدأ بـ{" "}
          <code style={{ direction: "ltr", display: "inline-block" }}>sk_live_</code>) في متغيّرات
          البيئة على Vercel ثمّ أعد النشر.
        </div>
      )}

      <div className="flex flex-col" style={{ gap: 20, fontFamily: "Tajawal, sans-serif" }}>
        {gateways.map((g) => {
          const m = modeLabel(g.mode);
          return (
            <dl key={g.name} className="flex flex-col" style={{ gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--carbon)" }}>{g.name}</div>
              <Row label="الوضع">
                <span style={{ color: m.color }}>{m.text}</span>
              </Row>
              {g.webhookUrl && (
                <Row label="رابط الإشعار (webhook)" mono>
                  {g.webhookUrl}
                </Row>
              )}
              {g.lastCharge && (
                <>
                  <Row label="آخر عمليّة — المعرّف لدى البوّابة" mono>
                    {g.lastCharge.id}
                  </Row>
                  <Row label="آخر عمليّة — حالتها لدى البوّابة">
                    {g.lastCharge.error ? (
                      <span style={{ color: "var(--rose)" }}>{g.lastCharge.error}</span>
                    ) : (
                      <span>
                        {g.lastCharge.status ?? "—"}
                        {g.lastCharge.amount ? ` · ${g.lastCharge.amount}` : ""}
                      </span>
                    )}
                  </Row>
                  {g.lastCharge.liveMode !== null && (
                    <Row label="آخر عمليّة — حقيقيّة أم اختباريّة">
                      <span
                        style={{
                          color: g.lastCharge.liveMode ? "var(--success)" : "var(--rose)",
                        }}
                      >
                        {g.lastCharge.liveMode ? "حقيقيّة (live)" : "اختباريّة (test)"}
                      </span>
                    </Row>
                  )}
                </>
              )}
              {g.configured && !g.lastCharge && (
                <Row label="آخر عمليّة">
                  <span style={{ color: "var(--pebble)" }}>لا توجد عمليّات بعد</span>
                </Row>
              )}
            </dl>
          );
        })}
      </div>

      <p
        style={{
          marginTop: 16,
          fontSize: 11.5,
          lineHeight: 1.9,
          color: "var(--pebble)",
          fontFamily: "Tajawal, sans-serif",
        }}
      >
        إن كان الوضع «مباشر» والعمليّة «حقيقيّة» ومع ذلك لا تجد المبلغ في لوحة Tap: تأكّد أنّك
        تنظر إلى الحساب نفسه (Live وليس Test في اللوحة، والـ business الصحيح)، ثمّ راجع دورة
        التسوية — Tap تحتجز المبالغ ثمّ تحوّلها للبنك بعد مدّة التسوية المتّفق عليها.
      </p>
    </div>
  );
}
