// src/components/marketing/cost-calculator.tsx — «كم يكلّف كتابك؟»
//
// الباحث يفكّر بعدد صفحات كتابه لا بالباقات. فيُدخل العدد، ويرى أوفر طريقٍ لشرائه
// (planPurchase — حسابٌ لا تخمين) وما يتبقّى في رصيده. ويقبل ?pages= في الرابط،
// فيصل إليه فاحص PDF بعدد صفحات الملفّ الذي فحصه الزائر للتوّ.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calculator } from "lucide-react";
import { planPurchase, singlePurchase, FREE_INITIAL_PAGES, type PurchasePlan } from "@/lib/packages";
import { useAuthState } from "@/lib/use-auth-state";
import { ar, arGrouped, arSar, arDecimal } from "@/lib/utils";

const MAX_PAGES = 100000;
const DEFAULT_PAGES = 400;
const F = "Tajawal, sans-serif";

// يقبل الأرقام العربيّة والفارسيّة كما يكتبها المستخدم، لا اللاتينيّة وحدها
function parsePages(raw: string): number {
  const latin = raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[^\d]/g, "");
  const n = parseInt(latin, 10);
  return Number.isFinite(n) ? Math.min(n, MAX_PAGES) : 0;
}

function lineLabel({ pkg, qty }: PurchasePlan["lines"][number]): string {
  if (pkg.id === "flex") return `${arGrouped(pkg.pages)} صفحة مرنة`;
  return qty > 1 ? `${pkg.nameAr} × ${ar(qty)}` : pkg.nameAr;
}

// البديل بعمليّة واحدة يُعرض متى قارب الأوفر: ريالان زائدان مقابل حوالةٍ واحدة
// وصفحاتٍ أكثر عرضٌ يستحقّ الذكر، وضعف الكلفة ليس بديلاً بل تشويش.
const SINGLE_MARGIN = 1.1;

// رابط صفحة الشحن بالباقة محدَّدةً سلفاً — حين تكون الخطّة شراءً واحداً
function billingHref(plan: PurchasePlan): string {
  if (plan.lines.length !== 1 || plan.lines[0].qty !== 1) return "/billing";
  const { pkg } = plan.lines[0];
  return pkg.id === "flex" ? `/billing?pkg=flex&pages=${pkg.pages}` : `/billing?pkg=${pkg.id}`;
}

export function CostCalculator() {
  const member = useAuthState() === "in";
  const [raw, setRaw] = useState(ar(DEFAULT_PAGES));
  // حسابٌ جديد ⇒ أوّل الصفحات مجّانيّة. والداخل استعمل رصيده غالباً فلا نفترضه
  const [fresh, setFresh] = useState(true);

  useEffect(() => {
    const p = parsePages(new URLSearchParams(window.location.search).get("pages") ?? "");
    if (p > 0) setRaw(ar(p));
  }, []);
  useEffect(() => {
    if (member) setFresh(false);
  }, [member]);

  const pages = parsePages(raw);
  const need = Math.max(0, pages - (fresh ? FREE_INITIAL_PAGES : 0));
  const best = useMemo(() => planPurchase(need), [need]);
  const single = useMemo(() => {
    if (best.purchases <= 1) return null;
    const s = singlePurchase(need);
    return s && s.totalHalalas <= best.totalHalalas * SINGLE_MARGIN ? s : null;
  }, [best, need]);
  const leftover = best.pagesGranted - need;

  return (
    <div
      id="calc"
      className="mx-auto"
      style={{
        maxWidth: 900,
        marginTop: 28,
        background: "var(--snow)",
        border: "1px solid var(--border-sub)",
        borderRadius: "var(--r-card)",
        boxShadow: "var(--shadow-card)",
        padding: 28,
        scrollMarginTop: 96,
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-start">
        {/* المُدخَل */}
        <div>
          <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
            <Calculator size={18} strokeWidth={1.7} style={{ color: "var(--orange)" }} />
            <h3 className="m-0" style={{ fontFamily: F, fontSize: 19, fontWeight: 500, color: "var(--carbon)" }}>
              كم يكلّف كتابك؟
            </h3>
          </div>
          <p className="font-light" style={{ fontFamily: F, fontSize: 14, color: "var(--stone)", lineHeight: 1.7, marginBottom: 16 }}>
            اكتب عدد صفحاته، ونحسب لك أوفر طريقٍ لشرائها.
          </p>
          <label className="label" htmlFor="calc-pages">
            عدد الصفحات
          </label>
          <div className="flex items-center gap-3">
            <input
              id="calc-pages"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className="field"
              style={{ maxWidth: 160, fontSize: 18, textAlign: "center" }}
            />
            <span style={{ fontFamily: F, fontSize: 14, color: "var(--stone)" }}>صفحة</span>
          </div>
          <label
            className="flex items-center gap-2 cursor-pointer select-none"
            style={{ fontFamily: F, fontSize: 13.5, color: "var(--stone)", marginTop: 14 }}
          >
            <input
              type="checkbox"
              checked={fresh}
              onChange={(e) => setFresh(e.target.checked)}
              style={{ accentColor: "var(--orange)", width: 16, height: 16 }}
            />
            حسابٌ جديد — أوّل {ar(FREE_INITIAL_PAGES)} صفحة مجّاناً
          </label>
        </div>

        {/* النتيجة — تُعلَن لقارئ الشاشة عند كلّ تغيير */}
        <div
          aria-live="polite"
          style={{
            background: "var(--fog)",
            border: "1px solid var(--border-sub)",
            borderRadius: 18,
            padding: 22,
            minHeight: 168,
          }}
        >
          {pages === 0 ? (
            <p className="m-0" style={{ fontFamily: F, fontSize: 14, color: "var(--pebble)", lineHeight: 1.8 }}>
              أدخِل عدد صفحات كتابك لترى كلفته.
            </p>
          ) : need === 0 ? (
            <>
              <div style={{ fontFamily: F, fontSize: 30, fontWeight: 300, color: "var(--carbon)", lineHeight: 1.2 }}>
                مجّاناً
              </div>
              <p style={{ fontFamily: F, fontSize: 14, color: "var(--stone)", lineHeight: 1.8, margin: "8px 0 18px" }}>
                يكفيه رصيد التسجيل: {ar(FREE_INITIAL_PAGES)} صفحة بلا بطاقة ائتمانيّة.
              </p>
              <Link
                href={member ? "/upload" : "/signup"}
                className="btn-primary no-underline"
                style={{ fontSize: 14, padding: "11px 24px" }}
              >
                {member ? "ارفع كتابك" : "ابدأ مجاناً"}
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span style={{ fontFamily: F, fontSize: 40, fontWeight: 300, color: "var(--carbon)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {arSar(best.totalHalalas)}
                </span>
                <span style={{ fontFamily: F, fontSize: 15, color: "var(--stone)" }}>ريال</span>
              </div>
              <div style={{ fontFamily: F, fontSize: 13.5, color: "var(--carbon)", marginTop: 10, lineHeight: 1.8 }}>
                {best.lines.map(lineLabel).join(" + ")}
              </div>
              <div style={{ fontFamily: F, fontSize: 12.5, color: "var(--stone)", lineHeight: 1.8 }}>
                {/* سعر الصفحة المشتراة — بمقياس بطاقات الباقات نفسه فيُقارَن بها */}
                ≈ {arDecimal(best.totalHalalas / 100 / best.pagesGranted)} ريال للصفحة
                {fresh && ` · بعد ${ar(FREE_INITIAL_PAGES)} صفحة مجّانيّة`}
                {leftover > 0 && ` · يبقى في رصيدك ${arGrouped(leftover)} صفحة`}
              </div>
              {single && (
                <div style={{ fontFamily: F, fontSize: 12.5, color: "var(--pebble)", lineHeight: 1.8, marginTop: 6 }}>
                  أو بعمليّة شحنٍ واحدة: {lineLabel(single.lines[0])}
                  {single.lines[0].pkg.id !== "flex" && ` (${arGrouped(single.pagesGranted)} صفحة)`} بـ
                  {arSar(single.totalHalalas)} ريال
                </div>
              )}
              <Link
                href={member ? billingHref(best) : "/signup"}
                className="btn-primary no-underline"
                style={{ fontSize: 14, padding: "11px 24px", marginTop: 16 }}
              >
                {member ? "اشحن رصيدك" : `ابدأ بـ${ar(FREE_INITIAL_PAGES)} صفحة مجّاناً`}
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
