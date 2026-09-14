// src/app/opengraph-image.tsx — صورة المشاركة، مولَّدة من الكود لا ملفّاً ثابتاً
//
// تُولَّد بهويّة المنصّة (البرتقاليّ #f69251 وخطّ Tajawal). والخطّ يُقرأ من ملفّ
// داخل المستودع لا من الشبكة: صورة المشاركة تُطلب من روبوتات المنصّات الاجتماعيّة،
// فاعتمادها على نداء خارجيّ يجعلها تفشل صامتةً وتظهر الروابط بلا صورة.
import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const runtime = "nodejs";

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SUBLINE = "تفريغ الكتب المصوّرة مع حفظ ترقيم الصفحات المطبوع";

// مولّد الصور (Satori) لا يُطبّق خوارزميّة ثنائيّ الاتّجاه: يرصف كلمات السطر
// يساراً-يميناً وإن صحّ رسمُ حروف كلّ كلمة، فتخرج الجملة العربيّة مقلوبةَ الترتيب.
// و`direction: "rtl"` لا أثر له عنده (جُرّب في ثلاث بِنيات فخرج الناتج متطابقاً
// بايتاً ببايت). فنرصف الكلمات بأنفسنا: كلّ كلمة عنصرٌ مستقلّ في صفٍّ
// `row-reverse` فتقع أولاها في أقصى اليمين، و`gap` يقوم مقام المسافة بينها.
// ولا يُغني عن التقسيم أن يوضع نصٌّ كاملٌ داخل صفٍّ `row-reverse`: Satori يقسّمه
// كلماتٍ بنفسه لكنّه لا يعكس ترتيبها (جُرّب فخرج الناتج متطابقاً بايتاً ببايت مع
// الترتيب المقلوب). وهذا يصحّ للنصّ العربيّ الخالص؛ فإن أُدخلت أرقامٌ أو كلماتٌ
// لاتينيّة فراجِع الصورة بعينك قبل النشر.
function RtlLine({
  text,
  fontSize,
  color,
  marginTop,
}: {
  text: string;
  fontSize: number;
  color: string;
  marginTop?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row-reverse",
        alignItems: "baseline",
        gap: Math.round(fontSize * 0.28),
        fontSize,
        color,
        marginTop,
      }}
    >
      {text.trim().split(/\s+/).map((word, i) => (
        <div key={i} style={{ display: "flex" }}>
          {word}
        </div>
      ))}
    </div>
  );
}

export default async function Image() {
  const font = await readFile(path.join(process.cwd(), "public/fonts/Tajawal-Bold.ttf"));

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
