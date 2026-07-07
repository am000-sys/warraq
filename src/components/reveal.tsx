// src/components/reveal.tsx
// كشف العناصر عند دخولها نافذة العرض — IntersectionObserver خالص
// (لا مستمِع scroll — محظور أداءً)، ويحترم prefers-reduced-motion عبر CSS.
"use client";

import { useEffect, useRef, type ReactNode, type CSSProperties } from "react";

type RevealProps = {
  children: ReactNode;
  /** تأخير الظهور بالثواني — للتدرّج بين العناصر المتجاورة */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "li" | "span";
};

export function Reveal({ children, delay = 0, className = "", style, as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // تحصين: بيئة بلا IntersectionObserver ⇒ إظهار فوري بلا حركة
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("wq-visible");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("wq-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as "div";
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={`wq-reveal ${className}`}
      style={{ ...style, ["--reveal-delay" as string]: `${delay}s` }}
    >
      {children}
    </Tag>
  );
}
