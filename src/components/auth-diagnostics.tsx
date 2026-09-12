// src/components/auth-diagnostics.tsx — تشخيص المصادقة (للمالك)
// يُجيب مباشرةً عن سؤالين متكرّرين: لماذا لا يظهر زرّ Google؟ وهل بقيت حسابات
// محجوبة بعد تفعيل تحقّق البريد؟ — ويُنفّذ تفعيلها بنقرة بدل أوامر يدويّة.
"use client";

import { useState } from "react";
import { KeyRound, Check, Copy } from "lucide-react";

export type AuthDiagnostic = {
  googleConfigured: boolean;
  googleIdLooksValid: boolean; // شكل المعرّف صحيح؟ (يكشف اللصق الناقص/التبديل)
  googleSecretLooksValid: boolean;
  redirectUri: string | null; // رابط الإرجاع المتوقّع لهذا النطاق
  deployEnv: string | null;
  legacyPending: number | null; // حسابات سابقة غير مفعَّلة (null = تعذّر العدّ)
  legacyCutoff: string;
};

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

export function AuthDiagnostics({ data }: { data: AuthDiagnostic }) {
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(data.legacyPending);

  async function verifyLegacy() {
    setState("loading");
    const res = await fetch("/api/admin/verify-legacy-users", { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("done");
      setMsg(`فُعِّل ${body.verified ?? 0} حساباً.`);
      setPending(0);
    } else {
      setState("error");
      setMsg(body.error ?? "تعذّر التنفيذ");
    }
  }

  function copyRedirect() {
    if (!data.redirectUri) return;
    navigator.clipboard.writeText(data.redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card mb-7" style={{ borderRadius: 16 }}>
      <div className="flex items-center" style={{ gap: 10, marginBottom: 16 }}>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, borderRadius: 10, background: "var(--orange-soft)" }}
        >
          <KeyRound size={15} color="var(--orange)" strokeWidth={1.8} />
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
            تشخيص المصادقة
          </div>
          <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
            الدخول بـ Google وحالة تفعيل الحسابات
          </div>
        </div>
      </div>

      <dl className="flex flex-col" style={{ gap: 12, fontFamily: "Tajawal, sans-serif" }}>
        <Row label="الدخول بحساب Google">
          {!data.googleConfigured ? (
            <span style={{ color: "var(--pebble)" }}>غير مُعَدّ — الزرّ مخفيّ</span>
          ) : data.googleIdLooksValid && data.googleSecretLooksValid ? (
            <span style={{ color: "var(--success)" }}>مفعَّل — الزرّ ظاهر</span>
          ) : (
            <span style={{ color: "var(--rose)" }}>مضبوط بقيمة خاطئة</span>
          )}
        </Row>
      </dl>

      {data.googleConfigured && !(data.googleIdLooksValid && data.googleSecretLooksValid) && (
        <div
          style={{
            background: "rgba(201,123,132,0.08)",
            border: "1px solid rgba(201,123,132,0.25)",
            borderRadius: 12,
            padding: 14,
            marginTop: 14,
            fontFamily: "Tajawal, sans-serif",
            fontSize: 12.5,
            lineHeight: 2,
            color: "var(--carbon)",
          }}
        >
          <strong style={{ color: "var(--rose)" }}>
            قيمة غير صالحة — الضغط على الزرّ سيعطي خطأ 401 invalid_client.
          </strong>
          <ul style={{ margin: "6px 0 0", paddingInlineStart: 18 }}>
            {!data.googleIdLooksValid && (
              <li>
                <code>AUTH_GOOGLE_ID</code> لا يطابق شكل معرّف Google. يجب أن ينتهي بـ{" "}
                <code style={{ direction: "ltr", display: "inline-block" }}>
                  .apps.googleusercontent.com
                </code>{" "}
                — غالباً لَصْقٌ ناقص، أو وُضِع فيه السرّ بالخطأ.
              </li>
            )}
            {!data.googleSecretLooksValid && (
              <li>
                <code>AUTH_GOOGLE_SECRET</code> لا يبدأ بـ{" "}
                <code style={{ direction: "ltr", display: "inline-block" }}>GOCSPX-</code> —
                غالباً وُضِع فيه المعرّف بالخطأ.
              </li>
            )}
          </ul>
          صحّح القيمة في Vercel ثمّ أعد النشر.
        </div>
      )}

      {!data.googleConfigured && (
        <div
          style={{
            background: "var(--fog)",
            borderRadius: 12,
            padding: 14,
            marginTop: 14,
            fontFamily: "Tajawal, sans-serif",
            fontSize: 12.5,
            lineHeight: 2,
            color: "var(--stone)",
          }}
        >
          لإظهار الزرّ: أنشئ <strong>OAuth client ID</strong> من نوع Web application في
          Google Cloud Console، ثمّ ضع <code>AUTH_GOOGLE_ID</code> و
          <code>AUTH_GOOGLE_SECRET</code> في متغيّرات البيئة على Vercel وأعد النشر
          (الصفحتان ساكنتان فتُقرأ القيم وقت البناء).
          {data.redirectUri && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11.5, color: "var(--pebble)", marginBottom: 4 }}>
                رابط الإرجاع المطلوب (Authorized redirect URI) — انسخه كما هو:
              </div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <code
                  style={{
                    flex: 1,
                    direction: "ltr",
                    background: "var(--snow)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 11.5,
                    wordBreak: "break-all",
                    fontFamily: "ui-monospace, Menlo, monospace",
                  }}
                >
                  {data.redirectUri}
                </code>
                <button
                  type="button"
                  onClick={copyRedirect}
                  className="btn-ghost flex-shrink-0"
                  style={{ padding: "8px 12px", fontSize: 12, gap: 6 }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "نُسخ" : "نسخ"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <dl className="flex flex-col" style={{ gap: 12, marginTop: 14, fontFamily: "Tajawal, sans-serif" }}>
        <Row label="حسابات سابقة محجوبة (قبل تحقّق البريد)">
          {pending === null ? (
            <span style={{ color: "var(--pebble)" }}>تعذّر العدّ</span>
          ) : (
            <span style={{ color: pending > 0 ? "var(--rose)" : "var(--success)" }}>
              {pending > 0 ? `${pending} حساباً` : "لا يوجد"}
            </span>
          )}
        </Row>
      </dl>

      {pending !== null && pending > 0 && (
        <div style={{ marginTop: 14, fontFamily: "Tajawal, sans-serif" }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.9, color: "var(--stone)", margin: "0 0 10px" }}>
            هذه حسابات أُنشئت قبل {new Date(data.legacyCutoff).toLocaleDateString("ar-SA")}
            {" "}ولم يكن التحقّق موجوداً حينها، فهي محجوبة عن الدخول الآن. تفعيلها لا يمسّ
            الحسابات الجديدة — تلك تبقى ملزَمة بالرمز.
          </p>
          {state === "done" && (
            <div
              className="flex items-center"
              style={{ gap: 6, fontSize: 13, color: "var(--success)", marginBottom: 10 }}
            >
              <Check size={14} /> {msg}
            </div>
          )}
          {state === "error" && (
            <div style={{ fontSize: 13, color: "var(--rose)", marginBottom: 10 }}>{msg}</div>
          )}
          <button
            type="button"
            onClick={verifyLegacy}
            disabled={state === "loading" || state === "done"}
            className="btn-primary"
            style={{ fontSize: 14, padding: "10px 22px", opacity: state === "loading" ? 0.6 : 1 }}
          >
            {state === "loading"
              ? "جارٍ التفعيل…"
              : state === "done"
                ? "تمّ ✓"
                : "فعّل الحسابات السابقة"}
          </button>
        </div>
      )}

      {state === "done" && pending === 0 && msg && (
        <div
          className="flex items-center"
          style={{ gap: 6, fontSize: 13, color: "var(--success)", marginTop: 12, fontFamily: "Tajawal, sans-serif" }}
        >
          <Check size={14} /> {msg}
        </div>
      )}
    </div>
  );
}
