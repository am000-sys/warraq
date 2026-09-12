// src/components/email-diagnostics.tsx — تشخيص وصول البريد (للمالك)
// يعرض نتيجة فحص حيّ لسجلّات SPF/DKIM/DMARC، ويُملي السجلّ الناقص جاهزاً للّصق.
"use client";

import { useState } from "react";
import { MailCheck, Check, X, Copy } from "lucide-react";
import type { EmailDnsReport, RecordCheck } from "@/lib/email-dns";

function Line({ label, check }: { label: string; check: RecordCheck }) {
  return (
    <div style={{ paddingBottom: 12, borderBottom: "1px solid var(--border-sub)" }}>
      <div className="flex justify-between items-center flex-wrap" style={{ gap: 8 }}>
        <span className="flex items-center" style={{ gap: 7, fontSize: 13, color: "var(--stone)" }}>
          {check.ok ? (
            <Check size={14} color="var(--success)" />
          ) : (
            <X size={14} color="var(--rose)" />
          )}
          {label}
        </span>
        <span style={{ fontSize: 12.5, fontWeight: 500, color: check.ok ? "var(--success)" : "var(--rose)" }}>
          {check.ok ? "موجود" : "مفقود"}
        </span>
      </div>
      {check.value && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            direction: "ltr",
            textAlign: "left",
            color: "var(--pebble)",
            fontFamily: "ui-monospace, Menlo, monospace",
            wordBreak: "break-all",
          }}
        >
          {check.name} → {check.value}
        </div>
      )}
      {check.note && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--rose)", lineHeight: 1.8 }}>
          {check.note}
        </div>
      )}
    </div>
  );
}

export function EmailDiagnostics({ report }: { report: EmailDnsReport }) {
  const [copied, setCopied] = useState(false);
  const allOk = report.spf.ok && report.dkim.ok && report.dmarc.ok;

  function copyDmarc() {
    navigator.clipboard.writeText(report.suggestedDmarc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card mb-7" style={{ borderRadius: 16 }}>
      <div className="flex items-center" style={{ gap: 10, marginBottom: 16 }}>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, borderRadius: 10, background: "var(--orange-soft)" }}
        >
          <MailCheck size={15} color="var(--orange)" strokeWidth={1.8} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>
            وصول البريد
          </div>
          <div style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
            فحص حيّ لسجلّات توثيق نطاق المُرسِل — يُقرأ من DNS عند كلّ فتح
          </div>
        </div>
      </div>

      {!report.domain ? (
        <div style={{ fontFamily: "Tajawal, sans-serif", fontSize: 12.5, color: "var(--rose)", lineHeight: 1.9 }}>
          تعذّر استخراج نطاق المُرسِل من <code>EMAIL_FROM</code>
          {report.from ? ` (القيمة الحاليّة: ${report.from})` : ""}. اضبطه بصيغة{" "}
          <code style={{ direction: "ltr", display: "inline-block" }}>الاسم &lt;noreply@نطاقك&gt;</code>.
        </div>
      ) : (
        <>
          <div
            style={{
              fontFamily: "Tajawal, sans-serif",
              fontSize: 12.5,
              color: "var(--stone)",
              marginBottom: 14,
              lineHeight: 1.9,
            }}
          >
            نطاق المُرسِل:{" "}
            <code style={{ direction: "ltr", display: "inline-block", fontWeight: 500 }}>
              {report.domain}
            </code>
          </div>

          <dl className="flex flex-col" style={{ gap: 12, fontFamily: "Tajawal, sans-serif" }}>
            <Line label="SPF — يأذن لخادم الإرسال" check={report.spf} />
            <Line label="DKIM — توقيع الرسائل" check={report.dkim} />
            <Line label="DMARC — سياسة التعامل مع الانتحال" check={report.dmarc} />
            <Line label="MX الارتدادات" check={report.bounceMx} />
          </dl>

          {allOk ? (
            <div
              className="flex items-center"
              style={{
                gap: 7,
                marginTop: 14,
                fontSize: 12.5,
                color: "var(--success)",
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              <Check size={14} /> التوثيق مكتمل. ما يبقى هو بناء سمعة المُرسِل مع الوقت.
            </div>
          ) : (
            !report.dmarc.ok && (
              <div
                style={{
                  background: "var(--fog)",
                  borderRadius: 12,
                  padding: 14,
                  marginTop: 14,
                  fontFamily: "Tajawal, sans-serif",
                  fontSize: 12.5,
                  lineHeight: 2,
                  color: "var(--stone)",
                }}
              >
                أضِف سجلّ <strong>TXT</strong> في إعدادات DNS لنطاقك:
                <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--pebble)" }}>
                  الاسم / Host:
                </div>
                <code
                  style={{
                    display: "block",
                    direction: "ltr",
                    background: "var(--snow)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 11.5,
                    marginTop: 4,
                    fontFamily: "ui-monospace, Menlo, monospace",
                  }}
                >
                  {report.dmarc.name}
                </code>
                <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--pebble)" }}>
                  القيمة / Value:
                </div>
                <div className="flex items-center" style={{ gap: 8, marginTop: 4 }}>
                  <code
                    style={{
                      flex: 1,
                      direction: "ltr",
                      background: "var(--snow)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      fontSize: 11.5,
                      wordBreak: "break-all",
                      fontFamily: "ui-monospace, Menlo, monospace",
                    }}
                  >
                    {report.suggestedDmarc}
                  </code>
                  <button
                    type="button"
                    onClick={copyDmarc}
                    className="btn-ghost flex-shrink-0"
                    style={{ padding: "8px 12px", fontSize: 12, gap: 6 }}
                  >
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                    {copied ? "نُسخ" : "نسخ"}
                  </button>
                </div>
                <div style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.9 }}>
                  <code>p=none</code> يعني «راقِب ولا تحجب» — آمن للبدء، ويُشدَّد لاحقاً إلى{" "}
                  <code>quarantine</code> بعد أن تطمئنّ للتقارير. يسري التغيير خلال دقائق إلى ساعات.
                </div>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
