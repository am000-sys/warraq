// النطاق الرسميّ — نفس المصدر الذي تقرأ منه `src/lib/site.ts` وقت التشغيل.
// (لا يمكن استيراد الملفّ هنا: هذا ملفّ CommonJS وذاك TypeScript.)
const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://wr-aq.com").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // تحويل نطاق Vercel إلى النطاق الرسميّ — تحويلاً دائماً (308).
  //
  // النطاقان يخدمان الموقع نفسه، فرآهما قوقل محتوًى مكرّراً. وقد فهرس الرئيسة على
  // `*.vercel.app` قبل ضبط الوسوم أصلاً، فلمّا أعلنّا الرابط القانونيّ **خالفه**
  // واختار نطاق Vercel أصلاً و`wr-aq.com` نسخةً منه — فبقيت الرئيسة خارج الفهرس.
  // والرابط القانونيّ تلميحٌ يجوز لقوقل ردّه؛ أمّا التحويل الدائم فأمرٌ لا يُردّ.
  //
  // ثلاثة قيود مقصودة:
  // ١. في الإنتاج وحده — فنشرات المعاينة (preview) تبقى على عناوينها وإلّا تعذّر اختبارها.
  // ٢. `/api/` مستثنًى — مهامّ Vercel المجدولة تُنادي الدالّة على عنوان النشر نفسه،
  //    وتحويلها يكسر التشغيل المجدول (`vercel.json`). والتحويل غرضه الفهرسة لا الواجهات.
  // ٣. لا يُفعَّل إن كان النطاق الرسميّ نفسه على vercel.app — وإلّا دار التحويل على نفسه.
  async redirects() {
    if (process.env.VERCEL_ENV !== "production") return [];
    if (SITE_URL.includes(".vercel.app")) return [];
    return [
      {
        source: "/:path((?!api/).*)",
        has: [{ type: "host", value: "(.*)\\.vercel\\.app" }],
        destination: `${SITE_URL}/:path`,
        permanent: true,
      },
    ];
  },
  // مكتبة docx (توليد Word) تُترك خارج تجميع الخادم لتعمل بثبات على Vercel
  // (تجميعها قد يُفسد internals فيرمي خطأً وقت التوليد)
  serverExternalPackages: ["docx"],
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb", // لرفع PDFs كبيرة
    },
  },
  // تجاوز ESLint warnings الخفيفة وقت البناء (تمّ التحقّق محلّياً)
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
  },
};

module.exports = nextConfig;
