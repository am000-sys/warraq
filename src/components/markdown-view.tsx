// src/components/markdown-view.tsx — عرض مخرَج OCR كـ Markdown (جداول + أشكال) بدل نصّ خام
"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const font = "Tajawal, sans-serif";

export function MarkdownView({ content }: { content: string }) {
  return (
    <div dir="rtl" style={{ fontFamily: font, color: "var(--midnight)", fontSize: 14, lineHeight: 2 }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // المحتوى من OCR موثوق؛ نسمح بـ data URI للأشكال المضمّنة
        urlTransform={(url) => url}
        components={{
          p: ({ children }) => (
            <p style={{ margin: "0 0 12px", lineHeight: 2 }}>{children}</p>
          ),
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
          ol: ({ children }) => (
            <ol style={{ paddingInlineStart: 22, margin: "0 0 12px" }}>{children}</ol>
          ),
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
              style={{ maxWidth: "100%", height: "auto", borderRadius: 8, margin: "10px 0", border: "1px solid var(--border-sub)" }}
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
          hr: () => <hr style={{ border: "none", borderTop: "1px solid var(--border-sub)", margin: "14px 0" }} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
