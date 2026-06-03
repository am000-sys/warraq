// src/app/(app)/upload/page.tsx — رفع ملف جديد
// مرجع: design-reference/warraq-v3.html (function UploadSection)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload as UploadIcon, FileText, X, Info } from "lucide-react";
import { ProcessingView } from "@/components/processing-view";
import { FailureHintCard } from "@/components/failure-hint";
import { largeFileMB } from "@/lib/failure-hints";
import { ar } from "@/lib/utils";

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

  // أكبر حجم ملفّ مختار بالميجابايت إن تجاوز الحدّ الآمن (لتنبيه استباقيّ بالضغط)
  const bigFileMB = files.reduce((m, f) => Math.max(m, largeFileMB(f.size) ?? 0), 0);

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
      // الملفّات الصغيرة (< ٤م) عبر المسار المباشر — أبسط وأوثق (تحت حدّ جسم الطلب)
      const SMALL = 4 * 1024 * 1024;
      if (file.size < SMALL) {
        return await processDirect(file);
      }

      // الكبيرة: إن كانت PDF نقسّمها في المتصفّح ونرسل أجزاءً صغيرة (بلا Blob ولا حدّ حجم)
      const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
      if (isPdf) {
        return await processChunkedPdf(file);
      }

      // صورة كبيرة (نادر): المسار المباشر
      return await processDirect(file);
    } catch (err) {
      setError((err as Error).message);
      setProgress("");
    }
  }

  // يقسّم PDF كبيراً في المتصفّح إلى أجزاء (٦ صفحات) ويرسل كلّ جزء للخادم→Mistral
  async function processChunkedPdf(file: File) {
    setProgress("جارٍ تجهيز الملفّ...");
    const { PDFDocument } = await import("pdf-lib");
    const srcBytes = new Uint8Array(await file.arrayBuffer());
    const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
    const total = src.getPageCount();
    if (total === 0) throw new Error("ملفّ PDF فارغ أو تالف");

    const PER = 6; // صفحات لكلّ جزء — تبقي الجزء صغيراً تحت حدّ جسم الطلب
    let jobId = "";
    for (let offset = 0; offset < total; offset += PER) {
      const end = Math.min(total, offset + PER);
      const chunkDoc = await PDFDocument.create();
      const idx = Array.from({ length: end - offset }, (_, i) => offset + i);
      const copied = await chunkDoc.copyPages(src, idx);
      copied.forEach((p) => chunkDoc.addPage(p));
      const chunkBytes = await chunkDoc.save();
      const blob = new Blob([chunkBytes.slice()], { type: "application/pdf" });

      const fd = new FormData();
      fd.append("chunk", blob, "chunk.pdf");
      fd.append("fileName", file.name);
      fd.append("model", model);
      fd.append("offset", String(offset));
      fd.append("totalPages", String(total));
      if (jobId) fd.append("jobId", jobId);
      if (end >= total) fd.append("final", "1");

      const res = await fetch("/api/jobs/chunk", { method: "POST", body: fd });
      const data = await parseRes(res);
      jobId = data.jobId;
      setProgress(`تمّت معالجة ${data.processed ?? end} من ${total} صفحة...`);
    }
    router.push(`/jobs/${jobId}`);
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

      {/* تنبيه استباقيّ: الملفّ كبير — يُفضّل ضغطه قبل المعالجة لتفادي الفشل */}
      {bigFileMB > 0 && !progress && !error && (
        <div
          className="mb-4 flex items-start gap-2.5"
          style={{
            background: "var(--orange-soft)",
            border: "1px solid rgba(246,146,81,0.22)",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <Info size={16} color="var(--orange)" strokeWidth={1.8} style={{ marginTop: 1, flexShrink: 0 }} />
          <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--stone)", fontFamily: "Tajawal, sans-serif" }}>
            حجم الملفّ كبير ({ar(bigFileMB)} ميجابايت). لضمان نجاح المعالجة، يُفضَّل ضغطه أو
            تقليل دقّة المسح قبل الرفع — فكِبَر الحجم سبب شائع لفشل المعالجة.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <div
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
          {/* تلميح عمليّ بعد الفشل (الضغط غالباً يحلّ المشكلة) */}
          <FailureHintCard errorMessage={error} />
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
