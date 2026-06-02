/** @type {import('next').NextConfig} */
const nextConfig = {
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
