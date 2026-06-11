// src/app/(app)/upload/upload-form.tsx — نموذج الرفع والمعالجة
// مرجع: design-reference/warraq-v3.html (function UploadSection)
//
// موثوقيّة الكتب الكبيرة:
// - فحص مسبق للرصيد قبل أيّ رفع (عدّ صفحات PDF في المتصفّح) مع دعوة واضحة للشحن.
// - إعادة محاولة تلقائيّة لكلّ جزء (٣ محاولات بتراجع تدريجيّ) للأعطال العابرة.
// - عند الانقطاع: زرّ «استكمال المعالجة» يتابع من حيث توقّف في نفس الوظيفة —
//   الصفحات المكتملة محفوظة ولا تُخصم مرّتين (الخادم يتجاهل المكرّر).
// - تقدّم حقيقيّ (صفحة من أصل كذا) بدل شريط إيحائيّ فقط.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload as UploadIcon, FileText, X, Info, Wallet, RotateCcw, Eye } from "lucide-react";
import { ProcessingView } from "@/components/processing-view";
import { FailureHintCard } from "@/components/failure-hint";
import { largeFileMB } from "@/lib/failure-hints";
import { modelCredits } from "@/lib/models";
import { ar } from "@/lib/utils";

// مؤقّتاً: نعتمد النموذج الفائق فقط بالتسعيرة الأساسيّة (بلا اختيار)
const MODEL = "OPUS" as const;

// حالة استئناف بعد انقطاع: نتابع نفس الوظيفة من آخر صفحة أكّدها الخادم
type ResumeState = {
  jobId: string;
  nextOffset: number; // مرجعه الخادم (processed) — لا نخمّن
  total: number;
  file: File;
};

export function UploadForm({ balance }: { balance: number }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const model = MODEL;
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState("");
  const [pct, setPct] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [needTopup, setNeedTopup] = useState(false);
  const [resume, setResume] = useState<ResumeState | null>(null);
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

  function resetState() {
    setError("");
    setNeedTopup(false);
    setResume(null);
    setPct(null);
  }

  async function handleStart() {
    if (!files.length) return;
    resetState();
    const file = files[0];
    setProgress("جارٍ التحضير...");

    try {
      const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";

      // الملفّات الصغيرة (< ٤م) عبر المسار المباشر — أبسط وأوثق (تحت حدّ جسم الطلب)
      const SMALL = 4 * 1024 * 1024;
      if (file.size < SMALL && !isPdf) {
        if (!checkBalanceUpfront(1)) return;
        return await processDirect(file);
      }
      if (file.size < SMALL && isPdf) {
        if (!checkBalanceUpfront(await countPdfPages(file))) return;
        return await processDirect(file);
      }

      // الكبيرة: إن كانت PDF نقسّمها في المتصفّح ونرسل أجزاءً صغيرة (بلا Blob ولا حدّ حجم)
      if (isPdf) {
        return await processChunkedPdf(file);
      }

      // صورة كبيرة (نادر): المسار المباشر
      if (!checkBalanceUpfront(1)) return;
      return await processDirect(file);
    } catch (err) {
      setError((err as Error).message);
      setProgress("");
    }
  }

  // فحص مسبق للرصيد قبل أيّ رفع — يمنع البدء بمعالجة لن تكتمل (الخادم يفرض أيضاً)
  function checkBalanceUpfront(requiredPages: number): boolean {
    const required = requiredPages * (modelCredits(model) || 1);
    if (required <= balance) return true;
    setProgress("");
    setNeedTopup(true);
    setError(
      `رصيدك لا يكفي لمعالجة هذا المستند: يحتاج ${ar(required)} صفحة ولديك ${ar(balance)}. اشحن رصيدك ثم أعد المحاولة — لن يُخصم شيء الآن.`,
    );
    return false;
  }

  // وظيفة سابقة غير مكتملة لنفس الملفّ (انقطعت أو أُغلق تبويبها) — للاستئناف التلقائي
  async function findResumableJob(
    fileName: string,
    total: number,
  ): Promise<{ id: string; processedPages: number } | null> {
    try {
      const res = await fetch("/api/jobs?limit=50");
      if (!res.ok) return null;
      const { jobs } = (await res.json()) as {
        jobs?: {
          id: string;
          fileName: string;
          totalPages: number;
          processedPages: number;
          status: string;
          storageKey: string;
        }[];
      };
      return (
        (jobs ?? []).find(
          (j) =>
            j.fileName === fileName &&
            j.totalPages === total &&
            j.storageKey === "chunked" &&
            (j.status === "FAILED" || j.status === "PROCESSING") &&
            j.processedPages > 0 &&
            j.processedPages < total,
        ) ?? null
      );
    } catch {
      return null;
    }
  }

  // عدّ صفحات PDF في المتصفّح (للفحص المسبق) — فشل العدّ لا يمنع المعالجة
  async function countPdfPages(file: File): Promise<number> {
    try {
      const { PDFDocument } = await import("pdf-lib");
      const src = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()), {
        ignoreEncryption: true,
      });
      return src.getPageCount();
    } catch {
      return 1;
    }
  }

  // يقسّم PDF كبيراً في المتصفّح إلى أجزاء (٦ صفحات) ويرسل كلّ جزء للخادم→Mistral.
  // عند تمرير from: استئناف لنفس الوظيفة من آخر صفحة أكّدها الخادم.
  async function processChunkedPdf(file: File, from?: ResumeState) {
    setProgress("جارٍ تجهيز الملفّ...");
    const { PDFDocument } = await import("pdf-lib");
    const srcBytes = new Uint8Array(await file.arrayBuffer());
    const src = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
    const total = src.getPageCount();
    if (total === 0) throw new Error("ملفّ PDF فارغ أو تالف");

    const PER = 6; // صفحات لكلّ جزء — تبقي الجزء صغيراً تحت حدّ جسم الطلب
    let jobId = from?.jobId ?? "";
    let startAt = Math.min(from?.nextOffset ?? 0, total);

    // استئناف عابر للجلسات: إن وُجدت معالجة سابقة غير مكتملة لنفس الملفّ
    // (أُغلق التبويب أو انقطعت)، نستكملها بدل البدء — والدفع — من الصفر.
    if (!from) {
      const prior = await findResumableJob(file.name, total);
      if (prior) {
        jobId = prior.id;
        startAt = prior.processedPages;
        setProgress(`وُجدت معالجة سابقة لهذا الملفّ — نستكمل من الصفحة ${ar(startAt + 1)}...`);
      } else if (!checkBalanceUpfront(total)) {
        // بداية جديدة: الرصيد يجب أن يغطّي المستند كاملاً (عند الاستئناف يكفي المتبقّي،
        // والخادم يفرضه جزءاً جزءاً — فالرصيد المعروض قد يكون تقادم بعد شحن)
        return;
      }
    }
    // عند الاستئناف: الشريط يبدأ من آخر موضع مؤكّد لا من الصفر
    if (startAt > 0) {
      setPct(Math.round((startAt / total) * 100));
      setProgress(`نستكمل المعالجة من الصفحة ${ar(startAt + 1)} من ${ar(total)}...`);
    }

    for (let offset = startAt; offset < total; offset += PER) {
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

      try {
        const data = await postChunkWithRetry(fd);
        jobId = data.jobId;
        const processed = typeof data.processed === "number" ? data.processed : end;
        showProgress({ processed, total });
        // نحفظ موضع الاستئناف من مرجع الخادم — للاستكمال عند أيّ انقطاع لاحق
        setResume({ jobId, nextOffset: processed, total, file });
      } catch (err) {
        // انقطاع بعد استنفاد المحاولات: نعرض الاستكمال من آخر موضع مؤكّد
        if (jobId) {
          setResume({
            jobId,
            nextOffset: (err as ChunkError).processed ?? offset,
            total,
            file,
          });
        }
        if ((err as ChunkError).topup) setNeedTopup(true);
        setProgress("");
        setError((err as Error).message);
        return;
      }
    }
    router.push(`/jobs/${jobId}`);
  }

  // استكمال معالجة منقطعة من آخر صفحة مؤكّدة (نفس الوظيفة — بلا خصم مكرّر)
  async function handleResume() {
    if (!resume) return;
    const r = resume;
    resetState();
    try {
      await processChunkedPdf(r.file, r);
    } catch (err) {
      setError((err as Error).message);
      setProgress("");
    }
  }

  type ChunkError = Error & { topup?: boolean; processed?: number };

  // إرسال جزء مع إعادة محاولة تلقائيّة للأعطال العابرة (شبكة/ازدحام/خادم)
  async function postChunkWithRetry(
    fd: FormData,
  ): Promise<{ jobId: string; processed?: number; total?: number }> {
    const ATTEMPTS = 3;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      let res: Response;
      try {
        res = await fetch("/api/jobs/chunk", { method: "POST", body: fd });
      } catch {
        // خطأ شبكة عابر (انقطاع/انتقال شبكة)
        if (attempt === ATTEMPTS) {
          throw new Error(
            "انقطع الاتصال أثناء المعالجة — تحقّق من الشبكة ثم استكمل من حيث توقّفت.",
          );
        }
        await sleep(2000 * attempt);
        continue;
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;

      const err: ChunkError = Object.assign(
        new Error(data?.error ?? "فشلت المعالجة"),
        { processed: typeof data?.processed === "number" ? data.processed : undefined },
      );
      if (data?.configRequired) {
        err.message = "خدمة الـ OCR غير مُعَدّة بعد. يحتاج المالك ضبط الإعدادات على الخادم.";
        throw err;
      }
      if (res.status === 402) {
        err.topup = true; // نفاد الرصيد ليس عطلاً عابراً — لا إعادة محاولة
        throw err;
      }
      // 429/5xx: ازدحام أو عطل خادم عابر غالباً — أعد المحاولة بتراجع تدريجيّ
      if ((res.status === 429 || res.status >= 500) && attempt < ATTEMPTS) {
        await sleep(2000 * attempt);
        continue;
      }
      throw err;
    }
    throw new Error("فشلت المعالجة");
  }

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
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
      setProgress(`تمّت معالجة ${ar(data.processed ?? 0)} من ${ar(data.total)} صفحة...`);
      setPct(Math.round(((data.processed ?? 0) / data.total) * 100));
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
        setNeedTopup(true);
        throw new Error(
          data?.error ?? `رصيد غير كافٍ. لديك ${ar(data.available ?? 0)} صفحة.`,
        );
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
        <ProcessingView previewUrl={preview} realProgress={pct} realLabel={progress} />
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

          {/* إجراءات واضحة بعد الانقطاع: استكمال بلا خصم مكرّر / عرض المنجَز / شحن الرصيد */}
          <div className="flex items-center gap-2 flex-wrap" style={{ marginTop: 10 }}>
            {resume && !needTopup && (
              <button
                onClick={handleResume}
                className="btn-primary"
                style={{ fontSize: 13, padding: "9px 20px" }}
              >
                <RotateCcw size={14} />
                استكمال المعالجة (من الصفحة {ar(resume.nextOffset + 1)})
              </button>
            )}
            {needTopup && (
              <Link
                href="/billing"
                className="btn-primary no-underline"
                style={{ fontSize: 13, padding: "9px 20px" }}
              >
                <Wallet size={14} />
                شحن الرصيد
              </Link>
            )}
            {resume && (
              <Link
                href={`/jobs/${resume.jobId}`}
                className="btn-ghost no-underline"
                style={{ fontSize: 13, padding: "9px 20px" }}
              >
                <Eye size={14} />
                عرض الصفحات المكتملة ({ar(resume.nextOffset)})
              </Link>
            )}
          </div>

          {/* تلميح عمليّ بعد الفشل (الضغط غالباً يحلّ المشكلة) — ليس لمشاكل الرصيد */}
          {!needTopup && <FailureHintCard errorMessage={error} />}
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
