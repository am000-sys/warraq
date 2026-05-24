// src/components/marketing/pricing.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

// التسعير الحاليّ = ربع التسعيرة السابقة (سعر الصفحة ~٠٫٠٥ ريال)
const plans = [
  {
    tier: "مجاني",
    price: { monthly: 0, yearly: 0 },
    feats: ["٥٠ صفحة مجاناً", "نموذج سريع", "تصدير TXT و MD", "دعم بالبريد"],
    cta: "ابدأ مجاناً",
  },
  {
    tier: "احترافي",
    price: { monthly: 24.75, yearly: 19.75 },
    badge: "الأكثر شيوعاً",
    feats: [
      "٥٠٠ صفحة / شهر",
      "نموذجا سريع + جيد",
      "جميع صيغ التصدير",
      "أولوية المعالجة",
      "دعم أولوية",
    ],
    cta: "اشترك الآن",
    featured: true,
  },
  {
    tier: "مؤسسي",
    price: { monthly: 112.25, yearly: 89.75 },
    feats: [
      "٢٥٠٠ صفحة / شهر",
      "جميع النماذج (فائق)",
      "إدارة فريق",
      "مدير حساب مخصص",
      "وصول API",
    ],
    cta: "تواصل معنا",
  },
];

export function Pricing({ standalone = false }: { standalone?: boolean }) {
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  return (
    <section
      style={{
        padding: "96px 0",
        background: standalone ? "var(--fog)" : "var(--snow)",
      }}
    >
      <div className="container-warraq">
        <div className="text-center" style={{ marginBottom: 52 }}>
          <div className="badge" style={{ marginBottom: 18 }}>
            الأسعار
          </div>
          <h2
            className="mb-3"
            style={{
              fontFamily: "Tajawal, sans-serif",
              fontSize: "clamp(28px,4vw,48px)",
              fontWeight: 300,
              color: "var(--carbon)",
              letterSpacing: "-0.02em",
            }}
          >
            ابدأ مجاناً
          </h2>
          <p
            className="font-light"
            style={{
              fontSize: 16,
              color: "var(--stone)",
              fontFamily: "Tajawal, sans-serif",
              marginBottom: 28,
            }}
          >
            بدون بطاقة ائتمانية · ترقية في أي وقت
          </p>
          <div
            className="inline-flex"
            style={{
              background: "var(--fog)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-btn)",
              padding: 4,
            }}
          >
            {[
              { k: "monthly" as const, l: "شهري" },
              { k: "yearly" as const, l: "سنوي — وفّر ٢٠٪" },
            ].map((b) => (
              <button
                key={b.k}
                onClick={() => setBilling(b.k)}
                className="cursor-pointer transition-all"
                style={{
                  padding: "9px 22px",
                  border: "none",
                  borderRadius: 24,
                  background: billing === b.k ? "var(--snow)" : "transparent",
                  color: billing === b.k ? "var(--carbon)" : "var(--stone)",
                  fontSize: 13,
                  fontWeight: billing === b.k ? 500 : 400,
                  fontFamily: "Tajawal, sans-serif",
                  boxShadow: billing === b.k ? "var(--shadow-card)" : "none",
                }}
              >
                {b.l}
              </button>
            ))}
          </div>
        </div>

        <div
          className="grid mx-auto wq-grid-3"
          style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 18, maxWidth: 900 }}
        >
          {plans.map((plan, i) => (
            <div
              key={i}
              className="relative"
              style={{
                background: plan.featured ? "var(--slate)" : "var(--snow)",
                borderRadius: "var(--r-card)",
                padding: 28,
                border: plan.featured
                  ? "1px solid rgba(246,146,81,0.25)"
                  : "1px solid var(--border-sub)",
                boxShadow: plan.featured
                  ? "0 8px 32px rgba(36,36,51,0.18)"
                  : "var(--shadow-card)",
                textAlign: "right",
              }}
            >
              {plan.badge && (
                <div
                  className="absolute"
                  style={{
                    top: -11,
                    right: 24,
                    background: "var(--orange)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "3px 12px",
                    borderRadius: "var(--r-badge)",
                    fontFamily: "Tajawal, sans-serif",
                  }}
                >
                  {plan.badge}
                </div>
              )}
              <div
                style={{
                  fontSize: 12,
                  color: plan.featured ? "rgba(255,255,255,0.4)" : "var(--stone)",
                  fontFamily: "Tajawal, sans-serif",
                  marginBottom: 14,
                  letterSpacing: "0.04em",
                }}
              >
                {plan.tier}
              </div>
              <div
                style={{
                  fontFamily: "Tajawal, sans-serif",
                  fontSize: 48,
                  fontWeight: 300,
                  color: plan.featured ? "#fff" : "var(--carbon)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {plan.price[billing] === 0 ? "٠" : plan.price[billing]}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: plan.featured ? "rgba(255,255,255,0.4)" : "var(--stone)",
                  fontFamily: "Tajawal, sans-serif",
                  marginBottom: 24,
                }}
              >
                ريال / شهر
              </div>
              <ul
                className="list-none flex flex-col"
                style={{ gap: 10, marginBottom: 24 }}
              >
                {plan.feats.map((f, j) => (
                  <li
                    key={j}
                    className="flex items-center gap-2"
                    style={{
                      fontSize: 13,
                      color: plan.featured
                        ? "rgba(255,255,255,0.65)"
                        : "var(--stone)",
                      fontFamily: "Tajawal, sans-serif",
                    }}
                  >
                    <span style={{ color: "var(--orange)", fontWeight: 600, flexShrink: 0 }}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={
                  plan.featured
                    ? "btn-primary w-full justify-center no-underline"
                    : "btn-ghost w-full justify-center no-underline"
                }
                style={{ fontSize: 14, padding: 12 }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p
          className="text-center"
          style={{
            marginTop: 24,
            fontSize: 12,
            color: "var(--pebble)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          شامل ضريبة القيمة المضافة · يُقبل mada، Visa، Apple Pay، STC Pay
        </p>
      </div>
    </section>
  );
}
