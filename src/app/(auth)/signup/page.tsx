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
