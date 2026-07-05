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
  // دلالة الألوان من النظام التصميمي: أخضر = مكتمل، برتقالي = نشِط الآن،
  // وردي = فشل، رمادي = محايد
  const styles: Record<string, React.CSSProperties> = {
    success: {
      background: "rgba(109,189,122,0.12)",
      color: "var(--success)",
      border: "1px solid rgba(109,189,122,0.25)",
    },
    processing: {
      background: "var(--orange-soft)",
      color: "var(--orange)",
      border: "1px solid rgba(246,146,81,0.2)",
    },
    danger: {
      background: "rgba(201,123,132,0.10)",
      color: "var(--rose)",
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
      className="inline-flex items-center"
      style={{
        fontSize: 11,
        padding: "3px 10px",
        borderRadius: "var(--r-badge)",
        fontFamily: "Tajawal, sans-serif",
        fontWeight: 500,
        gap: 5,
        whiteSpace: "nowrap",
        ...styles[variant],
      }}
    >
      {variant === "processing" && (
        <span
          className="animate-pulse-dot"
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: "currentColor",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
      )}
      {status}
    </span>
  );
}
