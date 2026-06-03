// src/components/failure-hint.tsx — بطاقة تلميح عمليّة عند فشل المعالجة
// مكوّن عرض خالص (بلا hooks) — يصلح للاستخدام في مكوّنات الخادم والعميل معاً.
import { Lightbulb } from "lucide-react";
import { failureHint } from "@/lib/failure-hints";

export function FailureHintCard({ errorMessage }: { errorMessage?: string | null }) {
  const hint = failureHint(errorMessage);
  return (
    <div
      style={{
        marginTop: 14,
        background: "var(--orange-soft)",
        border: "1px solid rgba(246,146,81,0.22)",
        borderRadius: 14,
        padding: 16,
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: 10 }}>
        <Lightbulb size={16} color="var(--orange)" strokeWidth={1.8} />
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--carbon)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          {hint.title}
        </span>
      </div>
      <ul style={{ margin: 0, paddingInlineStart: 0, listStyle: "none" }}>
        {hint.tips.map((tip, i) => (
          <li
            key={i}
            className="flex items-start gap-2"
            style={{
              fontSize: 12.5,
              lineHeight: 1.7,
              color: "var(--stone)",
              fontFamily: "Tajawal, sans-serif",
              marginBottom: i < hint.tips.length - 1 ? 6 : 0,
            }}
          >
            <span style={{ color: "var(--orange)", marginTop: 1 }}>•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
