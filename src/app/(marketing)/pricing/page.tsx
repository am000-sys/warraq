// src/app/(marketing)/pricing/page.tsx
// مرجع: design-reference/warraq-v3.html (function PricingPage)
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Pricing } from "@/components/marketing/pricing";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from "@/components/ui/accordion";

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
          {/* أكورديون وصول (Base UI) — يسمح بفتح أكثر من سؤال، مع تنقّل لوحة مفاتيح */}
          <Accordion>
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={i}>
                <AccordionTrigger>{faq.q}</AccordionTrigger>
                <AccordionPanel>{faq.a}</AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
      <Footer />
    </div>
  );
}
