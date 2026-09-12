// src/components/login-form.tsx — نموذج تسجيل الدخول
// مرجع: design-reference/warraq-v3.html (function AuthPage, mode='login')
"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Field, FieldLabel, FieldControl } from "@/components/ui/field";
import { GoogleButton, AuthDivider } from "@/components/google-button";

// useSearchParams يستلزم حدود Suspense كي تبقى الصفحة static (تُقدَّم من CDN)
export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  return (
    <Suspense fallback={null}>
      <LoginFormInner googleEnabled={googleEnabled} />
    </Suspense>
  );
}

function LoginFormInner({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const wasReset = params.get("reset") === "true";
  const wasVerified = params.get("verified") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      // الرفض يشمل حالة الحساب غير المفعَّل (authorize يردّه) — نذكرها
      // كاحتمال بلا تأكيد وجود الحساب، ونضع رابط التفعيل أسفل النموذج.
      setError("بريد إلكتروني أو كلمة مرور غير صحيحة، أو أنّ الحساب لم يُفعَّل بعد.");
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div className="w-full" style={{ maxWidth: 420 }}>
      <div className="text-center" style={{ marginBottom: 36 }}>
        <Link href="/" className="no-underline inline-block">
          <Logo size={1.05} />
        </Link>
      </div>

      <div className="card" style={{ borderRadius: "var(--r-card)" }}>
        <div
          className="flex"
          style={{
            background: "var(--fog)",
            borderRadius: "var(--r-inner)",
            padding: 4,
            marginBottom: 28,
          }}
        >
          <button
            type="button"
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
            تسجيل الدخول
          </button>
          <Link
            href="/signup"
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
            حساب جديد
          </Link>
        </div>

        {wasReset && (
          <div
            className="mb-4"
            style={{
              background: "var(--orange-soft)",
              border: "1px solid rgba(246,146,81,0.25)",
              color: "var(--orange)",
              borderRadius: 12,
              padding: 12,
              fontSize: 13,
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.
          </div>
        )}
        {wasVerified && (
          <div
            className="mb-4"
            style={{
              background: "rgba(109,189,122,0.10)",
              border: "1px solid rgba(109,189,122,0.25)",
              color: "var(--success)",
              borderRadius: 12,
              padding: 12,
              fontSize: 13,
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            تمّ تفعيل حسابك. سجّل الدخول الآن.
          </div>
        )}
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
            <GoogleButton label="الدخول بحساب Google" />
            <AuthDivider />
          </>
        )}

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
          <Field>
            <div className="flex justify-between" style={{ marginBottom: 6 }}>
              <FieldLabel className="mb-0">كلمة المرور</FieldLabel>
              <Link
                href="/forgot-password"
                className="no-underline"
                style={{
                  fontSize: 12,
                  color: "var(--orange)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
            <FieldControl
              type="password"
              required
              placeholder="••••••••"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
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
            {loading ? "..." : "تسجيل الدخول"}
          </button>
        </form>

        <p
          className="text-center"
          style={{
            marginTop: 16,
            fontSize: 12.5,
            color: "var(--pebble)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          لم تُفعّل حسابك بعد؟{" "}
          <Link href="/verify-email" style={{ color: "var(--orange)" }}>
            أكمِل التفعيل برمز البريد
          </Link>
        </p>
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
        ليس لديك حساب؟{" "}
        <Link
          href="/signup"
          className="no-underline"
          style={{ color: "var(--orange)", fontWeight: 500 }}
        >
          أنشئ حساباً
        </Link>
      </p>
    </div>
  );
}
