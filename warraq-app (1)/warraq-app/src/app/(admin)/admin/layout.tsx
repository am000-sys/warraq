// src/app/(admin)/admin/layout.tsx
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).systemRole !== "SYSTEM_ADMIN") redirect("/dashboard");

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-64 bg-[#0A2E54] text-white p-4">
        <Link href="/admin" className="block text-xl font-bold mb-6">
          وَرَّاق · المالك
        </Link>
        <nav className="space-y-1 text-sm">
          <NavLink href="/admin">الإحصائيات</NavLink>
          <NavLink href="/admin/users">المستخدمون</NavLink>
          <NavLink href="/admin/jobs">الوظائف</NavLink>
          <NavLink href="/admin/revenue">الإيرادات</NavLink>
          <NavLink href="/admin/system">النظام</NavLink>
          <div className="border-t border-white/10 my-3" />
          <Link href="/dashboard" className="block px-3 py-2 text-white/70 hover:text-white">
            ← العودة للوحة المستخدم
          </Link>
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-lg hover:bg-white/10 transition"
    >
      {children}
    </Link>
  );
}
