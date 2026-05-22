// src/components/delete-account-button.tsx
"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";

export function DeleteAccountButton() {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("هل أنت متأكّد؟ سيُحذف حسابك وكلّ بياناتك نهائياً ولا يمكن التراجع.")) return;
    if (!confirm("تأكيد أخير: حذف الحساب نهائياً؟")) return;
    setLoading(true);
    const res = await fetch("/api/account/delete", { method: "POST" });
    if (res.ok) {
      await signOut({ callbackUrl: "/" });
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d?.error ?? "تعذّر حذف الحساب");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="cursor-pointer"
      style={{
        background: "none",
        border: "1px solid rgba(201,123,132,0.30)",
        color: "var(--rose)",
        padding: "10px 22px",
        borderRadius: "var(--r-btn)",
        fontSize: 13,
        fontFamily: "Tajawal, sans-serif",
        fontWeight: 500,
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "جارٍ الحذف..." : "حذف الحساب"}
    </button>
  );
}
