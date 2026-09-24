// src/lib/og.tsx — أدوات صور المشاركة المشتركة
//
// مولّد الصور (Satori) لا يُطبّق خوارزميّة ثنائيّ الاتّجاه: يرصف كلمات السطر
// يساراً-يميناً وإن صحّ رسمُ حروف كلّ كلمة، فتخرج الجملة العربيّة مقلوبةَ الترتيب.
// و`direction: "rtl"` لا أثر له عنده، ولا وضعُ النصّ كاملاً في صفٍّ `row-reverse`
// (جُرّب الوجهان فخرج الناتج متطابقاً بايتاً ببايت مع المقلوب). فنرصف الكلمات
// بأنفسنا: كلّ كلمة عنصرٌ مستقلّ في صفٍّ `row-reverse` فتقع أولاها في أقصى اليمين.
import { readFile } from "fs/promises";
import path from "path";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG = { orange: "#f69251", midnight: "#181825", white: "#ffffff", pebble: "#949494" };

// الخطّ من المستودع لا من الشبكة: الروبوتات هي التي تطلب الصورة، ونداءٌ خارجيّ
// يجعلها تفشل صامتةً فتظهر الروابط بلا صورة.
export function loadOgFont() {
  return readFile(path.join(process.cwd(), "public/fonts/Tajawal-Bold.ttf"));
}

export function ogFonts(data: Buffer) {
  return [{ name: "Tajawal", data, style: "normal" as const, weight: 700 as const }];
}

// كلمةٌ لاتينيّة تلتصق بها علامة ترقيم («PDF:») تُرسم يساراً-يميناً لأنّها لاتينيّة،
// فتقع العلامة عن يمينها — وموضعها في السطر العربيّ عن يسارها. فتُقدَّم العلامة.
// الكلمات العربيّة لا تحتاج هذا: يرسمها المولّد من اليمين وتقع علامتها صحيحة.
function displayWord(w: string): string {
  const m = w.match(/^([A-Za-z0-9][A-Za-z0-9.\-]*)([:،,؛.!؟?]+)$/);
  return m ? m[2] + m[1] : w;
}

// المولّد يمرّ على كلّ مفتاحٍ في النمط ويستدعي `trim` على قيمته، فمفتاحٌ قيمته
// `undefined` (كـ`marginTop` حين لا يُمرَّر) يُفشل البناء كلّه بخطأ «reading 'trim'».
// فتُحذف المفاتيح غير المعرَّفة قبل التسليم.
function defined(style: Record<string, unknown>): React.CSSProperties {
  return Object.fromEntries(Object.entries(style).filter(([, v]) => v !== undefined)) as React.CSSProperties;
}

export function RtlLine({
  text,
  fontSize,
  color,
  marginTop,
  wrap,
  maxWidth,
  lineHeight,
}: {
  text: string;
  fontSize: number;
  color: string;
  marginTop?: number;
  wrap?: boolean; // سطرٌ طويل يلتفّ: السطر الأوّل يبدأ من اليمين ثمّ ينزل
  maxWidth?: number;
  lineHeight?: number;
}) {
  const gap = Math.round(fontSize * 0.28);
  return (
    <div
      style={defined({
        display: "flex",
        flexDirection: "row-reverse",
        alignItems: "baseline",
        fontSize,
        color,
        marginTop,
        // بلا التفاف: `gap` وحده كما كان — فالصورة الرئيسة لا تتغيّر بايتاً
        ...(wrap
          ? { flexWrap: "wrap", columnGap: gap, rowGap: Math.round(fontSize * 0.2), maxWidth, lineHeight }
          : { gap }),
      })}
    >
      {text.trim().split(/\s+/).map((word, i) => (
        <div key={i} style={{ display: "flex" }}>
          {displayWord(word)}
        </div>
      ))}
    </div>
  );
}

// بطاقة الصفحة الداخليّة: تصنيفٌ صغير، والعنوان كبيراً، والنطاق في الأسفل.
// محاذاةٌ إلى اليمين لا إلى الوسط — عنوان مقالٍ يُقرأ كسطرٍ عربيّ.
export function OgCard({ label, title, domain }: { label: string; title: string; domain: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        justifyContent: "space-between",
        background: OG.midnight,
        fontFamily: "Tajawal",
        padding: "72px 80px 60px",
        position: "relative",
      }}
    >
      <div
        style={{ position: "absolute", top: 0, right: 0, width: "100%", height: 14, background: OG.orange }}
      />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div style={{ display: "flex", fontSize: 44, color: OG.orange }}>وَرَّاق</div>
        <RtlLine text={label} fontSize={28} color={OG.pebble} marginTop={6} />
      </div>
      <RtlLine text={title} fontSize={62} color={OG.white} wrap maxWidth={1040} lineHeight={1.45} />
      <div style={{ display: "flex", fontSize: 26, color: OG.pebble }}>{domain}</div>
    </div>
  );
}
