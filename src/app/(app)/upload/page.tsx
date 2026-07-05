// src/app/(app)/upload/page.tsx — رفع ملف جديد (غلاف خادم: يجلب الرصيد للفحص المسبق)
import { getCurrentUser } from "@/lib/auth";
import { UploadForm } from "./upload-form";
import { BookOpenCheck, Hash, FileDown, type LucideIcon } from "lucide-react";

export const metadata = { title: "رفع ملف — ورّاق" };

export default async function UploadPage() {
  const user = await getCurrentUser();
  return (
    <>
      <UploadForm balance={user?.pagesBalance ?? 0} />

      {/* ما الذي يحدث لملفّك؟ — تذكير مختصر بقيمة المعالجة */}
      <div
        className="grid wq-grid-3"
        style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginTop: 20 }}
      >
        <HintCard
          icon={Hash}
          title="حفظ الترقيم المطبوع"
          text="نحفظ رقم الصفحة كما هو مطبوع في الكتاب — مرجعيّة دقيقة للتوثيق."
        />
        <HintCard
          icon={BookOpenCheck}
          title="تصحيح الآيات تلقائيّاً"
          text="الآيات بين ﴿ ﴾ تُقابَل بالرسم العثماني وتُصحَّح دون أيّ تكلفة إضافيّة."
        />
        <HintCard
          icon={FileDown}
          title="تصدير بخمس صيغ"
          text="TXT وMarkdown وWord وExcel وJSON — جاهزة للبحث والتحرير."
        />
      </div>
    </>
  );
}

function HintCard({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="card" style={{ borderRadius: 16, padding: "18px 20px" }}>
      <div className="flex items-center" style={{ gap: 10, marginBottom: 8 }}>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: "var(--orange-soft)",
          }}
        >
          <Icon size={14} color="var(--orange)" strokeWidth={1.8} />
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--carbon)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          {title}
        </span>
      </div>
      <p
        className="font-light"
        style={{
          fontSize: 12,
          color: "var(--stone)",
          lineHeight: 1.8,
          fontFamily: "Tajawal, sans-serif",
          margin: 0,
        }}
      >
        {text}
      </p>
    </div>
  );
}
