// src/app/(app)/upload/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [model, setModel] = useState<"HAIKU" | "SONNET" | "OPUS">("SONNET");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  async function handleUpload() {
    if (!file) return;
    setError("");
    setProgress("جارٍ تحضير الرفع...");

    try {
      // ١. الحصول على رابط رفع موقّع
      const signRes = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          contentType: file.type || "application/pdf",
        }),
      });

      if (!signRes.ok) {
        const data = await signRes.json();
        throw new Error(data.error ?? "فشل تحضير الرفع");
      }

      const { uploadUrl, storageKey } = await signRes.json();

      // ٢. رفع الملف مباشرة إلى R2
      setProgress("جارٍ رفع الملف...");
      const upRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/pdf" },
      });
      if (!upRes.ok) throw new Error("فشل الرفع");

      // ٣. إنشاء وظيفة المعالجة
      setProgress("جارٍ بدء المعالجة...");
      const jobRes = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey,
          fileName: file.name,
          fileSize: file.size,
          model,
        }),
      });

      if (!jobRes.ok) {
        const data = await jobRes.json();
        if (jobRes.status === 402) {
          throw new Error(
            `رصيد غير كافٍ. تحتاج ${data.required} صفحة، لديك ${data.available}.`
          );
        }
        throw new Error(data.error ?? "فشل إنشاء الوظيفة");
      }

      const { job } = await jobRes.json();
      router.push(`/jobs/${job.id}`);
    } catch (err: any) {
      setError(err.message);
      setProgress("");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">رفع ملف جديد</h1>
      <p className="text-gray-600 mb-8">PDF عربي مصوّر — حتى ١٠٠ ميجابايت.</p>

      <div className="bg-white border rounded-2xl p-8">
        {/* Drop zone */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-6">
          {file ? (
            <div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} م.ب
              </p>
              <button
                onClick={() => setFile(null)}
                className="text-xs text-red-600 mt-2"
              >
                إزالة
              </button>
            </div>
          ) : (
            <>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer text-[#0A2E54] underline"
              >
                اختر ملفاً
              </label>
              <p className="text-xs text-gray-500 mt-2">PDF · PNG · JPG</p>
            </>
          )}
        </div>

        {/* Model selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">مستوى الدقّة</label>
          <div className="grid grid-cols-3 gap-2">
            {(["HAIKU", "SONNET", "OPUS"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`p-3 rounded-xl border text-sm ${
                  model === m
                    ? "border-[#0A2E54] bg-blue-50"
                    : "border-gray-200"
                }`}
              >
                <div className="font-medium">{m === "HAIKU" ? "سريع" : m === "SONNET" ? "متوازن" : "أعلى دقّة"}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {m === "HAIKU" ? "للنصوص الواضحة" : m === "SONNET" ? "موصى به" : "للمخطوطات"}
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {progress && !error && (
          <p className="text-sm text-gray-600 mb-4 text-center">{progress}</p>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || !!progress}
          className="w-full bg-[#0A2E54] text-white py-3 rounded-full disabled:opacity-50"
        >
          ابدأ المعالجة
        </button>
      </div>
    </div>
  );
}
