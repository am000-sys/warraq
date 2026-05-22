// src/components/book-to-text-mockup.tsx
// المحاكاة المتحرّكة: كتاب → نص
// مرجع: design-reference/warraq-v3.html (function BookToTextMockup)
"use client";

import { useEffect, useState } from "react";

const sampleLines = [
  { text: "بسم الله الرحمن الرحيم", highlight: true },
  { text: "قال الإمام ابن تيمية رحمه الله", highlight: false },
  { text: "في فتاواه الكبرى أن الواجب", highlight: false },
  { text: "على كل مسلم أن يتعلم من أمور", highlight: false },
  { text: "دينه ما لا يسعه جهله...", highlight: false },
];

const pageLines = [
  { w: "100%", dark: true },
  { w: "88%", dark: false },
  { w: "94%", dark: false },
  { w: "82%", dark: false },
  { w: "90%", dark: false },
  { w: "96%", dark: false },
  { w: "76%", dark: false },
  { w: "88%", dark: false },
  { w: "92%", dark: false },
  { w: "68%", dark: false },
];

export function BookToTextMockup() {
  const [scanPos, setScanPos] = useState(0);
  const [textVisible, setTextVisible] = useState(0);

  useEffect(() => {
    let pos = 0;
    let chars = 0;
    const t = setInterval(() => {
      pos = pos >= 100 ? 0 : pos + 1.2;
      chars = pos >= 100 ? 0 : Math.min(chars + 3, 100);
      setScanPos(pos);
      setTextVisible(chars);
    }, 35);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full mx-auto" style={{ maxWidth: 880 }}>
      <div
        className="overflow-hidden border"
        style={{
          background: "var(--snow)",
          borderRadius: 24,
          boxShadow: "0 4px 40px rgba(0,0,0,0.08), 0 1px 0 rgba(0,0,0,0.04)",
          borderColor: "var(--border-sub)",
        }}
      >
        {/* Browser bar */}
        <div
          className="flex items-center gap-2"
          style={{
            background: "var(--fog)",
            borderBottom: "1px solid var(--border-sub)",
            padding: "10px 16px",
          }}
        >
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#c97b84" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f69251" }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#6dbd7a" }} />
          <div className="flex-1" style={{ marginRight: 12 }}>
            <div
              className="flex items-center px-3 max-w-[260px]"
              style={{
                background: "var(--snow)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                height: 24,
                fontSize: 11,
                color: "var(--pebble)",
                fontFamily: "Inter, sans-serif",
                direction: "ltr",
              }}
            >
              app.warraq.sa/jobs/J-1001/results
            </div>
          </div>
        </div>

        {/* Two panels */}
        <div className="grid wq-mockup-grid" style={{ gridTemplateColumns: "1fr 56px 1fr", minHeight: 300 }}>
          {/* LEFT — scanned page */}
          <div
            className="flex flex-col gap-2.5 wq-mockup-panel"
            style={{ padding: 20, borderLeft: "1px solid var(--border-sub)" }}
          >
            <div className="flex justify-between items-center mb-1">
              <span style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
                الصفحة الأصلية
              </span>
              <span
                style={{
                  fontSize: 10,
                  background: "var(--fog)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "2px 8px",
                  color: "var(--stone)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                PNG
              </span>
            </div>

            <div
              className="flex-1 relative overflow-hidden"
              style={{
                background: "#faf9f6",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "16px 14px",
              }}
            >
              {/* Scan line */}
              <div
                className="absolute right-0 left-0 z-[2]"
                style={{
                  height: 2,
                  top: `calc(12px + ${scanPos}% * 0.85)`,
                  background:
                    "linear-gradient(to left, transparent, rgba(246,146,81,0.7), transparent)",
                  boxShadow: "0 0 6px rgba(246,146,81,0.5)",
                  transition: "top 0.04s linear",
                }}
              />
              <div className="flex flex-col gap-2.5" style={{ direction: "rtl" }}>
                {pageLines.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      height: i === 0 ? 8 : 6,
                      background: l.dark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.11)",
                      borderRadius: 2,
                      width: l.w,
                    }}
                  />
                ))}
              </div>
              <svg
                style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, opacity: 0.5 }}
                viewBox="0 0 24 24"
                fill="none"
              >
                <path d="M2 8 L2 2 L8 2" stroke="#f69251" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M16 2 L22 2 L22 8" stroke="#f69251" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          {/* CENTER — arrow */}
          <div
            className="flex flex-col items-center justify-center gap-2 wq-mockup-divider"
            style={{ padding: "20px 0", borderLeft: "1px solid var(--border-sub)" }}
          >
            <div className="w-px flex-1 wq-divider-line" style={{ background: "var(--border-sub)" }} />
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 wq-divider-arrow"
              style={{
                background: "var(--orange-soft)",
                border: "1px solid rgba(246,146,81,0.3)",
              }}
            >
              <span style={{ color: "var(--orange)", fontSize: 13, lineHeight: 1 }}>←</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse-dot"
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: "50%",
                    background: "var(--orange)",
                    animationDelay: `${i * 0.3}s`,
                    opacity: 0.7,
                  }}
                />
              ))}
            </div>
            <div className="w-px flex-1" style={{ background: "var(--border-sub)" }} />
          </div>

          {/* RIGHT — extracted text */}
          <div className="flex flex-col gap-2.5 wq-mockup-panel" style={{ padding: 20 }}>
            <div className="flex justify-between items-center mb-1">
              <span
                style={{
                  fontSize: 11,
                  color: "var(--orange)",
                  fontFamily: "Tajawal, sans-serif",
                  fontWeight: 500,
                }}
              >
                النص المستخرج
              </span>
              <span
                style={{
                  fontSize: 10,
                  background: "var(--orange-soft)",
                  border: "1px solid rgba(246,146,81,0.2)",
                  borderRadius: 4,
                  padding: "2px 8px",
                  color: "var(--orange)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                نصّ رقمي
              </span>
            </div>
            <div
              className="flex-1 overflow-hidden relative"
              style={{
                background: "var(--fog)",
                borderRadius: 12,
                padding: 16,
                direction: "rtl",
              }}
            >
              <div
                style={{
                  fontFamily: "Tajawal, sans-serif",
                  fontSize: 14,
                  lineHeight: 2.1,
                  color: "var(--midnight)",
                }}
              >
                {sampleLines.map((line, i) => {
                  const lineStart = i * 20;
                  const visible = Math.max(
                    0,
                    Math.min(
                      line.text.length,
                      Math.round(((textVisible - lineStart) * line.text.length) / 20),
                    ),
                  );
                  return (
                    <div key={i} style={{ marginBottom: 2 }}>
                      <span
                        style={{
                          color: line.highlight ? "var(--orange)" : "var(--midnight)",
                          fontWeight: line.highlight ? 500 : 400,
                        }}
                      >
                        {line.text.slice(0, visible)}
                      </span>
                      {visible < line.text.length && (
                        <span
                          className="animate-pulse-dot"
                          style={{
                            display: "inline-block",
                            width: 2,
                            height: "1em",
                            background: "var(--orange)",
                            verticalAlign: "middle",
                            marginRight: 1,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Status footer */}
        <div
          className="flex justify-between items-center"
          style={{
            background: "var(--fog)",
            borderTop: "1px solid var(--border-sub)",
            padding: "10px 20px",
          }}
        >
          <div className="flex gap-5">
            {[
              { l: "النموذج", v: "وَرَّاق متوازن" },
              { l: "الصفحة", v: `${Math.round(scanPos / 10 + 1)} / ٢٤٠` },
              { l: "الصيغة", v: "نصّ + Markdown" },
            ].map((s, i) => (
              <div key={i} className="flex gap-1.5 items-center">
                <span style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
                  {s.l}:
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--stone)",
                    fontFamily: "Tajawal, sans-serif",
                    fontWeight: 500,
                  }}
                >
                  {s.v}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: "var(--orange)" }}
            />
            <span
              style={{
                fontSize: 11,
                color: "var(--orange)",
                fontFamily: "Tajawal, sans-serif",
                fontWeight: 500,
              }}
            >
              جارٍ المعالجة
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
