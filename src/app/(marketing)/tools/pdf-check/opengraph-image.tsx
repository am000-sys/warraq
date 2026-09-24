// صورة مشاركة الأداة المجّانيّة — هي طُعم الحملة، فتُعرَّف بنفسها حين تُشارَك
import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE, loadOgFont, ogFonts } from "@/lib/og";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const alt = "فاحص ملفّات PDF العربيّة — أداة مجّانيّة";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const font = await loadOgFont();
  return new ImageResponse(
    <OgCard
      label="أداة مجّانيّة"
      title="لماذا يخرج النصّ العربيّ رموزاً حين تنسخه من PDF؟"
      domain={new URL(SITE_URL).host}
    />,
    { ...OG_SIZE, fonts: ogFonts(font) },
  );
}
