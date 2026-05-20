// src/components/marketing/stats.tsx
// إحصائيات صادقة عن قدرات المنصّة (لا أرقام استخدام مُختلَقة)
const items = [
  { n: "٣", l: "نماذج ذكاء (Haiku · Sonnet · Opus)" },
  { n: "٥", l: "صيغ تصدير (TXT · MD · DOCX · JSON · PDF)" },
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
        <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          {items.map((s, i) => (
            <div
              key={i}
              style={{
                padding: "44px 28px",
                textAlign: "center",
                borderLeft: i > 0 ? "1px solid var(--border-sub)" : "none",
              }}
            >
              <div
                style={{
                  fontFamily: "Tajawal, sans-serif",
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
              <div
                style={{
                  fontSize: 13,
                  color: "var(--stone)",
                  fontFamily: "Tajawal, sans-serif",
                  lineHeight: 1.5,
                }}
              >
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
