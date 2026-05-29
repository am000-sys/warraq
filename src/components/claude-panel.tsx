// src/components/claude-panel.tsx — قسم خدمات Claude الإضافيّة على صفحة المستند
// يظهر بعد نجاح OCR. مفعّل للمؤهّلين، أو مقفل مع upsell لغير المؤهّلين.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Lock, FileText, MessageSquare, Loader2, Wand2 } from "lucide-react";

export type ClaudeAccessClient = {
  enabled: boolean;
  eligible: boolean;
  mode: "plan" | "usage" | "none";
  costPerAction: number;
  balance: number;
};

const REPORTS: { type: string; label: string }[] = [
  { type: "summary", label: "ملخّص عام" },
  { type: "executive-summary", label: "ملخّص تنفيذي" },
  { type: "key-points", label: "النقاط الرئيسيّة" },
  { type: "structured", label: "تقرير منظّم" },
];

const cardStyle: React.CSSProperties = { borderRadius: 16, marginTop: 24 };
const titleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  color: "var(--carbon)",
  fontFamily: "Tajawal, sans-serif",
};

export function ClaudePanel({ jobId, access }: { jobId: string; access: ClaudeAccessClient }) {
  if (!access.enabled) return null;
  return access.eligible ? (
    <ClaudeActive jobId={jobId} access={access} />
  ) : (
    <ClaudeLocked />
  );
}

function SectionHeader() {
  return (
    <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
      <Sparkles size={16} color="var(--orange)" />
      <span style={titleStyle}>مساعد المستند الذكي</span>
      <span className="badge" style={{ fontSize: 10 }}>
        إضافة مدفوعة
      </span>
    </div>
  );
}

function ClaudeLocked() {
  return (
    <div className="card" style={{ ...cardStyle, border: "1px dashed var(--border)" }}>
      <SectionHeader />
      <p
        className="font-light"
        style={{
          fontSize: 13,
          color: "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
          lineHeight: 1.8,
          margin: "8px 0 14px",
        }}
      >
        «اسأل المستند» و«توليد تقرير» و«تحسين الدقّة» مزايا ذكاء اصطناعيّ إضافيّة،
        غير مشمولة في التفريغ النصّي الأساسي. فعّلها بترقية خطّتك بما يناسب تسعيرة موقعك.
      </p>
      <div className="flex items-center gap-2">
        <Lock size={14} color="var(--pebble)" />
        <Link
          href="/billing"
          className="btn-primary no-underline"
          style={{ fontSize: 13, padding: "9px 20px" }}
        >
          ترقية الخطّة / تفعيل الإضافة
        </Link>
      </div>
    </div>
  );
}

function ClaudeActive({ jobId, access }: { jobId: string; access: ClaudeAccessClient }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [report, setReport] = useState("");
  const [busy, setBusy] = useState<null | "ask" | string>(null);
  const [error, setError] = useState("");
  const [enhanceMsg, setEnhanceMsg] = useState("");

  async function enhance() {
    if (busy) return;
    setBusy("enhance");
    setError("");
    setEnhanceMsg("جارٍ تحسين الدقّة والتنسيق...");
    try {
      let offset = 0;
      let done = false;
      while (!done) {
        const res = await fetch(`/api/jobs/${jobId}/enhance`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ offset }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error ?? "تعذّر تحسين الدقّة");
        offset = data.processed ?? offset;
        done = Boolean(data.done);
        setEnhanceMsg(`تمّ تحسين ${data.processed ?? 0} من ${data.total ?? 0} صفحة...`);
      }
      setEnhanceMsg("اكتمل تحسين الدقّة ✓");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setEnhanceMsg("");
    } finally {
      setBusy(null);
    }
  }

  async function ask() {
    if (!question.trim() || busy) return;
    setBusy("ask");
    setError("");
    setAnswer("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/ask`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "تعذّر تنفيذ السؤال");
      setAnswer(data.answer ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function makeReport(type: string) {
    if (busy) return;
    setBusy(type);
    setError("");
    setReport("");
    try {
      const res = await fetch(`/api/jobs/${jobId}/report`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "تعذّر توليد التقرير");
      setReport(data.report ?? "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card" style={cardStyle}>
      <SectionHeader />
      {access.mode === "usage" && (
        <p style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif", marginBottom: 12 }}>
          تُحتسب كلّ عمليّة من رصيدك ({access.costPerAction} وحدة) · الرصيد: {access.balance}
        </p>
      )}

      {/* تحسين الدقّة والتنسيق (تصحيح القراءة + تنسيق + حواشي + رقم الصفحة) */}
      <div
        className="flex items-center justify-between flex-wrap"
        style={{
          gap: 10,
          background: "var(--orange-soft)",
          border: "1px solid rgba(246,146,81,0.2)",
          borderRadius: 12,
          padding: "12px 14px",
          marginTop: 8,
          marginBottom: 4,
        }}
      >
        <div className="min-w-0">
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>
            تحسين الدقّة والتنسيق
          </div>
          <div style={{ fontSize: 11, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
            {enhanceMsg ||
              "يصحّح أخطاء التعرّف ويُحسّن التنسيق ويفصل الحواشي ويضبط أرقام الصفحات — دون تغيير المعنى."}
          </div>
        </div>
        <button
          onClick={enhance}
          disabled={busy !== null}
          className="btn-primary"
          style={{ fontSize: 13, padding: "9px 18px", opacity: busy ? 0.7 : 1 }}
        >
          {busy === "enhance" ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
          تحسين وتنسيق
        </button>
      </div>

      {/* Ask */}
      <div style={{ marginTop: 8 }}>
        <label
          className="flex items-center gap-1.5"
          style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif", marginBottom: 6 }}
        >
          <MessageSquare size={13} /> اسأل عن المستند
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="مثال: ما أبرز موضوعات هذا المستند؟"
          rows={2}
          className="field"
          style={{ fontFamily: "Tajawal, sans-serif", resize: "vertical" }}
        />
        <button
          onClick={ask}
          disabled={!question.trim() || busy !== null}
          className="btn-primary"
          style={{ fontSize: 13, padding: "9px 20px", marginTop: 8, opacity: busy ? 0.7 : 1 }}
        >
          {busy === "ask" ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          اسأل
        </button>
        {answer && (
          <pre
            dir="rtl"
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 14,
              lineHeight: 2,
              fontFamily: "Tajawal, sans-serif",
              color: "var(--midnight)",
              background: "var(--fog)",
              borderRadius: 12,
              padding: 16,
              marginTop: 12,
            }}
          >
            {answer}
          </pre>
        )}
      </div>

      {/* Reports */}
      <div style={{ marginTop: 18, borderTop: "1px solid var(--border-sub)", paddingTop: 16 }}>
        <label
          className="flex items-center gap-1.5"
          style={{ fontSize: 13, color: "var(--stone)", fontFamily: "Tajawal, sans-serif", marginBottom: 10 }}
        >
          <FileText size={13} /> توليد تقرير
        </label>
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {REPORTS.map((r) => (
            <button
              key={r.type}
              onClick={() => makeReport(r.type)}
              disabled={busy !== null}
              className="btn-ghost"
              style={{ fontSize: 12, padding: "8px 14px", opacity: busy && busy !== r.type ? 0.6 : 1 }}
            >
              {busy === r.type ? <Loader2 size={13} className="animate-spin" /> : null}
              {r.label}
            </button>
          ))}
        </div>
        {report && (
          <pre
            dir="rtl"
            style={{
              whiteSpace: "pre-wrap",
              fontSize: 14,
              lineHeight: 2,
              fontFamily: "Tajawal, sans-serif",
              color: "var(--midnight)",
              background: "var(--fog)",
              borderRadius: 12,
              padding: 16,
              marginTop: 12,
            }}
          >
            {report}
          </pre>
        )}
      </div>

      {error && (
        <p style={{ fontSize: 13, color: "var(--rose)", fontFamily: "Tajawal, sans-serif", marginTop: 12 }}>
          {error}
        </p>
      )}
    </div>
  );
}
