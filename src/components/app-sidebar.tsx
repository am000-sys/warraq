// src/components/app-sidebar.tsx — السايدبار للمستخدم (مع دعم الجوال)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Logo } from "@/components/logo";
import {
  LayoutDashboard,
  Upload,
  ListChecks,
  BookOpenCheck,
  Wallet,
  Settings,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  ChevronsUpDown,
} from "lucide-react";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const items = [
  { k: "/dashboard", l: "لوحة التحكم", icon: LayoutDashboard },
  { k: "/upload", l: "رفع ملف", icon: Upload },
  { k: "/jobs", l: "الوظائف", icon: ListChecks },
  { k: "/study", l: "الملخّص الدراسي", icon: BookOpenCheck },
  { k: "/billing", l: "شحن الرصيد", icon: Wallet },
  { k: "/settings", l: "الإعدادات", icon: Settings },
];

type Props = {
  user: {
    name: string | null;
    email: string;
    pagesBalance: number;
    plan: string;
    quota: number;
    isAdmin: boolean;
  };
};

export function AppSidebar({ user }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const initial = (user.name || user.email)[0]?.toUpperCase() || "أ";
  const pct = Math.min(100, Math.round((user.pagesBalance / Math.max(1, user.quota)) * 100));

  // أغلق القائمة عند تغيير الصفحة
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // إغلاق درج الجوال بمفتاح Escape (وصوليّة)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* شريط علوي للجوال */}
      <div
        className="wq-mobile-topbar"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          left: 0,
          height: 56,
          background: "var(--snow)",
          borderBottom: "1px solid var(--border-sub)",
          zIndex: 30,
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
      >
        <Link href="/" className="no-underline">
          <Logo size={0.7} />
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="القائمة"
          aria-expanded={open}
          aria-controls="app-sidebar"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--carbon)", padding: 8 }}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* خلفية معتمة عند فتح القائمة على الجوال */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 19,
          }}
        />
      )}

      <div
        id="app-sidebar"
        className={`fixed top-0 right-0 bottom-0 z-20 flex flex-col wq-sidebar${open ? " wq-sidebar-open" : ""}`}
        style={{
          width: 228,
          background: "var(--snow)",
          borderLeft: "1px solid var(--border-sub)",
          boxShadow: "0 0 20px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ padding: "20px 20px", borderBottom: "1px solid var(--border-sub)" }}>
          <Link href="/" className="no-underline">
            <Logo size={0.78} />
          </Link>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5" style={{ padding: "12px 10px" }}>
          {items.map((item) => {
            const active = pathname === item.k || pathname.startsWith(item.k + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.k}
                href={item.k}
                className="flex items-center gap-2.5 transition-all no-underline"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: active ? "var(--orange-soft)" : "transparent",
                  color: active ? "var(--orange)" : "var(--stone)",
                  fontWeight: active ? 500 : 400,
                  fontSize: 14,
                  fontFamily: "Tajawal, sans-serif",
                  textAlign: "right",
                  borderRight: active ? "2px solid var(--orange)" : "2px solid transparent",
                }}
              >
                <Icon size={16} strokeWidth={1.7} />
                {item.l}
              </Link>
            );
          })}

          {user.isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2.5 transition-all no-underline"
              style={{
                marginTop: 8,
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--orange-soft)",
                color: "var(--orange)",
                fontWeight: 500,
                fontSize: 14,
                fontFamily: "Tajawal, sans-serif",
                textAlign: "right",
                border: "1px solid rgba(246,146,81,0.25)",
              }}
            >
              <ShieldCheck size={16} strokeWidth={1.7} />
              لوحة المالك
            </Link>
          )}
        </nav>

        {/* Upgrade nudge */}
        <div
          style={{
            margin: "0 10px 12px",
            background: "var(--orange-soft)",
            border: "1px solid rgba(246,146,81,0.2)",
            borderRadius: 14,
            padding: "14px 14px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--graphite)",
              fontFamily: "Tajawal, sans-serif",
              marginBottom: 6,
            }}
          >
            {user.pagesBalance.toLocaleString("ar-SA")} صفحة متبقية
          </div>
          <div style={{ height: 4, background: "rgba(246,146,81,0.15)", borderRadius: 2, marginBottom: 10 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--orange)", borderRadius: 2 }} />
          </div>
          <Link
            href="/billing"
            className="btn-primary w-full justify-center no-underline"
            style={{ fontSize: 12, padding: "8px 0" }}
          >
            ترقية الخطة
          </Link>
        </div>

        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border-sub)" }}>
          {/* قائمة الحساب — Base UI DropdownMenu (تنقّل لوحة مفاتيح + إغلاق بـ Esc) */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-[10px] p-1.5 text-start outline-none transition-colors hover:bg-fog focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-fog">
              <div
                className="flex flex-shrink-0 items-center justify-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "var(--orange-soft)",
                  border: "1px solid rgba(246,146,81,0.25)",
                  fontSize: 13,
                  color: "var(--orange)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className="truncate"
                  style={{ fontSize: 13, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}
                >
                  {user.name || user.email.split("@")[0]}
                </div>
                <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
                  {user.plan}
                </div>
              </div>
              <ChevronsUpDown size={14} className="flex-shrink-0 text-pebble" />
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="min-w-[196px]">
              <DropdownMenuItem render={<Link href="/settings" />}>
                <Settings size={16} strokeWidth={1.7} />
                الإعدادات
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-rose [&_svg]:text-rose"
              >
                <LogOut size={16} strokeWidth={1.7} />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </>
  );
}
