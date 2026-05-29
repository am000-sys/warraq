// src/components/job-retry.tsx — إعادة محاولة معالجة وظيفة فاشلة (مخزّنة على R2)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";

export function JobRetry({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function retry() {
    if (busy) return;
    setBusy(true);
    setErr("");
    setMsg("جارٍ إعادة المعالجة...");
    try {
      let done = false;
      while (!done) {
        const res = await fetch(`/api/jobs/${jobId}/process`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "تعذّرت إعادة المعالجة");
        done = Boolean(data.done);
        if (data.total > 1) setMsg(`تمّت معالجة ${data.processed ?? 0} من ${data.total} صفحة...`);
      }
      setMsg("اكتملت المعالجة ✓");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setMsg("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 12 }}>
      <button
        onClick={retry}
        disabled={busy}
        className="btn-primary"
        style={{ fontSize: 13, padding: "9px 20px", opacity: busy ? 0.7 : 1 }}
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        إعادة المحاولة
      </button>
      {msg && (
        <span style={{ fontSize: 12, color: "var(--orange)", fontFamily: "Tajawal, sans-serif" }}>{msg}</span>
      )}
      {err && (
        <span style={{ fontSize: 12, color: "var(--rose)", fontFamily: "Tajawal, sans-serif" }}>{err}</span>
      )}
    </div>
  );
}
