// src/components/marketing/stats.tsx
const items = [
  { n: "٤م", l: "صفحة جرى تحويلها", plus: true },
  { n: "٩٨٪", l: "متوسط الدقة", plus: false },
  { n: "١٢٠٠", l: "باحث نشط", plus: true },
  { n: "٣ث", l: "لكل صفحة", plus: false },
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
                  marginBottom: 8,
                }}
              >
                {s.n}
                {s.plus && <span style={{ color: "var(--orange)" }}>+</span>}
              </div>
              <div style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
