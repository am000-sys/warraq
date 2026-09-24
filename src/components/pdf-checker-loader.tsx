// src/components/pdf-checker-loader.tsx — يحمّل الفاحص في المتصفّح وحده
//
// pdfjs مكتبةٌ للمتصفّح؛ إدخالها في رسم الخادم يجرّ اعتمادات Node الاختياريّة
// (canvas) ويُثقل الحزمة بلا فائدة. و`ssr: false` لا يجوز في مكوّن خادم،
// فهذا الغلاف العميل موضعه.
"use client";

import dynamic from "next/dynamic";

const PdfChecker = dynamic(() => import("./pdf-checker"), {
  ssr: false,
  loading: () => (
    <div
      className="card"
      style={{
        padding: "36px 24px",
        borderRadius: "var(--r-card)",
        textAlign: "center",
        fontFamily: "Tajawal, sans-serif",
        fontSize: 14,
        color: "var(--pebble)",
      }}
    >
      يجهّز الفاحص…
    </div>
  ),
});

export function PdfCheckerLoader() {
  return <PdfChecker />;
}
