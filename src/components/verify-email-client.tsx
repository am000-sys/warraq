// src/components/verify-email-client.tsx — تفعيل حساب مستقلّ عن مسار التسجيل
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { Field, FieldLabel, FieldControl } from "@/components/ui/field";
import { VerifyCodeForm } from "@/components/verify-code-form";

export function VerifyEmailClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [sending, setSending] = useState(false);

  // إرسال رمز جديد ثمّ الانتقال لخطوة إدخاله. الردّ محايد دائماً (لا يكشف
  // إن كان البريد مسجّلاً)، فننتقل للخطوة التالية أيّاً كانت النتيجة.
  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    await fetch("/api/auth/resend-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => {});
    setSending(false);
    setStep("code");
  }

  return (
    <div className="w-full" style={{ maxWidth: 420 }}>
      <div className="text-center" style={{ marginBottom: 36 }}>
        <Link href="/" className="no-underline inline-block">
          <Logo size={1.05} />
        </Link>
      </div>

      <div className="card" style={{ borderRadius: "var(--r-card)" }}>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: "var(--carbon)",
            fontFamily: "Tajawal, sans-serif",
            margin: "0 0 8px",
          }}
        >
          تفعيل الحساب
        </h1>

        {step === "email" ? (
          <form onSubmit={requestCode} className="flex flex-col" style={{ gap: 16 }}>
            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.9,
                color: "var(--stone)",
                fontFamily: "Tajawal, sans-serif",
                margin: 0,
              }}
            >
              أدخِل بريد حسابك وسنرسل إليه رمز تفعيل جديداً.
            </p>
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
              className="btn-primary justify-center w-full"
              disabled={sending}
              style={{
                fontSize: 14,
                padding: 13,
                opacity: sending ? 0.6 : 1,
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              {sending ? "جارٍ الإرسال…" : "أرسل الرمز"}
            </button>
          </form>
        ) : (
          <VerifyCodeForm
            email={email}
            onChangeEmail={() => setStep("email")}
            // بعد التفعيل نحوّل للدخول — كلمة المرور ليست بحوزتنا هنا
            onVerified={() => router.push("/login?verified=true")}
          />
        )}

        <p
          className="text-center"
          style={{
            marginTop: 16,
            fontSize: 12.5,
            color: "var(--pebble)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          <Link href="/login" style={{ color: "var(--orange)" }}>
            العودة لتسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
