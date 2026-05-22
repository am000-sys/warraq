// src/app/(app)/upload/page.tsx — رفع ملف جديد
// مرجع: design-reference/warraq-v3.html (function UploadSection)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload as UploadIcon, FileText, X } from "lucide-react";

const models = [
  { k: "HAIKU", l: "وَرَّاق سريع", d: "سريع وفعّال", t: "مجاني" },
  { k: "SONNET", l: "وَرَّاق متوازن", d: "متوازن · موصى به", t: "احترافي" },
  { k: "OPUS", l: "وَرَّاق دقيق", d: "أعلى دقة للمخطوطات الصعبة", t: "مؤسسي" },
] as const;

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [model, setModel] = useState<"HAIKU" | "SONNET" | "OPUS">("SONNET");
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  function addFiles(list: FileList | File[]) {
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  async function handleStart() {
    if (!files.length) return;
    setError("");

    // For simplicity, process the first file (the original logic was single-file)
    const file = files[0];
    setProgress("جارٍ الرفع والمعالجة بـ Claude...");

    try {
      // المسار المباشر: يرسل الملفّ ويعالجه في طلب واحد (بدون R2)
      const fd = new FormData();
      fd.append("file", file);
      fd.append("model", model);

      const res = await fetch("/api/jobs/direct", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.configRequired) {
          throw new Error(
            "خدمة الـ OCR غير مُعَدّة بعد. يحتاج المالك ضبط مفتاح Anthropic على الخادم.",
          );
        }
        if (res.status === 402) {
          throw new Error(`رصيد غير كافٍ. لديك ${data.available ?? 0} صفحة.`);
        }
        throw new Error(data?.error ?? "فشلت المعالجة");
      }

      const { jobId } = await res.json();
      router.push(`/jobs/${jobId}`);
    } catch (err) {
      setError((err as Error).message);
      setProgress("");
    }
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: "Tajawal, sans-serif",
          fontSize: 26,
          fontWeight: 400,
          color: "var(--carbon)",
          marginBottom: 28,
        }}
      >
        رفع ملف جديد
      </h1>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => document.getElementById("file-input")?.click()}
        className="cursor-pointer transition-all"
        style={{
          border: `2px dashed ${dragging ? "var(--orange)" : "var(--border)"}`,
          borderRadius: 20,
          padding: "52px 24px",
          textAlign: "center",
          background: dragging ? "var(--orange-soft)" : "var(--snow)",
          marginBottom: 20,
        }}
      >
        <div
          className="mx-auto flex items-center justify-center mb-3.5"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--orange-soft)",
            color: "var(--orange)",
          }}
        >
          <UploadIcon size={24} strokeWidth={1.7} />
        </div>
        <p
          style={{
            fontFamily: "Tajawal, sans-serif",
            fontSize: 16,
            fontWeight: 500,
            color: "var(--carbon)",
            marginBottom: 6,
          }}
        >
          اسحب ملفاتك هنا أو اضغط للاختيار
        </p>
        <p
          className="font-light"
          style={{
            fontFamily: "Tajawal, sans-serif",
            fontSize: 13,
            color: "var(--stone)",
          }}
        >
          PDF · PNG · JPG · TIFF · حتى ٥٠٠ ميجابايت
        </p>
        <input
          id="file-input"
          type="file"
          multiple
          accept="application/pdf,image/png,image/jpeg,image/tiff"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          style={{ display: "none" }}
        />
      </div>

      {/* Files */}
      {files.length > 0 && (
        <div className="card" style={{ borderRadius: 16, marginBottom: 18, padding: "16px 20px" }}>
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5"
              style={{
                padding: "8px 0",
                borderBottom: i < files.length - 1 ? "1px solid var(--border-sub)" : "none",
              }}
            >
              <FileText size={18} color="var(--stone)" />
              <span
                className="flex-1"
                style={{
                  fontSize: 13,
                  color: "var(--carbon)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                {f.name}
              </span>
              <span style={{ fontSize: 11, color: "var(--pebble)", fontFamily: "Inter, sans-serif" }}>
                {(f.size / 1024 / 1024).toFixed(1)} MB
              </span>
              <button
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="cursor-pointer"
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--pebble)",
                  padding: 4,
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Model picker */}
      <div className="card" style={{ borderRadius: 16, marginBottom: 18 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--carbon)",
            fontFamily: "Tajawal, sans-serif",
            marginBottom: 14,
          }}
        >
          اختر النموذج
        </div>
        {models.map((m) => (
          <label
            key={m.k}
            className="flex items-center gap-3 cursor-pointer transition-all"
            style={{
              padding: "13px 14px",
              border: `1.5px solid ${model === m.k ? "var(--orange)" : "var(--border)"}`,
              borderRadius: 12,
              background: model === m.k ? "var(--orange-soft)" : "transparent",
              marginBottom: 8,
            }}
          >
            <input
              type="radio"
              name="model"
              checked={model === m.k}
              onChange={() => setModel(m.k)}
              style={{ accentColor: "var(--orange)", flexShrink: 0 }}
            />
            <div className="flex-1">
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--carbon)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                {m.l}
              </div>
              <div
                className="font-light"
                style={{
                  fontSize: 12,
                  color: "var(--stone)",
                  fontFamily: "Tajawal, sans-serif",
                }}
              >
                {m.d}
              </div>
            </div>
            <span className="badge" style={{ fontSize: 10 }}>
              {m.t}
            </span>
          </label>
        ))}
      </div>

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

      {progress && !error && (
        <div className="mb-4">
          <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
            <span
              className="flex items-center gap-2"
              style={{ fontSize: 13, color: "var(--orange)", fontFamily: "Tajawal, sans-serif", fontWeight: 500 }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                style={{ background: "var(--orange)" }}
              />
              {progress}
            </span>
          </div>
          {/* شريط تقدّم متحرّك (indeterminate) */}
          <div
            style={{
              height: 6,
              background: "var(--fog)",
              borderRadius: 3,
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                height: "100%",
                width: "40%",
                background: "var(--orange)",
                borderRadius: 3,
                animation: "warraq-progress 1.2s ease-in-out infinite",
              }}
            />
          </div>
          <style>{`@keyframes warraq-progress { 0%{right:-40%} 100%{right:100%} }`}</style>
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={!files.length || !!progress}
        className="btn-primary"
        style={{
          fontSize: 15,
          padding: "13px 32px",
          opacity: !files.length || !!progress ? 0.4 : 1,
        }}
      >
        {progress ? progress : `ابدأ المعالجة${files.length > 0 ? ` (${files.length} ملف)` : ""}`}
      </button>
    </div>
  );
}
