// src/app/(marketing)/guides/[slug]/page.tsx — مُصيِّر المقال الواحد
//
// كلّ المقالات تمرّ من هنا، فالوسوم والبيانات المهيكلة والتنسيق واحدة لا تُنسى
// في مقالٍ دون آخر. و`generateStaticParams` يجعلها صفحاتٍ ثابتة وقت البناء.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { GUIDES, findGuide, type Block } from "@/content/guides";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.description,
      url: `${SITE_URL}/guides/${guide.slug}`,
      publishedTime: guide.updated,
    },
  };
}

const TEXT: React.CSSProperties = {
  fontFamily: "Tajawal, sans-serif",
  fontSize: 15.5,
  lineHeight: 2.1,
  color: "var(--stone)",
};

function Rendered({ block }: { block: Block }) {
  switch (block.t) {
    case "h2":
      return (
        <h2
          style={{
            fontFamily: "Tajawal, sans-serif",
            fontSize: 22,
            fontWeight: 500,
            color: "var(--carbon)",
            lineHeight: 1.7,
            marginTop: 40,
            marginBottom: 14,
          }}
        >
          {block.text}
        </h2>
      );
    case "p":
      return <p style={{ ...TEXT, marginBottom: 18 }}>{block.text}</p>;
    case "ul":
    case "ol": {
      const Tag = block.t === "ul" ? "ul" : "ol";
      return (
        <Tag
          style={{
            ...TEXT,
            marginBottom: 18,
            paddingInlineStart: 22,
            listStyleType: block.t === "ul" ? "disc" : "arabic-indic",
          }}
        >
          {block.items.map((item, i) => (
            <li key={i} style={{ marginBottom: 8 }}>
              {item}
            </li>
          ))}
        </Tag>
      );
    }
    case "note":
      return (
        <div
          style={{
            ...TEXT,
            fontSize: 14.5,
            background: "var(--snow)",
            border: "1px solid var(--border)",
            borderInlineStart: "3px solid var(--orange)",
            borderRadius: 12,
            padding: "16px 18px",
            margin: "26px 0",
          }}
        >
          {block.text}
        </div>
      );
    case "table":
      return (
        // الجداول وحدها يُسمح لها بالتمرير الأفقيّ على الشاشات الضيّقة
        <div style={{ overflowX: "auto", margin: "26px 0" }}>
          <table
            style={{
              ...TEXT,
              fontSize: 14,
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 480,
            }}
          >
            <thead>
              <tr>
                {block.head.map((h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: "right",
                      fontWeight: 500,
                      color: "var(--carbon)",
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--border)",
                      background: "var(--snow)",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      style={{
                        padding: "10px 12px",
                        borderBottom: "1px solid var(--border-sub)",
                        verticalAlign: "top",
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = findGuide(slug);
  if (!guide) notFound();

  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <div style={{ minHeight: "100vh", background: "var(--fog)" }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.description,
          url: `${SITE_URL}/guides/${guide.slug}`,
          datePublished: guide.updated,
          dateModified: guide.updated,
          inLanguage: "ar",
          author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          mainEntityOfPage: `${SITE_URL}/guides/${guide.slug}`,
        }}
      />
      <Nav />
      <div style={{ paddingTop: 88 }}>
        <article className="mx-auto" style={{ maxWidth: 680, padding: "36px 28px 24px" }}>
          <Link
            href="/guides"
            className="inline-flex items-center no-underline"
            style={{
              gap: 6,
              fontFamily: "Tajawal, sans-serif",
              fontSize: 13,
              color: "var(--stone)",
              marginBottom: 22,
            }}
          >
            <ArrowLeft size={14} style={{ transform: "scaleX(-1)" }} />
            كلّ الأدلّة
          </Link>

          <h1
            style={{
              fontFamily: "Tajawal, sans-serif",
              fontSize: "clamp(26px,3.6vw,38px)",
              fontWeight: 300,
              color: "var(--carbon)",
              letterSpacing: "-0.02em",
              lineHeight: 1.6,
              marginBottom: 28,
            }}
          >
            {guide.title}
          </h1>

          {guide.blocks.map((block, i) => (
            <Rendered key={i} block={block} />
          ))}

          {/* دعوةٌ للتجربة — بلا وعدٍ برقمٍ أو نسبة دقّة */}
          <div
            style={{
              background: "var(--snow)",
              border: "1px solid var(--border-sub)",
              borderRadius: "var(--r-card)",
              padding: 24,
              marginTop: 44,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "Tajawal, sans-serif",
                fontSize: 15,
                lineHeight: 1.9,
                color: "var(--carbon)",
                marginBottom: 16,
              }}
            >
              أصدق اختبارٍ صفحاتٌ من كتابك أنت.
            </p>
            <Link
              href="/try"
              className="btn-primary no-underline"
              style={{ fontSize: 14, padding: "11px 26px" }}
            >
              جرّب على كتابك
            </Link>
          </div>
        </article>

        {/* روابط داخليّة — تمنع يُتم الصفحات وتوزّع الوزن بينها */}
        {others.length > 0 && (
          <div className="mx-auto" style={{ maxWidth: 680, padding: "0 28px 80px" }}>
            <h2
              style={{
                fontFamily: "Tajawal, sans-serif",
                fontSize: 15,
                fontWeight: 500,
                color: "var(--carbon)",
                marginBottom: 14,
              }}
            >
              اقرأ أيضاً
            </h2>
            <div className="flex flex-col" style={{ gap: 12 }}>
              {others.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guides/${g.slug}`}
                  className="card no-underline"
                  style={{ display: "block", padding: 18, borderRadius: 16 }}
                >
                  <div
                    style={{
                      fontFamily: "Tajawal, sans-serif",
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--carbon)",
                      lineHeight: 1.7,
                    }}
                  >
                    {g.title}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
