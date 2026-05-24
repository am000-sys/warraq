// src/components/marketing/cta-band.tsx
import Link from "next/link";
import { Logo } from "@/components/logo";

export function CTABand() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        padding: "96px 0",
        background: "var(--slate)",
        textAlign: "center",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 60% at 50% 100%, rgba(246,146,81,0.07) 0%, transparent 70%)",
        }}
      />
      <div className="container-warraq relative">
        <div className="flex justify-center mb-8">
          <Logo size={1.1} inverted />
        </div>
        <h2
          className="mx-auto"
          style={{
            fontFamily: "Tajawal, sans-serif",
            fontSize: "clamp(28px,4.5vw,54px)",
            fontWeight: 300,
            color: "#fff",
            letterSpacing: "-0.02em",
            lineHeight: 1.18,
            marginBottom: 18,
            maxWidth: 580,
          }}
        >
          التراث العربي يستحق
          <br />
          أن يُقرأ رقمياً
        </h2>
        <p
          className="font-light"
          style={{
            fontSize: 17,
            color: "rgba(255,255,255,0.45)",
            marginBottom: 40,
            lineHeight: 1.65,
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          ابدأ مجاناً بـ ٥٠ صفحة — بدون بطاقة ائتمانية.
        </p>
        <Link
          href="/signup"
          className="btn-primary no-underline"
          style={{ fontSize: 16, padding: "15px 36px" }}
        >
          ابدأ مجاناً — ٥٠ صفحة
        </Link>
      </div>
    </section>
  );
}
