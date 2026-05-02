// src/app/(marketing)/page.tsx
// ─────────────────────────
// الصفحة الرئيسية - مطابقة لتصميم المستخدم
// مرجع: design-reference/warraq-v3.html
// ─────────────────────────

import Link from "next/link";
import {
  ScanLine,
  BookOpen,
  Sparkles,
  FileText,
  Code2,
  Building2,
  Star,
  Lock,
  ArrowLeft,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { BookToTextMockup } from "@/components/book-to-text-mockup";

export default function HomePage() {
  return (
    <div className="bg-fog min-h-screen">
      <Nav />

      {/* ═══ HERO ═══ */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-7 pt-28 pb-20 relative">
        {/* Subtle radial glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-3/5 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(246,146,81,0.05) 0%, transparent 60%)",
          }}
        />

        {/* Eyebrow */}
        <div className="badge mb-8 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse-dot" />
          مدعوم بـ Claude Vision · Anthropic
        </div>

        {/* Headline */}
        <h1
          className="font-sans font-light text-carbon leading-[1.13] tracking-tighter max-w-[760px] mb-6 animate-fade-in delay-1"
          style={{ fontSize: "clamp(40px, 6vw, 72px)" }}
        >
          التراث العربي،
          <br />
          <span className="text-stone">نصاً قابلاً للبحث</span>
        </h1>

        {/* Sub */}
        <p className="text-lg text-stone leading-[1.7] max-w-[500px] mb-10 font-light animate-fade-in delay-2">
          حوِّل الكتب العربية المصوّرة إلى نصوص رقميّة دقيقة في دقائق. من
          المخطوطات القديمة إلى المطبوعات الحديثة.
        </p>

        {/* CTA */}
        <div className="flex gap-3 mb-10 flex-wrap justify-center animate-fade-in delay-3">
          <Link
            href="/signup"
            className="btn-primary"
            style={{ fontSize: 16, padding: "14px 32px" }}
          >
            ابدأ مجاناً — ١٠ صفحات
          </Link>
          <Link
            href="/pricing"
            className="btn-ghost"
            style={{ fontSize: 16, padding: "14px 32px" }}
          >
            شاهد الأسعار
          </Link>
        </div>

        {/* Trust line */}
        <div className="flex items-center gap-6 flex-wrap justify-center mb-16 animate-fade-in delay-4">
          <div className="flex items-center gap-1.5">
            <span className="text-orange tracking-widest text-xs">★★★★★</span>
            <span className="text-sm text-stone">دقّة ٩٨٪+ في العربية</span>
          </div>
          <div className="w-px h-3.5 bg-border-default" />
          <div className="flex items-center gap-1.5">
            <span className="text-orange tracking-widest text-xs">★★★★★</span>
            <span className="text-sm text-stone">يدعم المخطوطات القديمة</span>
          </div>
          <div className="w-px h-3.5 bg-border-default" />
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-stone" />
            <span className="text-sm text-stone">بياناتك مشفّرة بالكامل</span>
          </div>
        </div>

        {/* Mockup */}
        <BookToTextMockup />
      </section>

      {/* ═══ STATS ═══ */}
      <section className="py-20 bg-snow border-y border-border-sub">
        <div className="container-warraq">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { num: "+٩٨٪", label: "دقّة استخراج النصّ العربي" },
              { num: "٥+", label: "صيغ تصدير" },
              { num: "<٣ ث", label: "متوسّط معالجة الصفحة" },
              { num: "٣", label: "نماذج ذكاء اصطناعي" },
            ].map((stat, i) => (
              <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="font-sans font-light text-5xl text-carbon mb-2 tracking-tight">
                  {stat.num}
                </div>
                <div className="text-sm text-stone">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="py-24 px-7">
        <div className="container-warraq">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <span className="badge mb-4">المميّزات</span>
            <h2 className="font-sans font-light text-4xl md:text-5xl text-carbon tracking-tight leading-tight mb-4">
              صُمِّم لخصوصيّة العربيّة
            </h2>
            <p className="text-stone leading-relaxed">
              لسنا أداة OCR عاديّة. وَرَّاق يَفهم التشكيل، يَحفظ ترقيم الصفحات الأصلي،
              ويُحافظ على بنية المستند.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="card hover:-translate-y-0.5 transition-transform"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="w-11 h-11 rounded-xl bg-orange/10 flex items-center justify-center mb-5">
                  <f.icon className="w-5 h-5 text-orange" />
                </div>
                <h3 className="font-medium text-lg text-carbon mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-stone leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how" className="py-24 bg-snow border-y border-border-sub">
        <div className="container-warraq">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <span className="badge mb-4">كيف يعمل</span>
            <h2 className="font-sans font-light text-4xl md:text-5xl text-carbon tracking-tight leading-tight">
              ثلاث خطوات. لا أكثر.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="text-center">
                <div className="font-sans text-orange/30 font-light text-7xl mb-4 leading-none">
                  ٠{i + 1}
                </div>
                <h3 className="font-medium text-xl text-carbon mb-3">
                  {step.title}
                </h3>
                <p className="text-stone leading-relaxed text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ AUDIENCES ═══ */}
      <section className="py-24 bg-midnight text-white">
        <div className="container-warraq">
          <div className="max-w-2xl mx-auto text-center mb-16">
            <span
              className="badge"
              style={{
                background: "rgba(255,255,255,0.05)",
                borderColor: "rgba(255,255,255,0.1)",
                color: "#f69251",
                marginBottom: 16,
              }}
            >
              من يَستخدم وَرَّاق
            </span>
            <h2 className="font-sans font-light text-4xl md:text-5xl tracking-tight leading-tight mt-4">
              لكلّ من يَتعامل مع التراث
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {audiences.map((a, i) => (
              <div
                key={i}
                className="border border-white/10 rounded-card p-7 hover:bg-white/[0.03] transition-colors"
              >
                <a.icon className="w-6 h-6 text-orange mb-5" />
                <h3 className="font-medium text-lg mb-2">{a.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-24 px-7">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-sans font-light text-4xl md:text-5xl text-carbon tracking-tight leading-tight mb-5">
            ابدأ بعشر صفحات مجانيّة.
          </h2>
          <p className="text-stone text-lg mb-8 leading-relaxed">
            بدون بطاقة ائتمان. جرّب الجودة بنفسك،
            <br />
            ثمّ قرّر إن أردت الاستمرار.
          </p>
          <Link
            href="/signup"
            className="btn-primary"
            style={{ fontSize: 16, padding: "14px 32px" }}
          >
            أنشئ حساباً الآن
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ─── Data ─────────────────────────────────────
const features = [
  {
    icon: BookOpen,
    title: "يَفهم التراث العربي",
    desc: "مُدرَّب على كتب التراث الكلاسيكي. يميّز التشكيل والحواشي والآيات بدقّة.",
  },
  {
    icon: FileText,
    title: "يَحفظ ترقيم الصفحات الأصلي",
    desc: "ليس ترقيماً متسلسلاً جديداً — الرقم المطبوع داخل الصفحة كما هو في الكتاب.",
  },
  {
    icon: Sparkles,
    title: "بنية المستند سليمة",
    desc: "العناوين، القوائم، الجداول، الحواشي — كلّها مُحافَظ عليها بصيغة Markdown.",
  },
  {
    icon: ScanLine,
    title: "خمس صيغ تصدير",
    desc: "TXT، Markdown، Word، PDF قابل للبحث، JSON. اختر ما يناسب عملك.",
  },
  {
    icon: Code2,
    title: "API للمطوّرين",
    desc: "ادمج وَرَّاق في موقعك أو تطبيقك. واجهة برمجيّة بسيطة وموثَّقة.",
  },
  {
    icon: Star,
    title: "ثلاثة مستويات للدقّة",
    desc: "اختر السرعة (Haiku) أو التوازن (Sonnet) أو أعلى دقّة (Opus).",
  },
];

const steps = [
  {
    title: "ارفع الملفّ",
    desc: "اسحب PDF المصوّر إلى المتصفّح. حتّى ١٠٠ ميجابايت في الملفّ الواحد.",
  },
  {
    title: "اِنتظر دقائق",
    desc: "وَرَّاق يَعمل في الخلفيّة. سَنُرسل لك بريداً عند الاكتمال.",
  },
  {
    title: "حمّل النصّ",
    desc: "اختر الصيغة المناسبة وحمّل ملفّك. النتائج محفوظة ٣٠ يوماً.",
  },
];

const audiences = [
  {
    icon: BookOpen,
    title: "المحقّقون",
    desc: "ادخل النصّ المخطوط مباشرة إلى محرّر التحقيق. وفّر ساعات النَّسخ اليدوي.",
  },
  {
    icon: FileText,
    title: "الباحثون",
    desc: "ابحث في كتبك العربيّة المصوّرة. اقتبس بدقّة. أنشئ مكتبة قابلة للبحث.",
  },
  {
    icon: Building2,
    title: "المؤسّسات",
    desc: "رقمنة الأرشيف العربي للمكتبات ودور النشر والجامعات والمراكز البحثيّة.",
  },
];
