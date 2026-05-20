// src/app/(app)/api-keys/page.tsx
// المستخدم العادي: يرى مفاتيحه فقط (للقراءة) + دعوة للتواصل مع الإدارة.
// المالك: ينشئ مفاتيح للمستخدمين ويديرها.
"use client";

import { useEffect, useState } from "react";
import { Copy, Trash2, Key, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  user?: { email: string } | null;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // حقول إنشاء المالك
  const [name, setName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    const res = await fetch("/api/api-keys");
    const data = await res.json();
    setKeys(data.keys ?? []);
    setIsAdmin(Boolean(data.isAdmin));
    setLoading(false);
  }

  async function handleCreate() {
    if (!name || !userEmail) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, userEmail }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data?.error ?? "تعذّر إنشاء المفتاح");
      return;
    }
    if (data.apiKey?.key) {
      setNewKey(data.apiKey.key);
      setName("");
      setUserEmail("");
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
        subtitle={
          isAdmin
            ? "أنشئ مفاتيح API للمستخدمين بعد دفعهم."
            : "مفاتيحك للوصول البرمجي إلى وَرَّاق."
        }
      />

      {/* رسالة للمستخدم العادي */}
      {!isAdmin && (
        <div
          className="mb-5 flex items-start gap-3"
          style={{
            background: "var(--orange-soft)",
            border: "1px solid rgba(246,146,81,0.25)",
            borderRadius: 16,
            padding: 18,
          }}
        >
          <ShieldCheck size={18} color="var(--orange)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--carbon)",
                fontFamily: "Tajawal, sans-serif",
                marginBottom: 4,
              }}
            >
              للحصول على مفتاح API
            </p>
            <p
              className="font-light"
              style={{
                fontSize: 13,
                color: "var(--stone)",
                fontFamily: "Tajawal, sans-serif",
                lineHeight: 1.7,
              }}
            >
              مفاتيح API تُصدَر من إدارة وَرَّاق بعد الاشتراك في الباقة المناسبة.
              تواصل معنا عبر البريد <strong>support@warraq.sa</strong> لطلب مفتاحك.
            </p>
          </div>
        </div>
      )}

      {/* المفتاح الجديد (للمالك) */}
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
            <p style={{ fontSize: 13, fontWeight: 500, color: "var(--orange)", fontFamily: "Tajawal, sans-serif" }}>
              احفظ هذا المفتاح وسلّمه للمستخدم — لن يُعرض ثانيةً
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
            <button onClick={copy} className="btn-ghost" style={{ fontSize: 12, padding: "8px 14px" }}>
              <Copy size={13} />
              {copied ? "نُسخ!" : "نسخ"}
            </button>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-3 cursor-pointer"
            style={{ background: "none", border: "none", fontSize: 12, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}
          >
            تمّ ✓
          </button>
        </div>
      )}

      {/* نموذج الإنشاء — للمالك فقط */}
      {isAdmin && (
        <div className="card mb-5" style={{ borderRadius: 16 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: "var(--carbon)",
              fontFamily: "Tajawal, sans-serif",
              marginBottom: 14,
            }}
          >
            إنشاء مفتاح لمستخدم
          </div>
          {error && (
            <div
              className="mb-3"
              style={{
                background: "rgba(201,123,132,0.10)",
                border: "1px solid rgba(201,123,132,0.20)",
                color: "var(--rose)",
                borderRadius: 10,
                padding: 10,
                fontSize: 13,
                fontFamily: "Tajawal, sans-serif",
              }}
            >
              {error}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="email"
              placeholder="بريد المستخدم"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              className="field field-ltr flex-1"
            />
            <input
              type="text"
              placeholder="اسم المفتاح"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field flex-1"
            />
            <button
              onClick={handleCreate}
              disabled={!name || !userEmail || creating}
              className="btn-primary"
              style={{ fontSize: 14, padding: "12px 24px", whiteSpace: "nowrap" }}
            >
              {creating ? "..." : "إنشاء"}
            </button>
          </div>
        </div>
      )}

      {/* قائمة المفاتيح */}
      {loading ? (
        <p className="text-center" style={{ padding: 40, color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
          ...
        </p>
      ) : keys.length === 0 ? (
        <div className="card text-center" style={{ padding: "60px 20px", color: "var(--pebble)", fontFamily: "Tajawal, sans-serif" }}>
          <Key size={32} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 14 }}>
            {isAdmin ? "لا توجد مفاتيح بعد." : "لا توجد مفاتيح مرتبطة بحسابك بعد."}
          </p>
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
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--carbon)", fontFamily: "Tajawal, sans-serif" }}>
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
                {isAdmin && k.user && (
                  <p style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Inter, sans-serif", direction: "ltr", textAlign: "right", marginTop: 2 }}>
                    {k.user.email}
                  </p>
                )}
              </div>
              {isAdmin && !k.revokedAt && (
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
