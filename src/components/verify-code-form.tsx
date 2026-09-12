// src/components/verify-code-form.tsx — إدخال رمز تفعيل البريد
// يُستعمل في خطوة التسجيل (والرمز يُتبَع بدخول تلقائيّ) وفي صفحة /verify-email
// المستقلّة (لمن أغلق التبويب قبل الإكمال).
"use client";

import { useState } from "react";
import { CODE_LENGTH } from "@/lib/verification-shared";

export function VerifyCodeForm({
  email,
  onVerified,
  onChangeEmail,
}: {
  email: string;
  // تُستدعى بعد نجاح التفعيل — الصفحة تقرّر ما يليه (دخول تلقائيّ أو تحويل)
  onVerified: () => void | Promise<void>;
  // زرّ «تعديل البريد» — يُعرض حين يكون البريد قابلاً للتغيير
  onChangeEmail?: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== CODE_LENGTH || loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "تعذّر التحقّق — أعد المحاولة.");
        setLoading(false);
        return;
      }
      await onVerified();
    } catch {
      setError("تعذّر الاتّصال — تحقّق من الشبكة وأعد المحاولة.");
      setLoading(false);
    }
  }

  async function resend() {
    if (resending) return;
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      setNotice(data?.message ?? "أُرسل رمز جديد إن كان البريد غير مفعَّل.");
    } catch {
      setError("تعذّر إرسال الرمز — أعد المحاولة.");
    }
    setResending(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col" style={{ gap: 16 }}>
      <p
        style={{
          fontSize: 13.5,
          lineHeight: 1.9,
          color: "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
          margin: 0,
        }}
      >
        أرسلنا رمزاً من {CODE_LENGTH} أرقام إلى{" "}
        <strong style={{ color: "var(--carbon)", direction: "ltr", display: "inline-block" }}>
          {email}
        </strong>
        . أدخِله لإكمال إنشاء حسابك.
      </p>

      <input
        className="field"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={CODE_LENGTH}
        placeholder="000000"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
        style={{
          textAlign: "center",
          direction: "ltr",
          fontFamily: "ui-monospace, Menlo, monospace",
          fontSize: 24,
          letterSpacing: 10,
          padding: "14px 12px",
        }}
      />

      {error && (
        <div
          style={{
            background: "rgba(201,123,132,0.08)",
            border: "1px solid rgba(201,123,132,0.25)",
            borderRadius: 12,
            padding: 10,
            fontSize: 13,
            color: "var(--rose)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          {error}
        </div>
      )}
      {notice && (
        <div
          style={{
            background: "var(--fog)",
            borderRadius: 12,
            padding: 10,
            fontSize: 12.5,
            color: "var(--stone)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          {notice}
        </div>
      )}

      <button
        type="submit"
        className="btn-primary justify-center w-full"
        disabled={loading || code.length !== CODE_LENGTH}
        style={{
          fontSize: 14,
          padding: 13,
          opacity: loading || code.length !== CODE_LENGTH ? 0.6 : 1,
          fontFamily: "Tajawal, sans-serif",
        }}
      >
        {loading ? "جارٍ التحقّق…" : "تفعيل الحساب"}
      </button>

      <div
        className="flex items-center justify-center flex-wrap"
        style={{ gap: 14, fontSize: 12.5, fontFamily: "Tajawal, sans-serif" }}
      >
        <button
          type="button"
          onClick={resend}
          disabled={resending}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: "var(--orange)",
            fontFamily: "inherit",
            fontSize: "inherit",
          }}
        >
          {resending ? "جارٍ الإرسال…" : "أعِد إرسال الرمز"}
        </button>
        {onChangeEmail && (
          <button
            type="button"
            onClick={onChangeEmail}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              color: "var(--stone)",
              fontFamily: "inherit",
              fontSize: "inherit",
            }}
          >
            تعديل البريد
          </button>
        )}
      </div>
    </form>
  );
}
