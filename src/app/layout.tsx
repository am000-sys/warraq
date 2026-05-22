// src/app/layout.tsx — Root layout for وَرَّاق
import type { Metadata } from "next";
import { Tajawal, Inter } from "next/font/google";
import "./globals.css";

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
  title: "وَرَّاق — تحويل الكتب العربية إلى نصوص",
  description:
    "منصّة احترافية لتحويل الكتب العربية المصوّرة إلى نصوص رقمية دقيقة بالذكاء الاصطناعي.",
  metadataBase: new URL("https://warraq.sa"),
  openGraph: {
    title: "وَرَّاق",
    description: "التراث العربي، نصاً قابلاً للبحث.",
    type: "website",
    locale: "ar_SA",
  },
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
      <body>{children}</body>
    </html>
  );
}
