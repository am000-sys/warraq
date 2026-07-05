// src/app/(admin)/admin/system/page.tsx — إعدادات النظام + سجلّ النشاط + تشخيص الأداء
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { InitDbButton } from "@/components/init-db-button";
import { Activity } from "lucide-react";

// قياس زمن الذهاب والإياب لقاعدة البيانات من داخل دالّة الخادم نفسها.
// عيّنات متتابعة: الأولى قد تشمل فتح الاتصال، والأفضل (min) يمثّل زمن الشبكة الصافي.
async function measureDbLatency(): Promise<{ samples: number[]; ok: boolean }> {
  const samples: number[] = [];
  try {
    for (let i = 0; i < 6; i++) {
      const t = performance.now();
      await db.$queryRaw`SELECT 1`;
      samples.push(Math.round(performance.now() - t));
    }
    return { samples, ok: true };
  } catch {
    return { samples, ok: false };
  }
}

// مضيف قاعدة البيانات (الاسم فقط — لا يُعرض المستخدم ولا كلمة المرور أبداً)
function dbHost(): string | null {
  try {
    const raw = process.env.DATABASE_URL;
    if (!raw) return null;
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

// اقتراح أقرب منطقة Vercel من نمط اسم مضيف القاعدة (AWS regions الشائعة)
const REGION_MAP: [string, string][] = [
  ["us-east-1", "iad1 (واشنطن)"],
  ["us-east-2", "cle1 (كليفلاند)"],
  ["us-west-1", "sfo1 (سان فرانسيسكو)"],
  ["us-west-2", "pdx1 (بورتلاند)"],
  ["eu-central-1", "fra1 (فرانكفورت)"],
  ["eu-west-1", "dub1 (دبلن)"],
  ["eu-west-2", "lhr1 (لندن)"],
  ["eu-west-3", "cdg1 (باريس)"],
  ["eu-north-1", "arn1 (ستوكهولم)"],
  ["ap-southeast-1", "sin1 (سنغافورة)"],
  ["ap-southeast-2", "syd1 (سيدني)"],
  ["ap-south-1", "bom1 (مومباي)"],
  ["ap-northeast-1", "hnd1 (طوكيو)"],
  ["ap-northeast-2", "icn1 (سيول)"],
  ["sa-east-1", "gru1 (ساو باولو)"],
  ["me-south-1", "dxb1 (دبي)"],
  ["me-central-1", "dxb1 (دبي)"],
  ["af-south-1", "cpt1 (كيب تاون)"],
];

function suggestVercelRegion(host: string | null): string | null {
  if (!host) return null;
  const hit = REGION_MAP.find(([aws]) => host.includes(aws));
  return hit ? hit[1] : null;
}

// حكم عمليّ على زمن القاعدة (أفضل عيّنة = زمن الشبكة الصافي بين الدالّة والقاعدة).
// sameRegion: هل منطقة الدالّة تطابق المنطقة المقترحة من مضيف القاعدة؟ —
// تُميّز بين مشكلة مسافة (انقل المنطقة) ومشكلة موصّل (حسّن الاتصال).
function latencyVerdict(
  best: number,
  sameRegion: boolean,
): { label: string; color: string; advice: string | null } {
  if (best <= 5)
    return { label: "ممتاز — نفس المنطقة", color: "var(--success)", advice: null };
  if (best <= 25)
    return { label: "جيّد", color: "var(--success)", advice: null };
  if (best <= 80) {
    return sameRegion
      ? {
          label: "جيّد — يتبقّى زمن الموصّل",
          color: "var(--orange)",
          advice:
            "المنطقتان متطابقتان، والمتبقّي كلفة الموصّل المشترك (pooler). خطوة مجّانيّة: في DATABASE_URL ارفع connection_limit إلى 5 (إن كان 1) ليستعيد التطبيق توازي الاستعلامات. ولمزيد من الخفض لاحقاً: موصّل مخصّص من مزوّد القاعدة.",
        }
      : {
          label: "مقبول — لكن ليس مثاليّاً",
          color: "var(--orange)",
          advice: "القاعدة ليست في منطقة الدوالّ نفسها. قرّبهما لتقليص زمن كلّ صفحة.",
        };
  }
  return sameRegion
    ? {
        label: "بطيء رغم تطابق المنطقة",
        color: "var(--rose)",
        advice:
          "الزمن أعلى ممّا تبرّره الشبكة — افحص حِمل القاعدة/خطّتها، أو جرّب موصّلاً مخصّصاً بدل المشترك.",
      }
    : {
        label: "بعيد — هذا سبب البطء الرئيس",
        color: "var(--rose)",
        advice:
          "كلّ استعلام يدفع هذا الزمن كاملاً، والصفحة الواحدة تنفّذ عدّة استعلامات. الحلّ: في Vercel → Settings → Functions → Region اختر المنطقة الأقرب لقاعدة البيانات (تجدها في عنوان DATABASE_URL)، أو انقل القاعدة لمنطقة الدوالّ.",
      };
}

export default async function AdminSystemPage() {
  // القياس أوّلاً وبتسلسل — كي لا تُزاحمه استعلامات الصفحة فتتشوّه الأرقام
  const dbLatency = await measureDbLatency();

  const [recentLogs, settings] = await Promise.all([
    db.auditLog
      .findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      })
      .catch(() => []),
    db.systemSetting.findMany().catch(() => []),
  ]);

  const region = process.env.VERCEL_REGION || null;
  const host = dbHost();
  const suggested = suggestVercelRegion(host);
  // "hnd1 (طوكيو)" → "hnd1" للمقارنة مع منطقة الدالّة الحاليّة
  const sameRegion = Boolean(region && suggested && suggested.startsWith(region));
  const best = dbLatency.samples.length ? Math.min(...dbLatency.samples) : null;
  const verdict = best !== null ? latencyVerdict(best, sameRegion) : null;

  return (
    <div>
      <PageHeader title="النظام" subtitle="إعدادات وسجلّ نشاط المنصّة." />

      {/* تشخيص الأداء — يقيس من داخل بيئة التشغيل الفعليّة */}
      <div className="card mb-7" style={{ borderRadius: 16 }}>
        <div className="flex items-center" style={{ gap: 10, marginBottom: 16 }}>
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 32, height: 32, borderRadius: 10, background: "var(--orange-soft)" }}
          >
            <Activity size={15} color="var(--orange)" strokeWidth={1.8} />
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
              تشخيص الأداء
            </div>
            <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
              يُقاس عند كلّ تحميل لهذه الصفحة، من داخل دالّة الخادم نفسها
            </div>
          </div>
        </div>

        <dl className="flex flex-col" style={{ gap: 12, fontFamily: "Tajawal, sans-serif" }}>
          <div
            className="flex justify-between items-center"
            style={{ paddingBottom: 12, borderBottom: "1px solid var(--border-sub)" }}
          >
            <dt style={{ fontSize: 13, color: "var(--stone)" }}>منطقة دالّة الخادم (Vercel)</dt>
            <dd
              style={{
                fontSize: 12,
                fontFamily: "ui-monospace, Menlo, monospace",
                direction: "ltr",
                background: "var(--fog)",
                padding: "4px 10px",
                borderRadius: 6,
              }}
            >
              {region ?? "غير متاحة (تشغيل محلّي)"}
            </dd>
          </div>
          <div
            className="flex justify-between items-center flex-wrap"
            style={{ gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--border-sub)" }}
          >
            <dt style={{ fontSize: 13, color: "var(--stone)" }}>مضيف قاعدة البيانات</dt>
            <dd
              style={{
                fontSize: 12,
                fontFamily: "ui-monospace, Menlo, monospace",
                direction: "ltr",
                background: "var(--fog)",
                padding: "4px 10px",
                borderRadius: 6,
                wordBreak: "break-all",
              }}
            >
              {host ?? "—"}
            </dd>
          </div>
          {suggested && (
            <div
              className="flex justify-between items-center"
              style={{ paddingBottom: 12, borderBottom: "1px solid var(--border-sub)" }}
            >
              <dt style={{ fontSize: 13, color: "var(--stone)" }}>
                منطقة Vercel المقترحة (الأقرب للقاعدة)
              </dt>
              <dd
                style={{
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: "var(--orange)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                {suggested}
              </dd>
            </div>
          )}
          <div
            className="flex justify-between items-center"
            style={{ paddingBottom: 12, borderBottom: "1px solid var(--border-sub)" }}
          >
            <dt style={{ fontSize: 13, color: "var(--stone)" }}>
              زمن قاعدة البيانات (٦ عيّنات — الأولى تشمل فتح الاتصال)
            </dt>
            <dd
              style={{
                fontSize: 12,
                fontFamily: "ui-monospace, Menlo, monospace",
                direction: "ltr",
                background: "var(--fog)",
                padding: "4px 10px",
                borderRadius: 6,
              }}
            >
              {dbLatency.ok ? dbLatency.samples.join(" / ") + " ms" : "فشل الاتصال"}
            </dd>
          </div>
          {verdict && (
            <div className="flex justify-between items-center">
              <dt style={{ fontSize: 13, color: "var(--stone)" }}>التقييم</dt>
              <dd style={{ fontSize: 13, fontWeight: 500, color: verdict.color }}>
                {verdict.label}
              </dd>
            </div>
          )}
        </dl>

        {verdict?.advice && (
          <p
            style={{
              marginTop: 14,
              fontSize: 12.5,
              lineHeight: 1.9,
              color: "var(--graphite)",
              fontFamily: "Tajawal, sans-serif",
              background: "var(--orange-soft)",
              border: "1px solid var(--orange-mid)",
              borderRadius: 12,
              padding: "10px 14px",
            }}
          >
            {verdict.advice}
          </p>
        )}

        {/* فحوصات مزوّدي الذكاء — تفتح تقريراً خاماً مع حكم عربيّ وخطوات علاج */}
        <div
          className="flex flex-wrap items-center"
          style={{ gap: 8, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-sub)" }}
        >
          <span style={{ fontSize: 12, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
            فحوصات المزوّدين:
          </span>
          <a
            href="/api/admin/qwen-test"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost no-underline"
            style={{ fontSize: 12, padding: "7px 14px" }}
          >
            فحص Qwen / علي بابا (الملخّص الدراسي)
          </a>
          <a
            href="/api/admin/mistral-test"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost no-underline"
            style={{ fontSize: 12, padding: "7px 14px" }}
          >
            فحص Mistral (التفريغ)
          </a>
        </div>
      </div>

      <InitDbButton />

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
