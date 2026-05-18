/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // ── Warraq Dialog Palette ──
        fog: "#f7f7f7",
        snow: "#ffffff",
        carbon: "#000000",
        midnight: "#181825",
        slate: "#242433",
        graphite: "#484758",
        stone: "#636363",
        pebble: "#949494",
        ash: "#8b8b8b",
        orange: {
          DEFAULT: "#f69251",
          soft: "rgba(246,146,81,0.10)",
          mid: "rgba(246,146,81,0.18)",
        },
        rose: "#c97b84",
        border: "#e8e8e8",
        "border-sub": "#f0f0f0",
        success: "#6dbd7a",
      },
      fontFamily: {
        sans: ["Tajawal", "ui-sans-serif", "system-ui", "sans-serif"],
        latin: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        btn: "28px",
        card: "24px",
        badge: "100px",
        nav: "32px",
        inner: "12px",
      },
      boxShadow: {
        card: "rgba(24,24,37,0.10) 0px 2px 8px -2px",
        btn: "rgba(0,0,0,0.06) 0px 2px 8px, rgba(0,0,0,0.04) 0px 1px 2px",
        nav: "rgba(24,24,37,0.08) 0px 4px 20px -4px",
        "nav-light": "rgba(24,24,37,0.06) 0px 1px 4px",
        "btn-orange": "rgba(246,146,81,0.30) 0px 6px 20px",
        "card-hover": "0 8px 28px rgba(246,146,81,0.10)",
      },
      maxWidth: {
        warraq: "1160px",
      },
      animation: {
        "fade-in": "fade-in 0.6s ease-out both",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        "scan-line": "scan-line 3s linear infinite",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.8)" },
        },
        "scan-line": {
          "0%": { top: "12px" },
          "85%": { top: "calc(100% - 12px)" },
          "100%": { top: "12px" },
        },
      },
    },
  },
  plugins: [],
};
