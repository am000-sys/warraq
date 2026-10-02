// src/components/marketing/pricing.tsx — قسم الأسعار: يعرض ما يُشترى فعلاً
//
// الأسعار من TOPUP_PACKAGES — المصدر الذي تبيع منه صفحة الشحن — فلا يفترقان.
// والاشتراك الشهريّ قرارٌ قائم لم يُبنَ بعد، فيُعرض «قريباً» بلا زرّ شراء
// (decisions.md، 2026-11-04): لا تُعرض خطّة لا تُشترى كأنّها متاحة.
// مكوّن خادم؛ الحاسبة وأزرار الدخول وحدها تفاعليّة.
import { Check } from "lucide-react";
import {
  TOPUP_PACKAGES,
  FREE_INITIAL_PAGES,
  FLEX_MIN,
  FLEX_MAX,
  FLEX_STEP,
  FLEX_PER_PAGE,
  type TopUpPackage,
} from "@/lib/packages";
import { PAYMENT_METHODS_NOTE } from "@/lib/payments-config";
import { CONTACT_WHATSAPP_URL } from "@/lib/site";
import { AuthCta } from "@/components/marketing/auth-cta";
import { CostCalculator } from "@/components/marketing/cost-calculator";
import { ar, arGrouped, arDecimal } from "@/lib/utils";

const F = "Tajawal, sans-serif";

// ما يناله كلّ حساب — الفرق بين الباقات عددُ الصفحات وحده
const INCLUDED = [
  "حفظ ترقيم الصفحات المطبوع",
  "تصحيح الآيات بالرسم العثمانيّ",
  "تصدير TXT وMD وDOCX وJSON وXLSX",
  "معالجة قابلة للاستئناف",
];

// الاشتراك الشهريّ — يُعرض «قريباً» حتى يُبنى (الأسعار كما في prisma/seed.ts)
const SUBSCRIPTIONS = [
  { tier: "احترافي", monthly: 31, pages: 500 },
  { tier: "مؤسسي", monthly: 140, pages: 2500 },
];

type Card = {
  key: string;
  name: string;
  price: number;
  pages: string;
  note: string;
  badge?: string;
  featured?: boolean;
  cta: { guest: string; member: string; href: string };
};

const FREE_CARD: Card = {
  key: "free",
  name: "عند التسجيل",
  price: 0,
  pages: `${ar(FREE_INITIAL_PAGES)} صفحة`,
  note: "بلا بطاقة ائتمانيّة",
  cta: { guest: "ابدأ مجاناً", member: "ارفع كتابك", href: "/upload" },
};

const toCard = (p: TopUpPackage): Card => ({
  key: p.id,
  name: p.nameAr,
  price: p.amountSar,
  pages: `${arGrouped(p.pages)} صفحة`,
  note: `${arDecimal(p.perPage, 4)} ريال للصفحة`,
  badge: p.savePct ? `وفّر ${ar(p.savePct)}٪` : undefined,
  featured: p.featured,
  cta: { guest: "ابدأ مجاناً", member: "اشحن بهذه الباقة", href: `/billing?pkg=${p.id}` },
});

export function Pricing({ standalone = false }: { standalone?: boolean }) {
  const cards = [FREE_CARD, ...TOPUP_PACKAGES.map(toCard)];
  // صفحة الأسعار تحمل عنوانها الرئيس هنا؛ وفي الصفحة الرئيسة هو قسمٌ من أقسامها
  const Heading = standalone ? "h1" : "h2";

  return (
    <section
      id="pricing"
      style={{ padding: "96px 0", background: standalone ? "var(--fog)" : "var(--snow)" }}
    >
      <div className="container-warraq">
        <div className="text-center mx-auto" style={{ marginBottom: 48, maxWidth: 620 }}>
          <Heading
            className="mb-3"
            style={{
              fontFamily: F,
              fontSize: "clamp(28px,4vw,48px)",
              fontWeight: 300,
              color: "var(--carbon)",
              letterSpacing: "-0.02em",
            }}
          >
            ادفع لما تفرّغه فقط
          </Heading>
          <p className="font-light m-0" style={{ fontSize: 16, color: "var(--stone)", fontFamily: F, lineHeight: 1.75 }}>
            أوّل {ar(FREE_INITIAL_PAGES)} صفحة مجّاناً بلا بطاقة ائتمانيّة، ثمّ اشحن رصيدك بالباقة التي
            تناسب كتابك — ويبقى ما لم تستعمله في حسابك.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mx-auto" style={{ gap: 16, maxWidth: 1040 }}>
          {cards.map((c) => (
            <div
              key={c.key}
              className="relative flex flex-col"
              style={{
                background: c.featured ? "var(--slate)" : "var(--snow)",
                borderRadius: "var(--r-card)",
                padding: 24,
                border: c.featured ? "1px solid rgba(246,146,81,0.25)" : "1px solid var(--border-sub)",
                boxShadow: c.featured ? "0 8px 32px rgba(36,36,51,0.18)" : "var(--shadow-card)",
              }}
            >
              {c.badge && (
                <div
                  className="absolute"
                  style={{
                    top: -11,
                    right: 20,
                    background: "var(--orange)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 500,
                    padding: "3px 12px",
                    borderRadius: "var(--r-badge)",
                    fontFamily: F,
                  }}
                >
                  {c.badge}
                </div>
              )}
              <div style={{ fontSize: 13, color: c.featured ? "rgba(255,255,255,0.5)" : "var(--stone)", fontFamily: F, marginBottom: 12 }}>
                {c.name}
              </div>
              <div className="flex items-baseline gap-1.5" style={{ marginBottom: 6 }}>
                <span
                  style={{
                    fontFamily: F,
                    fontSize: 44,
                    fontWeight: 300,
                    color: c.featured ? "#fff" : "var(--carbon)",
                    letterSpacing: "-0.03em",
                    lineHeight: 1,
                  }}
                >
                  {c.price === 0 ? "مجّاناً" : arGrouped(c.price)}
                </span>
                {c.price > 0 && (
                  <span style={{ fontSize: 14, color: c.featured ? "rgba(255,255,255,0.5)" : "var(--stone)", fontFamily: F }}>
                    ريال
                  </span>
                )}
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: c.featured ? "#fff" : "var(--carbon)", fontFamily: F }}>
                {c.pages}
              </div>
              <div style={{ fontSize: 12.5, color: c.featured ? "var(--orange)" : "var(--stone)", fontFamily: F, marginBottom: 22 }}>
                {c.note}
              </div>
              <AuthCta
                guestLabel={c.cta.guest}
                memberLabel={c.cta.member}
                memberHref={c.cta.href}
                className={`${c.featured ? "btn-primary" : "btn-ghost"} w-full justify-center no-underline mt-auto`}
                style={{ fontSize: 14, padding: 11 }}
              />
            </div>
          ))}
        </div>

        <p className="text-center" style={{ fontFamily: F, fontSize: 13.5, color: "var(--stone)", marginTop: 22 }}>
          أو حدِّد العدد بنفسك: من {arGrouped(FLEX_MIN)} إلى {arGrouped(FLEX_MAX)} صفحة (بمضاعفات{" "}
          {ar(FLEX_STEP)}) بـ{arDecimal(FLEX_PER_PAGE)} ريال للصفحة.
        </p>

        <CostCalculator />

        {/* المزايا واحدة للجميع — يُقال صراحةً لأنّه أوّل ما يسأل عنه من اعتاد الخطط المتدرّجة */}
        <div className="mx-auto text-center" style={{ maxWidth: 900, marginTop: 28 }}>
          <div style={{ fontFamily: F, fontSize: 13, color: "var(--stone)", marginBottom: 12 }}>
            كلّ المزايا لكلّ حساب، مجّانيّاً كان أو مشحوناً:
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {INCLUDED.map((f) => (
              <span key={f} className="badge" style={{ fontSize: 12.5, fontWeight: 400 }}>
                <Check size={13} strokeWidth={2} style={{ color: "var(--orange)" }} />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* الاشتراك الشهريّ: قرارٌ قائم لم يُبنَ بعد — بلا زرّ شراء */}
        <div
          className="mx-auto"
          style={{
            maxWidth: 900,
            marginTop: 28,
            background: "var(--snow)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--r-card)",
            padding: 24,
            textAlign: "right",
          }}
        >
          <div className="flex items-center gap-2" style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: "var(--carbon)", fontFamily: F }}>
              الاشتراك الشهريّ
            </span>
            <span className="badge">قريباً</span>
          </div>
          <ul className="list-none flex flex-col" style={{ gap: 8, marginBottom: CONTACT_WHATSAPP_URL ? 18 : 0 }}>
            {SUBSCRIPTIONS.map((s) => (
              <li key={s.tier} style={{ fontSize: 14, color: "var(--stone)", fontFamily: F }}>
                <strong style={{ fontWeight: 500, color: "var(--carbon)" }}>{s.tier}</strong>:{" "}
                {ar(s.monthly)} ريالاً شهرياً، تشمل {arGrouped(s.pages)} صفحة كلّ شهر
              </li>
            ))}
          </ul>
          {CONTACT_WHATSAPP_URL && (
            <a
              href={CONTACT_WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost no-underline"
              style={{ fontSize: 14, padding: "10px 20px" }}
            >
              للجهات والطلبات الكبيرة: تواصل معنا عبر واتساب
            </a>
          )}
        </div>

        <p className="text-center" style={{ marginTop: 24, fontSize: 12, color: "var(--pebble)", fontFamily: F, lineHeight: 1.9 }}>
          شامل ضريبة القيمة المضافة · {PAYMENT_METHODS_NOTE}
        </p>
      </div>
    </section>
  );
}
