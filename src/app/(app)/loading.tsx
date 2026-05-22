// هيكل تحميل فوري يقلّل الإحساس بالبطء أثناء التنقّل
export default function Loading() {
  return (
    <div style={{ animation: "fade-in 0.3s ease" }}>
      <div
        style={{
          height: 28,
          width: 220,
          background: "var(--border-sub)",
          borderRadius: 8,
          marginBottom: 28,
        }}
      />
      <div className="grid wq-grid-4" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card" style={{ borderRadius: 16, height: 96 }} />
        ))}
      </div>
      <div className="card" style={{ borderRadius: 16, height: 240 }} />
    </div>
  );
}
