// src/app/(admin)/admin/layout.tsx — إطار لوحة المالك (داكن)
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin-sidebar";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.systemRole !== "SYSTEM_ADMIN") redirect("/dashboard");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

  return (
    <div className="flex min-h-screen" style={{ background: "var(--fog)", direction: "rtl" }}>
      <AdminSidebar name={user?.name || user?.email.split("@")[0] || "مالك"} />
      <div
        className="flex-1 overflow-y-auto"
        style={{ marginRight: 228, padding: 36 }}
      >
        {children}
      </div>
    </div>
  );
}
