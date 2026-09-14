// src/app/robots.ts — يسمح بالعامّ ويمنع الخاصّ صراحةً
import type { MetadataRoute } from "next";
import { SITE_URL, PRIVATE_PREFIXES } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // لوحة المستخدم والمالك ومسارات الـ API لا تُفهرَس: لا قيمة لها في البحث،
      // وزحفها يستهلك ميزانيّة الزحف ويكشف بنية التطبيق.
      disallow: [...PRIVATE_PREFIXES],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
