// src/app/(app)/billing/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function BillingPage() {
  const [pages, setPages] = useState(100);
  const [loading, setLoading] = useState(false);
  const [gateway, setGateway] = useState<"stripe" | "tap">("stripe");

  const PRICE = 0.25;
  const total = (pages * PRICE).toFixed(2);

  async function handlePayg() {
    setLoading(true);
    const endpoint = gateway === "stripe" ? "/api/stripe/checkout" : "/api/tap/checkout";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "payg", pages }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error ?? "فشل");
      setLoading(false);
    }
  }

  async function handleSubscribe(planSlug: string) {
    setLoading(true);
    const endpoint = gateway === "stripe" ? "/api/stripe/checkout" : "/api/tap/checkout";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "subscription", planSlug }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert(data.error ?? "فشل");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">الفوترة</h1>

      {/* Gateway selector */}
      <div className="bg-white border rounded-2xl p-4 mb-6 flex gap-2">
        <p className="text-sm text-gray-700 ml-auto">طريقة الدفع:</p>
        <button
          onClick={() => setGateway("stripe")}
          className={`px-4 py-1.5 rounded-full text-sm ${
            gateway === "stripe" ? "bg-[#0A2E54] text-white" : "bg-gray-100"
          }`}
        >
          بطاقة دولية / Apple Pay
        </button>
        <button
          onClick={() => setGateway("tap")}
          className={`px-4 py-1.5 rounded-full text-sm ${
            gateway === "tap" ? "bg-[#0A2E54] text-white" : "bg-gray-100"
          }`}
        >
          مدى / STC Pay
        </button>
      </div>

      {/* PAYG Calculator */}
      <div className="bg-[#0A2E54] text-white rounded-2xl p-6 mb-6">
        <h2 className="text-xl mb-4">دفعة واحدة</h2>
        <div className="bg-white/10 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm">عدد الصفحات</span>
            <span className="font-bold">{pages.toLocaleString("ar-SA")}</span>
          </div>
          <input
            type="range"
            min="10"
            max="2000"
            step="10"
            value={pages}
            onChange={(e) => setPages(parseInt(e.target.value))}
            className="w-full mb-3 accent-white"
          />
          <div className="flex justify-between pt-3 border-t border-white/20">
            <span>المجموع</span>
            <span className="text-xl font-bold">{total} ﷼</span>
          </div>
        </div>
        <button
          onClick={handlePayg}
          disabled={loading}
          className="w-full bg-white text-[#0A2E54] py-3 rounded-full mt-4 font-medium disabled:opacity-50"
        >
          {loading ? "..." : "ادفع الآن"}
        </button>
      </div>

      {/* Subscription Plans */}
      <h2 className="text-lg font-bold mb-3">أو اشترك شهرياً</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-2xl p-5">
          <h3 className="font-bold">باحث</h3>
          <p className="text-2xl font-bold my-2">75 ﷼<span className="text-sm font-normal text-gray-500">/شهر</span></p>
          <p className="text-sm text-gray-600 mb-4">500 صفحة شهرياً (0.15 ﷼/صفحة)</p>
          <button
            onClick={() => handleSubscribe("researcher")}
            className="w-full bg-[#0A2E54] text-white py-2 rounded-full"
          >
            اشترك
          </button>
        </div>
        <div className="bg-white border-2 border-[#0A2E54] rounded-2xl p-5">
          <h3 className="font-bold">محقّق</h3>
          <p className="text-2xl font-bold my-2">225 ﷼<span className="text-sm font-normal text-gray-500">/شهر</span></p>
          <p className="text-sm text-gray-600 mb-4">2500 صفحة شهرياً (0.09 ﷼/صفحة)</p>
          <button
            onClick={() => handleSubscribe("verifier")}
            className="w-full bg-[#0A2E54] text-white py-2 rounded-full"
          >
            اشترك
          </button>
        </div>
      </div>
    </div>
  );
}
