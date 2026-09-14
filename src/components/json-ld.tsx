// src/components/json-ld.tsx — بيانات منظَّمة (Schema.org) تُحقن في الصفحة
//
// محرّكات البحث تقرأ منها هويّة المنصّة وخدمتها وأسعارها، فتظهر النتيجة أغنى.
// الحقن عبر dangerouslySetInnerHTML هو الطريق المعتمد لـ ld+json في React،
// والمحتوى من كودنا لا من مُدخَل مستخدم — فلا سبيل للحقن.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
