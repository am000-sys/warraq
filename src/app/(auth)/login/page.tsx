// src/app/(auth)/login/page.tsx — تسجيل الدخول
// مرجع: design-reference/warraq-v3.html (function AuthPage, mode='login')
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";
  const wasReset = params.get("reset") === "true";

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
      setError("بريد إلكتروني أو كلمة مرور غير صحيحة");
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

        <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 16 }}>
          <div>
            <label className="label">البريد الإلكتروني</label>
            <input
              type="email"
              required
              placeholder="ahmed@example.com"
              className="field field-ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <div className="flex justify-between" style={{ marginBottom: 6 }}>
              <label
                style={{
                  fontSize: 13,
                  color: "var(--stone)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                كلمة المرور
              </label>
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
            <input
              type="password"
              required
              placeholder="••••••••"
              className="field"
              style={{ direction: "ltr" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

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

        <div className="flex items-center" style={{ margin: "22px 0", gap: 12 }}>
          <div className="flex-1 h-px" style={{ background: "var(--border-sub)" }} />
          <span style={{ fontSize: 12, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
            أو
          </span>
          <div className="flex-1 h-px" style={{ background: "var(--border-sub)" }} />
        </div>

        <button
          type="button"
          onClick={() => signIn("google", { callbackUrl })}
          className="btn-ghost w-full justify-center"
          style={{ gap: 10 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          المتابعة مع Google
        </button>
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
