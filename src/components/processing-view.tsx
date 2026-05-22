// src/components/processing-view.tsx
// تجربة انتظار بصريّة أثناء المعالجة: معاينة المستند + ضوء مسح + تقدّم مُقنِع.
// (محاكاة بصريّة تدعم تجربة المستخدم — تكتمل فعلياً عند عودة النتيجة)
"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const STAGES = [
  "جارٍ تجهيز الملفّ...",
  "قراءة الصفحة بصرياً...",
  "استخراج النصّ العربي...",
  "ضبط التشكيل والفقرات...",
  "تنسيق النتائج النهائيّة...",
];

const SAMPLE = [
  "بسم الله الرحمن الرحيم",
  "الحمد لله ربّ العالمين",
  "وبه نستعين على أمور",
  "الدنيا والدين، وصلّى الله",
  "على سيّدنا محمّد وآله...",
];

export function ProcessingView({ previewUrl }: { previewUrl: string | null }) {
  const [scan, setScan] = useState(0);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const [chars, setChars] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setScan((s) => (s >= 100 ? 0 : s + 2));
      setChars((c) => Math.min(100, c + 2.5));
      // تقدّم يتباطأ قرب ٩٠٪ (ينتظر النتيجة الفعليّة)
      setProgress((p) => (p < 90 ? p + (90 - p) * 0.04 + 0.4 : p));
    }, 60);
    const s = setInterval(() => setStage((x) => (x + 1) % STAGES.length), 1800);
    return () => {
      clearInterval(t);
      clearInterval(s);
    };
  }, []);

  return (
    <div className="card" style={{ borderRadius: 20, overflow: "hidden", padding: 0 }}>
      {/* الشريط العلوي */}
      <div
        className="flex items-center gap-2"
        style={{ background: "var(--fog)", borderBottom: "1px solid var(--border-sub)", padding: "12px 18px" }}
      >
        <Sparkles size={16} color="var(--orange)" />
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>
          جارٍ المعالجة بالذكاء الاصطناعي
        </span>
      </div>

      <div className="grid wq-grid-2" style={{ gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        {/* يسار: المستند مع ضوء المسح */}
        <div style={{ padding: 20, borderLeft: "1px solid var(--border-sub)" }}>
          <div
            className="relative overflow-hidden"
            style={{
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "#faf9f6",
              minHeight: 280,
              maxHeight: 360,
            }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="المستند" style={{ width: "100%", display: "block" }} />
            ) : (
              <div className="flex flex-col items-center justify-center" style={{ minHeight: 280, gap: 10 }}>
                <span style={{ fontSize: 44 }}>📄</span>
                <span style={{ fontSize: 12, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>مستند PDF</span>
              </div>
            )}
            {/* ضوء المسح */}
            <div
              style={{
                position: "absolute",
                right: 0,
                left: 0,
                height: 3,
                top: `${scan}%`,
                background: "linear-gradient(to left, transparent, rgba(246,146,81,0.9), transparent)",
                boxShadow: "0 0 14px 3px rgba(246,146,81,0.5)",
                transition: "top 0.06s linear",
              }}
            />
            {/* تظليل أسفل خطّ المسح */}
            <div
              style={{
                position: "absolute",
                right: 0,
                left: 0,
                top: `${scan}%`,
                bottom: 0,
                background: "linear-gradient(to bottom, rgba(247,247,247,0.55), transparent 40%)",
                transition: "top 0.06s linear",
              }}
            />
          </div>
        </div>

        {/* يمين: النصّ المستخرَج يظهر تدريجياً */}
        <div style={{ padding: 20 }}>
          <div
            className="flex items-center gap-1.5"
            style={{ marginBottom: 12, fontSize: 11, color: "var(--orange)", fontFamily: "Tajawal, sans-serif", fontWeight: 500 }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "var(--orange)" }} />
            النصّ المستخرَج
          </div>
          <div dir="rtl" style={{ fontFamily: "Tajawal, sans-serif", fontSize: 14, lineHeight: 2.1, color: "var(--midnight)" }}>
            {SAMPLE.map((line, i) => {
              const start = i * 20;
              const visible = Math.max(0, Math.min(line.length, Math.round(((chars - start) * line.length) / 20)));
              return (
                <div key={i} style={{ marginBottom: 2 }}>
                  <span style={{ color: i === 0 ? "var(--orange)" : "var(--midnight)", fontWeight: i === 0 ? 500 : 400 }}>
                    {line.slice(0, visible)}
                  </span>
                  {visible < line.length && visible > 0 && (
                    <span
                      className="animate-pulse-dot"
                      style={{ display: "inline-block", width: 2, height: "1em", background: "var(--orange)", verticalAlign: "middle", marginRight: 1 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* شريط التقدّم + المرحلة */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-sub)", background: "var(--fog)" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>{STAGES[stage]}</span>
          <span style={{ fontSize: 13, color: "var(--orange)", fontWeight: 500, fontFamily: "Tajawal, sans-serif" }}>
            {Math.round(progress)}٪
          </span>
        </div>
        <div style={{ height: 6, background: "var(--border-sub)", borderRadius: 3, overflow: "hidden" }}>
          <div
            style={{ height: "100%", width: `${progress}%`, background: "var(--orange)", borderRadius: 3, transition: "width 0.2s" }}
          />
        </div>
      </div>
    </div>
  );
}
