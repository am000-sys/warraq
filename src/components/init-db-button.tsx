// src/components/init-db-button.tsx — زرّ تهيئة الجداول (للمالك)
"use client";

import { useState } from "react";
import { Database, Check } from "lucide-react";

export function InitDbButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function run() {
    setState("loading");
    const res = await fetch("/api/admin/init", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("done");
      setMsg(data.message ?? "تمّ");
    } else {
      setState("error");
      setMsg(data.error ?? "فشل");
    }
  }

  return (
    <div className="card mb-6" style={{ borderRadius: 16 }}>
      <h2
        className="flex items-center gap-2"
        style={{ fontSize: 15, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif", marginBottom: 6 }}
      >
        <Database size={16} color="var(--orange)" />
        تهيئة جداول النظام
      </h2>
      <p
        className="font-light"
        style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif", marginBottom: 14, lineHeight: 1.7 }}
      >
        اضغط مرّة واحدة لإنشاء جداول طلبات الشحن والتجربة المجانيّة (إن لم تكن موجودة).
      </p>
      {state === "done" && (
        <div className="flex items-center gap-2 mb-3" style={{ fontSize: 13, color: "var(--orange)", fontFamily: "Tajawal, sans-serif" }}>
          <Check size={14} /> {msg}
        </div>
      )}
      {state === "error" && (
        <div className="mb-3" style={{ fontSize: 13, color: "var(--rose)", fontFamily: "Tajawal, sans-serif" }}>
          {msg}
        </div>
      )}
      <button
        onClick={run}
        disabled={state === "loading" || state === "done"}
        className="btn-primary"
        style={{ fontSize: 14, padding: "10px 22px", opacity: state === "loading" ? 0.6 : 1 }}
      >
        {state === "loading" ? "جارٍ التهيئة..." : state === "done" ? "تمّت التهيئة ✓" : "تهيئة الجداول"}
      </button>
    </div>
  );
}
