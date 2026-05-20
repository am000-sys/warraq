// src/components/marketing/use-cases.tsx (مُصدَّر كـ Testimonials للتوافق)
// قسم «لمن وَرَّاق» — وصف صادق للجمهور المستهدف بلا شهادات مُختلَقة
import { GraduationCap, BookMarked, Library, Building2 } from "lucide-react";

const audiences = [
  {
    icon: GraduationCap,
    t: "الباحثون وطلّاب الدراسات العليا",
    d: "حوِّل مصادرك المصوّرة إلى نصّ قابل للبحث والاقتباس، ووفّر ساعات النسخ اليدوي.",
  },
  {
    icon: BookMarked,
    t: "محقّقو المخطوطات",
    d: "تعامَل مع الخطوط العربية القديمة، مع الحفاظ على ترقيم الصفحات المطبوع داخل النصّ.",
  },
  {
    icon: Library,
    t: "المكتبات ودور الأرشفة",
    d: "رقمنة مجموعات كاملة عبر المعالجة المجمّعة، وبناء أرشيف نصّي قابل للفهرسة.",
  },
  {
    icon: Building2,
    t: "دور النشر الرقمية",
    d: "أعِد إنتاج الكتب المصوّرة في صيغ رقمية حديثة جاهزة للنشر والتوزيع.",
  },
];

export function Testimonials() {
  return (
    <section style={{ padding: "96px 0", background: "var(--fog)" }}>
      <div className="container-warraq">
        <div className="text-center" style={{ marginBottom: 52 }}>
          <div className="badge" style={{ marginBottom: 18 }}>
            لمن وَرَّاق
          </div>
          <h2
            style={{
              fontFamily: "Tajawal, sans-serif",
              fontSize: "clamp(26px,3.5vw,44px)",
              fontWeight: 300,
              color: "var(--carbon)",
              letterSpacing: "-0.02em",
              marginBottom: 14,
            }}
          >
            مصمّم لخدمة التراث
          </h2>
          <p
            className="font-light mx-auto"
            style={{
              fontSize: 17,
              color: "var(--stone)",
              fontFamily: "Tajawal, sans-serif",
              maxWidth: 460,
              lineHeight: 1.65,
            }}
          >
            أداة متخصّصة لكلّ من يعمل على النصّ العربي المصوّر.
          </p>
        </div>

        <div className="grid wq-grid-2" style={{ gridTemplateColumns: "repeat(2,1fr)", gap: 18 }}>
          {audiences.map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={i} className="card" style={{ display: "flex", gap: 16 }}>
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 44,
                    height: 44,
                    background: "var(--orange-soft)",
                    border: "1px solid rgba(246,146,81,0.18)",
                    borderRadius: 12,
                    color: "var(--orange)",
                  }}
                >
                  <Icon size={20} strokeWidth={1.7} />
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Tajawal, sans-serif",
                      fontSize: 17,
                      fontWeight: 500,
                      color: "var(--carbon)",
                      marginBottom: 6,
                    }}
                  >
                    {a.t}
                  </div>
                  <div
                    className="font-light"
                    style={{
                      fontSize: 14,
                      color: "var(--stone)",
                      lineHeight: 1.7,
                      fontFamily: "Tajawal, sans-serif",
                    }}
                  >
                    {a.d}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
