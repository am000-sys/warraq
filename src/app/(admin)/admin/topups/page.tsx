// src/app/(admin)/admin/topups/page.tsx — مراجعة طلبات شحن الرصيد
"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Check, X, Clock } from "lucide-react";
import { ar } from "@/lib/utils";

type Req = {
  id: string;
  userId: string;
  packageId: string;
  pages: number;
  amountSar: number;
  senderName: string;
  status: string;
  note: string | null;
  createdAt: string;
  receiptImage?: string;
};

export default function AdminTopupsPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [userMap, setUserMap] = useState<Record<string, { email: string; name: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/topup");
    const data = await res.json();
    setRequests(data.requests ?? []);
    setUserMap(data.userMap ?? {});
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function review(id: string, action: "approve" | "reject") {
    if (action === "reject" && !confirm("رفض هذا الطلب؟")) return;
    setBusy(id);
    const note = action === "reject" ? prompt("سبب الرفض (اختياري):") ?? undefined : undefined;
    await fetch(`/api/topup/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note }),
    });
    setBusy(null);
    load();
  }

  const pending = requests.filter((r) => r.status === "PENDING");
  const others = requests.filter((r) => r.status !== "PENDING");

  return (
    <div>
      <PageHeader
        title="طلبات الشحن"
        subtitle={`${ar(pending.length)} طلب بانتظار المراجعة`}
      />

      {loading ? (
        <p style={{ padding: 40, textAlign: "center", color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
          ...
        </p>
      ) : requests.length === 0 ? (
        <div className="card text-center" style={{ padding: "60px 20px", color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
          <Clock size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>لا توجد طلبات شحن بعد.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="grid wq-grid-2" style={{ gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
              {pending.map((r) => (
                <div key={r.id} className="card" style={{ borderRadius: 16 }}>
                  <div className="flex justify-between items-start" style={{ marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>
                        {ar(r.pages)} صفحة · {ar(Math.round(r.amountSar / 100))} ريال
                      </div>
                      <div style={{ fontSize: 12, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif", marginTop: 2 }}>
                        {userMap[r.userId]?.email ?? r.userId}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--stone)", fontFamily: "Tajawal, sans-serif", marginTop: 2 }}>
                        المُحوِّل: {r.senderName}
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5" style={{ fontSize: 11, color: "#4285f4", fontFamily: "Tajawal, sans-serif" }}>
                      <Clock size={13} /> بانتظار
                    </span>
                  </div>

                  {r.receiptImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.receiptImage}
                      alt="الإيصال"
                      onClick={() => setPreview(r.receiptImage!)}
                      style={{
                        width: "100%",
                        maxHeight: 200,
                        objectFit: "contain",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        cursor: "zoom-in",
                        marginBottom: 14,
                        background: "var(--fog)",
                      }}
                    />
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => review(r.id, "approve")}
                      disabled={busy === r.id}
                      className="btn-primary flex-1 justify-center"
                      style={{ fontSize: 13, padding: 10 }}
                    >
                      <Check size={14} /> اعتماد وإضافة الرصيد
                    </button>
                    <button
                      onClick={() => review(r.id, "reject")}
                      disabled={busy === r.id}
                      className="flex items-center justify-center gap-1.5 cursor-pointer"
                      style={{
                        border: "1px solid rgba(201,123,132,0.3)",
                        color: "var(--rose)",
                        background: "none",
                        borderRadius: "var(--r-btn)",
                        padding: "10px 16px",
                        fontSize: 13,
                        fontFamily: "Tajawal, sans-serif",
                      }}
                    >
                      <X size={14} /> رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {others.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif", marginBottom: 12 }}>
                الطلبات المُعالَجة
              </h3>
              <div className="card" style={{ borderRadius: 16, padding: "8px 16px" }}>
                {others.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex justify-between items-center"
                    style={{ padding: "12px 8px", borderBottom: i < others.length - 1 ? "1px solid var(--border-sub)" : "none" }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>
                        {ar(r.pages)} صفحة · {userMap[r.userId]?.email ?? ""}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
                        {new Date(r.createdAt).toLocaleDateString("ar-SA")}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: r.status === "APPROVED" ? "var(--orange)" : "var(--rose)",
                        fontFamily: "Tajawal, sans-serif",
                      }}
                    >
                      {r.status === "APPROVED" ? "مُعتمَد" : "مرفوض"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* معاينة الإيصال بالحجم الكامل */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            cursor: "zoom-out",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="الإيصال" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 12 }} />
        </div>
      )}
    </div>
  );
}
