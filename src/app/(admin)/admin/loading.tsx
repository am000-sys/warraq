// هيكل تحميل لوحة المالك
export default function Loading() {
  return (
    <div style={{ animation: "fade-in 0.3s ease" }}>
      <div style={{ height: 28, width: 240, background: "var(--border-sub)", borderRadius: 8, marginBottom: 28 }} />
      <div className="grid wq-grid-4" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card" style={{ borderRadius: 16, height: 100 }} />
        ))}
      </div>
      <div className="grid wq-grid-2" style={{ gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div className="card" style={{ borderRadius: 16, height: 200 }} />
        <div className="card" style={{ borderRadius: 16, height: 200 }} />
      </div>
    </div>
  );
}
