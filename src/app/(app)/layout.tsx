// src/app/(app)/layout.tsx — إطار لوحة المستخدم (محميّ)
import { redirect } from "next/navigation";
import { auth, getCurrentUser } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // الخطّة الحاليّة (إن وُجد اشتراك نشط)
  const sub = user.subscriptionId
    ? await db.subscription
        .findUnique({
          where: { id: user.subscriptionId },
          include: { plan: true },
        })
        .catch(() => null)
    : null;

  return (
    <div className="flex min-h-screen" style={{ background: "var(--fog)", direction: "rtl" }}>
      <AppSidebar
        user={{
          name: user.name,
          email: user.email,
          pagesBalance: user.pagesBalance,
          plan: sub?.plan?.nameAr || "الخطة المجانية",
          quota: sub?.plan?.pagesPerMonth ?? 50,
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
