// src/components/marketing/hero.tsx
// تكوين تحريري غير متمركز (asymmetric): النصّ يبدأ من اليمين مع فراغ متعمّد
// في المقابل، والمحاكاة المتحرّكة هي المرساة البصريّة بعرض كامل.
// دخول متدرّج عبر .wq-enter (يحترم prefers-reduced-motion من globals.css)
import Link from "next/link";
import { BookToTextMockup } from "@/components/book-to-text-mockup";

export function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "var(--fog)", padding: "112px 0 72px" }}
    >
      {/* توهّج شعاعي خافت من جهة البداية */}
      <div
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: "70%",
          height: "55%",
          background:
            "radial-gradient(ellipse 70% 55% at 80% 0%, rgba(246,146,81,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="container-warraq relative">
        {/* كتلة النصّ: تصطفّ من البداية وتترك فراغاً متعمّداً في المقابل */}
        <div style={{ maxWidth: 720 }}>
          <div className="badge wq-enter mb-7" style={{ ["--enter-delay" as string]: "0s" }}>
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-dot"
              style={{ background: "var(--orange)" }}
            />
            ذكاء اصطناعي متقدّم لقراءة العربية
          </div>

          <h1
            className="text-display wq-enter mb-6"
            style={{
              color: "var(--carbon)",
              ["--enter-delay" as string]: "0.08s",
            }}
          >
            التراث العربي،
            <br />
            <span style={{ color: "var(--stone)" }}>نصاً قابلاً للبحث</span>
          </h1>

          <p
            className="wq-enter mb-10 font-light"
            style={{
              fontSize: 18,
              color: "var(--stone)",
              lineHeight: 1.7,
              maxWidth: 480,
              ["--enter-delay" as string]: "0.16s",
            }}
          >
            حوِّل الكتب العربية المصوّرة إلى نصوص رقمية دقيقة في دقائق، مع حفظ ترقيم الصفحات
            المطبوع كما هو.
          </p>

          <div
            className="wq-enter flex gap-3 flex-wrap"
            style={{ ["--enter-delay" as string]: "0.24s" }}
          >
            <Link href="/signup" className="btn-primary no-underline" style={{ fontSize: 16, padding: "14px 32px" }}>
              ابدأ مجاناً
            </Link>
            <Link href="/try" className="btn-ghost no-underline" style={{ fontSize: 16, padding: "14px 32px" }}>
              جرّب بلا تسجيل
            </Link>
          </div>
        </div>

        {/* المرساة البصريّة: المحاكاة الحيّة كتاب → نصّ */}
        <div className="wq-enter" style={{ marginTop: 72, ["--enter-delay" as string]: "0.32s" }}>
          <BookToTextMockup />
        </div>
      </div>
    </section>
  );
}
