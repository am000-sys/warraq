// src/app/(auth)/forgot-password/page.tsx — استعادة كلمة المرور
"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Field, FieldLabel, FieldControl } from "@/components/ui/field";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="w-full" style={{ maxWidth: 420 }}>
      <div className="text-center" style={{ marginBottom: 36 }}>
        <Link href="/" className="no-underline inline-block">
          <Logo size={1.05} />
        </Link>
      </div>

      <div className="card" style={{ borderRadius: "var(--r-card)" }}>
        {sent ? (
          <div className="text-center">
            <div
              className="mx-auto flex items-center justify-center mb-4"
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--orange-soft)",
                fontSize: 24,
                color: "var(--orange)",
              }}
            >
              ✉
            </div>
            <h2
              style={{
                fontFamily: "Tajawal, sans-serif",
                fontSize: 20,
                fontWeight: 500,
                color: "var(--carbon)",
                marginBottom: 8,
              }}
            >
              تحقّق من بريدك
            </h2>
            <p
              className="font-light"
              style={{
                fontSize: 14,
                color: "var(--stone)",
                fontFamily: "Tajawal, sans-serif",
                lineHeight: 1.7,
              }}
            >
              أرسلنا رابط إعادة تعيين كلمة المرور إلى <strong>{email}</strong> إن كان مرتبطاً بحساب.
            </p>
            <Link
              href="/login"
              className="btn-ghost w-full justify-center no-underline"
              style={{ marginTop: 24 }}
            >
              العودة لتسجيل الدخول
            </Link>
          </div>
        ) : (
          <>
            <h2
              style={{
                fontFamily: "Tajawal, sans-serif",
                fontSize: 22,
                fontWeight: 500,
                color: "var(--carbon)",
                marginBottom: 8,
              }}
            >
              نسيت كلمة المرور؟
            </h2>
            <p
              className="font-light"
              style={{
                fontSize: 14,
                color: "var(--stone)",
                fontFamily: "Tajawal, sans-serif",
                lineHeight: 1.7,
                marginBottom: 24,
              }}
            >
              أدخل بريدك وسنرسل لك رابط إعادة تعيين كلمة المرور.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 16 }}>
              <Field>
                <FieldLabel>البريد الإلكتروني</FieldLabel>
                <FieldControl
                  type="email"
                  required
                  placeholder="ahmed@example.com"
                  dir="ltr"
                  className="text-right"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center"
                style={{ fontSize: 15, padding: 13, opacity: loading ? 0.7 : 1 }}
              >
                {loading ? "..." : "إرسال الرابط"}
              </button>
            </form>
            <Link
              href="/login"
              className="text-center block no-underline"
              style={{
                marginTop: 16,
                fontSize: 13,
                color: "var(--stone)",
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              ← العودة لتسجيل الدخول
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
