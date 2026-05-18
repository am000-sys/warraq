// src/app/(app)/settings/page.tsx — إعدادات الحساب
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { ar } from "@/lib/utils";

export default async function SettingsPage() {
  const user = (await getCurrentUser())!;

  return (
    <div>
      <PageHeader title="الإعدادات" />

      {/* Account info */}
      <div className="card mb-4" style={{ borderRadius: 16 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--carbon)",
            fontFamily: "Tajawal, sans-serif",
            marginBottom: 18,
          }}
        >
          معلومات الحساب
        </h2>
        <dl className="flex flex-col" style={{ gap: 14 }}>
          <SettingRow label="الاسم" value={user.name || "—"} />
          <SettingRow label="البريد الإلكتروني" value={user.email} ltr />
          <SettingRow
            label="رصيد الصفحات"
            value={ar(user.pagesBalance)}
            highlight
          />
          <SettingRow
            label="تاريخ التسجيل"
            value={new Date(user.createdAt).toLocaleDateString("ar-SA")}
          />
        </dl>
      </div>

      {/* Preferences */}
      <div className="card mb-4" style={{ borderRadius: 16 }}>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--carbon)",
            fontFamily: "Tajawal, sans-serif",
            marginBottom: 18,
          }}
        >
          التفضيلات
        </h2>
        <div className="flex flex-col" style={{ gap: 14 }}>
          <PrefRow
            label="الإشعارات بالبريد"
            description="عند اكتمال الوظائف"
            defaultChecked
          />
          <PrefRow
            label="إشعارات الفواتير"
            description="عند نجاح/فشل الدفعات"
            defaultChecked
          />
          <PrefRow
            label="نشرة المنتج"
            description="جديد المميزات والتحديثات"
            defaultChecked={false}
          />
        </div>
      </div>

      {/* Danger zone */}
      <div
        className="card"
        style={{
          borderRadius: 16,
          border: "1px solid rgba(201,123,132,0.20)",
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 500,
            color: "var(--rose)",
            fontFamily: "Tajawal, sans-serif",
            marginBottom: 12,
          }}
        >
          المنطقة الخطرة
        </h2>
        <p
          className="font-light"
          style={{
            fontSize: 13,
            color: "var(--stone)",
            fontFamily: "Tajawal, sans-serif",
            marginBottom: 14,
            lineHeight: 1.7,
          }}
        >
          حذف الحساب يلغي كل بياناتك ووظائفك ومفاتيح API. لا يمكن التراجع.
        </p>
        <button
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
          }}
        >
          حذف الحساب
        </button>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
  highlight,
  ltr,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  ltr?: boolean;
}) {
  return (
    <div
      className="flex justify-between items-center"
      style={{ borderBottom: "1px solid var(--border-sub)", paddingBottom: 14 }}
    >
      <dt
        style={{
          fontSize: 13,
          color: "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
        }}
      >
        {label}
      </dt>
      <dd
        style={{
          fontSize: 14,
          color: highlight ? "var(--orange)" : "var(--carbon)",
          fontWeight: highlight ? 500 : 400,
          fontFamily: ltr ? "Inter, sans-serif" : "Tajawal, sans-serif",
          direction: ltr ? "ltr" : "rtl",
        }}
      >
        {value}
      </dd>
    </div>
  );
}

function PrefRow({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label
      className="flex justify-between items-center cursor-pointer"
      style={{ padding: "8px 0" }}
    >
      <div>
        <div
          style={{
            fontSize: 14,
            color: "var(--carbon)",
            fontFamily: "Tajawal, sans-serif",
            fontWeight: 500,
            marginBottom: 2,
          }}
        >
          {label}
        </div>
        <div
          className="font-light"
          style={{
            fontSize: 12,
            color: "var(--pebble)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          {description}
        </div>
      </div>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        style={{ accentColor: "var(--orange)", width: 18, height: 18 }}
      />
    </label>
  );
}
