// src/components/survey-send-form.tsx — إرسال الاستبيان إلى شريحة يختارها المالك
// الإرسال بيد المالك وحده، وبعد تأكيدٍ صريح يذكر العدد والشريحة.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ar } from "@/lib/utils";

type Segment = { v: string; l: string; count: number };

export function SurveySendForm({ segments }: { segments: Segment[] }) {
  const router = useRouter();
  const [segment, setSegment] = useState(segments[0]?.v ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const current = segments.find((s) => s.v === segment);

  async function send() {
    if (!current || current.count === 0) return;
    const ok = window.confirm(
      `سيُرسَل الاستبيان بالبريد إلى ${ar(current.count)} مستخدماً (${current.l}). متابعة؟`,
    );
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/survey/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment }),
      });
      const body = (await res.json().catch(() => ({}))) as { data?: { sent: number }; error?: string };
      if (!res.ok || !body.data) throw new Error(body.error || "تعذّر الإرسال");
      setMsg({ ok: true, text: `أُرسل الاستبيان إلى ${ar(body.data.sent)} مستخدماً.` });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col" style={{ gap: 10, marginBottom: 16 }}>
        {segments.map((s) => (
          <label key={s.v} className="flex items-center gap-2.5 cursor-pointer" style={{ fontSize: 14 }}>
            <input
              type="radio"
              name="segment"
              value={s.v}
              checked={segment === s.v}
              onChange={() => setSegment(s.v)}
              style={{ accentColor: "var(--orange)", width: 16, height: 16 }}
            />
            <span style={{ color: "var(--carbon)" }}>{s.l}</span>
            <span style={{ color: "var(--pebble)", fontSize: 13 }}>({ar(s.count)} لم يصلهم بعد)</span>
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={send}
        disabled={busy || !current || current.count === 0}
        className="btn-primary"
        style={{ fontSize: 14, padding: "11px 24px", opacity: busy || !current?.count ? 0.6 : 1 }}
      >
        {busy ? "جارٍ الإرسال…" : "أرسل الاستبيان"}
      </button>
      {msg && (
        <p role="status" style={{ marginTop: 12, fontSize: 13, color: msg.ok ? "var(--stone)" : "var(--orange)" }}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
