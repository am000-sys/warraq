// src/app/(marketing)/try/layout.tsx — بيانات وصفيّة لصفحة التجربة
// الصفحة نفسها "use client" فلا تُصدّر metadata، والتخطيط يحملها عنها.
import type { Metadata } from "next";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "جرّب مجاناً",
  description:
    "جرّب تفريغ صفحة من كتابك المصوَّر إلى نصّ عربيّ دقيق — بلا تسجيل ولا بطاقة.",
  alternates: { canonical: "/try" },
};

// التذييل هنا لا في الصفحة: الصفحة مكوّن عميل، وما تستورده يصير عميلاً معه، والتذييل
// يقرأ بريد التواصل من بيئة الخادم — فيُصيَّر هنا على الخادم ولا يختلف عند الإماهة.
export default function TryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
