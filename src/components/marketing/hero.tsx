// src/components/marketing/hero.tsx
import Link from "next/link";
import { BookToTextMockup } from "@/components/book-to-text-mockup";

export function Hero() {
  return (
    <section
      className="min-h-screen flex flex-col items-center justify-center text-center relative"
      style={{ background: "var(--fog)", padding: "110px 28px 80px" }}
    >
      {/* Subtle radial */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "80%",
          height: "60%",
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(246,146,81,0.05) 0%, transparent 60%)",
        }}
      />

      {/* Eyebrow */}
      <div className="badge mb-8">
        <div
          className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-dot"
          style={{ background: "var(--orange)" }}
        />
        ذكاء اصطناعي متقدّم لقراءة العربية
      </div>

      {/* Headline */}
      <h1
        className="mb-6"
        style={{
          fontFamily: "Tajawal, sans-serif",
          fontSize: "clamp(40px, 6vw, 72px)",
          fontWeight: 300,
          color: "var(--carbon)",
          lineHeight: 1.13,
          letterSpacing: "-0.025em",
          maxWidth: 760,
        }}
      >
        التراث العربي،
        <br />
        <span style={{ color: "var(--stone)" }}>نصاً قابلاً للبحث</span>
      </h1>

      {/* Sub */}
      <p
        className="mb-10 font-light"
        style={{
          fontFamily: "Tajawal, sans-serif",
          fontSize: 18,
          color: "var(--stone)",
          lineHeight: 1.7,
          maxWidth: 500,
        }}
      >
        حوِّل الكتب العربية المصوّرة إلى نصوص رقمية دقيقة في دقائق. من المخطوطات القديمة إلى المطبوعات الحديثة.
      </p>

      {/* CTA */}
      <div className="flex gap-3 flex-wrap justify-center mb-10">
        <Link href="/signup" className="btn-primary no-underline" style={{ fontSize: 16, padding: "14px 32px" }}>
          ابدأ مجاناً — ٥٠ صفحة
        </Link>
        <Link href="/try" className="btn-ghost no-underline" style={{ fontSize: 16, padding: "14px 32px" }}>
          جرّب مجاناً الآن
        </Link>
      </div>

      {/* Trust badges — قدرات واقعيّة بلا أرقام مُختلَقة */}
      <div className="flex items-center gap-6 flex-wrap justify-center mb-16">
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13 }}>✦</span>
          <span style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
            ذكاء اصطناعي متقدّم
          </span>
        </div>
        <div className="w-px h-3.5" style={{ background: "var(--border)" }} />
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13 }}>📜</span>
          <span style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
            يدعم الخطوط العربية القديمة
          </span>
        </div>
        <div className="w-px h-3.5" style={{ background: "var(--border)" }} />
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13 }}>🔒</span>
          <span style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
            بياناتك مشفّرة بالكامل
          </span>
        </div>
      </div>

      <BookToTextMockup />
    </section>
  );
}
