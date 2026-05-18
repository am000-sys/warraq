// src/components/marketing/features.tsx
"use client";

import { useState } from "react";

const feats = [
  {
    icon: "✦",
    t: "دعم كامل للخطوط العربية",
    d: "نسخ، ثلث، ديواني، رقعة، كوفي — مع الشكل والتشديد. يتعامل مع أصعب المخطوطات.",
  },
  {
    icon: "⚡",
    t: "معالجة سريعة",
    d: "صفحة كاملة في ٣ ثوانٍ. معالجة متوازية للكتب الضخمة دون انتظار.",
  },
  {
    icon: "◈",
    t: "ثلاثة نماذج",
    d: "Haiku للسرعة، Sonnet للتوازن، Opus لأصعب المخطوطات. اختر الأنسب لك.",
  },
  {
    icon: "↓",
    t: "تصدير متعدد الصيغ",
    d: "TXT وMarkdown وDOCX وJSON. نتائجك جاهزة في أداتك المفضلة.",
  },
  {
    icon: "◎",
    t: "API للمطورين",
    d: "RESTful API موثقة بالكامل. ادمج وَرَّاق في تطبيقاتك بسطور قليلة.",
  },
  {
    icon: "⊞",
    t: "حسابات المؤسسات",
    d: "فريق كامل بأدوار متعددة. فوترة مركزية. مثالي للمكتبات والأرشيفات.",
  },
];

export function Features() {
  return (
    <section
      id="features"
      style={{ padding: "96px 0", background: "var(--fog)" }}
    >
      <div className="container-warraq">
        <div className="text-center mb-15" style={{ marginBottom: 60 }}>
          <div className="badge mb-4" style={{ marginBottom: 18 }}>
            المميزات
          </div>
          <h2
            className="mb-3"
            style={{
              fontFamily: "Tajawal, sans-serif",
              fontSize: "clamp(28px,4vw,48px)",
              fontWeight: 300,
              color: "var(--carbon)",
              letterSpacing: "-0.02em",
              lineHeight: 1.18,
            }}
          >
            كل ما يحتاجه الباحث
          </h2>
          <p
            className="font-light mx-auto"
            style={{
              fontSize: 17,
              color: "var(--stone)",
              fontFamily: "Tajawal, sans-serif",
              maxWidth: 440,
              lineHeight: 1.65,
            }}
          >
            من المخطوط الأصلي إلى نص رقمي قابل للبحث والتحرير.
          </p>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
          {feats.map((f, i) => (
            <FeatureCard key={i} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon, t, d }: { icon: string; t: string; d: string }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="card transition-all"
      style={{
        cursor: "default",
        borderColor: hover ? "rgba(246,146,81,0.35)" : "var(--border-sub)",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hover ? "0 8px 28px rgba(246,146,81,0.10)" : "var(--shadow-card)",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        className="flex items-center justify-center mb-4"
        style={{
          width: 40,
          height: 40,
          background: "var(--orange-soft)",
          border: "1px solid rgba(246,146,81,0.18)",
          borderRadius: 10,
          fontSize: 17,
          color: "var(--orange)",
        }}
      >
        {icon}
      </div>
      <div
        className="mb-2"
        style={{
          fontFamily: "Tajawal, sans-serif",
          fontSize: 17,
          fontWeight: 500,
          color: "var(--carbon)",
        }}
      >
        {t}
      </div>
      <div
        className="font-light"
        style={{
          fontSize: 14,
          color: "var(--stone)",
          lineHeight: 1.7,
          fontFamily: "Tajawal, sans-serif",
        }}
      >
        {d}
      </div>
    </div>
  );
}
