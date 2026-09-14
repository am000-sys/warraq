// src/app/(marketing)/pricing/page.tsx
// مرجع: design-reference/warraq-v3.html (function PricingPage)
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/site";
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
    a: "الدفع حالياً بالتحويل البنكيّ: اختر الباقة، حوّل المبلغ، وأرفق الإيصال — ويُضاف الرصيد بعد المراجعة. والدفع بالبطاقة (mada وVisa وApple Pay وSTC Pay) قيد التفعيل وسيتاح قريباً.",
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
    a: "نعم. محرّك التفريغ يتعامل مع المخطوطات العربية القديمة بمختلف الخطوط.",
  },
];

export const metadata: Metadata = {
  title: "الأسعار",
  description:
    "خطط وَرَّاق وأسعارها: مجانيّ بخمسين صفحة، واحترافيّ ٣١ ريالاً شهريّاً بخمسمئة صفحة، ومؤسسيّ ١٤٠ ريالاً بألفين وخمسمئة صفحة.",
  alternates: { canonical: "/pricing" },
};

// الأسعار من نفس المصدر المعروض في الصفحة (components/marketing/pricing.tsx)
// — فلا يفترق ما تقرؤه محرّكات البحث عمّا يراه الزائر.
const OFFERS = [
  { name: "مجاني", price: 0, pages: 50 },
  { name: "احترافي", price: 31, pages: 500 },
  { name: "مؤسسي", price: 140, pages: 2500 },
];

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--fog)" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: SITE_NAME,
          url: `${SITE_URL}/pricing`,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          inLanguage: "ar",
          description: SITE_DESCRIPTION,
          offers: OFFERS.map((o) => ({
            "@type": "Offer",
            name: o.name,
            price: o.price,
            priceCurrency: "SAR",
            description: `${o.pages} صفحة شهريّاً`,
            url: `${SITE_URL}/pricing`,
          })),
        }}
      />
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
