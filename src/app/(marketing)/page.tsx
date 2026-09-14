// src/app/(marketing)/page.tsx — الصفحة الرئيسية
// مرجع: design-reference/warraq-v3.html (function LandingPage)
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "@/lib/site";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Hero } from "@/components/marketing/hero";
import { Stats } from "@/components/marketing/stats";
import { Features } from "@/components/marketing/features";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Testimonials } from "@/components/marketing/testimonials";
import { Pricing } from "@/components/marketing/pricing";
import { CTABand } from "@/components/marketing/cta-band";

export const metadata: Metadata = {
  // الجذر يحمل العنوان الكامل، فلا نُكرّره هنا — نكتفي بالوصف والرابط القانونيّ.
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    <>
      {/* هويّة المنصّة وموقعها — تُعرّف محرّكات البحث بالجهة لا بالصفحة وحدها */}
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: SITE_NAME,
            url: SITE_URL,
            description: SITE_DESCRIPTION,
            areaServed: "SA",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: SITE_NAME,
            url: SITE_URL,
            inLanguage: "ar",
          },
        ]}
      />
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <CTABand />
      </main>
      <Footer />
    </>
  );
}
