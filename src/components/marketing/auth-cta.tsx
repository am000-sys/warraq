// src/components/marketing/auth-cta.tsx — زرّ الدعوة الرئيس في صفحات التسويق
//
// يتكيّف مع حالة الدخول: الزائر يُدعى للتسجيل، والداخل يُعاد إلى خدمات الموقع
// بدل أن يُساق إلى صفحة تسجيل لا تعنيه — وهي كانت الحال قبل هذا المكوّن.
// أثناء التحقّق نعرض دعوة الزائر (وهي الحال الأغلب وما يراه محرّك البحث في
// الـ HTML الساكن)، ثمّ تتبدّل عند معرفة الحال.
"use client";

import Link from "next/link";
import { useAuthState } from "@/lib/use-auth-state";

export function AuthCta({
  guestLabel = "ابدأ مجاناً",
  memberLabel = "ارفع كتابك",
  memberHref = "/upload",
  className = "btn-primary no-underline",
  style,
}: {
  guestLabel?: string;
  memberLabel?: string;
  memberHref?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const state = useAuthState();
  const isMember = state === "in";

  return (
    <Link
      href={isMember ? memberHref : "/signup"}
      className={className}
      style={style}
      // الحفاظ على العرض أثناء التبدّل فلا يقفز التخطيط
      suppressHydrationWarning
    >
      {isMember ? memberLabel : guestLabel}
    </Link>
  );
}

// رابط ثانويّ يظهر للداخلين فقط — طريق إضافيّ إلى اللوحة من متن الصفحة
export function MemberOnlyLink({
  href,
  children,
  className,
  style,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const state = useAuthState();
  if (state !== "in") return null;
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}
