// src/components/marketing/stats.tsx
// إحصائيات صادقة عن قدرات المنصّة (لا أرقام استخدام مُختلَقة)، وأرقام المنتج من
// مصادرها لا مكتوبةً هنا. وكان فيها «∞ صفحات في الخطط المدفوعة» والخطط محدودة،
// و«معالجة في الخلفية ٢٤/٧» والمعالجة تجري ما دامت صفحة الرفع مفتوحة.
import { Reveal } from "@/components/reveal";
import { TOPUP_PACKAGES, FREE_INITIAL_PAGES } from "@/lib/packages";
import { ar, arGrouped } from "@/lib/utils";

const largest = TOPUP_PACKAGES.reduce((a, b) => (b.pages > a.pages ? b : a));

const items = [
  { n: ar(FREE_INITIAL_PAGES), l: "صفحة مجانية عند التسجيل" },
  { n: "٥", l: "صيغ تصدير (TXT, MD, DOCX, JSON, XLSX)" },
  // عدد آي المصحف (رواية حفص، العدّ الكوفيّ) — حقيقةٌ ثابتة لا إعداد، ومُولِّد
  // src/data/quran-uthmani.json يرفض الكتابة ما لم يجده كاملاً. فلا يُستورد الملفّ
  // (١٫٣ ميجابايت) إلى حزمة الصفحة لأجل عدّه.
  { n: "٦٬٢٣٦", l: "آية مرجعيّة بالرسم العثماني لتصحيح الاقتباس" },
  { n: arGrouped(largest.pages), l: `صفحة بـ${ar(largest.amountSar)} ريال — بلا اشتراك شهريّ` },
];

export function Stats() {
  return (
    <div
      style={{
        background: "var(--snow)",
        borderTop: "1px solid var(--border-sub)",
        borderBottom: "1px solid var(--border-sub)",
      }}
    >
      <div className="container-warraq">
        <div className="grid wq-grid-4" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
          {items.map((s, i) => (
            <Reveal
              key={s.l}
              delay={i * 0.07}
              style={{
                padding: "44px 28px",
                textAlign: "center",
                borderLeft: i > 0 ? "1px solid var(--border-sub)" : "none",
              }}
            >
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 300,
                  color: "var(--carbon)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  marginBottom: 10,
                }}
              >
                {s.n}
              </div>
              <div style={{ fontSize: 13, color: "var(--stone)", lineHeight: 1.5 }}>{s.l}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
