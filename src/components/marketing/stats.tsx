// src/components/marketing/stats.tsx
// إحصائيات صادقة عن قدرات المنصّة (لا أرقام استخدام مُختلَقة)
import { Reveal } from "@/components/reveal";

const items = [
  { n: "٣", l: "نماذج ذكاء (سريع، جيد، فائق)" },
  { n: "٥", l: "صيغ تصدير (TXT, MD, DOCX, JSON, PDF)" },
  { n: "∞", l: "صفحات في الخطط المدفوعة" },
  { n: "٢٤/٧", l: "معالجة تلقائية في الخلفية" },
];

export function Stats() {
  return (
    <div
      style={{
        background: "var(--snow)",
        borderTop: "1px solid var(--border-sub)",
        borderBottom: "1px solid var(--border-sub)",
      }}
    >
      <div className="container-warraq">
        <div className="grid wq-grid-4" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          {items.map((s, i) => (
            <Reveal
              key={s.l}
              delay={i * 0.07}
              style={{
                padding: "44px 28px",
                textAlign: "center",
                borderLeft: i > 0 ? "1px solid var(--border-sub)" : "none",
              }}
            >
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 300,
                  color: "var(--carbon)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  marginBottom: 10,
                }}
              >
                {s.n}
              </div>
              <div style={{ fontSize: 13, color: "var(--stone)", lineHeight: 1.5 }}>{s.l}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
