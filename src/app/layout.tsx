// src/app/layout.tsx — Root layout for وَرَّاق
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "وَرَّاق — تحويل الكتب العربية إلى نصوص",
  description:
    "منصّة احترافية لتحويل الكتب العربية المصوّرة إلى نصوص رقمية دقيقة باستخدام Claude Vision.",
  metadataBase: new URL("https://warraq.sa"),
  openGraph: {
    title: "وَرَّاق",
    description: "التراث العربي، نصاً قابلاً للبحث.",
    type: "website",
    locale: "ar_SA",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
