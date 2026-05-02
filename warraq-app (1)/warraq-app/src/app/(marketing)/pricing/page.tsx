// src/app/(marketing)/pricing/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles, Zap, Crown } from "lucide-react";
import { Logo } from "@/components/logo";

export default function PricingPage() {
  const [pages, setPages] = useState(100);
  const PRICE_PER_PAGE = 0.25;
  const total = (pages * PRICE_PER_PAGE).toFixed(2);

  return (
    <div className="min-h-screen bg-canvas">
      {/* ─── Nav ─── */}
      <header className="border-b border-border-soft bg-canvas/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo />
          <Link href="/" className="btn-ghost text-[13px]">
            <ArrowLeft className="w-3.5 h-3.5" />
            الرئيسيّة
          </Link>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="py-20 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-warraq-gold text-[13px] font-medium tracking-widest uppercase mb-3 animate-fade-in">
            تسعير شفّاف
          </p>
          <h1 className="font-display font-bold text-5xl md:text-6xl text-ink tracking-tighter mb-6 animate-fade-up">
            ادفع كما يناسبك
          </h1>
          <p className="text-lg text-ink-soft leading-relaxed animate-fade-up stagger-1">
            اشترك شهريّاً للأسعار الأرخص للصفحة، أو ادفع لمرّة واحدة فقط بدون التزام.
          </p>
        </div>
      </section>

      {/* ─── PAYG Calculator ─── */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-6">
          <div className="bg-gradient-navy rounded-3xl p-8 md:p-10 text-white shadow-soft-lg overflow-hidden relative">
            {/* Decorative ornament */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-warraq-gold/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

            <div className="relative">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-warraq-gold-soft text-[12px] font-medium tracking-widest uppercase mb-2">
                    دفعة واحدة
                  </p>
                  <h2 className="font-display font-bold text-3xl">
                    احسب تكلفة كتابك
                  </h2>
                </div>
                <Sparkles className="w-6 h-6 text-warraq-gold-soft" />
              </div>

              <div className="bg-white/[0.06] backdrop-blur-sm rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-baseline mb-4">
                  <span className="text-white/70 text-sm">عدد الصفحات</span>
                  <span className="font-display font-bold text-3xl arabic-numerals">
                    {pages.toLocaleString("ar-SA")}
                  </span>
                </div>

                <input
                  type="range"
                  min="10"
                  max="2000"
                  step="10"
                  value={pages}
                  onChange={(e) => setPages(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-full appearance-none accent-warraq-gold-soft cursor-pointer mb-2"
                  style={{
                    background: `linear-gradient(to left, rgb(var(--warraq-gold-soft)) 0%, rgb(var(--warraq-gold-soft)) ${(pages / 2000) * 100}%, rgba(255,255,255,0.1) ${(pages / 2000) * 100}%, rgba(255,255,255,0.1) 100%)`,
                  }}
                />

                <div className="flex justify-between text-[11px] text-white/40 arabic-numerals">
                  <span>١٠</span>
                  <span>٢٠٠٠</span>
                </div>

                <div className="border-t border-white/10 mt-6 pt-6 flex justify-between items-center">
                  <div>
                    <p className="text-white/60 text-[12px] mb-1">المجموع</p>
                    <p className="font-display font-bold text-4xl arabic-numerals">
                      {total} <span className="text-2xl font-normal">﷼</span>
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-white/60 text-[11px] mb-1">السعر للصفحة</p>
                    <p className="text-white/90 text-[13px] arabic-numerals">٠٫٢٥ ﷼</p>
                  </div>
                </div>
              </div>

              <Link
                href={`/signup?pages=${pages}`}
                className="mt-6 w-full bg-white text-navy font-display font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-warraq-gold-soft transition-colors"
              >
                ابدأ الآن — ادفع لاحقاً عند الرفع
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Subscription Plans ─── */}
      <section className="pb-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display font-bold text-3xl md:text-4xl text-ink tracking-tight mb-3">
              أو اشترك شهريّاً
            </h2>
            <p className="text-ink-soft">
              للأسعار الأقلّ للصفحة. ألغِ في أيّ وقت.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((plan, i) => (
              <PlanCard key={i} plan={plan} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-24 border-t border-border-soft bg-paper-warm">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display font-bold text-3xl text-center text-ink tracking-tight mb-12">
            أسئلة شائعة
          </h2>

          <div className="space-y-4">
            {faq.map((q, i) => (
              <details key={i} className="card group">
                <summary className="cursor-pointer p-5 list-none flex items-center justify-between">
                  <span className="font-display font-medium text-[15px] text-ink">
                    {q.q}
                  </span>
                  <span className="text-ink-faint group-open:rotate-180 transition-transform">
                    ▾
                  </span>
                </summary>
                <p className="px-5 pb-5 text-ink-soft text-[14px] leading-relaxed">
                  {q.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border-soft py-10 text-center">
        <p className="text-ink-faint text-[13px]">© ٢٠٢٦ وَرَّاق</p>
      </footer>
    </div>
  );
}

// ─── Plan Card ─────────────────────────────────
function PlanCard({ plan }: { plan: any }) {
  const Icon = plan.icon;
  return (
    <div
      className={`relative p-7 rounded-3xl transition-all ${
        plan.popular
          ? "bg-navy text-white shadow-soft-lg"
          : "bg-paper border border-border hover:border-ink-faint/40"
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 right-7 bg-warraq-gold text-white text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full">
          الأكثر شيوعاً
        </div>
      )}

      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${
          plan.popular ? "bg-white/10" : "bg-navy/5"
        }`}
      >
        <Icon className={`w-5 h-5 ${plan.popular ? "text-warraq-gold-soft" : "text-navy"}`} />
      </div>

      <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
      <p className={`text-[13px] mb-6 ${plan.popular ? "text-white/60" : "text-ink-soft"}`}>
        {plan.tagline}
      </p>

      <div className="mb-1 arabic-numerals">
        <span className="font-display font-bold text-5xl">{plan.price}</span>
        <span className={`text-sm mr-2 ${plan.popular ? "text-white/60" : "text-ink-soft"}`}>
          ﷼/شهر
        </span>
      </div>
      <p className={`text-[12px] mb-7 ${plan.popular ? "text-white/50" : "text-ink-faint"} arabic-numerals`}>
        {plan.pricePerPage} للصفحة
      </p>

      <Link
        href={plan.cta.href}
        className={`block text-center py-3 rounded-2xl font-medium text-[14px] transition-colors mb-6 ${
          plan.popular
            ? "bg-white text-navy hover:bg-warraq-gold-soft"
            : "bg-navy text-white hover:bg-navy/90"
        }`}
      >
        {plan.cta.label}
      </Link>

      <ul className="space-y-2.5">
        {plan.features.map((f: string, i: number) => (
          <li key={i} className="flex items-start gap-2 text-[13px]">
            <Check
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                plan.popular ? "text-warraq-gold-soft" : "text-navy"
              }`}
            />
            <span className={plan.popular ? "text-white/85" : "text-ink-soft"}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Data ─────────────────────────────────────
const plans = [
  {
    name: "مجاني",
    icon: Sparkles,
    tagline: "لتجربة الجودة قبل الشراء",
    price: "٠",
    pricePerPage: "—",
    cta: { label: "ابدأ مجاناً", href: "/signup" },
    features: [
      "١٠ صفحات شهريّاً",
      "نموذج Sonnet (متوازن)",
      "تصدير TXT وMarkdown وWord",
      "حفظ النتائج ٣٠ يوماً",
    ],
  },
  {
    name: "باحث",
    icon: Zap,
    tagline: "للباحثين والكتّاب الأفراد",
    price: "٧٥",
    pricePerPage: "٠٫١٥ ﷼",
    popular: true,
    cta: { label: "اشترك الآن", href: "/billing?plan=researcher" },
    features: [
      "٥٠٠ صفحة شهريّاً",
      "كلّ النماذج بما فيها Opus",
      "كلّ صيغ التصدير + JSON",
      "API للمطوّرين",
      "ملفّات حتّى ١٠٠ م.ب",
      "أولويّة في المعالجة",
    ],
  },
  {
    name: "محقّق",
    icon: Crown,
    tagline: "لمراكز التحقيق والمؤسّسات",
    price: "٢٢٥",
    pricePerPage: "٠٫٠٩ ﷼",
    cta: { label: "اشترك", href: "/billing?plan=verifier" },
    features: [
      "٢٥٠٠ صفحة شهريّاً",
      "نموذج Opus (أعلى دقّة)",
      "حسابات مؤسّسة + أعضاء",
      "API + Webhooks",
      "ملفّات حتّى ٢٠٠ م.ب",
      "دعم فنّيّ مخصَّص",
    ],
  },
];

const faq = [
  {
    q: "هل يفهم وَرَّاق التشكيل؟",
    a: "نعم، تماماً. وَرَّاق يحفظ التشكيل (الفتحة، الكسرة، الضمة، الشدة، التنوين) كما هو في النصّ الأصلي.",
  },
  {
    q: "ماذا يحدث لرصيدي إن لم أستخدمه في الشهر؟",
    a: "للأسف، الصفحات الشهريّة في الاشتراكات لا تتراكم — تتجدّد كلّ شهر. إن أردتَ صفحات تبقى معك، استخدم خيار الدفع لمرّة واحدة (PAYG).",
  },
  {
    q: "هل يمكنني إلغاء الاشتراك؟",
    a: "نعم، في أيّ وقت. ستحتفظ بالصفحات المتبقّية حتّى نهاية الشهر المدفوع، ثمّ يَتوقّف التجديد.",
  },
  {
    q: "ما الفرق بين النماذج الثلاثة؟",
    a: "Haiku أسرع وأرخص للنصوص الواضحة. Sonnet متوازن للاستخدام العام. Opus الأعلى دقّة للمخطوطات الصعبة والحواشي المعقّدة.",
  },
  {
    q: "هل يمكنني الدفع بمدى أو STC Pay؟",
    a: "نعم. ندعم: مدى، Apple Pay، STC Pay، Visa، MasterCard. اختر طريقتك المفضّلة عند الدفع.",
  },
];
