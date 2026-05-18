// src/components/marketing/testimonials.tsx
const items = [
  {
    q: "وَرَّاق وفّر عليّ أشهراً من العمل اليدوي. حوّلت ٨٠٠ صفحة من الرسائل المخطوطة في يومين.",
    n: "د. نورة العتيبي",
    r: "باحثة تراث · جامعة الملك سعود",
    i: "ن",
  },
  {
    q: "دقة مذهلة مع النصوص العربية القديمة. النتائج تفوق توقعاتي مع النسخ المشكول.",
    n: "أ. محمد الغامدي",
    r: "محقق مخطوطات · دار الوثائق الوطنية",
    i: "م",
  },
  {
    q: "استخدمنا الـ API لبناء نظام أرشفة كامل. التوثيق ممتاز والاستجابة سريعة.",
    n: "سارة البلوشي",
    r: "مطورة · مكتبة المخطوطات الرقمية",
    i: "س",
  },
  {
    q: "الخطط المرنة مناسبة للمشاريع الصغيرة. أنصح به لكل من يعمل في رقمنة التراث.",
    n: "عبدالله الزهراني",
    r: "طالب دكتوراه · جامعة الملك عبدالعزيز",
    i: "ع",
  },
  {
    q: "المعالجة المجمّعة أنقذتنا. رفعنا ٢٠٠٠ صفحة ليلاً واستيقظنا والنتائج جاهزة.",
    n: "رنا الجابر",
    r: "مديرة التوثيق · مؤسسة التراث",
    i: "ر",
  },
];

export function Testimonials() {
  return (
    <section
      style={{ padding: "96px 0", background: "var(--fog)", overflow: "hidden" }}
    >
      <div className="container-warraq" style={{ marginBottom: 48 }}>
        <div className="badge mb-4" style={{ marginBottom: 18 }}>
          شهادات المستخدمين
        </div>
        <h2
          style={{
            fontFamily: "Tajawal, sans-serif",
            fontSize: "clamp(26px,3.5vw,44px)",
            fontWeight: 300,
            color: "var(--carbon)",
            letterSpacing: "-0.02em",
          }}
        >
          ثقة الباحثين
        </h2>
      </div>
      <div
        className="flex no-scrollbar mx-auto"
        style={{
          gap: 18,
          padding: "8px 28px",
          overflowX: "auto",
          maxWidth: 1160,
        }}
      >
        {items.map((t, i) => (
          <div
            key={i}
            style={{
              flex: "0 0 300px",
              background: "var(--snow)",
              border: "1px solid var(--border-sub)",
              borderRadius: "var(--r-card)",
              padding: 24,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div
              style={{
                color: "var(--orange)",
                fontSize: 30,
                lineHeight: 1,
                marginBottom: 12,
                fontFamily: "Georgia, serif",
              }}
            >
              &ldquo;
            </div>
            <p
              className="font-light"
              style={{
                fontSize: 14,
                color: "var(--midnight)",
                lineHeight: 1.7,
                fontFamily: "Tajawal, sans-serif",
                marginBottom: 20,
              }}
            >
              {t.q}
            </p>
            <div className="flex items-center gap-2.5">
              <div
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "var(--orange-soft)",
                  border: "1px solid rgba(246,146,81,0.25)",
                  fontSize: 14,
                  color: "var(--orange)",
                  fontWeight: 500,
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                {t.i}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--carbon)",
                    fontFamily: "Tajawal, sans-serif",
                  }}
                >
                  {t.n}
                </div>
                <div style={{ fontSize: 11, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
                  {t.r}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
