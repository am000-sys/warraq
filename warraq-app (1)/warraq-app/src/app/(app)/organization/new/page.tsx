// src/app/(app)/organization/new/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // توليد slug تلقائي من الاسم
  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "خطأ");
      setLoading(false);
      return;
    }

    const { org } = await res.json();
    router.push(`/organization/${org.id}`);
  }

  return (
    <div className="max-w-md mx-auto">
      <Link href="/organization" className="text-sm text-gray-600">
        ← العودة
      </Link>
      <h1 className="text-2xl font-bold mt-4 mb-2">مؤسسة جديدة</h1>
      <p className="text-sm text-gray-600 mb-6">
        أنشئ مساحة عمل لفريقك. يمكنك دعوة أعضاء وتقاسم رصيد الصفحات.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-2xl p-6 space-y-4"
      >
        <div>
          <label className="block text-sm mb-1">اسم المؤسسة</label>
          <input
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="مثل: مركز التحقيق العلمي"
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">المعرّف (يظهر في الرابط)</label>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <span className="px-3 py-2 bg-gray-50 text-gray-500 text-sm">
              warraq.app/
            </span>
            <input
              type="text"
              required
              minLength={3}
              pattern="[a-z0-9\-]+"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="flex-1 p-2 outline-none text-left"
              dir="ltr"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            أحرف لاتينية صغيرة وأرقام وشرطات فقط
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !name || !slug}
          className="w-full bg-[#0A2E54] text-white py-2 rounded-full disabled:opacity-50"
        >
          {loading ? "..." : "إنشاء"}
        </button>
      </form>
    </div>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-\s]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 40);
}
