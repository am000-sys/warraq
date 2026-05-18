// src/components/admin-sidebar.tsx
// السايدبار الداكن للمالك
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { Activity, Users, Briefcase, DollarSign, Server } from "lucide-react";

const items = [
  { k: "/admin", l: "النظرة العامة", icon: Activity },
  { k: "/admin/users", l: "المستخدمون", icon: Users },
  { k: "/admin/jobs", l: "الوظائف", icon: Briefcase },
  { k: "/admin/revenue", l: "الإيرادات", icon: DollarSign },
  { k: "/admin/system", l: "النظام", icon: Server },
];

export function AdminSidebar({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <div
      className="fixed top-0 right-0 bottom-0 z-10 flex flex-col"
      style={{
        width: 228,
        background: "var(--midnight)",
        borderLeft: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          padding: "20px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Link href="/admin" className="no-underline">
          <Logo size={0.78} inverted />
        </Link>
      </div>

      <nav
        className="flex-1 flex flex-col gap-0.5"
        style={{ padding: "12px 10px" }}
      >
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
                borderRight: active
                  ? "2px solid var(--orange)"
                  : "2px solid transparent",
              }}
            >
              <Icon size={16} strokeWidth={1.7} />
              {item.l}
            </Link>
          );
        })}
      </nav>

      <div
        style={{
          padding: "14px 20px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(246,146,81,0.15)",
              border: "1px solid rgba(246,146,81,0.3)",
              fontSize: 13,
              color: "var(--orange)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            {name[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div
              className="truncate"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#fff",
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              {name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.4)",
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              مالك النظام
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
