// src/app/(auth)/signup/page.tsx — إنشاء حساب جديد
// مرجع: design-reference/warraq-v3.html (function AuthPage, mode='register')
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "تعذّر إنشاء الحساب — جرّب بريداً آخر.");
      setLoading(false);
      return;
    }

    // Auto-login after signup
    const signRes = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (signRes?.error) {
      router.push("/login");
    } else {
      router.push("/dashboard");
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
            <label className="label">الاسم الكامل</label>
            <input
              type="text"
              required
              placeholder="أحمد محمد"
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
            <label className="label">كلمة المرور</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="field"
              style={{ direction: "ltr" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p
              className="font-light"
              style={{
                fontSize: 12,
                color: "var(--pebble)",
                fontFamily: "Tajawal, sans-serif",
                marginTop: 6,
              }}
            >
              ٨ أحرف على الأقل
            </p>
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
            {loading ? "..." : "إنشاء الحساب"}
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
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
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
