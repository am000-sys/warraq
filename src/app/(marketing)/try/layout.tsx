// src/app/(marketing)/try/layout.tsx — بيانات وصفيّة لصفحة التجربة
// الصفحة نفسها "use client" فلا تُصدّر metadata، والتخطيط يحملها عنها.
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "جرّب مجاناً",
  description:
    "جرّب تفريغ صفحة من كتابك المصوَّر إلى نصّ عربيّ دقيق — بلا تسجيل ولا بطاقة.",
  alternates: { canonical: "/try" },
};

export default function TryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
