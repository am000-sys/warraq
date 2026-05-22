// src/app/(marketing)/pricing/page.tsx
// مرجع: design-reference/warraq-v3.html (function PricingPage)
"use client";

import { useState } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Pricing } from "@/components/marketing/pricing";

const faqs = [
  {
    q: "هل يمكنني ترقية خطتي لاحقاً؟",
    a: "نعم، يمكنك الترقية أو التخفيض في أي وقت. الفرق يُحتسب تلقائياً.",
  },
  {
    q: "ما صيغ الدفع المقبولة؟",
    a: "نقبل mada وVisa وMastercard وApple Pay وSTC Pay عبر Stripe وTap Payments.",
  },
  {
    q: "هل بياناتي آمنة؟",
    a: "نعم. ملفاتك مشفرة أثناء النقل والتخزين. لا نشارك بياناتك مع أي طرف ثالث.",
  },
  {
    q: "ماذا يحدث عند تجاوز حصة الصفحات؟",
    a: "يمكنك شراء صفحات إضافية (PAYG) دون الترقية للخطة التالية.",
  },
  {
    q: "هل تدعم المخطوطات اليدوية؟",
    a: "نعم. نموذجنا الفائق يتعامل مع المخطوطات العربية القديمة بمختلف الخطوط.",
  },
];

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--fog)" }}>
      <Nav />
      <div style={{ paddingTop: 88 }}>
        <Pricing standalone />

        {/* FAQ */}
        <div className="mx-auto" style={{ maxWidth: 640, padding: "0 28px 80px" }}>
          <h2
            style={{
              fontFamily: "Tajawal, sans-serif",
              fontSize: 28,
              fontWeight: 300,
              color: "var(--carbon)",
              letterSpacing: "-0.01em",
              marginBottom: 28,
            }}
          >
            أسئلة شائعة
          </h2>
          {faqs.map((faq, i) => (
            <FAQItem key={i} {...faq} />
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--border-sub)", padding: "18px 0" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center cursor-pointer text-right"
        style={{ background: "none", border: "none" }}
      >
        <span
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--carbon)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          {q}
        </span>
        <span
          className="flex-shrink-0 transition-transform"
          style={{
            color: "var(--orange)",
            fontSize: 20,
            transform: open ? "rotate(45deg)" : "none",
            marginRight: 16,
          }}
        >
          +
        </span>
      </button>
      {open && (
        <p
          className="font-light"
          style={{
            marginTop: 10,
            fontSize: 14,
            color: "var(--stone)",
            lineHeight: 1.65,
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          {a}
        </p>
      )}
    </div>
  );
}
