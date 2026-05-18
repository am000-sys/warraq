// src/app/(auth)/layout.tsx — إطار مصادقة بسيط متمحور
// مرجع: design-reference/warraq-v3.html (function AuthPage)

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: "100vh", background: "var(--fog)", padding: 24 }}
    >
      {children}
    </div>
  );
}
