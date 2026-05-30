// src/app/(app)/upload/page.tsx — رفع ملف جديد
// مرجع: design-reference/warraq-v3.html (function UploadSection)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload as UploadIcon, FileText, X } from "lucide-react";
import { ProcessingView } from "@/components/processing-view";

// مؤقّتاً: نعتمد النموذج الفائق فقط بالتسعيرة الأساسيّة (بلا اختيار)
const MODEL = "OPUS" as const;

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const model = MODEL;
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  function addFiles(list: FileList | File[]) {
    const arr = Array.from(list);
    setFiles((prev) => [...prev, ...arr]);
    // معاينة لأوّل صورة (للعرض أثناء المعالجة)
    const img = arr.find((f) => f.type.startsWith("image/"));
    if (img && !preview) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(img);
    }
  }

  async function handleStart() {
    if (!files.length) return;
    setError("");
    const file = files[0];
    setProgress("جارٍ التحضير...");

    try {
      const contentType = file.type || "application/octet-stream";

      // الملفّات الصغيرة (< ٤م) عبر المسار المباشر — أبسط وأوثق (تحت حدّ جسم الطلب)
      const SMALL = 4 * 1024 * 1024;
      if (file.size < SMALL) {
        return await processDirect(file);
      }

      // ١) للملفّات الكبيرة: اسأل الخادم عن طريقة التخزين (R2 / Blob)
      const up = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: file.name, fileSize: file.size, contentType }),
      });

      // إن لم يُضبط أيّ تخزين: المسار المباشر (قد يفشل للكبير، لكن نحاول)
      if (up.status === 503) {
        return await processDirect(file);
      }
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(upData?.error ?? "تعذّر تحضير الرفع");

      // ٢) ارفع الملفّ مباشرةً إلى التخزين (يتجاوز حدّ جسم الطلب)
      setProgress("جارٍ رفع الملفّ...");
      let storageKey: string;
      if (upData.method === "blob") {
        const { upload } = await import("@vercel/blob/client");
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
        });
        storageKey = blob.url; // رابط عامّ يُمرَّر لـ Mistral
      } else {
        const put = await fetch(upData.uploadUrl, {
          method: "PUT",
          headers: { "content-type": contentType },
          body: file,
        });
        if (!put.ok) throw new Error("فشل رفع الملفّ إلى التخزين");
        storageKey = upData.storageKey;
      }

      // ٣) أنشئ الوظيفة المرتبطة بالملفّ المخزّن
      const jr = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storageKey,
          fileName: file.name,
          fileSize: file.size,
          model,
        }),
      });
      const jd = await jr.json().catch(() => ({}));
      if (!jr.ok) {
        if (jr.status === 402) throw new Error(`رصيد غير كافٍ. لديك ${jd.available ?? 0} صفحة.`);
        throw new Error(jd?.error ?? "تعذّر إنشاء الوظيفة");
      }
      const jobId: string = jd.job.id;

      // ٤) عالج على دفعات من التخزين حتى تنتهي كلّ الصفحات (دون إعادة إرسال)
      setProgress("جارٍ تفريغ النصّ...");
      let done = false;
      while (!done) {
        const pr = await fetch(`/api/jobs/${jobId}/process`, { method: "POST" });
        const pd = await parseRes(pr);
        done = Boolean(pd.done);
        showProgress(pd);
      }

      router.push(`/jobs/${jobId}`);
    } catch (err) {
      setError((err as Error).message);
      setProgress("");
    }
  }

  // مسار احتياطي: لو لم يُضبط R2، نعالج عبر الرفع المباشر على دفعات
  async function processDirect(file: File) {
    setProgress("جارٍ الرفع والتفريغ...");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("model", model);

    let res = await fetch("/api/jobs/direct", { method: "POST", body: fd });
    let data = await parseRes(res);
    const jobId: string = data.jobId;
    let done: boolean = Boolean(data.done);
    showProgress(data);

    while (!done) {
      const fd2 = new FormData();
      fd2.append("file", file);
      fd2.append("model", model);
      fd2.append("jobId", jobId);
      res = await fetch("/api/jobs/direct", { method: "POST", body: fd2 });
      data = await parseRes(res);
      done = Boolean(data.done);
      showProgress(data);
    }
    router.push(`/jobs/${jobId}`);
  }

  function showProgress(data: { processed?: number; total?: number }) {
    if (data.total && data.total > 1) {
      setProgress(`تمّت معالجة ${data.processed ?? 0} من ${data.total} صفحة...`);
    } else {
      setProgress("جارٍ تفريغ النصّ...");
    }
  }

  async function parseRes(res: Response) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
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
    return data;
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

      {/* أثناء المعالجة: تجربة بصريّة بدل النموذج */}
      {progress ? (
        <ProcessingView previewUrl={preview} />
      ) : (
      <>
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
      </>
      )}
    </div>
  );
}
