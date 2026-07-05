// src/app/(app)/layout.tsx — إطار لوحة المستخدم (محميّ)
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // الخطّة الحاليّة تأتي ضمن استعلام getCurrentUser نفسه (join) — بلا جولة إضافيّة
  const sub = user.subscription;

  return (
    <div className="flex min-h-screen" style={{ background: "var(--fog)", direction: "rtl" }}>
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
          pagesBalance: user.pagesBalance,
          plan: sub?.plan?.nameAr || "الخطة المجانية",
          quota: sub?.plan?.pagesPerMonth ?? 50,
          isAdmin: user.systemRole === "SYSTEM_ADMIN",
        }}
      />
      <div
        className="flex-1 overflow-y-auto wq-app-main"
        style={{ marginRight: 228, padding: 36 }}
      >
        {children}
      </div>
    </div>
  );
}
