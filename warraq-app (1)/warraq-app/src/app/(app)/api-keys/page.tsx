// src/app/(app)/api-keys/page.tsx
"use client";
import { useEffect, useState } from "react";

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
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.apiKey?.key) {
      setNewKey(data.apiKey.key);
      setName("");
      refresh();
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("إلغاء هذا المفتاح؟")) return;
    await fetch(`/api/api-keys?id=${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">مفاتيح API</h1>
      <p className="text-gray-600 mb-6">للمطوّرين الذين يستخدمون واجهة وَرَّاق البرمجية.</p>

      {newKey && (
        <div className="bg-green-50 border border-green-300 rounded-2xl p-4 mb-6">
          <p className="text-sm font-bold mb-2">احفظ هذا المفتاح الآن — لن يُعرض ثانيةً:</p>
          <code className="block bg-white p-3 rounded-lg text-xs font-mono break-all">
            {newKey}
          </code>
          <button
            onClick={() => setNewKey(null)}
            className="text-xs text-gray-600 mt-2"
          >
            حفظت ✓
          </button>
        </div>
      )}

      <div className="bg-white border rounded-2xl p-4 mb-6 flex gap-2">
        <input
          type="text"
          placeholder="اسم المفتاح (مثل: مشروع التحقيق)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border rounded-lg px-3 py-2"
        />
        <button
          onClick={handleCreate}
          disabled={!name}
          className="bg-[#0A2E54] text-white px-5 py-2 rounded-full disabled:opacity-50"
        >
          إنشاء
        </button>
      </div>

      {loading ? (
        <p>...</p>
      ) : keys.length === 0 ? (
        <p className="text-center text-gray-500 py-8">لا توجد مفاتيح بعد.</p>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          {keys.map((k) => (
            <div key={k.id} className="px-4 py-3 border-b last:border-b-0">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{k.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{k.keyPrefix}***</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {k.lastUsedAt
                      ? `آخر استخدام: ${new Date(k.lastUsedAt).toLocaleDateString("ar-SA")}`
                      : "لم يُستخدم بعد"}
                  </p>
                </div>
                {!k.revokedAt && (
                  <button
                    onClick={() => handleRevoke(k.id)}
                    className="text-xs text-red-600"
                  >
                    إلغاء
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
