// src/components/app-sidebar.tsx — السايدبار للمستخدم
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import {
  LayoutDashboard,
  Upload,
  ListChecks,
  KeyRound,
  Receipt,
  Settings,
  Building2,
} from "lucide-react";

const items = [
  { k: "/dashboard", l: "لوحة التحكم", icon: LayoutDashboard },
  { k: "/upload", l: "رفع ملف", icon: Upload },
  { k: "/jobs", l: "الوظائف", icon: ListChecks },
  { k: "/api-keys", l: "مفاتيح API", icon: KeyRound },
  { k: "/billing", l: "الفوترة", icon: Receipt },
  { k: "/organization", l: "المؤسسة", icon: Building2 },
  { k: "/settings", l: "الإعدادات", icon: Settings },
];

type Props = {
  user: {
    name: string | null;
    email: string;
    pagesBalance: number;
    plan: string;
    quota: number;
  };
};

export function AppSidebar({ user }: Props) {
  const pathname = usePathname();
  const initial = (user.name || user.email)[0]?.toUpperCase() || "أ";
  const pct = Math.min(100, Math.round((user.pagesBalance / Math.max(1, user.quota)) * 100));

  return (
    <div
      className="fixed top-0 right-0 bottom-0 z-10 flex flex-col"
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
        <div
          style={{
            height: 4,
            background: "rgba(246,146,81,0.15)",
            borderRadius: 2,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "var(--orange)",
              borderRadius: 2,
            }}
          />
        </div>
        <Link
          href="/billing"
          className="btn-primary w-full justify-center no-underline"
          style={{ fontSize: 12, padding: "8px 0" }}
        >
          ترقية الخطة
        </Link>
      </div>

      <div style={{ padding: "14px 20px", borderTop: "1px solid var(--border-sub)" }}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center flex-shrink-0"
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
          <div className="min-w-0">
            <div
              className="truncate"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--carbon)",
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              {user.name || user.email.split("@")[0]}
            </div>
            <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
              {user.plan}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
