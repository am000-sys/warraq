// src/app/(auth)/layout.tsx
// إطار مشترك لصفحات المصادقة - بساطة مع لمسة بصريّة

import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* ─── الجانب الأيسر: النموذج ─── */}
      <div className="flex flex-col p-8">
        <div className="flex items-center justify-between">
          <Logo />
          <Link href="/" className="text-[13px] text-ink-faint hover:text-ink transition-colors">
            ← الرئيسيّة
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-sm animate-fade-up">{children}</div>
        </div>

        <p className="text-[11px] text-ink-faint text-center">
          © ٢٠٢٦ وَرَّاق · جميع الحقوق محفوظة
        </p>
      </div>

      {/* ─── الجانب الأيمن: زخرفة ─── */}
      <div className="hidden lg:block bg-navy relative overflow-hidden">
        {/* Background ornaments */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-warraq-gold/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-navy-soft/30 rounded-full blur-3xl" />
        </div>

        {/* Pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="islamic-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="20" stroke="white" strokeWidth="1" fill="none" />
              <circle cx="0" cy="0" r="20" stroke="white" strokeWidth="1" fill="none" />
              <circle cx="60" cy="0" r="20" stroke="white" strokeWidth="1" fill="none" />
              <circle cx="0" cy="60" r="20" stroke="white" strokeWidth="1" fill="none" />
              <circle cx="60" cy="60" r="20" stroke="white" strokeWidth="1" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#islamic-pattern)" />
        </svg>

        <div className="relative h-full flex flex-col justify-center p-12 text-white">
          <div className="text-warraq-gold-soft text-[12px] font-medium tracking-widest uppercase mb-4">
            من تراثنا
          </div>

          <blockquote className="font-display font-bold text-3xl leading-snug mb-6 max-w-md">
            "الكِتابُ نِعْمَ الذَّخيرَةُ وَالعُقْدَةُ،
            <br />
            وَنِعْمَ الجَليسُ ساعَةَ الوَحْدَةِ."
          </blockquote>

          <cite className="text-white/60 text-sm not-italic">
            ❋ الجاحظ، البيان والتبيين
          </cite>

          <div className="mt-12 max-w-md">
            <div className="h-px bg-white/20 mb-6" />
            <p className="text-white/80 leading-relaxed">
              من البيان الذي سَحَر العقول، إلى نصٍّ تَبحث فيه بسهولة.
              <br />
              <span className="text-warraq-gold-soft">وَرَّاق يَخدم تراثنا.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
