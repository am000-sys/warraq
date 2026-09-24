// صورة مشاركةٍ لكلّ دليل تحمل عنوانه — فيظهر العنوان نفسه حين يُشارَك الرابط في
// واتساب وتلغرام بدل بطاقة الموقع العامّة. وهي أنشط قنوات التداول في الوسط العلميّ.
import { ImageResponse } from "next/og";
import { GUIDES, findGuide } from "@/content/guides";
import { OgCard, OG_SIZE, loadOgFont, ogFonts } from "@/lib/og";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const alt = `دليلٌ من ${SITE_NAME}`;
export const size = OG_SIZE;
export const contentType = "image/png";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = findGuide(slug);
  const font = await loadOgFont();
  return new ImageResponse(
    <OgCard label="دليل" title={guide?.title ?? SITE_NAME} domain={new URL(SITE_URL).host} />,
    { ...OG_SIZE, fonts: ogFonts(font) },
  );
}
