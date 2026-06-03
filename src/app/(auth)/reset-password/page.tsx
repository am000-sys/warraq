// src/app/(auth)/reset-password/page.tsx — صفحة إعادة تعيين كلمة المرور
"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="text-center">
        <p style={{ fontFamily: "Tajawal, sans-serif", fontSize: 14, color: "var(--rose)", marginBottom: 24 }}>
          رابط غير صالح. طلب رابطاً جديداً.
        </p>
        <Link href="/forgot-password" className="btn-primary no-underline justify-center" style={{ fontSize: 14 }}>
          طلب رابط جديد
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون ٨ أحرف على الأقل");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "حدث خطأ، حاول مجدداً");
      } else {
        setDone(true);
        setTimeout(() => router.push("/login"), 2500);
      }
    } catch {
      setError("تعذّر الاتصال، حاول مجدداً");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <div
          className="mx-auto flex items-center justify-center mb-4"
          style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "var(--orange-soft)", fontSize: 24, color: "var(--orange)",
          }}
        >
          ✓
        </div>
        <h2 style={{ fontFamily: "Tajawal, sans-serif", fontSize: 20, fontWeight: 500, color: "var(--carbon)", marginBottom: 8 }}>
          تمّت إعادة التعيين
        </h2>
        <p style={{ fontSize: 14, color: "var(--stone)", fontFamily: "Tajawal, sans-serif", lineHeight: 1.7 }}>
          كلمة مرورك الجديدة جاهزة. سيُعاد توجيهك لتسجيل الدخول...
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 style={{ fontFamily: "Tajawal, sans-serif", fontSize: 22, fontWeight: 500, color: "var(--carbon)", marginBottom: 8 }}>
        كلمة مرور جديدة
      </h2>
      <p className="font-light" style={{ fontSize: 14, color: "var(--stone)", fontFamily: "Tajawal, sans-serif", lineHeight: 1.7, marginBottom: 24 }}>
        اختر كلمة مرور قويّة لا تقلّ عن ٨ أحرف.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 16 }}>
        <div>
          <label className="label">كلمة المرور الجديدة</label>
          <input
            type="password"
            required
            minLength={8}
            placeholder="••••••••"
            className="field field-ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label">تأكيد كلمة المرور</label>
          <input
            type="password"
            required
            minLength={8}
            placeholder="••••••••"
            className="field field-ltr"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: "var(--rose)", fontFamily: "Tajawal, sans-serif" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center"
          style={{ fontSize: 15, padding: 13, opacity: loading ? 0.7 : 1 }}
        >
          {loading ? "..." : "تعيين كلمة المرور"}
        </button>
      </form>

      <Link
        href="/login"
        className="text-center block no-underline"
        style={{ marginTop: 16, fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}
      >
        ← العودة لتسجيل الدخول
      </Link>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full" style={{ maxWidth: 420 }}>
      <div className="text-center" style={{ marginBottom: 36 }}>
        <Link href="/" className="no-underline inline-block">
          <Logo size={1.05} />
        </Link>
      </div>
      <div className="card" style={{ borderRadius: "var(--r-card)" }}>
        <Suspense fallback={<p style={{ fontFamily: "Tajawal, sans-serif", fontSize: 14, color: "var(--stone)" }}>جارٍ التحميل...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
