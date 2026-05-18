// src/components/page-header.tsx
// ترويسة موحّدة لصفحات اللوحة

type Props = {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
};

export function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex justify-between items-start mb-8">
      <div>
        <h1
          className="mb-1.5"
          style={{
            fontFamily: "Tajawal, sans-serif",
            fontSize: 28,
            fontWeight: 400,
            color: "var(--carbon)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="font-light"
            style={{
              fontSize: 14,
              color: "var(--stone)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatusPill({
  status,
  variant = "neutral",
}: {
  status: string;
  variant?: "success" | "processing" | "neutral" | "danger";
}) {
  const styles: Record<string, React.CSSProperties> = {
    success: {
      background: "var(--orange-soft)",
      color: "var(--orange)",
      border: "1px solid rgba(246,146,81,0.2)",
    },
    processing: {
      background: "rgba(66,133,244,0.08)",
      color: "#4285f4",
      border: "1px solid rgba(66,133,244,0.15)",
    },
    danger: {
      background: "rgba(201,123,132,0.10)",
      color: "#c97b84",
      border: "1px solid rgba(201,123,132,0.20)",
    },
    neutral: {
      background: "rgba(72,71,88,0.08)",
      color: "var(--graphite)",
      border: "1px solid rgba(72,71,88,0.1)",
    },
  };
  return (
    <span
      style={{
        fontSize: 11,
        padding: "3px 10px",
        borderRadius: "var(--r-badge)",
        fontFamily: "Tajawal, sans-serif",
        fontWeight: 500,
        ...styles[variant],
      }}
    >
      {status}
    </span>
  );
}
