// src/components/payment-diagnostics.tsx — تشخيص بوّابات الدفع (وضع المفاتيح + الشحنات الفعليّة)
// الغرض: كشف الحالة التي ينجح فيها الدفع في الموقع ولا تصل الأموال إلى حساب Tap.
// ملاحظة جوهريّة: القراءة تخصّ **البيئة التي تعمل فيها هذه الصفحة وحدها** — متغيّرات
// Vercel تُضبط لكلّ بيئة على حدة، فقد يكون مفتاح Preview اختباريّاً والإنتاج مباشراً.
import { CreditCard } from "lucide-react";
import type { TransactionStatus } from "@prisma/client";

export type TapChargeRow = {
  id: string;
  createdAt: Date;
  localStatus: TransactionStatus; // حالتها في قاعدتنا
  localAmountSar: number;
  status: string | null; // حالتها لدى Tap
  liveMode: boolean | null;
  amount: string | null;
  error?: string;
};

export type GatewayDiagnostic = {
  name: string;
  configured: boolean;
  mode: "live" | "test" | "unknown" | null;
  webhookUrl: string | null;
  charges: TapChargeRow[];
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

const ENV_LABEL: Record<string, string> = {
  production: "الإنتاج (Production)",
  preview: "معاينة فرع (Preview)",
  development: "تطوير (Development)",
};

function Notice({
  tone,
  children,
}: {
  tone: "warn" | "alert";
  children: React.ReactNode;
}) {
  const color = tone === "alert" ? "201,123,132" : "246,146,81";
  return (
    <div
      style={{
        background: `rgba(${color},0.08)`,
        border: `1px solid rgba(${color},0.25)`,
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        fontFamily: "Tajawal, sans-serif",
        fontSize: 12.5,
        lineHeight: 1.9,
        color: "var(--carbon)",
      }}
    >
      {children}
    </div>
  );
}

export function PaymentDiagnostics({
  gateways,
  deployEnv,
  deployUrl,
}: {
  gateways: GatewayDiagnostic[];
  deployEnv: string | null;
  deployUrl: string | null;
}) {
  const testGateways = gateways.filter(
    (g) => g.configured && (g.mode === "test" || g.charges.some((c) => c.liveMode === false)),
  );
  // شحنة حقيقيّة مُحصَّلة فعلاً — دليل قاطع أنّ بيئةً ما كانت مباشرة
  const liveCaptured = gateways
    .flatMap((g) => g.charges)
    .filter((c) => c.liveMode === true && c.status === "CAPTURED");
  const notProduction = Boolean(deployEnv && deployEnv !== "production");
  // خلاصة رقميّة تُجيب مباشرةً: كم وصل البوّابة فعلاً؟ CAPTURED اختباريّة = صفر ريال.
  const allCharges = gateways.flatMap((g) => g.charges);
  const testCaptured = allCharges.filter(
    (c) => c.liveMode === false && c.status === "CAPTURED",
  );
  const sumSar = (rows: TapChargeRow[]) =>
    rows.reduce((t, c) => t + c.localAmountSar, 0).toFixed(2).replace(/\.00$/, "");

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
            وضع المفاتيح المُشغَّلة فعلاً، وحالة الشحنات كما تراها البوّابة نفسها
          </div>
        </div>
      </div>

      {notProduction && (
        <Notice tone="warn">
          <strong style={{ color: "var(--orange)" }}>
            انتبه: هذه القراءة تخصّ بيئة «{ENV_LABEL[deployEnv!] ?? deployEnv}» فقط.
          </strong>{" "}
          متغيّرات البيئة في Vercel تُضبط لكلّ بيئة على حدة، فقد يكون المفتاح هنا اختباريّاً
          والإنتاج مباشراً أو العكس. للحكم على المدفوعات الحقيقيّة افتح هذه الصفحة على نطاق
          الإنتاج.
        </Notice>
      )}

      {testGateways.length > 0 && (
        <Notice tone="alert">
          <strong style={{ color: "var(--rose)" }}>
            {testGateways.map((g) => g.name).join("، ")} تعمل بوضع اختباريّ في هذه البيئة.
          </strong>{" "}
          الدفع ينجح في الموقع ويُضاف الرصيد للمستخدم، لكن لا مال يُحصَّل ولا تظهر العمليّة في
          لوحة البوّابة المباشرة. ولأنّ البيئة الاختباريّة لا تلمس البطاقات الحقيقيّة، فأيّ مبلغ
          خُصم فعلاً من بطاقة لم تخصمه شحنة اختباريّة — راجع الشحنات الحقيقيّة أدناه. الحلّ:
          استبدل المفتاح بمفتاح الإنتاج (يبدأ بـ{" "}
          <code style={{ direction: "ltr", display: "inline-block" }}>sk_live_</code>) في متغيّرات
          البيئة على Vercel ثمّ أعد النشر.
        </Notice>
      )}

      {liveCaptured.length > 0 && (
        <Notice tone="warn">
          <strong style={{ color: "var(--orange)" }}>
            هناك {liveCaptured.length} شحنة حقيقيّة مُحصَّلة (CAPTURED · live).
          </strong>{" "}
          هذه مبالغ فعليّة يجب أن تجدها في لوحة Tap بوضع Live. طابِق معرّفاتها أدناه مع اللوحة.
        </Notice>
      )}

      {allCharges.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 16,
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          <div
            style={{
              flex: "1 1 200px",
              background: "var(--fog)",
              borderRadius: 12,
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--pebble)" }}>وصل البوّابة فعلاً</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: liveCaptured.length ? "var(--success)" : "var(--stone)",
              }}
            >
              {sumSar(liveCaptured)} ريال
              <span style={{ fontSize: 11, color: "var(--pebble)" }}>
                {" "}
                ({liveCaptured.length} عمليّة)
              </span>
            </div>
          </div>
          <div
            style={{
              flex: "1 1 200px",
              background: "var(--fog)",
              borderRadius: 12,
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--pebble)" }}>
              مُحصَّل اختباريّاً (محاكاة — بلا مال)
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 500,
                color: testCaptured.length ? "var(--rose)" : "var(--stone)",
              }}
            >
              {sumSar(testCaptured)} ريال
              <span style={{ fontSize: 11, color: "var(--pebble)" }}>
                {" "}
                ({testCaptured.length} عمليّة)
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col" style={{ gap: 24, fontFamily: "Tajawal, sans-serif" }}>
        {gateways.map((g) => {
          const m = modeLabel(g.mode);
          return (
            <div key={g.name} className="flex flex-col" style={{ gap: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--carbon)" }}>{g.name}</div>
              <dl className="flex flex-col" style={{ gap: 12 }}>
                <Row label="الوضع">
                  <span style={{ color: m.color }}>{m.text}</span>
                </Row>
                {deployEnv && <Row label="بيئة النشر">{ENV_LABEL[deployEnv] ?? deployEnv}</Row>}
                {g.webhookUrl && (
                  <Row label="رابط الإشعار (webhook)" mono>
                    {g.webhookUrl}
                  </Row>
                )}
              </dl>

              {g.configured && g.charges.length === 0 && (
                <div style={{ fontSize: 12.5, color: "var(--pebble)" }}>لا توجد عمليّات بعد</div>
              )}

              {g.charges.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 12,
                      minWidth: 640,
                    }}
                  >
                    <thead>
                      <tr style={{ color: "var(--pebble)", textAlign: "right" }}>
                        <th style={{ padding: "8px 6px", fontWeight: 400 }}>التاريخ</th>
                        <th style={{ padding: "8px 6px", fontWeight: 400 }}>المعرّف لدى Tap</th>
                        <th style={{ padding: "8px 6px", fontWeight: 400 }}>المبلغ</th>
                        <th style={{ padding: "8px 6px", fontWeight: 400 }}>لدينا</th>
                        <th style={{ padding: "8px 6px", fontWeight: 400 }}>لدى Tap</th>
                        <th style={{ padding: "8px 6px", fontWeight: 400 }}>حقيقيّة؟</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.charges.map((c) => (
                        <tr key={c.id} style={{ borderTop: "1px solid var(--border-sub)" }}>
                          <td style={{ padding: "8px 6px", color: "var(--stone)" }}>
                            {c.createdAt.toLocaleDateString("ar-SA")}
                          </td>
                          <td
                            style={{
                              padding: "8px 6px",
                              fontFamily: "ui-monospace, Menlo, monospace",
                              direction: "ltr",
                              fontSize: 11,
                            }}
                          >
                            {c.id}
                          </td>
                          <td style={{ padding: "8px 6px", direction: "ltr", textAlign: "right" }}>
                            {c.amount ?? `${c.localAmountSar} SAR`}
                          </td>
                          <td style={{ padding: "8px 6px", color: "var(--stone)" }}>
                            {c.localStatus}
                          </td>
                          <td style={{ padding: "8px 6px" }}>
                            {c.error ? (
                              <span style={{ color: "var(--rose)" }}>{c.error}</span>
                            ) : (
                              <span
                                style={{
                                  color:
                                    c.status === "CAPTURED"
                                      ? c.liveMode === true
                                        ? "var(--success)"
                                        : "var(--rose)"
                                      : "var(--stone)",
                                }}
                              >
                                {c.status ?? "—"}
                                {c.status === "CAPTURED" && c.liveMode === false && (
                                  <span style={{ fontSize: 10.5, opacity: 0.85 }}>
                                    {" "}
                                    (محاكاة — بلا مال)
                                  </span>
                                )}
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "8px 6px" }}>
                            {c.liveMode === null ? (
                              <span style={{ color: "var(--pebble)" }}>—</span>
                            ) : (
                              <span
                                style={{ color: c.liveMode ? "var(--success)" : "var(--rose)" }}
                              >
                                {c.liveMode ? "حقيقيّة" : "اختباريّة"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
        دلالة الحالات لدى Tap: <strong>CAPTURED</strong> = اكتملت الشحنة —{" "}
        <em>في بيئتها</em>؛ فإن كانت اختباريّة فهي محاكاة بلا مال، ولا تكون مالاً حقيقيّاً إلّا
        مع «حقيقيّة» ·{" "}
        <strong>ABANDONED</strong> = غادر العميل صفحة الدفع دون إتمامها ·{" "}
        <strong>INITIATED</strong> = أُنشئت ولم تُدفع بعد · <strong>DECLINED</strong> = رفضها
        المُصدِر. وإن كان الوضع «مباشر» والشحنة «حقيقيّة» ومُحصَّلة ومع ذلك لا تجد المبلغ في
        لوحة Tap: تأكّد أنّك تنظر إلى الحساب نفسه (Live وليس Test في اللوحة، والـ business
        الصحيح)، ثمّ راجع دورة التسوية — Tap تحتجز المبالغ ثمّ تحوّلها للبنك بعد مدّة التسوية.
        {deployUrl ? ` (النشر الحاليّ: ${deployUrl})` : ""}
      </p>
    </div>
  );
}
