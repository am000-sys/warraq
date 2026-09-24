// src/app/(marketing)/tools/pdf-check/page.tsx — أداة مجّانيّة: فاحص ملفّات PDF العربيّة
//
// تجيب سؤالاً يتكرّر في المنتديات بلا جوابٍ عمليّ: «لماذا يتحوّل النصّ العربيّ إلى
// رموز حين أنسخه من PDF؟». الإجابات المنشورة تخمينٌ عامّ («جرّب برنامجاً آخر»)،
// وهذه تفحص الملفّ نفسه وتقول السبب. وتقول بصراحة متى لا يحتاج الملفّ إلى وَرَّاق.
import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/json-ld";
import { PdfCheckerLoader } from "@/components/pdf-checker-loader";
import { SITE_URL, SITE_NAME } from "@/lib/site";

const TITLE = "فاحص ملفّات PDF العربيّة";
const DESCRIPTION =
  "أداة مجّانيّة تفحص ملفّ PDF في متصفّحك وتخبرك لماذا يخرج النصّ العربيّ رموزاً أو مقلوباً عند النسخ، وهل يحتاج إلى تفريغ — بلا رفعٍ ولا تسجيل.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/tools/pdf-check" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/tools/pdf-check` },
};

const F = "Tajawal, sans-serif";
const P: React.CSSProperties = { fontFamily: F, fontSize: 15.5, lineHeight: 2.1, color: "var(--stone)", marginBottom: 16 };
const H2: React.CSSProperties = {
  fontFamily: F,
  fontSize: 22,
  fontWeight: 500,
  color: "var(--carbon)",
  lineHeight: 1.7,
  marginTop: 44,
  marginBottom: 14,
};
const LI: React.CSSProperties = { marginBottom: 10 };

export default function PdfCheckPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--fog)" }}>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: TITLE,
            url: `${SITE_URL}/tools/pdf-check`,
            description: DESCRIPTION,
            applicationCategory: "UtilitiesApplication",
            operatingSystem: "Web",
            inLanguage: "ar",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: 0, priceCurrency: "SAR" },
            provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
              { "@type": "ListItem", position: 2, name: TITLE, item: `${SITE_URL}/tools/pdf-check` },
            ],
          },
        ]}
      />
      <Nav />
      <div style={{ paddingTop: 88 }}>
        <div className="mx-auto" style={{ maxWidth: 720, padding: "36px 28px 80px" }}>
          <span
            className="badge"
            style={{ fontFamily: F, fontSize: 12, marginBottom: 14, display: "inline-block" }}
          >
            أداة مجّانيّة
          </span>
          <h1
            style={{
              fontFamily: F,
              fontSize: "clamp(28px,4vw,42px)",
              fontWeight: 300,
              color: "var(--carbon)",
              letterSpacing: "-0.02em",
              lineHeight: 1.5,
              marginBottom: 12,
            }}
          >
            {TITLE}
          </h1>
          <p style={{ ...P, fontSize: 16, marginBottom: 28 }}>
            اعرف في ثوانٍ لماذا يخرج النصّ العربيّ رموزاً أو حروفاً مقطّعة حين تنسخه من ملفّ PDF — وهل
            يحتاج ملفّك إلى تفريغ أصلاً.
          </p>

          <PdfCheckerLoader />

          <h2 style={H2}>لماذا يتحوّل النصّ العربيّ إلى رموز عند النسخ؟</h2>
          <p style={P}>
            ملفّ PDF قد يبدو سليماً تماماً على الشاشة، ثمّ تنسخ منه فيخرج كلامٌ لا يُفهم. والسبب أنّ ما تراه
            شيء وما هو مخزَّن في الملفّ شيءٌ آخر. وللمشكلة أربعة أصول، وهي ما يفحصه هذا الفاحص:
          </p>
          <ol style={{ ...P, paddingInlineStart: 22, listStyleType: "arabic-indic" }}>
            <li style={LI}>
              <strong style={{ color: "var(--carbon)", fontWeight: 500 }}>لا نصّ أصلاً.</strong> الملفّ صورٌ
              لصفحاتٍ مصوَّرة، فلا شيء يُنسخ. ويُعرف بأنّ الفأرة تحدّد الصفحة كلّها كتلةً واحدة.
            </li>
            <li style={LI}>
              <strong style={{ color: "var(--carbon)", fontWeight: 500 }}>أشكال الحروف بدل الحروف.</strong>{" "}
              بعض البرامج تخزّن الحرف بشكله المتّصل في الكلمة لا بحرفه الأساسيّ. يظهر النصّ صحيحاً، لكنّ
              البحث لا يعثر عليه، وكثيرٌ من البرامج تلصقه مقطّعاً أو مقلوب الترتيب.
            </li>
            <li style={LI}>
              <strong style={{ color: "var(--carbon)", fontWeight: 500 }}>ترميزٌ قديم أو ناقص.</strong> ملفّاتٌ
              أُنشئت بترميز ويندوز العربيّ القديم فتُقرأ بالغربيّ، فتصير «الحمد» «ÇáÍãÏ». أو خطٌّ بلا جدول
              تحويلٍ إلى يونيكود، فيخرج رموزاً وعلامات ترقيم.
            </li>
            <li style={LI}>
              <strong style={{ color: "var(--carbon)", fontWeight: 500 }}>تفريغٌ آليّ سابقٌ خاطئ.</strong> ملفٌّ
              مصوَّر مرّ على برنامج قراءةٍ لم يعرف العربيّة، فأضاف طبقة نصٍّ بحروفٍ لاتينيّة لا صلة لها بالكتاب.
            </li>
          </ol>
          <p style={P}>
            وأكثر النصائح المنشورة تقول «جرّب برنامجاً آخر». وهي تنفع في حالةٍ واحدة فقط: أن يكون الملفّ سليماً
            والعلّة في البرنامج. أمّا الحالات الأربع فالعلّة في الملفّ نفسه، ولا يُصلحها تغيير البرنامج.
          </p>

          <h2 style={H2}>ماذا تفعل بالنتيجة</h2>
          <ul style={{ ...P, paddingInlineStart: 22, listStyleType: "disc" }}>
            <li style={LI}>
              <strong style={{ color: "var(--carbon)", fontWeight: 500 }}>نصّيّ سليم:</strong> انسخ مباشرةً. لا
              تحتاج إلى تفريغ، ولا إلى وَرَّاق.
            </li>
            <li style={LI}>
              <strong style={{ color: "var(--carbon)", fontWeight: 500 }}>مصوَّر، أو نصٌّ تالف، أو مختلط:</strong>{" "}
              النصّ القائم لا يُصلَح. الحلّ قراءة الصفحة من صورتها من جديد —{" "}
              <Link href="/guides/tafrigh-alkutub-almusawwara" style={{ color: "var(--orange)" }}>
                وهذه طرق ذلك ومواضع كلٍّ منها
              </Link>
              .
            </li>
          </ul>

          <h2 style={H2}>حدود هذا الفحص</h2>
          <p style={P}>
            يفحص حتى اثنتي عشرة صفحة موزّعة على الملفّ، لا الملفّ كلّه — فملفٌّ نادرُ الخلل قد يمرّ خلله. ويحكم
            بنوع الحروف المخزَّنة لا بصحّة الكلمات: نصٌّ عربيّ الحروف لكنّه مليءٌ بأخطاء تفريغٍ سابق يُعدّ عنده
            سليماً. فالنتيجة مؤشّرٌ قويّ لا شهادة، وأصدق اختبارٍ أن تنسخ فقرةً وتبحث فيها بنفسك.
          </p>
          <p style={{ ...P, fontSize: 14, color: "var(--pebble)" }}>
            الفحص كلّه يجري في متصفّحك. لا يُرفع الملفّ، ولا يُحفظ، ولا يطّلع عليه أحد.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}
