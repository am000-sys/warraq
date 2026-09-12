// src/components/signup-form.tsx — نموذج إنشاء حساب جديد (خطوتان: بيانات ثمّ رمز تحقّق)
// مرجع: design-reference/warraq-v3.html (function AuthPage, mode='register')
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import {
  Field,
  FieldLabel,
  FieldControl,
  FieldDescription,
} from "@/components/ui/field";
import { GoogleButton, AuthDivider } from "@/components/google-button";
import { VerifyCodeForm } from "@/components/verify-code-form";

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // خطوة التحقّق تبقى في نفس المكوّن، فكلمة المرور محفوظة في الحالة ويتمّ
  // الدخول تلقائيّاً بعد التفعيل بلا مطالبة المستخدم بإدخالها ثانية.
  const [step, setStep] = useState<"form" | "verify">("form");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data?.error ?? "تعذّر إنشاء الحساب — جرّب بريداً آخر.");
      return;
    }
    setStep("verify");
  }

  // بعد نجاح التفعيل: دخول تلقائيّ بالبيانات المحفوظة في الحالة
  async function handleVerified() {
    const signRes = await signIn("credentials", { email, password, redirect: false });
    if (signRes?.error) router.push("/login");
    else router.push("/dashboard");
  }

  return (
    <div className="w-full" style={{ maxWidth: 420 }}>
      <div className="text-center" style={{ marginBottom: 36 }}>
        <Link href="/" className="no-underline inline-block">
          <Logo size={1.05} />
        </Link>
      </div>

      <div className="card" style={{ borderRadius: "var(--r-card)" }}>
        {/* Tabs */}
        <div
          className="flex"
          style={{
            background: "var(--fog)",
            borderRadius: "var(--r-inner)",
            padding: 4,
            marginBottom: 28,
          }}
        >
          <Link
            href="/login"
            className="no-underline text-center cursor-pointer transition-all"
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 9,
              background: "transparent",
              color: "var(--stone)",
              fontWeight: 400,
              fontSize: 14,
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            تسجيل الدخول
          </Link>
          <button
            className="cursor-pointer transition-all"
            style={{
              flex: 1,
              padding: 10,
              border: "none",
              borderRadius: 9,
              background: "var(--snow)",
              color: "var(--carbon)",
              fontWeight: 500,
              fontSize: 14,
              boxShadow: "var(--shadow-card)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            حساب جديد
          </button>
        </div>

        {step === "verify" ? (
          <VerifyCodeForm
            email={email}
            onVerified={handleVerified}
            onChangeEmail={() => setStep("form")}
          />
        ) : (
        <>
        {error && (
          <div
            className="mb-4"
            style={{
              background: "rgba(201,123,132,0.10)",
              border: "1px solid rgba(201,123,132,0.20)",
              color: "var(--rose)",
              borderRadius: 12,
              padding: 12,
              fontSize: 13,
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            {error}
          </div>
        )}

        {googleEnabled && (
          <>
            <GoogleButton label="التسجيل بحساب Google" />
            <AuthDivider />
          </>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 16 }}>
          <Field>
            <FieldLabel>الاسم الكامل</FieldLabel>
            <FieldControl
              type="text"
              required
              placeholder="أحمد محمد"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
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
          <Field>
            <FieldLabel>كلمة المرور</FieldLabel>
            <FieldControl
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldDescription>٨ أحرف على الأقل</FieldDescription>
          </Field>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center"
            style={{
              fontSize: 15,
              padding: 13,
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "..." : "إنشاء الحساب"}
          </button>
        </form>
        </>
        )}
      </div>

      <p
        className="text-center"
        style={{
          marginTop: 20,
          fontSize: 13,
          color: "var(--pebble)",
          fontFamily: "Tajawal, sans-serif",
        }}
      >
        لديك حساب؟{" "}
        <Link
          href="/login"
          className="no-underline"
          style={{ color: "var(--orange)", fontWeight: 500 }}
        >
          سجّل الدخول
        </Link>
      </p>
    </div>
  );
}
