// src/app/(app)/organization/new/page.tsx — إنشاء مؤسسة جديدة
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Field,
  FieldLabel,
  FieldControl,
  FieldDescription,
} from "@/components/ui/field";

export default function NewOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="mx-auto" style={{ maxWidth: 480 }}>
      <Link
        href="/organization"
        className="inline-flex items-center gap-1.5 mb-4 no-underline"
        style={{
          fontSize: 13,
          color: "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
        }}
      >
        <ArrowRight size={14} />
        العودة
      </Link>

      <h1
        style={{
          fontFamily: "Tajawal, sans-serif",
          fontSize: 26,
          fontWeight: 400,
          color: "var(--carbon)",
          marginBottom: 6,
        }}
      >
        مؤسسة جديدة
      </h1>
      <p
        className="font-light"
        style={{
          fontSize: 14,
          color: "var(--stone)",
          fontFamily: "Tajawal, sans-serif",
          marginBottom: 24,
          lineHeight: 1.7,
        }}
      >
        أنشئ مساحة عمل لفريقك. يمكنك دعوة أعضاء وتقاسم رصيد الصفحات.
      </p>

      {error && (
        <div
          className="mb-4"
          style={{
            background: "rgba(201,123,132,0.10)",
            border: "1px solid rgba(201,123,132,0.20)",
            color: "var(--rose)",
            borderRadius: 12,
            padding: 12,
            fontSize: 13,
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card flex flex-col" style={{ gap: 16 }}>
        <Field>
          <FieldLabel>اسم المؤسسة</FieldLabel>
          <FieldControl
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="مثل: مركز التحقيق العلمي"
          />
        </Field>

        <Field>
          <FieldLabel>المعرّف (يظهر في الرابط)</FieldLabel>
          <div
            className="flex items-stretch overflow-hidden"
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              background: "var(--fog)",
            }}
          >
            <span
              className="flex items-center"
              style={{
                padding: "0 12px",
                background: "var(--snow)",
                borderLeft: "1px solid var(--border)",
                fontSize: 13,
                color: "var(--pebble)",
                fontFamily: "Inter, sans-serif",
              }}
            >
              warraq.app/
            </span>
            <FieldControl
              type="text"
              required
              minLength={3}
              pattern="[a-z0-9\-]+"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              dir="ltr"
              className="flex-1 rounded-none border-0 bg-transparent p-3 text-left text-[14px] font-latin"
            />
          </div>
          <FieldDescription>
            أحرف لاتينية صغيرة وأرقام وشرطات فقط
          </FieldDescription>
        </Field>

        <button
          type="submit"
          disabled={loading || !name || !slug}
          className="btn-primary w-full justify-center"
          style={{ fontSize: 15, padding: 12, marginTop: 4 }}
        >
          {loading ? "..." : "إنشاء المؤسسة"}
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
