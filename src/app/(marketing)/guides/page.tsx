// src/app/(marketing)/guides/page.tsx — فهرس الأدلّة
import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { GUIDES } from "@/content/guides";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "أدلّة وشروح",
  description:
    "أدلّة عمليّة في تفريغ الكتب المصوّرة إلى نصّ: الطرق ومواضعها، وحفظ ترقيم الصفحات المطبوع، وحدود القراءة الآليّة في العربيّة.",
  alternates: { canonical: "/guides" },
};

export default function GuidesIndex() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--fog)" }}>
      {/* فهرسٌ مهيكل — يربط المقالات بعضها ببعض لدى محرّكات البحث */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `أدلّة وشروح — ${SITE_NAME}`,
          url: `${SITE_URL}/guides`,
          inLanguage: "ar",
          hasPart: GUIDES.map((g) => ({
            "@type": "Article",
            headline: g.title,
            description: g.description,
            url: `${SITE_URL}/guides/${g.slug}`,
            datePublished: g.updated,
          })),
        }}
      />
      <Nav />
      <div style={{ paddingTop: 88 }}>
        <div className="mx-auto" style={{ maxWidth: 760, padding: "40px 28px 80px" }}>
          <h1
            style={{
              fontFamily: "Tajawal, sans-serif",
              fontSize: "clamp(28px,4vw,44px)",
              fontWeight: 300,
              color: "var(--carbon)",
              letterSpacing: "-0.02em",
              marginBottom: 12,
            }}
          >
            أدلّة وشروح
          </h1>
          <p
            style={{
              fontFamily: "Tajawal, sans-serif",
              fontSize: 15,
              lineHeight: 2,
              color: "var(--stone)",
              marginBottom: 40,
            }}
          >
            ما تعلّمناه من تفريغ الكتب المصوّرة — الطرق ومواضعها، وما يُفسد النتيجة، وحدود
            القراءة الآليّة في العربيّة. مكتوبةٌ لمن يُحيل إلى ما يقرأ.
          </p>

          <div className="flex flex-col" style={{ gap: 16 }}>
            {GUIDES.map((g) => (
              <Link
                key={g.slug}
                href={`/guides/${g.slug}`}
                className="card no-underline"
                style={{ display: "block", padding: 24, borderRadius: "var(--r-card)" }}
              >
                <h2
                  style={{
                    fontFamily: "Tajawal, sans-serif",
                    fontSize: 19,
                    fontWeight: 500,
                    color: "var(--carbon)",
                    lineHeight: 1.7,
                    marginBottom: 8,
                  }}
                >
                  {g.title}
                </h2>
                <p
                  style={{
                    fontFamily: "Tajawal, sans-serif",
                    fontSize: 14,
                    lineHeight: 1.9,
                    color: "var(--stone)",
                  }}
                >
                  {g.summary}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
