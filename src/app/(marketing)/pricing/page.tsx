// src/app/(marketing)/pricing/page.tsx
// مرجع: design-reference/warraq-v3.html (function PricingPage)
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/site";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Pricing } from "@/components/marketing/pricing";
import { TOPUP_PACKAGES, FREE_INITIAL_PAGES, planPurchase } from "@/lib/packages";
import { CARD_PAYMENTS_ENABLED } from "@/lib/payments-config";
import { ar, arSar, arDecimal } from "@/lib/utils";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionPanel,
} from "@/components/ui/accordion";

// كلفة كتابٍ نموذجيّ تُحسب من الباقات نفسها، فلا يصير الجواب قديماً إذا تغيّر سعر
const SAMPLE_BOOK = 300;
const sample = planPurchase(SAMPLE_BOOK - FREE_INITIAL_PAGES);
const cheapest = TOPUP_PACKAGES.reduce((a, b) => (b.perPage < a.perPage ? b : a));

// كلّ جوابٍ هنا يطابق ما يفعله المنتج اليوم. وكانت أجوبةٌ سابقة تَعِد بما لا يقع:
// «الترقية والتخفيض» لاشتراكٍ لا يُباع، و«لا نشارك بياناتك مع أيّ طرف ثالث»
// والصفحات تُقرأ لدى مزوّد الذكاء الاصطناعيّ، و«نعم» مطلقة للمخطوط اليدويّ.
const faqs = [
  {
    q: "هل أحتاج إلى اشتراك شهريّ؟",
    a: `لا. تشحن رصيداً من الصفحات متى احتجت، ويبقى ما لم تستعمله في حسابك. وعند التسجيل تحصل على ${ar(FREE_INITIAL_PAGES)} صفحة مجّاناً بلا بطاقة ائتمانيّة.`,
  },
  {
    q: "كم يكلّف تفريغ كتاب؟",
    a: `يُحتسب بالصفحة. كتابٌ من ${ar(SAMPLE_BOOK)} صفحة على حسابٍ جديد يكلّف ${arSar(sample.totalHalalas)} ريال بعد الصفحات المجّانيّة، وينزل سعر الصفحة إلى ${arDecimal(cheapest.perPage)} ريال في ${cheapest.nameAr}. وحاسبة الكلفة أعلاه تحسب أوفر طريقٍ لعدد صفحات كتابك.`,
  },
  {
    q: "هل تختلف المزايا بين الباقات؟",
    a: "لا. ترقيم الصفحات المطبوع وتصحيح الآيات وكلّ صيغ التصدير متاحةٌ لكلّ حساب؛ والباقة تحدّد عدد الصفحات وحده.",
  },
  {
    q: "ما وسائل الدفع المقبولة؟",
    a: CARD_PAYMENTS_ENABLED
      ? "الدفع بالبطاقة، أو بالتحويل البنكيّ: اختر الباقة، حوّل المبلغ، وأرفق الإيصال — ويُضاف الرصيد بعد المراجعة."
      : "الدفع حالياً بالتحويل البنكيّ: اختر الباقة، حوّل المبلغ، وأرفق الإيصال — ويُضاف الرصيد بعد المراجعة. والدفع بالبطاقة (mada وVisa وApple Pay وSTC Pay) قيد التفعيل وسيتاح قريباً.",
  },
  {
    q: "ماذا لو لم يكفِ رصيدي الكتاب كلّه؟",
    a: "نفحص قبل البدء أنّ رصيدك يكفي المستند كاملاً، فلا تبدأ معالجةٌ تنقطع في منتصفها دون علمك. وإن نفد الرصيد أثناءها بقيت الصفحات المكتملة محفوظة ومتاحة للتصفّح والتصدير.",
  },
  {
    q: "هل بياناتي آمنة؟",
    a: "تُنقل ملفّاتك مشفّرةً ولا تظهر لغيرك من المستخدمين. ولمعالجتها — التفريغ وما تطلبه من تلخيصٍ أو سؤال — تُرسَل إلى مزوّدي الذكاء الاصطناعيّ الذين يؤدّون ذلك، ولا نشاركها مع جهةٍ لغير هذا الغرض.",
  },
  {
    q: "هل تدعم المخطوطات اليدويّة؟",
    a: "أفضل نتائجه في الكتب المطبوعة وكتب التراث المصوّرة. أمّا المخطوط بخطّ اليد فتتفاوت نتيجته بوضوح الخطّ وحال النسخة، ويحتاج مراجعة — جرّب صفحةً منه مجّاناً قبل أن تشحن.",
  },
];

export const metadata: Metadata = {
  title: "الأسعار",
  description: `ادفع لما تفرّغه: ${ar(FREE_INITIAL_PAGES)} صفحة مجّاناً عند التسجيل، ثمّ رصيدٌ بالصفحة بلا اشتراك شهريّ — وسعر الصفحة حتى ${arDecimal(cheapest.perPage)} ريال. واحسب كلفة كتابك قبل أن تبدأ.`,
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--fog)" }}>
      {/* العروض من الباقات التي تبيعها صفحة الشحن نفسها، والأسئلة من نصّ الصفحة —
          فلا يفترق ما تقرؤه محرّكات البحث ومحرّكات الإجابة عمّا يراه الزائر. */}
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: SITE_NAME,
            url: `${SITE_URL}/pricing`,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            inLanguage: "ar",
            description: SITE_DESCRIPTION,
            offers: [
              { name: "مجّاناً عند التسجيل", price: 0, note: `${FREE_INITIAL_PAGES} صفحة بلا بطاقة ائتمانيّة` },
              ...TOPUP_PACKAGES.map((p) => ({
                name: p.nameAr,
                price: p.amountSar,
                note: `${p.pages} صفحة — دفعةً واحدة بلا اشتراك`,
              })),
            ].map((o) => ({
              "@type": "Offer",
              name: o.name,
              price: o.price,
              priceCurrency: "SAR",
              description: o.note,
              url: `${SITE_URL}/pricing`,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            inLanguage: "ar",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]}
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
