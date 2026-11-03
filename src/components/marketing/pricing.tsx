// src/components/marketing/pricing.tsx
// ما يُشترى اليوم: باقات صفحات مسبقة الدفع، وأسعارها من src/lib/packages.ts (المصدر الوحيد).
// الاشتراك الشهريّ قرارٌ قائم لم يُبنَ بعد، فيُعرض «قريباً» بلا زرّ شراء
// (decisions.md، 2026-11-04): لا تُعرض خطّة لا تُشترى كأنّها متاحة.
"use client";

import Link from "next/link";
import {
  TOPUP_PACKAGES,
  FLEX_MIN,
  FLEX_MAX,
  FLEX_STEP,
  FLEX_PER_PAGE,
} from "@/lib/packages";
import { CONTACT_WHATSAPP_URL } from "@/lib/site";
import { useAuthState } from "@/lib/use-auth-state";
import { ar, arNum } from "@/lib/utils";

// سعر الصفحة بكسوره كاملة (٠٫٠٣٧٦ لا ٠٫٠٣٨)
const perPage = (n: number) => n.toLocaleString("ar-SA", { maximumFractionDigits: 4 });

// الاشتراك الشهريّ — يُعرض «قريباً» حتى يُبنى (الأسعار كما في prisma/seed.ts)
const SUBSCRIPTIONS = [
  { tier: "احترافي", monthly: 31, pages: 500 },
  { tier: "مؤسسي", monthly: 140, pages: 2500 },
];

type Card = {
  tier: string;
  price: number;
  unit: string;
  feats: string[];
  cta: string;
  href: string;
  featured?: boolean;
};

export function Pricing({ standalone = false }: { standalone?: boolean }) {
  // الشراء يحتاج حساباً، والتسجيل يُدخل المستخدم إلى لوحته ومعه الرصيد المجّانيّ
  const authed = useAuthState() === "in";

  const cards: Card[] = [
    {
      tier: "مجاني",
      price: 0,
      unit: "ريال · عند التسجيل",
      feats: ["٥٠ صفحة مجاناً", "تفريغ عالي الدقّة", "تصدير TXT و MD", "بلا بطاقة ائتمانية"],
      cta: "ابدأ مجاناً",
      href: authed ? "/upload" : "/signup",
    },
    ...TOPUP_PACKAGES.map((p) => ({
      tier: p.nameAr,
      price: p.amountSar,
      unit: "ريال · دفعة واحدة",
      feats: [
        `${arNum(p.pages)} صفحة`,
        `${perPage(p.perPage)} ريال للصفحة`,
        ...(p.savePct ? [`وفّر ${ar(p.savePct)}٪`] : []),
      ],
      cta: authed ? "اشترِ الباقة" : "سجّل واشترِ",
      href: authed ? "/billing" : "/signup",
      featured: p.featured,
    })),
  ];

  return (
    <section
      style={{
        padding: "96px 0",
        background: standalone ? "var(--fog)" : "var(--snow)",
      }}
    >
      <div className="container-warraq">
        <div className="text-center" style={{ marginBottom: 52 }}>
          <h2
            className="mb-3"
            style={{
              fontFamily: "Tajawal, sans-serif",
              fontSize: "clamp(28px,4vw,48px)",
              fontWeight: 300,
              color: "var(--carbon)",
              letterSpacing: "-0.02em",
            }}
          >
            ابدأ مجاناً
          </h2>
          <p
            className="font-light"
            style={{
              fontSize: 16,
              color: "var(--stone)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            بدون بطاقة ائتمانية · اشحن رصيدك متى احتجت
          </p>
        </div>

        <div
          className="grid mx-auto wq-grid-3"
          style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 18, maxWidth: 1080 }}
        >
          {cards.map((card) => (
            <div
              key={card.tier}
              style={{
                background: card.featured ? "var(--slate)" : "var(--snow)",
                borderRadius: "var(--r-card)",
                padding: 28,
                border: card.featured
                  ? "1px solid rgba(246,146,81,0.25)"
                  : "1px solid var(--border-sub)",
                boxShadow: card.featured
                  ? "0 8px 32px rgba(36,36,51,0.18)"
                  : "var(--shadow-card)",
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: card.featured ? "rgba(255,255,255,0.4)" : "var(--stone)",
                  fontFamily: "Tajawal, sans-serif",
                  marginBottom: 14,
                  letterSpacing: "0.04em",
                }}
              >
                {card.tier}
              </div>
              <div
                style={{
                  fontFamily: "Tajawal, sans-serif",
                  fontSize: 48,
                  fontWeight: 300,
                  color: card.featured ? "#fff" : "var(--carbon)",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                {ar(card.price)}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: card.featured ? "rgba(255,255,255,0.4)" : "var(--stone)",
                  fontFamily: "Tajawal, sans-serif",
                  marginBottom: 24,
                }}
              >
                {card.unit}
              </div>
              <ul
                className="list-none flex flex-col"
                style={{ gap: 10, marginBottom: 24 }}
              >
                {card.feats.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2"
                    style={{
                      fontSize: 13,
                      color: card.featured
                        ? "rgba(255,255,255,0.65)"
                        : "var(--stone)",
                      fontFamily: "Tajawal, sans-serif",
                    }}
                  >
                    <span style={{ color: "var(--orange)", fontWeight: 600, flexShrink: 0 }}>
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={card.href}
                className={
                  card.featured
                    ? "btn-primary w-full justify-center no-underline"
                    : "btn-ghost w-full justify-center no-underline"
                }
                style={{ fontSize: 14, padding: 12 }}
              >
                {card.cta}
              </Link>
            </div>
          ))}
        </div>

        <p
          className="text-center"
          style={{
            marginTop: 20,
            fontSize: 13,
            color: "var(--stone)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          أو اشحن أيّ عدد من الصفحات بين {arNum(FLEX_MIN)} و{arNum(FLEX_MAX)} (بمضاعفات{" "}
          {ar(FLEX_STEP)}) بسعر {perPage(FLEX_PER_PAGE)} ريال للصفحة.
        </p>

        {/* الاشتراك الشهريّ: قرارٌ قائم لم يُبنَ بعد — بلا زرّ شراء */}
        <div
          className="mx-auto"
          style={{
            maxWidth: 1080,
            marginTop: 36,
            background: "var(--snow)",
            border: "1px dashed var(--border)",
            borderRadius: "var(--r-card)",
            padding: 28,
            textAlign: "right",
          }}
        >
          <div className="flex items-center gap-2" style={{ marginBottom: 14 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--carbon)",
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              الاشتراك الشهريّ
            </span>
            <span className="badge">قريباً</span>
          </div>
          <ul
            className="list-none flex flex-col"
            style={{ gap: 8, marginBottom: CONTACT_WHATSAPP_URL ? 20 : 0 }}
          >
            {SUBSCRIPTIONS.map((s) => (
              <li
                key={s.tier}
                style={{ fontSize: 14, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}
              >
                <strong style={{ fontWeight: 500, color: "var(--carbon)" }}>{s.tier}</strong>:{" "}
                {ar(s.monthly)} ريالاً شهرياً، تشمل {arNum(s.pages)} صفحة كلّ شهر
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

        <p
          className="text-center"
          style={{
            marginTop: 24,
            fontSize: 12,
            color: "var(--pebble)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          شامل ضريبة القيمة المضافة · الدفع بالتحويل البنكيّ — والبطاقات قريباً
        </p>
      </div>
    </section>
  );
}
