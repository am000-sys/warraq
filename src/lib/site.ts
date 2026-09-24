// src/lib/site.ts — عنوان الموقع ومعلوماته الثابتة، مصدرٌ واحد لا يُكرَّر
//
// كان `metadataBase` مكتوباً في layout.tsx على نطاق غير النطاق العامل، فتُبنى
// الروابط القانونيّة وصور المشاركة على عنوانٍ خاطئ. ولأنّ العنوان يُستعمل في
// أكثر من موضع (البيانات الوصفيّة، خريطة الموقع، robots، البريد) جُمع هنا.
//
// الأسبقيّة: متغيّر البيئة الصريح ⇐ نطاق الإنتاج الذي تُمرّره Vercel ⇐ النطاق الفعليّ.
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "https://wr-aq.com";
}

export const SITE_URL = resolveSiteUrl();
export const SITE_NAME = "وَرَّاق";
export const SITE_TAGLINE = "التراث العربي، نصّاً قابلاً للبحث.";
export const SITE_DESCRIPTION =
  "منصّة عربيّة لتحويل الكتب المصوّرة إلى نصّ رقميّ دقيق، تحفظ ترقيم الصفحات المطبوع — للمحقّقين والباحثين ودور النشر.";

// الصفحات العامّة وحدها هي ما يُفهرَس. ما تحت (app) و(admin) و/api خاصّ.
export const PUBLIC_ROUTES = ["/", "/pricing", "/try", "/guides", "/tools/pdf-check"] as const;

// المسارات الخاصّة — تُمنع من الزحف صراحةً في robots.
export const PRIVATE_PREFIXES = [
  "/api/",
  "/dashboard",
  "/upload",
  "/jobs",
  "/study",
  "/billing",
  "/settings",
  "/organization",
  "/api-keys",
  "/admin",
  "/invitations",
  "/verify-email",
  "/reset-password",
] as const;
