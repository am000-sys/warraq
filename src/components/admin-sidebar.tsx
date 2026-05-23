// src/components/admin-sidebar.tsx
// السايدبار الداكن للمالك (مع دعم الجوال)
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Logo } from "@/components/logo";
import { Activity, Users, Briefcase, DollarSign, Server, Menu, X, Wallet, LayoutDashboard, Crown } from "lucide-react";

const items = [
  { k: "/admin", l: "النظرة العامة", icon: Activity },
  { k: "/admin/topups", l: "طلبات الشحن", icon: Wallet },
  { k: "/admin/users", l: "المستخدمون", icon: Users },
  { k: "/admin/jobs", l: "الوظائف", icon: Briefcase },
  { k: "/admin/revenue", l: "الإيرادات", icon: DollarSign },
  { k: "/admin/system", l: "النظام", icon: Server },
];

export function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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
          background: "var(--midnight)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          zIndex: 30,
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
      >
        <Link href="/" className="no-underline">
          <Logo size={0.7} inverted />
        </Link>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="القائمة"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 8 }}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 19 }}
        />
      )}

      <div
        className={`fixed top-0 right-0 bottom-0 z-20 flex flex-col wq-sidebar${open ? " wq-sidebar-open" : ""}`}
        style={{
          width: 228,
          background: "var(--midnight)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div style={{ padding: "20px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Link href="/" className="no-underline">
            <Logo size={0.78} inverted />
          </Link>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5" style={{ padding: "12px 10px" }}>
          {items.map((item) => {
            const active = pathname === item.k;
            const Icon = item.icon;
            return (
              <Link
                key={item.k}
                href={item.k}
                className="flex items-center gap-2.5 transition-all no-underline"
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: active ? "rgba(246,146,81,0.1)" : "transparent",
                  color: active ? "var(--orange)" : "rgba(255,255,255,0.55)",
                  fontWeight: active ? 500 : 400,
                  fontSize: 14,
                  fontFamily: "Tajawal, sans-serif",
                  borderRight: active ? "2px solid var(--orange)" : "2px solid transparent",
                }}
              >
                <Icon size={16} strokeWidth={1.7} />
                {item.l}
              </Link>
            );
          })}

          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 transition-all no-underline"
            style={{
              marginTop: 8,
              padding: "10px 12px",
              borderRadius: 10,
              background: "transparent",
              color: "rgba(255,255,255,0.55)",
              fontWeight: 400,
              fontSize: 14,
              fontFamily: "Tajawal, sans-serif",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <LayoutDashboard size={16} strokeWidth={1.7} />
            العودة إلى لوحة المستخدم
          </Link>
        </nav>

        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            className="flex items-center gap-2.5"
            style={{
              background: "linear-gradient(135deg, rgba(246,146,81,0.12) 0%, rgba(246,146,81,0.04) 100%)",
              border: "1px solid rgba(246,146,81,0.22)",
              borderRadius: 14,
              padding: "10px 12px",
            }}
          >
            <div className="flex-shrink-0" style={{ position: "relative" }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--orange) 0%, #e07b3a 100%)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#fff",
                  fontFamily: "Tajawal, sans-serif",
                  boxShadow: "0 4px 14px rgba(246,146,81,0.5)",
                }}
              >
                {name[0]?.toUpperCase()}
              </div>
              {/* تاج صغير على الزاوية */}
              <div
                className="flex items-center justify-center"
                style={{
                  position: "absolute",
                  top: -7,
                  insetInlineEnd: -5,
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: "var(--midnight)",
                  border: "1px solid rgba(246,146,81,0.5)",
                }}
              >
                <Crown size={10} color="var(--orange)" strokeWidth={2.2} />
              </div>
            </div>
            <div className="min-w-0">
              <div
                className="truncate"
                style={{ fontSize: 13, fontWeight: 600, color: "#fff", fontFamily: "Tajawal, sans-serif" }}
              >
                {name}
              </div>
              <div
                className="flex items-center gap-1"
                style={{ fontSize: 11, color: "var(--orange)", fontFamily: "Tajawal, sans-serif", fontWeight: 500 }}
              >
                <Crown size={10} strokeWidth={2.2} />
                صاحب المنصّة
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
