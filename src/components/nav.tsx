// src/components/nav.tsx
// شريط التنقّل العلوي العائم — يتعرّف على حالة الدخول
// كشف التمرير عبر IntersectionObserver على عنصر حارس (لا مستمِع scroll — أداء)
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { useAuthState } from "@/lib/use-auth-state";

const links = [
  { l: "المميزات", href: "/#features" },
  { l: "كيف يعمل", href: "/#how" },
  { l: "الأسعار", href: "/pricing" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const authed = useAuthState() === "in";
  const sentinelRef = useRef<HTMLDivElement>(null);

  // الحارس عنصر بارتفاع 48px أعلى المستند؛ خروجه من العرض = تمرير كافٍ
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div
        ref={sentinelRef}
        aria-hidden
        className="absolute top-0 right-0 w-px pointer-events-none"
        style={{ height: 48 }}
      />
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100]"
        style={{ width: "calc(100% - 48px)", maxWidth: 1120 }}
      >
        <nav
          className="flex items-center justify-between gap-6 px-6 transition-all duration-300 backdrop-blur-md border border-border-sub"
          style={{
            background: scrolled ? "rgba(255,255,255,0.97)" : "var(--snow)",
            borderRadius: scrolled ? "var(--r-nav)" : "16px",
            boxShadow: scrolled ? "var(--shadow-nav)" : "rgba(24,24,37,0.06) 0px 1px 4px",
            height: 60,
          }}
        >
          <Link href="/" className="no-underline">
            <Logo size={0.82} />
          </Link>

          <ul className="flex items-center gap-8 list-none wq-hide-mobile">
            {links.map((item) => (
              <li key={item.l}>
                <Link
                  href={item.href}
                  className="text-sm font-normal text-stone hover:text-carbon transition-colors no-underline"
                  style={{ fontFamily: "Tajawal, sans-serif" }}
                >
                  {item.l}
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2.5">
            {authed ? (
              <Link href="/dashboard" className="btn-primary text-sm no-underline" style={{ padding: "10px 22px" }}>
                لوحة التحكم
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-carbon px-4 py-2 rounded-btn hover:bg-fog transition-colors no-underline wq-hide-mobile"
                  style={{ fontFamily: "Tajawal, sans-serif" }}
                >
                  تسجيل الدخول
                </Link>
                <Link href="/signup" className="btn-primary text-sm no-underline" style={{ padding: "10px 22px" }}>
                  ابدأ مجاناً
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
