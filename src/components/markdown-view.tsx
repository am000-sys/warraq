// src/components/markdown-view.tsx — عرض مخرَج Markdown (جداول + أشكال) بدل نصّ خام
// variant="default": عرض التفريغ النصّي (OCR) كما هو.
// variant="study": عرضٌ احترافيّ للملخّص الدراسي/التقارير — صناديق خلاصة، جداول
//   مقارنة منسّقة، وتمييز الآيات ﴿...﴾ والنقول الحرفيّة «...» (التنسيق في globals.css).
"use client";

import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const font = "Tajawal, sans-serif";

// ── تمييز الآيات ﴿...﴾ والنقول الحرفيّة «...» داخل النصّ ──
// نلفّ المطابقات بعناصر مُنسَّقة (الآية: تظليل خفيف، النقل: تسطير دقيق) — دلالةً
// بصريّة تخدم المحقّق والباحث. تنفيذ نصّيّ خالص لا يمسّ العناصر (الغامق/الجداول).
const INLINE_RE = /(﴿[^﴾]*﴾)|(«[^»]{0,600}»)/g;

function decorate(text: string, key: string): React.ReactNode {
  if (!text || (!text.includes("﴿") && !text.includes("«"))) return text;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1]) {
      parts.push(
        <span key={`${key}-${i++}`} className="wq-verse">
          {m[1]}
        </span>,
      );
    } else {
      parts.push(
        <span key={`${key}-${i++}`} className="wq-quote">
          {m[2]}
        </span>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

function enrich(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child, i) =>
    typeof child === "string" ? decorate(child, `e${i}`) : child,
  );
}

// نصّ عقدة hast (لاكتشاف وسم صندوق الخلاصة من بداية الاقتباس)
function hastText(node: unknown): string {
  const n = node as { value?: string; children?: unknown[] };
  if (!n) return "";
  if (typeof n.value === "string") return n.value;
  if (Array.isArray(n.children)) return n.children.map(hastText).join("");
  return "";
}

// ── مكوّنات العرض الافتراضي (التفريغ النصّي) — تبقى كما هي لئلّا تتغيّر صفحة المستند ──
const defaultComponents: Components = {
  p: ({ children }) => <p style={{ margin: "0 0 12px", lineHeight: 2 }}>{children}</p>,
  h1: ({ children }) => (
    <h1 style={{ fontSize: 20, fontWeight: 700, margin: "16px 0 10px" }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 style={{ fontSize: 18, fontWeight: 700, margin: "14px 0 8px" }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 style={{ fontSize: 16, fontWeight: 500, margin: "12px 0 6px" }}>{children}</h3>
  ),
  ul: ({ children }) => (
    <ul style={{ paddingInlineStart: 22, margin: "0 0 12px", listStyle: "disc" }}>{children}</ul>
  ),
  ol: ({ children }) => <ol style={{ paddingInlineStart: 22, margin: "0 0 12px" }}>{children}</ol>,
  li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
  table: ({ children }) => (
    <div style={{ overflowX: "auto", margin: "0 0 14px" }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          fontSize: 13,
          border: "1px solid var(--border)",
        }}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead style={{ background: "var(--fog)" }}>{children}</thead>,
  th: ({ children }) => (
    <th
      style={{
        border: "1px solid var(--border)",
        padding: "7px 10px",
        textAlign: "right",
        fontWeight: 500,
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td style={{ border: "1px solid var(--border)", padding: "7px 10px", textAlign: "right" }}>
      {children}
    </td>
  ),
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={typeof src === "string" ? src : ""}
      alt={alt ?? "شكل"}
      style={{
        maxWidth: "100%",
        height: "auto",
        borderRadius: 8,
        margin: "10px 0",
        border: "1px solid var(--border-sub)",
      }}
    />
  ),
  blockquote: ({ children }) => (
    <blockquote
      style={{
        borderInlineStart: "3px solid var(--orange)",
        paddingInlineStart: 12,
        margin: "0 0 12px",
        color: "var(--stone)",
      }}
    >
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code style={{ fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13, direction: "ltr" }}>
      {children}
    </code>
  ),
  hr: () => (
    <hr style={{ border: "none", borderTop: "1px solid var(--border-sub)", margin: "14px 0" }} />
  ),
};

// ── مكوّنات العرض الاحترافي (الملخّص/التقارير) — يعتمد التنسيق على .wq-md-study ──
const studyComponents: Components = {
  p: ({ children }) => <p>{enrich(children)}</p>,
  li: ({ children }) => <li>{enrich(children)}</li>,
  th: ({ children }) => <th>{enrich(children)}</th>,
  td: ({ children }) => <td>{enrich(children)}</td>,
  table: ({ children }) => (
    <div className="wq-md-tablewrap">
      <table>{children}</table>
    </div>
  ),
  img: ({ src, alt }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="wq-md-img" src={typeof src === "string" ? src : ""} alt={alt ?? "شكل"} />
  ),
  // صندوق الخلاصة / مربط الفهم يُكتشف من بداية الاقتباس؛ غيره اقتباس عاديّ
  blockquote: ({ node, children }) => {
    const text = hastText(node).trim();
    const isCallout = /^(?:\*{0,2})?(?:مربط الفهم|خلاصة|تنبيه|فائدة)/.test(text);
    return (
      <blockquote className={isCallout ? "wq-callout" : "wq-quote-block"}>{children}</blockquote>
    );
  },
};

export function MarkdownView({
  content,
  variant = "default",
}: {
  content: string;
  variant?: "default" | "study";
}) {
  const isStudy = variant === "study";
  return (
    <div
      dir="rtl"
      className={isStudy ? "wq-md-study" : undefined}
      style={{ fontFamily: font, color: "var(--midnight)", fontSize: 14, lineHeight: 2 }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // المحتوى من OCR/النموذج موثوق؛ نسمح بـ data URI للأشكال المضمّنة
        urlTransform={(url) => url}
        components={isStudy ? studyComponents : defaultComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
