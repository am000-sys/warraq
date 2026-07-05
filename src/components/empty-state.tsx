// src/components/empty-state.tsx — حالة فارغة موحّدة للوحات
// أيقونة داخل دائرة برتقاليّة ناعمة + عنوان + وصف + زرّ اختياري

import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** حشوة أصغر عند التضمين داخل بطاقة تحوي محتوى آخر */
  compact?: boolean;
};

export function EmptyState({ icon: Icon, title, description, action, compact }: Props) {
  return (
    <div
      className="text-center"
      style={{
        padding: compact ? "40px 20px" : "64px 24px",
        fontFamily: "Tajawal, sans-serif",
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          background: "var(--orange-soft)",
          border: "1px solid var(--orange-mid)",
          margin: "0 auto 16px",
        }}
      >
        <Icon size={24} color="var(--orange)" strokeWidth={1.6} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--carbon)", marginBottom: 6 }}>
        {title}
      </div>
      {description && (
        <p
          className="font-light"
          style={{
            fontSize: 13,
            color: "var(--stone)",
            lineHeight: 1.8,
            maxWidth: 400,
            margin: "0 auto",
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <div className="flex justify-center" style={{ marginTop: 18 }}>
          {action}
        </div>
      )}
    </div>
  );
}
