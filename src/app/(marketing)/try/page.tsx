// src/app/(marketing)/try/page.tsx — تجربة مجانيّة دون تسجيل
"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Upload, Sparkles, Copy, Check } from "lucide-react";

export default function TryPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limitReached, setLimitReached] = useState(false);
  const [copied, setCopied] = useState(false);

  function pick(f: File) {
    setFile(f);
    setText(null);
    setError("");
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }

  async function run() {
    if (!file) return;
    setLoading(true);
    setError("");
    setText(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/try", { method: "POST", body: fd });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error ?? "تعذّرت المعالجة");
      if (data?.limitReached) setLimitReached(true);
      return;
    }
    setText(data.text || "(لم يُستخرج نصّ — جرّب صورة أوضح)");
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--fog)" }}>
      <Nav />
      <div className="container-warraq" style={{ paddingTop: 120, paddingBottom: 80, maxWidth: 760 }}>
        <div className="text-center" style={{ marginBottom: 32 }}>
          <div className="badge" style={{ marginBottom: 16 }}>
            <Sparkles size={13} color="var(--orange)" /> تجربة مجانيّة فوريّة
          </div>
          <h1
            style={{
              fontFamily: "Tajawal, sans-serif",
              fontSize: "clamp(28px,5vw,44px)",
              fontWeight: 300,
              color: "var(--carbon)",
              letterSpacing: "-0.02em",
              marginBottom: 12,
            }}
          >
            جرّب استخراج النصّ الآن
          </h1>
          <p
            className="font-light"
            style={{ fontSize: 16, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}
          >
            ارفع صورة صفحة عربيّة — بدون تسجيل. (صفحتان مجاناً)
          </p>
        </div>

        <div className="card" style={{ borderRadius: 20 }}>
          {/* منطقة الرفع */}
          <div
            onClick={() => document.getElementById("try-file")?.click()}
            className="cursor-pointer transition-all"
            style={{
              border: `2px dashed ${preview ? "var(--orange)" : "var(--border)"}`,
              borderRadius: 14,
              padding: preview ? 12 : "44px 20px",
              textAlign: "center",
              background: preview ? "var(--orange-soft)" : "var(--snow)",
              marginBottom: 16,
            }}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="معاينة" style={{ maxHeight: 260, margin: "0 auto", borderRadius: 10 }} />
            ) : (
              <div className="flex flex-col items-center gap-2.5">
                <Upload size={28} color="var(--pebble)" />
                <span style={{ fontSize: 15, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif", fontWeight: 500 }}>
                  اضغط لاختيار صورة
                </span>
                <span style={{ fontSize: 12, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
                  PNG أو JPG · حتى ٦ ميجابايت
                </span>
              </div>
            )}
            <input
              id="try-file"
              type="file"
              accept="image/png,image/jpeg"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
            />
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
              {limitReached && (
                <Link href="/signup" className="no-underline" style={{ color: "var(--orange)", fontWeight: 500, marginRight: 6 }}>
                  أنشئ حساباً مجانياً
                </Link>
              )}
            </div>
          )}

          {!text && (
            <button
              onClick={run}
              disabled={!file || loading}
              className="btn-primary w-full justify-center"
              style={{ fontSize: 15, padding: 14, opacity: !file || loading ? 0.5 : 1 }}
            >
              {loading ? "جارٍ الاستخراج..." : "استخرج النصّ"}
            </button>
          )}

          {/* النتيجة */}
          {text && (
            <div>
              <div className="flex justify-between items-center" style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--orange)", fontFamily: "Tajawal, sans-serif" }}>
                  النصّ المستخرَج
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(text);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="btn-ghost"
                  style={{ fontSize: 12, padding: "6px 12px" }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "نُسخ" : "نسخ"}
                </button>
              </div>
              <div
                dir="rtl"
                style={{
                  background: "var(--fog)",
                  borderRadius: 12,
                  padding: 18,
                  fontSize: 15,
                  lineHeight: 2,
                  fontFamily: "Tajawal, sans-serif",
                  color: "var(--midnight)",
                  whiteSpace: "pre-wrap",
                  maxHeight: 360,
                  overflowY: "auto",
                }}
              >
                {text}
              </div>
              <div className="flex gap-2" style={{ marginTop: 16 }}>
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setText(null);
                  }}
                  className="btn-ghost flex-1 justify-center"
                  style={{ fontSize: 14 }}
                >
                  جرّب صورة أخرى
                </button>
                <Link href="/signup" className="btn-primary flex-1 justify-center no-underline" style={{ fontSize: 14 }}>
                  أنشئ حساباً للمزيد
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
