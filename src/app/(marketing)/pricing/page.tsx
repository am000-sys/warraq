// src/app/(marketing)/pricing/page.tsx
// مرجع: design-reference/warraq-v3.html (function PricingPage)
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/site";
import { TOPUP_PACKAGES } from "@/lib/packages";
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
    q: "هل الاشتراك الشهريّ متاح؟",
    a: "ليس بعد؛ نعمل عليه. وحتى يُتاح تشتري باقة صفحات بقدر حاجتك، ويبقى رصيدك في حسابك.",
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
    q: "ماذا يحدث إذا نفد رصيدي؟",
    a: "تشحن باقةً أو عدد الصفحات الذي تحتاجه. ولا نبدأ مستنداً لا يكفيه رصيدك: نخبرك بالمطلوب قبل البدء، فلا يُخصم شيء.",
  },
  {
    q: "هل تدعم المخطوطات اليدوية؟",
    a: "نعم. محرّك التفريغ يتعامل مع المخطوطات العربية القديمة بمختلف الخطوط.",
  },
];

export const metadata: Metadata = {
  title: "الأسعار",
  description:
    "أسعار وَرَّاق: خمسون صفحة مجّاناً عند التسجيل، ثمّ باقات صفحات تُدفع مرّة واحدة، تبدأ من ستّة ريالات لمئة صفحة.",
  alternates: { canonical: "/pricing" },
};

// العروض من نفس مصدر الصفحة (src/lib/packages.ts) — فلا يفترق ما تقرؤه محرّكات
// البحث عمّا يراه الزائر. والاشتراك الشهريّ لا يُعلَن عرضاً حتى يُبنى.
const OFFERS = [
  { name: "مجاني", price: 0, pages: 50 },
  ...TOPUP_PACKAGES.map((p) => ({ name: p.nameAr, price: p.amountSar, pages: p.pages })),
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
            description: `${o.pages} صفحة`,
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
