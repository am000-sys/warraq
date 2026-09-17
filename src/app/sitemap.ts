// src/app/sitemap.ts — خريطة الموقع للصفحات العامّة وحدها
import type { MetadataRoute } from "next";
import { SITE_URL, PUBLIC_ROUTES } from "@/lib/site";
import { GUIDES } from "@/content/guides";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const pages = PUBLIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    // الصفحة الرئيسة أولى، ثمّ الأسعار (صفحة القرار)، ثمّ ما دونها.
    priority: path === "/" ? 1 : path === "/pricing" ? 0.8 : 0.6,
  }));

  // المقالات تُدرَج من مصدرها الواحد، فإضافة مقالٍ تُدخله الخريطة بلا تعديل هنا.
  // و`lastModified` تاريخُ تعديل المقال نفسه لا تاريخ البناء: تاريخُ بناءٍ متجدّد
  // على محتوًى لم يتغيّر يُفقد الإشارة معناها لدى الزاحف.
  const guides = GUIDES.map((g) => ({
    url: `${SITE_URL}/guides/${g.slug}`,
    lastModified: new Date(g.updated),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...pages, ...guides];
}
