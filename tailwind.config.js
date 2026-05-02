/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        orange: "rgb(var(--orange) / <alpha-value>)",
        midnight: "rgb(var(--midnight) / <alpha-value>)",
        slate: "rgb(var(--slate) / <alpha-value>)",
        graphite: "rgb(var(--graphite) / <alpha-value>)",
        carbon: "rgb(var(--carbon) / <alpha-value>)",
        stone: "rgb(var(--stone) / <alpha-value>)",
        pebble: "rgb(var(--pebble) / <alpha-value>)",
        ash: "rgb(var(--ash) / <alpha-value>)",
        // Surfaces
        fog: "rgb(var(--fog) / <alpha-value>)",
        snow: "rgb(var(--snow) / <alpha-value>)",
        "border-default": "rgb(var(--border) / <alpha-value>)",
        "border-sub": "rgb(var(--border-sub) / <alpha-value>)",
        // Status
        rose: "rgb(var(--rose) / <alpha-value>)",
        green: "rgb(var(--green) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Tajawal", "IBM Plex Sans Arabic", "system-ui", "sans-serif"],
        latin: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        btn: "28px",
        card: "24px",
        badge: "100px",
        nav: "32px",
        inner: "12px",
      },
      maxWidth: {
        warraq: "1160px",
      },
    },
  },
  plugins: [],
};
