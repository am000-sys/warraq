// src/app/(app)/api-keys/page.tsx — مفاتيح API للمطوّرين
"use client";

import { useEffect, useState } from "react";
import { Copy, Trash2, Key } from "lucide-react";
import { PageHeader } from "@/components/page-header";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const res = await fetch("/api/api-keys");
    const data = await res.json();
    setKeys(data.keys ?? []);
    setLoading(false);
  }

  async function handleCreate() {
    if (!name) return;
    setCreating(true);
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setCreating(false);
    if (data.apiKey?.key) {
      setNewKey(data.apiKey.key);
      setName("");
      refresh();
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("إلغاء هذا المفتاح نهائياً؟")) return;
    await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
    refresh();
  }

  function copy() {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div>
      <PageHeader
        title="مفاتيح API"
        subtitle="للمطوّرين الذين يستخدمون واجهة وَرَّاق البرمجية."
      />

      {newKey && (
        <div
          className="mb-5"
          style={{
            background: "var(--orange-soft)",
            border: "1px solid rgba(246,146,81,0.3)",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Key size={16} color="var(--orange)" />
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--orange)",
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              احفظ هذا المفتاح الآن — لن يُعرض ثانيةً
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code
              className="flex-1"
              style={{
                background: "var(--snow)",
                padding: 12,
                borderRadius: 10,
                fontSize: 12,
                fontFamily: "ui-monospace, Menlo, monospace",
                wordBreak: "break-all",
                direction: "ltr",
                textAlign: "left",
              }}
            >
              {newKey}
            </code>
            <button
              onClick={copy}
              className="btn-ghost"
              style={{ fontSize: 12, padding: "8px 14px" }}
            >
              <Copy size={13} />
              {copied ? "نُسخ!" : "نسخ"}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-3 cursor-pointer"
            style={{
              background: "none",
              border: "none",
              fontSize: 12,
              color: "var(--stone)",
              fontFamily: "Tajawal, sans-serif",
            }}
          >
            حفظتُ المفتاح ✓
          </button>
        </div>
      )}

      {/* Create */}
      <div className="card flex gap-2.5" style={{ borderRadius: 16, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="اسم المفتاح (مثل: مشروع التحقيق)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field flex-1"
        />
        <button
          onClick={handleCreate}
          disabled={!name || creating}
          className="btn-primary"
          style={{ fontSize: 14, padding: "12px 24px" }}
        >
          {creating ? "..." : "إنشاء مفتاح"}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <p
          className="text-center"
          style={{
            padding: 40,
            color: "var(--pebble)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          ...
        </p>
      ) : keys.length === 0 ? (
        <div
          className="card text-center"
          style={{
            padding: "60px 20px",
            color: "var(--pebble)",
            fontFamily: "Tajawal, sans-serif",
          }}
        >
          <Key size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>لا توجد مفاتيح بعد. أنشئ مفتاحك الأول.</p>
        </div>
      ) : (
        <div className="card" style={{ borderRadius: 16, padding: "8px 16px" }}>
          {keys.map((k, i) => (
            <div
              key={k.id}
              className="flex justify-between items-center"
              style={{
                padding: "14px 10px",
                borderBottom: i < keys.length - 1 ? "1px solid var(--border-sub)" : "none",
              }}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--carbon)",
                      fontFamily: "Tajawal, sans-serif",
                    }}
                  >
                    {k.name}
                  </p>
                  {k.revokedAt && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--rose)",
                        background: "rgba(201,123,132,0.10)",
                        padding: "2px 8px",
                        borderRadius: "var(--r-badge)",
                        fontFamily: "Tajawal, sans-serif",
                      }}
                    >
                      ملغى
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--pebble)",
                    fontFamily: "ui-monospace, Menlo, monospace",
                    direction: "ltr",
                    textAlign: "right",
                  }}
                >
                  {k.keyPrefix}***
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: "var(--pebble)",
                    fontFamily: "Tajawal, sans-serif",
                    marginTop: 2,
                  }}
                >
                  {k.lastUsedAt
                    ? `آخر استخدام: ${new Date(k.lastUsedAt).toLocaleDateString("ar-SA")}`
                    : "لم يُستخدم بعد"}
                </p>
              </div>
              {!k.revokedAt && (
                <button
                  onClick={() => handleRevoke(k.id)}
                  className="cursor-pointer flex items-center gap-1.5"
                  style={{
                    background: "none",
                    border: "1px solid rgba(201,123,132,0.25)",
                    color: "var(--rose)",
                    padding: "6px 12px",
                    borderRadius: "var(--r-badge)",
                    fontSize: 12,
                    fontFamily: "Tajawal, sans-serif",
                  }}
                >
                  <Trash2 size={12} />
                  إلغاء
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
