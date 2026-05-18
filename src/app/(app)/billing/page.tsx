// src/app/(app)/billing/page.tsx — الفوترة + حاسبة PAYG + خطط
"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ar } from "@/lib/utils";

type PaidPlan = {
  slug: string;
  tier: string;
  price: number;
  pages: number;
  feats: string[];
  badge?: string;
  featured?: boolean;
};

const plans: PaidPlan[] = [
  {
    slug: "researcher",
    tier: "احترافي",
    price: 49,
    pages: 1000,
    feats: ["١٠٠٠ صفحة / شهر", "Haiku + Sonnet", "جميع صيغ التصدير", "API كاملة"],
  },
  {
    slug: "verifier",
    tier: "مؤسسي",
    price: 199,
    pages: 5000,
    badge: "الأفضل قيمة",
    feats: ["صفحات غير محدودة", "جميع النماذج", "إدارة فريق + SSO", "SLA ٩٩.٩٪"],
    featured: true,
  },
];

export default function BillingPage() {
  const [pages, setPages] = useState(100);
  const [gateway, setGateway] = useState<"stripe" | "tap">("stripe");
  const [loading, setLoading] = useState(false);

  const PRICE = 0.25;
  const total = (pages * PRICE).toFixed(2);

  async function pay(body: object) {
    setLoading(true);
    const endpoint = gateway === "stripe" ? "/api/stripe/checkout" : "/api/tap/checkout";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    if (data.url) window.location.href = data.url;
    else alert(data.error ?? "فشل");
  }

  return (
    <div>
      <PageHeader title="الفوترة" subtitle="إدارة خطّتك ورصيد الصفحات." />

      {/* Gateway picker */}
      <div className="card flex items-center gap-3" style={{ borderRadius: 16, marginBottom: 20 }}>
        <span
          style={{
            fontSize: 13,
            color: "var(--stone)",
            fontFamily: "Tajawal, sans-serif",
            marginLeft: "auto",
          }}
        >
          طريقة الدفع:
        </span>
        <div
          className="inline-flex"
          style={{
            background: "var(--fog)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-btn)",
            padding: 4,
          }}
        >
          {[
            { k: "stripe" as const, l: "بطاقة دولية / Apple Pay" },
            { k: "tap" as const, l: "مدى / STC Pay" },
          ].map((g) => (
            <button
              key={g.k}
              onClick={() => setGateway(g.k)}
              className="cursor-pointer transition-all"
              style={{
                padding: "8px 18px",
                border: "none",
                borderRadius: 24,
                background: gateway === g.k ? "var(--snow)" : "transparent",
                color: gateway === g.k ? "var(--carbon)" : "var(--stone)",
                fontSize: 13,
                fontWeight: gateway === g.k ? 500 : 400,
                fontFamily: "Tajawal, sans-serif",
                boxShadow: gateway === g.k ? "var(--shadow-card)" : "none",
              }}
            >
              {g.l}
            </button>
          ))}
        </div>
      </div>

      {/* PAYG calculator (dark card) */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "var(--slate)",
          borderRadius: 20,
          padding: 28,
          marginBottom: 24,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 100% 0%, rgba(246,146,81,0.07) 0%, transparent 70%)",
          }}
        />
        <div className="relative">
          <h2
            style={{
              fontSize: 18,
              fontWeight: 500,
              color: "#fff",
              fontFamily: "Tajawal, sans-serif",
              marginBottom: 16,
            }}
          >
            دفعة واحدة — صفحات إضافية
          </h2>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: 18,
            }}
          >
            <div className="flex justify-between mb-3">
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.6)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                عدد الصفحات
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: "#fff",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                {ar(pages)}
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={2000}
              step={10}
              value={pages}
              onChange={(e) => setPages(parseInt(e.target.value))}
              className="w-full mb-3"
              style={{ accentColor: "var(--orange)" }}
            />
            <div
              className="flex justify-between pt-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                المجموع
              </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 500,
                  color: "var(--orange)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                {total} ﷼
              </span>
            </div>
          </div>
          <button
            onClick={() => pay({ type: "payg", pages })}
            disabled={loading}
            className="btn-primary w-full justify-center"
            style={{ marginTop: 16, fontSize: 15 }}
          >
            {loading ? "..." : "ادفع الآن"}
          </button>
        </div>
      </div>

      {/* Subscriptions */}
      <h2
        style={{
          fontFamily: "Tajawal, sans-serif",
          fontSize: 16,
          fontWeight: 500,
          color: "var(--carbon)",
          marginBottom: 14,
        }}
      >
        أو اشترك شهرياً
      </h2>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {plans.map((plan) => (
          <div
            key={plan.slug}
            className="relative"
            style={{
              background: plan.featured ? "var(--slate)" : "var(--snow)",
              borderRadius: "var(--r-card)",
              padding: 24,
              border: plan.featured
                ? "1px solid rgba(246,146,81,0.25)"
                : "1px solid var(--border-sub)",
              boxShadow: plan.featured
                ? "0 8px 32px rgba(36,36,51,0.18)"
                : "var(--shadow-card)",
            }}
          >
            {plan.badge && (
              <div
                className="absolute"
                style={{
                  top: -11,
                  right: 24,
                  background: "var(--orange)",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "3px 12px",
                  borderRadius: "var(--r-badge)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                {plan.badge}
              </div>
            )}
            <div
              style={{
                fontSize: 12,
                color: plan.featured ? "rgba(255,255,255,0.4)" : "var(--stone)",
                fontFamily: "Tajawal, sans-serif",
                marginBottom: 12,
                letterSpacing: "0.04em",
              }}
            >
              {plan.tier}
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 300,
                color: plan.featured ? "#fff" : "var(--carbon)",
                fontFamily: "Tajawal, sans-serif",
                letterSpacing: "-0.02em",
                marginBottom: 4,
              }}
            >
              {plan.price}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: plan.featured ? "rgba(255,255,255,0.4)" : "var(--stone)",
                  marginRight: 4,
                }}
              >
                ﷼/شهر
              </span>
            </div>
            <ul
              className="list-none flex flex-col"
              style={{ gap: 8, marginBottom: 18 }}
            >
              {plan.feats.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2"
                  style={{
                    fontSize: 13,
                    color: plan.featured
                      ? "rgba(255,255,255,0.65)"
                      : "var(--stone)",
                    fontFamily: "Tajawal, sans-serif",
                  }}
                >
                  <span style={{ color: "var(--orange)", fontWeight: 600 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => pay({ type: "subscription", planSlug: plan.slug })}
              disabled={loading}
              className={
                plan.featured
                  ? "btn-primary w-full justify-center"
                  : "btn-ghost w-full justify-center"
              }
              style={{ fontSize: 14, padding: 11 }}
            >
              اشترك الآن
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
