// src/components/page-jump.tsx — بحث بالرقم المطبوع + قفز للصفحة
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function PageJump({ baseUrl }: { baseUrl: string }) {
  const [val, setVal] = useState("");
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = val.trim();
    if (!v) return;
    router.push(`${baseUrl}?q=${encodeURIComponent(v)}`);
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="انتقل لصفحة..."
        dir="rtl"
        style={{
          fontFamily: "Tajawal, sans-serif",
          fontSize: 13,
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "7px 12px",
          background: "var(--snow)",
          color: "var(--carbon)",
          outline: "none",
          width: 130,
        }}
      />
      <button
        type="submit"
        className="btn-ghost"
        style={{ padding: "7px 12px", fontSize: 13, gap: 5 }}
      >
        <Search size={13} />
        بحث
      </button>
    </form>
  );
}
