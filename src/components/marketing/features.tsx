// src/components/marketing/features.tsx
// شبكة Bento بإيقاع متغيّر (4+2 / 2+4 / 3+3) بدل ثلاثة أعمدة متساوية،
// مع تنويع خلفيّات الخلايا: تظليل برتقالي للميزة المميِّزة وخليّة داكنة للنماذج.
// مكوّن خادم — الحركة عبر <Reveal /> وحالات hover عبر CSS فقط.
import {
  Hash,
  Feather,
  Zap,
  Layers,
  FileDown,
  Building2,
  Check,
} from "lucide-react";
import { Reveal } from "@/components/reveal";

const cellBase =
  "rounded-card border transition-all duration-200 hover:-translate-y-0.5";

export function Features() {
  return (
    <section id="features" style={{ padding: "96px 0", background: "var(--fog)" }}>
      <div className="container-warraq">
        <Reveal style={{ marginBottom: 52, maxWidth: 560 }}>
          <h2 className="text-h2 mb-3" style={{ color: "var(--carbon)" }}>
            كل ما يحتاجه الباحث
          </h2>
          <p
            className="font-light"
            style={{ fontSize: 17, color: "var(--stone)", lineHeight: 1.65 }}
          >
            من المخطوط الأصلي إلى نص رقمي قابل للبحث والتحرير.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-[18px]">
          {/* ١ — الميزة المميِّزة: حفظ ترقيم الصفحات (خليّة كبيرة بتظليل برتقالي) */}
          <Reveal
            className={`md:col-span-4 ${cellBase}`}
            style={{
              background: "var(--orange-soft)",
              borderColor: "var(--orange-mid)",
              padding: 28,
            }}
          >
            <div className="flex flex-col md:flex-row items-start gap-6 h-full">
              <div className="flex-1">
                <IconTile icon={Hash} />
                <div className="mb-2" style={{ fontSize: 19, fontWeight: 500, color: "var(--carbon)" }}>
                  حفظ ترقيم الصفحات المطبوع
                </div>
                <p
                  className="font-light m-0"
                  style={{ fontSize: 14.5, color: "var(--stone)", lineHeight: 1.75, maxWidth: 380 }}
                >
                  نقرأ رقم الصفحة المطبوع داخل الصفحة نفسها ونثبته في النصّ، لا ترقيماً
                  متسلسلاً جديداً. مرجعيّة دقيقة يعتمد عليها المحقّق والباحث في العزو والإحالة.
                </p>
              </div>
              {/* توضيح مصغّر: ورقة برقمها المطبوع → السطر الناتج يحمل الرقم نفسه */}
              <div className="flex items-center gap-4 self-center" aria-hidden>
                <div
                  className="flex flex-col gap-1.5 justify-between"
                  style={{
                    width: 84,
                    height: 108,
                    background: "var(--snow)",
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "12px 10px",
                  }}
                >
                  {["82%", "94%", "70%", "88%", "60%"].map((w, i) => (
                    <div key={i} style={{ height: 5, width: w, background: "rgba(0,0,0,0.1)", borderRadius: 2 }} />
                  ))}
                  <div
                    className="self-center"
                    style={{ fontSize: 11, color: "var(--carbon)", fontWeight: 700, marginTop: 4 }}
                  >
                    ٢٤٧
                  </div>
                </div>
                <span style={{ color: "var(--orange)", fontSize: 16 }}>←</span>
                <div
                  className="badge"
                  style={{ background: "var(--snow)", borderColor: "var(--orange-mid)", color: "var(--carbon)" }}
                >
                  ص ٢٤٧
                </div>
              </div>
            </div>
          </Reveal>

          {/* ٢ — الخطوط العربية */}
          <Reveal
            delay={0.08}
            className={`md:col-span-2 ${cellBase}`}
            style={{ background: "var(--snow)", borderColor: "var(--border-sub)", padding: 28, boxShadow: "var(--shadow-card)" }}
          >
            <IconTile icon={Feather} />
            <div className="mb-2" style={{ fontSize: 17, fontWeight: 500, color: "var(--carbon)" }}>
              دعم كامل للخطوط العربية
            </div>
            <p className="font-light m-0" style={{ fontSize: 14, color: "var(--stone)", lineHeight: 1.7 }}>
              نسخ، ثلث، ديواني، رقعة، كوفي، مع الشكل والتشديد. يتعامل مع أصعب المخطوطات.
            </p>
          </Reveal>

          {/* ٣ — معالجة سريعة */}
          <Reveal
            className={`md:col-span-2 ${cellBase}`}
            style={{ background: "var(--snow)", borderColor: "var(--border-sub)", padding: 28, boxShadow: "var(--shadow-card)" }}
          >
            <IconTile icon={Zap} />
            <div className="mb-2" style={{ fontSize: 17, fontWeight: 500, color: "var(--carbon)" }}>
              معالجة سريعة
            </div>
            <p className="font-light m-0" style={{ fontSize: 14, color: "var(--stone)", lineHeight: 1.7 }}>
              معالجة الصفحات في ثوانٍ، مع تشغيل متوازٍ للكتب الضخمة دون انتظار.
            </p>
          </Reveal>

          {/* ٤ — ثلاثة نماذج (خليّة داكنة) */}
          <Reveal
            delay={0.08}
            className={`md:col-span-4 ${cellBase}`}
            style={{ background: "var(--midnight)", borderColor: "var(--slate)", padding: 28 }}
          >
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-1">
                <IconTile icon={Layers} dark />
                <div className="mb-2" style={{ fontSize: 19, fontWeight: 500, color: "#fff" }}>
                  ثلاثة نماذج ذكاء
                </div>
                <p
                  className="font-light m-0"
                  style={{ fontSize: 14.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.75, maxWidth: 360 }}
                >
                  سريع للنصوص الواضحة، جيّد للأغلب، وفائق لأصعب المخطوطات. اختر الأنسب
                  لكلّ كتاب.
                </p>
              </div>
              <div className="flex flex-col gap-2 self-center w-full md:w-auto" aria-hidden>
                {[
                  { k: "سريع", active: false },
                  { k: "جيد", active: true },
                  { k: "فائق", active: false },
                ].map((m) => (
                  <div
                    key={m.k}
                    className="flex items-center justify-between gap-8"
                    style={{
                      minWidth: 150,
                      padding: "8px 14px",
                      borderRadius: 10,
                      fontSize: 13,
                      color: m.active ? "#fff" : "rgba(255,255,255,0.45)",
                      background: m.active ? "rgba(246,146,81,0.16)" : "rgba(255,255,255,0.04)",
                      border: `1px solid ${m.active ? "rgba(246,146,81,0.4)" : "rgba(255,255,255,0.08)"}`,
                    }}
                  >
                    {m.k}
                    {m.active && <Check size={14} strokeWidth={2} style={{ color: "var(--orange)" }} />}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          {/* ٥ — تصدير متعدد الصيغ */}
          <Reveal
            className={`md:col-span-3 ${cellBase}`}
            style={{ background: "var(--snow)", borderColor: "var(--border-sub)", padding: 28, boxShadow: "var(--shadow-card)" }}
          >
            <IconTile icon={FileDown} />
            <div className="mb-2" style={{ fontSize: 17, fontWeight: 500, color: "var(--carbon)" }}>
              تصدير متعدد الصيغ
            </div>
            <p className="font-light mb-4" style={{ fontSize: 14, color: "var(--stone)", lineHeight: 1.7 }}>
              نتائجك جاهزة في أداتك المفضلة، أو ادمجها مباشرة عبر API.
            </p>
            <div className="flex gap-2 flex-wrap" aria-hidden>
              {["TXT", "MD", "DOCX", "JSON", "XLSX"].map((f) => (
                <span key={f} className="badge" style={{ fontFamily: "Inter, sans-serif", fontSize: 11 }}>
                  {f}
                </span>
              ))}
            </div>
          </Reveal>

          {/* ٦ — حسابات المؤسسات */}
          <Reveal
            delay={0.08}
            className={`md:col-span-3 ${cellBase}`}
            style={{ background: "var(--snow)", borderColor: "var(--border-sub)", padding: 28, boxShadow: "var(--shadow-card)" }}
          >
            <IconTile icon={Building2} />
            <div className="mb-2" style={{ fontSize: 17, fontWeight: 500, color: "var(--carbon)" }}>
              حسابات المؤسسات
            </div>
            <p className="font-light m-0" style={{ fontSize: 14, color: "var(--stone)", lineHeight: 1.7 }}>
              فريق كامل بأدوار متعددة وفوترة مركزية. مثالي للمكتبات ودور الأرشفة
              ومشاريع الرقمنة الكبيرة.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function IconTile({ icon: Icon, dark = false }: { icon: typeof Hash; dark?: boolean }) {
  return (
    <div
      className="flex items-center justify-center mb-4"
      style={{
        width: 40,
        height: 40,
        background: dark ? "rgba(246,146,81,0.14)" : "var(--orange-soft)",
        border: `1px solid ${dark ? "rgba(246,146,81,0.3)" : "var(--orange-mid)"}`,
        borderRadius: "var(--r-inner)",
        color: "var(--orange)",
      }}
    >
      <Icon size={19} strokeWidth={1.7} />
    </div>
  );
}
