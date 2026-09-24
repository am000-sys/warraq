// src/app/opengraph-image.tsx — صورة المشاركة، مولَّدة من الكود لا ملفّاً ثابتاً
//
// تُولَّد بهويّة المنصّة (البرتقاليّ #f69251 وخطّ Tajawal). والخطّ يُقرأ من ملفّ
// داخل المستودع لا من الشبكة: صورة المشاركة تُطلب من روبوتات المنصّات الاجتماعيّة،
// فاعتمادها على نداء خارجيّ يجعلها تفشل صامتةً وتظهر الروابط بلا صورة.
import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { RtlLine, loadOgFont } from "@/lib/og";

export const runtime = "nodejs";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SUBLINE = "تفريغ الكتب المصوّرة مع حفظ ترقيم الصفحات المطبوع";

export default async function Image() {
  const font = await loadOgFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#181825",
          fontFamily: "Tajawal",
          position: "relative",
        }}
      >
        {/* شريط الهويّة البرتقاليّ */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "100%",
            height: 14,
            background: "#f69251",
          }}
        />
        <div style={{ display: "flex", fontSize: 132, color: "#f69251", lineHeight: 1.3 }}>
          {SITE_NAME}
        </div>
        <RtlLine text={SITE_TAGLINE} fontSize={44} color="#ffffff" marginTop={8} />
        <RtlLine text={SUBLINE} fontSize={28} color="#949494" marginTop={40} />
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Tajawal", data: font, style: "normal", weight: 700 }],
    },
  );
}
