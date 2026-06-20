// src/components/topup-client.tsx — تدفّق شحن الرصيد بالحوالة
"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Upload, Clock, XCircle, CheckCircle, Minus, Plus } from "lucide-react";
import {
  type TopUpPackage,
  buildFlexiblePackage,
  FLEX_STEP,
  FLEX_MIN,
  FLEX_MAX,
} from "@/lib/packages";
import { ar } from "@/lib/utils";
import { Field, FieldLabel, FieldControl } from "@/components/ui/field";

type Bank = { bankName: string; iban: string };
type Req = {
  id: string;
  packageId: string;
  pages: number;
  amountSar: number;
  senderName: string;
  status: string;
  note: string | null;
  createdAt: string;
};

export function TopUpClient({ packages, bank }: { packages: TopUpPackage[]; bank: Bank }) {
  const [selected, setSelected] = useState<TopUpPackage | null>(null);
  const [senderName, setSenderName] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<Req[]>([]);
  const [flexPages, setFlexPages] = useState(FLEX_MIN);
  const [paying, setPaying] = useState<"tap" | "stripe" | null>(null);

  const flexActive = selected?.id === "flex";

  function setFlex(pages: number) {
    const clamped = Math.min(FLEX_MAX, Math.max(FLEX_MIN, pages));
    setFlexPages(clamped);
    setSelected(buildFlexiblePackage(clamped));
    setDone(false);
  }

  useEffect(() => {
    fetch("/api/topup")
      .then((r) => r.json())
      .then((d) => setHistory(d.requests ?? []))
      .catch(() => {});
  }, [done]);

  // ضغط الصورة قبل الرفع (تصغير + JPEG) لتقليل الحجم
  async function handleFile(file: File) {
    const img = document.createElement("img");
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const maxW = 1000;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setReceipt(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  function copyIban() {
    navigator.clipboard.writeText(bank.iban.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // الدفع الفوريّ بالبطاقة/المحفظة عبر بوّابة (Tap أو Stripe) ثمّ التحويل لصفحة الدفع
  async function payWithCard(gateway: "tap" | "stripe") {
    if (!selected || paying) return;
    setPaying(gateway);
    setError("");
    try {
      const res = await fetch(`/api/${gateway}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "package",
          packageId: selected.id,
          pages: selected.id === "flex" ? selected.pages : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) {
        setError(data?.error ?? "تعذّر بدء الدفع الإلكترونيّ");
        setPaying(null);
        return;
      }
      window.location.href = data.url; // إلى صفحة الدفع المستضافة
    } catch {
      setError("تعذّر الاتّصال ببوّابة الدفع");
      setPaying(null);
    }
  }

  async function submit() {
    if (!selected || !senderName || !receipt) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageId: selected.id,
        pages: selected.id === "flex" ? selected.pages : undefined,
        senderName,
        receiptImage: receipt,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({})))?.error ?? "تعذّر إرسال الطلب");
      return;
    }
    setDone(true);
    setSelected(null);
    setSenderName("");
    setReceipt(null);
  }

  return (
    <div>
      {done && (
        <div
          className="mb-5 flex items-center gap-2"
          style={{
            background: "var(--orange-soft)",
            border: "1px solid rgba(246,146,81,0.25)",
            color: "var(--orange)",
            borderRadius: 14,
            padding: 16,
            fontFamily: "Tajawal, sans-serif",
            fontSize: 14,
          }}
        >
          <Check size={16} />
          تمّ إرسال طلبك! سيُراجع المالك الحوالة ويُضاف الرصيد قريباً.
        </div>
      )}

      {/* الباقات */}
      <div className="grid wq-grid-3" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        {packages.map((p) => {
          const active = selected?.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                setSelected(p);
                setDone(false);
              }}
              className="text-right transition-all"
              style={{
                background: p.featured ? "var(--slate)" : "var(--snow)",
                borderRadius: "var(--r-card)",
                padding: 24,
                cursor: "pointer",
                border: active
                  ? "2px solid var(--orange)"
                  : p.featured
                    ? "1px solid rgba(246,146,81,0.25)"
                    : "1px solid var(--border-sub)",
                boxShadow: p.featured ? "0 8px 32px rgba(36,36,51,0.18)" : "var(--shadow-card)",
                position: "relative",
              }}
            >
              {p.savePct && (
                <div
                  style={{
                    position: "absolute",
                    top: -11,
                    right: 20,
                    background: "var(--orange)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "3px 12px",
                    borderRadius: "var(--r-badge)",
                    fontFamily: "Tajawal, sans-serif",
                  }}
                >
                  وفّر {ar(p.savePct)}٪
                </div>
              )}
              <div
                style={{
                  fontSize: 13,
                  color: p.featured ? "rgba(255,255,255,0.5)" : "var(--stone)",
                  fontFamily: "Tajawal, sans-serif",
                  marginBottom: 10,
                }}
              >
                {p.nameAr}
              </div>
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 300,
                  color: p.featured ? "#fff" : "var(--carbon)",
                  fontFamily: "Tajawal, sans-serif",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {ar(p.amountSar)}
                <span style={{ fontSize: 14, fontWeight: 400, marginRight: 4 }}>ريال</span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: p.featured ? "rgba(255,255,255,0.6)" : "var(--stone)",
                  fontFamily: "Tajawal, sans-serif",
                  marginBottom: 4,
                }}
              >
                {ar(p.pages)} صفحة
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--orange)",
                  fontFamily: "Tajawal, sans-serif",
                  fontWeight: 500,
                }}
              >
                {p.perPage.toLocaleString("ar-SA")} ريال / صفحة
              </div>
            </button>
          );
        })}
      </div>

      {/* الباقة المرنة — عدد صفحات بمضاعفات ٥٠ */}
      <div
        className="flex items-center justify-between flex-wrap"
        style={{
          gap: 16,
          background: "var(--snow)",
          borderRadius: "var(--r-card)",
          padding: 24,
          marginBottom: 28,
          border: flexActive ? "2px solid var(--orange)" : "1px solid var(--border-sub)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif", marginBottom: 6 }}>
            باقة مرنة — اختر عدد الصفحات (مضاعفات ٥٠)
          </div>
          <div className="flex items-center" style={{ gap: 12 }}>
            <button
              type="button"
              onClick={() => setFlex(flexPages - FLEX_STEP)}
              aria-label="إنقاص"
              style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: "var(--snow)", cursor: "pointer", color: "var(--carbon)" }}
              className="flex items-center justify-center"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              value={flexPages}
              step={FLEX_STEP}
              min={FLEX_MIN}
              max={FLEX_MAX}
              onChange={(e) => {
                const v = parseInt(e.target.value || "0", 10);
                const rounded = Math.round(v / FLEX_STEP) * FLEX_STEP;
                setFlex(rounded || FLEX_MIN);
              }}
              className="field"
              style={{ width: 110, textAlign: "center", fontFamily: "Inter, sans-serif", direction: "ltr" }}
            />
            <button
              type="button"
              onClick={() => setFlex(flexPages + FLEX_STEP)}
              aria-label="زيادة"
              style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid var(--border)", background: "var(--snow)", cursor: "pointer", color: "var(--carbon)" }}
              className="flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
            <span style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>صفحة</span>
          </div>
        </div>
        <div className="text-left">
          <div
            style={{
              fontSize: 30,
              fontWeight: 300,
              color: "var(--carbon)",
              fontFamily: "Tajawal, sans-serif",
              letterSpacing: "-0.02em",
              lineHeight: 1,
              marginBottom: 4,
            }}
          >
            {ar(buildFlexiblePackage(flexPages).amountSar)}
            <span style={{ fontSize: 14, fontWeight: 400, marginRight: 4 }}>ريال</span>
          </div>
          <button
            type="button"
            onClick={() => setFlex(flexPages)}
            className="btn-primary"
            style={{ fontSize: 13, padding: "9px 20px", marginTop: 6 }}
          >
            {flexActive ? "محدّدة ✓" : "اختر هذه الباقة"}
          </button>
        </div>
      </div>

      {/* تفاصيل الحوالة + الإرسال */}
      {selected && (
        <div className="card mb-6" style={{ borderRadius: 16 }}>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "var(--carbon)",
              fontFamily: "Tajawal, sans-serif",
              marginBottom: 16,
            }}
          >
            اشحن رصيدك — {ar(selected.amountSar)} ريال
          </h3>

          {error && (
            <div
              className="mb-4"
              style={{
                background: "rgba(201,123,132,0.10)",
                border: "1px solid rgba(201,123,132,0.20)",
                color: "var(--rose)",
                borderRadius: 10,
                padding: 10,
                fontSize: 13,
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              {error}
            </div>
          )}

          {/* الدفع الفوريّ بالبطاقة / Apple Pay */}
          <div className="flex flex-wrap" style={{ gap: 12 }}>
            <button
              type="button"
              onClick={() => payWithCard("tap")}
              disabled={paying !== null}
              className="btn-primary justify-center"
              style={{ flex: "1 1 200px", fontSize: 14, padding: 13, opacity: paying !== null ? 0.6 : 1 }}
            >
              {paying === "tap" ? "جارٍ التحويل…" : "Apple Pay · مدى · بطاقة"}
            </button>
            <button
              type="button"
              onClick={() => payWithCard("stripe")}
              disabled={paying !== null}
              className="btn-ghost justify-center"
              style={{ flex: "1 1 200px", fontSize: 14, padding: 13, opacity: paying !== null ? 0.6 : 1 }}
            >
              {paying === "stripe" ? "جارٍ التحويل…" : "بطاقة دوليّة · Apple/Google Pay"}
            </button>
          </div>
          <p
            style={{
              fontSize: 11,
              color: "var(--pebble)",
              fontFamily: "Tajawal, sans-serif",
              marginTop: 8,
            }}
          >
            دفع فوريّ وآمن — يُضاف الرصيد تلقائيّاً بعد إتمام الدفع.
          </p>

          {/* فاصل */}
          <div className="flex items-center" style={{ gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 12, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
              أو حوّل بنكيّاً
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* بيانات البنك */}
          <div
            style={{
              background: "var(--fog)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <BankRow label="البنك" value={bank.bankName} />
            <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
              <span style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
                الآيبان (IBAN)
              </span>
              <div className="flex items-center gap-2">
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--carbon)",
                    fontFamily: "ui-monospace, Menlo, monospace",
                    direction: "ltr",
                  }}
                >
                  {bank.iban}
                </span>
                <button
                  onClick={copyIban}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--orange)", padding: 2 }}
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between" style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>المبلغ</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--orange)", fontFamily: "Tajawal, sans-serif" }}>
                {ar(selected.amountSar)} ريال
              </span>
            </div>
          </div>

          {/* نموذج إثبات الحوالة البنكيّة */}
          <Field className="mb-4">
            <FieldLabel>اسم المُحوِّل (كما في الحوالة)</FieldLabel>
            <FieldControl
              type="text"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="الاسم في إيصال الحوالة"
            />
          </Field>

          <label className="label">صورة إيصال الحوالة</label>
          <div
            onClick={() => document.getElementById("receipt-input")?.click()}
            className="cursor-pointer"
            style={{
              border: `2px dashed ${receipt ? "var(--orange)" : "var(--border)"}`,
              borderRadius: 12,
              padding: receipt ? 12 : "32px 16px",
              textAlign: "center",
              background: receipt ? "var(--orange-soft)" : "var(--snow)",
              marginBottom: 18,
            }}
          >
            {receipt ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={receipt} alt="الإيصال" style={{ maxHeight: 200, margin: "0 auto", borderRadius: 8 }} />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload size={24} color="var(--pebble)" />
                <span style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
                  اضغط لرفع صورة الإيصال
                </span>
              </div>
            )}
            <input
              id="receipt-input"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          <button
            onClick={submit}
            disabled={!senderName || !receipt || submitting}
            className="btn-primary w-full justify-center"
            style={{ fontSize: 15, padding: 13, opacity: !senderName || !receipt || submitting ? 0.5 : 1 }}
          >
            {submitting ? "جارٍ الإرسال..." : "إرسال طلب الشحن"}
          </button>
        </div>
      )}

      {/* سجلّ الطلبات */}
      {history.length > 0 && (
        <>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--carbon)",
              fontFamily: "Tajawal, sans-serif",
              marginBottom: 12,
            }}
          >
            طلباتك السابقة
          </h3>
          <div className="card" style={{ borderRadius: 16, padding: "8px 16px" }}>
            {history.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center justify-between"
                style={{
                  padding: "14px 8px",
                  borderBottom: i < history.length - 1 ? "1px solid var(--border-sub)" : "none",
                }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>
                    {ar(r.pages)} صفحة · {ar(Math.round(r.amountSar / 100))} ريال
                  </div>
                  <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
                    {new Date(r.createdAt).toLocaleString("ar-SA")}
                    {r.note ? ` · ${r.note}` : ""}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function BankRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
      <span style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>{label}</span>
      <span style={{ fontSize: 14, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif", fontWeight: 500 }}>
        {value}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED")
    return (
      <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: "var(--orange)", fontFamily: "Tajawal, sans-serif" }}>
        <CheckCircle size={14} /> مُعتمَد
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: "var(--rose)", fontFamily: "Tajawal, sans-serif" }}>
        <XCircle size={14} /> مرفوض
      </span>
    );
  return (
    <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: "#4285f4", fontFamily: "Tajawal, sans-serif" }}>
      <Clock size={14} /> قيد المراجعة
    </span>
  );
}
