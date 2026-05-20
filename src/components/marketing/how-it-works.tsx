// src/components/marketing/how-it-works.tsx
"use client";

import { useState } from "react";

const steps = [
  {
    t: "ارفع ملفاتك",
    d: "PDF أو صور PNG/JPG/TIFF. حجم يصل إلى ٥٠٠ ميجابايت لكل وظيفة. رفع مجمّع مدعوم.",
  },
  {
    t: "اختر النموذج",
    d: "ثلاثة نماذج من Claude Vision — اختر Opus للمخطوطات الأصعب ودقة أعلى.",
  },
  {
    t: "انتظر المعالجة",
    d: "معالجة تلقائية في الخلفية. إشعار فور اكتمال كل الصفحات.",
  },
  {
    t: "صدِّر النتائج",
    d: "نص جاهز بصيغ TXT وMD وDOCX وJSON، أو ادمجه عبر API.",
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);

  return (
    <section id="how" style={{ padding: "96px 0", background: "var(--snow)" }}>
      <div className="container-warraq">
        <div className="grid items-center wq-grid-2" style={{ gridTemplateColumns: "1fr 1fr", gap: 64 }}>
          <div>
            <div className="badge mb-4" style={{ marginBottom: 18 }}>
              كيف يعمل
            </div>
            <h2
              style={{
                fontFamily: "Tajawal, sans-serif",
                fontSize: "clamp(26px,3.5vw,44px)",
                fontWeight: 300,
                color: "var(--carbon)",
                letterSpacing: "-0.02em",
                lineHeight: 1.18,
                marginBottom: 36,
              }}
            >
              أربع خطوات
              <br />
              إلى النص
            </h2>
            <div className="flex flex-col" style={{ gap: 4 }}>
              {steps.map((s, i) => {
                const isActive = active === i;
                return (
                  <div
                    key={i}
                    onClick={() => setActive(i)}
                    className="flex gap-4 cursor-pointer transition-all"
                    style={{
                      padding: "16px 14px",
                      borderRadius: 14,
                      background: isActive ? "var(--orange-soft)" : "transparent",
                      border: `1px solid ${isActive ? "rgba(246,146,81,0.22)" : "transparent"}`,
                    }}
                  >
                    <div
                      className="flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: "50%",
                        fontSize: 12,
                        fontWeight: 500,
                        background: isActive ? "var(--orange)" : "var(--fog)",
                        color: isActive ? "#fff" : "var(--stone)",
                        border: isActive ? "none" : "1px solid var(--border)",
                        fontFamily: "Tajawal, sans-serif",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div
                        className="transition-all"
                        style={{
                          fontFamily: "Tajawal, sans-serif",
                          fontSize: 15,
                          fontWeight: 500,
                          color: isActive ? "var(--carbon)" : "var(--stone)",
                          marginBottom: isActive ? 6 : 0,
                        }}
                      >
                        {s.t}
                      </div>
                      {isActive && (
                        <div
                          className="font-light"
                          style={{
                            fontSize: 14,
                            color: "var(--stone)",
                            lineHeight: 1.65,
                            fontFamily: "Tajawal, sans-serif",
                          }}
                        >
                          {s.d}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Visual panel */}
          <div
            className="card flex flex-col justify-center"
            style={{
              minHeight: 340,
              background: "var(--fog)",
              border: "1px solid var(--border-sub)",
            }}
          >
            {active === 0 && <Step0 />}
            {active === 1 && <Step1 />}
            {active === 2 && <Step2 />}
            {active === 3 && <Step3 />}
          </div>
        </div>
      </div>
    </section>
  );
}

function Step0() {
  return (
    <div className="flex flex-col items-center" style={{ gap: 18 }}>
      <div
        className="flex flex-col items-center justify-center"
        style={{
          width: 68,
          height: 84,
          background: "var(--snow)",
          borderRadius: 8,
          border: "2px dashed rgba(246,146,81,0.4)",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 28 }}>📄</span>
        <span style={{ fontSize: 9, color: "var(--pebble)", fontFamily: "Inter, sans-serif" }}>
          PDF / PNG
        </span>
      </div>
      <div style={{ fontSize: 14, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
        اسحب الملفات هنا أو اضغط للاختيار
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        {["PDF", "PNG", "JPG", "TIFF"].map((f) => (
          <span key={f} className="badge" style={{ fontSize: 11 }}>
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

function Step1() {
  const models = [
    { k: "Haiku", d: "سريع · للكتب الحديثة", active: false },
    { k: "Sonnet", d: "متوازن · موصى به", active: true },
    { k: "Opus", d: "الأدق · للمخطوطات الصعبة", active: false },
  ];
  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {models.map((m) => (
        <div
          key={m.k}
          className="flex justify-between items-center"
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            border: `1.5px solid ${m.active ? "var(--orange)" : "var(--border)"}`,
            background: m.active ? "rgba(246,146,81,0.04)" : "var(--snow)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--carbon)",
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              {m.k}
            </div>
            <div style={{ fontSize: 12, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
              {m.d}
            </div>
          </div>
          {m.active && (
            <div
              className="flex-shrink-0"
              style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--orange)" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function Step2() {
  const pages = [
    { p: "صفحة ١", pct: 100 },
    { p: "صفحة ٢", pct: 100 },
    { p: "صفحة ٣", pct: 64 },
    { p: "صفحة ٤", pct: 0 },
  ];
  return (
    <div className="flex flex-col" style={{ gap: 10 }}>
      {pages.map((pg, i) => (
        <div key={i}>
          <div
            className="flex justify-between"
            style={{ fontSize: 12, fontFamily: "Tajawal, sans-serif", marginBottom: 5 }}
          >
            <span style={{ color: "var(--carbon)" }}>{pg.p}</span>
            <span style={{ color: pg.pct === 100 ? "var(--orange)" : "var(--stone)" }}>
              {pg.pct === 100 ? "✓ مكتملة" : pg.pct > 0 ? "جارٍ المعالجة" : "في الانتظار"}
            </span>
          </div>
          <div style={{ height: 4, background: "var(--fog)", borderRadius: 2 }}>
            <div
              style={{
                height: "100%",
                width: `${pg.pct}%`,
                background: pg.pct === 100 ? "var(--orange)" : "rgba(246,146,81,0.35)",
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function Step3() {
  const formats = [
    { f: "TXT", d: "نص خام" },
    { f: "MD", d: "Markdown" },
    { f: "DOCX", d: "Word" },
    { f: "JSON", d: "API" },
  ];
  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {formats.map((x) => (
        <div
          key={x.f}
          style={{
            padding: 16,
            background: "var(--snow)",
            borderRadius: 12,
            border: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--carbon)",
              marginBottom: 4,
              fontFamily: "Inter, sans-serif",
            }}
          >
            {x.f}
          </div>
          <div style={{ fontSize: 12, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
            {x.d}
          </div>
        </div>
      ))}
    </div>
  );
}
