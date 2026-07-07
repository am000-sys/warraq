// src/components/marketing/use-cases.tsx (مُصدَّر كـ Testimonials للتوافق)
// قسم «لمن وَرَّاق» — عائلة تخطيط مختلفة عن البطاقات: شبكة مفتوحة بفواصل
// شعريّة (hairlines) ومساحات بيضاء، بلا صناديق. وصف صادق بلا شهادات مُختلَقة.
import { GraduationCap, BookMarked, Library, Building2 } from "lucide-react";
import { Reveal } from "@/components/reveal";

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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
          {/* العنوان في عمود البداية — يرافق القائمة أثناء التمرير */}
          <Reveal className="md:col-span-4">
            <div className="md:sticky md:top-28">
              <h2 className="text-h2 mb-4" style={{ color: "var(--carbon)" }}>
                مصمّم
                <br />
                لخدمة التراث
              </h2>
              <p
                className="font-light m-0"
                style={{ fontSize: 16, color: "var(--stone)", lineHeight: 1.7, maxWidth: 300 }}
              >
                أداة متخصّصة لكلّ من يعمل على النصّ العربي المصوّر.
              </p>
            </div>
          </Reveal>

          {/* القائمة: صفوف مفتوحة بفاصل شعري واحد بين كلّ صفّ */}
          <div className="md:col-span-8">
            {audiences.map((a, i) => {
              const Icon = a.icon;
              return (
                <Reveal
                  key={a.t}
                  delay={i * 0.06}
                  className="flex gap-5 items-start"
                  style={{
                    padding: "26px 0",
                    borderTop: i > 0 ? "1px solid var(--border-sub)" : "none",
                  }}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 44,
                      height: 44,
                      background: "var(--orange-soft)",
                      border: "1px solid var(--orange-mid)",
                      borderRadius: "var(--r-inner)",
                      color: "var(--orange)",
                    }}
                  >
                    <Icon size={20} strokeWidth={1.7} />
                  </div>
                  <div>
                    <div
                      className="mb-1.5"
                      style={{ fontSize: 17, fontWeight: 500, color: "var(--carbon)" }}
                    >
                      {a.t}
                    </div>
                    <p
                      className="font-light m-0"
                      style={{ fontSize: 14.5, color: "var(--stone)", lineHeight: 1.75, maxWidth: 520 }}
                    >
                      {a.d}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
