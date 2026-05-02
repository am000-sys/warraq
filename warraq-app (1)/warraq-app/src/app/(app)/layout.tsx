// src/app/(app)/layout.tsx
// ─────────────────────────
// Layout للصفحات المحميّة (يجب تسجيل الدخول)
// ─────────────────────────

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, getCurrentUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l p-4 hidden md:block">
        <Link href="/dashboard" className="block text-xl font-bold text-[#0A2E54] mb-8">
          وَرَّاق
        </Link>
        <nav className="space-y-1 text-sm">
          <NavLink href="/dashboard">الرئيسية</NavLink>
          <NavLink href="/upload">رفع جديد</NavLink>
          <NavLink href="/jobs">الوظائف</NavLink>
          <NavLink href="/billing">الفوترة</NavLink>
          <NavLink href="/api-keys">مفاتيح API</NavLink>
          <NavLink href="/organization">المؤسسة</NavLink>
          <NavLink href="/settings">الإعدادات</NavLink>
          {(user as any).systemRole === "SYSTEM_ADMIN" && (
            <>
              <div className="border-t my-3" />
              <p className="text-xs text-gray-500 px-3 mb-1">المالك</p>
              <NavLink href="/admin">لوحة المالك</NavLink>
            </>
          )}
        </nav>

        <div className="absolute bottom-4 right-4 left-4 w-56 bg-gray-50 rounded-lg p-3 text-xs">
          <p className="font-medium">{user.name}</p>
          <p className="text-gray-500 truncate">{user.email}</p>
          <p className="mt-2 text-[#0A2E54]">
            رصيد: {user.pagesBalance.toLocaleString("ar-SA")} صفحة
          </p>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-lg hover:bg-gray-100 transition"
    >
      {children}
    </Link>
  );
}
