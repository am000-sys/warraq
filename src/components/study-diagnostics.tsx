// src/components/study-diagnostics.tsx — تشخيص مزوّد الملخّص الدراسي (للمالك)
// يُجيب عن أسئلة التبديل بين المزوّدين بنظرة واحدة: أيّ نموذج يعمل الآن؟ وهل
// مفتاحه مضبوط؟ وهل يسع حدُّ الحروف المسموح به نافذةَ ذلك النموذج؟
// يعرض كذلك **مصدر** النموذج العامل (صفّ في القاعدة / متغيّر بيئة / افتراضيّ)،
// ويتيح تبديله بنقرة — لأنّ صفّ القاعدة يتقدّم على البيئة، فضبطُ البيئة وحده قد
// لا يُغيّر شيئاً وسبب ذلك غير ظاهر بلا هذا البيان.
"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import type { StudyDiagnostic } from "@/lib/study";

const PROVIDER_LABEL: Record<StudyDiagnostic["provider"], string> = {
  kimi: "Kimi (Moonshot)",
  qwen: "Qwen (علي بابا)",
  claude: "Claude (Anthropic)",
};

const ar = (n: number) => n.toLocaleString("ar-EG");

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="flex justify-between items-center flex-wrap"
      style={{ gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--border-sub)" }}
    >
      <dt style={{ fontSize: 13, color: "var(--stone)" }}>{label}</dt>
      <dd style={{ fontSize: 13, fontWeight: 500 }}>{children}</dd>
    </div>
  );
}

function Note({ tone, children }: { tone: "warn" | "info"; children: React.ReactNode }) {
  const warn = tone === "warn";
  return (
    <div
      style={{
        background: warn ? "rgba(201,123,132,0.08)" : "var(--orange-soft)",
        border: `1px solid ${warn ? "rgba(201,123,132,0.25)" : "var(--border)"}`,
        borderRadius: 12,
        padding: 14,
        marginTop: 14,
        fontFamily: "Tajawal, sans-serif",
        fontSize: 12.5,
        lineHeight: 2,
        color: "var(--carbon)",
      }}
    >
      {children}
    </div>
  );
}

const SOURCE_LABEL: Record<StudyDiagnostic["modelSource"], string> = {
  db: "صفّ في قاعدة البيانات (يتقدّم على البيئة)",
  env: "متغيّر البيئة STUDY_DEFAULT_MODEL",
  auto: "الافتراضيّ حسب المفتاح الموجود",
};

export function StudyDiagnostics({ data }: { data: StudyDiagnostic }) {
  const live = data.enabled && data.configuredEnabled && data.providerReady;
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [model, setModel] = useState(data.model);

  async function apply(next: string | null) {
    setState("loading");
    const res = await fetch("/api/admin/study-model", {
      method: next ? "POST" : "DELETE",
      ...(next ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ model: next }) } : {}),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("done");
      setModel(body.model ?? "—");
      setMsg(next ? `ضُبط النموذج على ${body.model}. حدّث الصفحة.` : "حُذف الضبط — عاد إلى البيئة. حدّث الصفحة.");
    } else {
      setState("error");
      setMsg(body.error ?? "تعذّر التنفيذ");
    }
  }

  // التبديل معروض فقط حين يكون مفيداً: مفتاح Kimi موجود والنموذج العامل ليس منه.
  const canSwitchToKimi = data.keys.kimi && data.provider !== "kimi";

  return (
    <div className="card mb-7" style={{ borderRadius: 16 }}>
      <div className="flex items-center" style={{ gap: 10, marginBottom: 16 }}>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, borderRadius: 10, background: "var(--orange-soft)" }}
        >
          <GraduationCap size={15} color="var(--orange)" strokeWidth={1.8} />
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
            تشخيص الملخّص الدراسي
          </div>
          <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
            المزوّد العامل وحدوده
          </div>
        </div>
      </div>

      <dl className="flex flex-col" style={{ gap: 12, fontFamily: "Tajawal, sans-serif" }}>
        <Row label="حالة الميزة">
          {live ? (
            <span style={{ color: "var(--success)" }}>تعمل</span>
          ) : (
            <span style={{ color: "var(--pebble)" }}>
              {!data.enabled
                ? "مُغلقة يدويّاً — تعرض «قريباً»"
                : !data.providerReady
                  ? "مُغلقة — مفتاح المزوّد المضبوط ناقص"
                  : "مُغلقة من الإعداد (study_enabled)"}
            </span>
          )}
        </Row>

        <Row label="المزوّد">
          <span style={{ color: data.providerReady ? "var(--success)" : "var(--rose)" }}>
            {PROVIDER_LABEL[data.provider]}
            {data.providerReady ? "" : " — بلا مفتاح"}
          </span>
        </Row>

        <Row label="النموذج (دقّة عالية)">
          <code style={{ fontFamily: "Inter, monospace", fontSize: 12 }}>{model}</code>
        </Row>

        <Row label="مصدر الضبط">
          <span style={{ color: "var(--stone)", fontWeight: 400 }}>
            {SOURCE_LABEL[data.modelSource]}
          </span>
        </Row>

        <Row label="النموذج (دقّة قصوى)">
          {data.premiumEnabled ? (
            <code style={{ fontFamily: "Inter, monospace", fontSize: 12 }}>{data.modelPremium}</code>
          ) : (
            <span style={{ color: "var(--pebble)" }}>معطّلة للمستخدمين</span>
          )}
        </Row>

        <Row label="أقصى حجم للمادّة">{ar(Math.round(data.maxChars / 1000))} ألف حرف</Row>

        {data.contextWindow !== null && (
          <Row label="نافذة النموذج">
            {ar(data.contextWindow)} توكن
            {data.estimatedPromptTokens !== null && (
              <span style={{ color: "var(--stone)", fontWeight: 400 }}>
                {" "}— تقدير المُدخَل الأقصى {ar(data.estimatedPromptTokens)}
              </span>
            )}
          </Row>
        )}

        <Row label="المفاتيح المضبوطة">
          <span style={{ color: "var(--stone)", fontWeight: 400 }}>
            {[
              data.keys.kimi ? "Kimi" : null,
              data.keys.qwen ? "Qwen" : null,
              data.keys.claude ? "Claude" : null,
            ]
              .filter(Boolean)
              .join("، ") || "لا شيء"}
          </span>
        </Row>
      </dl>

      {(canSwitchToKimi || data.modelSource === "db") && (
        <div className="flex flex-wrap items-center" style={{ gap: 10, marginTop: 14 }}>
          {canSwitchToKimi && (
            <button
              type="button"
              className="btn-primary"
              disabled={state === "loading"}
              onClick={() => apply("kimi-k3")}
              style={{ fontSize: 12.5, padding: "8px 16px" }}
            >
              حوّل إلى kimi-k3
            </button>
          )}
          {data.modelSource === "db" && (
            <button
              type="button"
              className="btn-ghost"
              disabled={state === "loading"}
              onClick={() => apply(null)}
              style={{ fontSize: 12.5, padding: "8px 16px" }}
            >
              احذف الضبط وعُد إلى البيئة
            </button>
          )}
          {msg && (
            <span
              style={{
                fontSize: 12,
                fontFamily: "Tajawal, sans-serif",
                color: state === "error" ? "var(--rose)" : "var(--success)",
              }}
            >
              {msg}
            </span>
          )}
        </div>
      )}

      {data.fits === false && (
        <Note tone="warn">
          <strong style={{ color: "var(--rose)" }}>حدّ الحروف أكبر من نافذة النموذج.</strong> مادّة
          بالحجم الأقصى ستُرفض قبل الإرسال (بلا خصم). اخفض <code>study_max_chars</code> أو انتقل
          إلى نموذج بنافذة أوسع مثل <code>kimi-k3</code>.
        </Note>
      )}

      {data.enabled && !data.providerReady && (
        <Note tone="warn">
          الميزة مفعّلة لكنّ مفتاح <strong>{PROVIDER_LABEL[data.provider]}</strong> غير مضبوط في
          البيئة — كلّ طلب سيفشل ويُسترَدّ رصيده. اضبط المفتاح أو بدّل النموذج.
        </Note>
      )}

      {!data.enabled && data.providerReady && (
        <Note tone="info">
          المزوّد جاهز والميزة مُغلقة يدويّاً بـ <code>STUDY_ENABLED=&quot;0&quot;</code>. احذف
          المتغيّر أو اضبطه بغير <code>0</code> ثمّ أعد النشر لتظهر للمستخدمين.
        </Note>
      )}
    </div>
  );
}
