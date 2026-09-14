// src/app/sitemap.ts — خريطة الموقع للصفحات العامّة وحدها
import type { MetadataRoute } from "next";
import { SITE_URL, PUBLIC_ROUTES } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    // الصفحة الرئيسة أولى، ثمّ الأسعار (صفحة القرار)، ثمّ التجربة.
    priority: path === "/" ? 1 : path === "/pricing" ? 0.8 : 0.6,
  }));
}
