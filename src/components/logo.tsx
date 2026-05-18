// src/components/logo.tsx
// شعار وَرَّاق: كتاب مفتوح + إطار مسح + اسم الموقع
// مرجع: design-reference/warraq-v3.html (function Logo)

type Props = {
  size?: number;
  inverted?: boolean;
};

export function Logo({ size = 1, inverted = false }: Props) {
  const orange = "#f69251";
  const fg = inverted ? "#fff" : "#000";
  const lineFg = inverted ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.20)";
  const iconSize = 40 * size;

  return (
    <div
      className="inline-flex items-center"
      style={{ gap: 10 * size, textDecoration: "none" }}
    >
      {/* Icon: open book inside scanning bracket */}
      <svg width={iconSize} height={iconSize} viewBox="0 0 40 40" fill="none">
        {/* Corner frame — scanning bracket */}
        <path d="M3 11 L3 3 L11 3" stroke={orange} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M29 3 L37 3 L37 11" stroke={orange} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M37 29 L37 37 L29 37" stroke={orange} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M11 37 L3 37 L3 29" stroke={orange} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Open book */}
        <path
          d="M20 30 C17 28.5 11 28 7 29 L7 12 C11 11 17 11.5 20 13 C23 11.5 29 11 33 12 L33 29 C29 28 23 28.5 20 30Z"
          fill="none"
          stroke={fg}
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.85"
        />
        <line x1="20" y1="13" x2="20" y2="30" stroke={fg} strokeWidth="1.3" opacity="0.7" />
        {/* Left page lines */}
        <line x1="9" y1="17" x2="18" y2="16.5" stroke={lineFg} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="9" y1="20.5" x2="18" y2="20" stroke={lineFg} strokeWidth="1.2" strokeLinecap="round" />
        <line x1="9" y1="24" x2="16" y2="23.6" stroke={lineFg} strokeWidth="1.2" strokeLinecap="round" />
        {/* Right page lines — orange (the extracted text side) */}
        <line x1="22" y1="16.5" x2="31" y2="17" stroke={orange} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="22" y1="20" x2="31" y2="20.5" stroke={orange} strokeWidth="1.2" strokeLinecap="round" opacity="0.6" />
        <line x1="22" y1="23.6" x2="29" y2="24" stroke={orange} strokeWidth="1.1" strokeLinecap="round" opacity="0.4" />
      </svg>

      {/* Wordmark */}
      <div className="flex flex-col leading-none">
        <span
          style={{
            fontFamily: "Tajawal, sans-serif",
            fontSize: 22 * size,
            fontWeight: 500,
            color: fg,
            letterSpacing: "-0.02em",
          }}
        >
          وَرَّاق
        </span>
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: 9 * size,
            fontWeight: 400,
            color: inverted ? "rgba(255,255,255,0.4)" : "#949494",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginTop: 1,
          }}
        >
          Warraq
        </span>
      </div>
    </div>
  );
}
