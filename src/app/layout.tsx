// src/app/layout.tsx — Root layout for وَرَّاق
import type { Metadata } from "next";
import { Tajawal, Inter } from "next/font/google";
import { DirectionProvider } from "@base-ui-components/react/direction-provider";
import "./globals.css";
import { SITE_NAME, SITE_URL, SITE_TAGLINE, SITE_DESCRIPTION } from "@/lib/site";

// خطوط مُحسَّنة (self-hosted) — أسرع من تحميل Google Fonts الخارجي
const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  // القالب يجعل كلّ صفحة تحمل عنوانها متبوعاً باسم المنصّة، والجذر يحمل العنوان
  // الكامل — فلا يتكرّر الاسم مرّتين في صفحةٍ واحدة.
  title: {
    default: `${SITE_NAME} — تحويل الكتب العربية إلى نصوص`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  // العنوان من مصدر واحد (src/lib/site.ts) لا مكتوباً هنا: الروابط القانونيّة
  // وصور المشاركة تُبنى عليه، وكتابته في موضعين تعني نطاقاً خاطئاً في أحدهما.
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    title: SITE_NAME,
    description: SITE_TAGLINE,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "ar_SA",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_TAGLINE,
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${tajawal.variable} ${inter.variable}`}>
      {/* DirectionProvider يُعلِم مكوّنات Base UI بالاتّجاه RTL (مواضع القوائم/الحوارات) */}
      <body>
        <DirectionProvider direction="rtl">{children}</DirectionProvider>
      </body>
    </html>
  );
}
