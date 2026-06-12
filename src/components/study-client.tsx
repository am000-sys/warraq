// src/components/study-client.tsx — واجهة الملخّص الدراسي التفاعليّة
// اختيار المصدر (مستند مفرّغ / نصّ مستقلّ) + محاور التركيز + العمق + مستوى الدقّة،
// مع عرض حيّ للملخّص أثناء التوليد، وشارة فحص النقول، والتصدير إلى Word.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  Check,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { MarkdownView } from "@/components/markdown-view";
import { StatusPill } from "@/components/page-header";
import { ar } from "@/lib/utils";
import {
  FOCUS_OPTIONS,
  DEPTH_OPTIONS,
  calcStudyCost,
  estimateSourcePages,
  type StudyPricing,
} from "@/lib/study-options";

const font = "Tajawal, sans-serif";

export type SummaryMeta = {
  id: string;
  title: string;
  sourcePages: number;
  focus: string[];
  depth: string;
  model: string;
  status: string;
  pagesCharged: number;
  verification: { total: number; verified: number; missing: string[] } | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

type JobLite = { id: string; fileName: string; totalPages: number; createdAt: string };

type Props = {
  jobs: JobLite[];
  initialSummaries: SummaryMeta[];
  balance: number;
  isAdmin: boolean;
  pricing: StudyPricing & { maxChars: number };
};

type Phase = "idle" | "running" | "done";

export function StudyClient({ jobs, initialSummaries, balance, isAdmin, pricing }: Props) {
  // ── المدخلات ──
  const [source, setSource] = useState<"doc" | "text">(jobs.length > 0 ? "doc" : "text");
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [focus, setFocus] = useState<string[]>(["definitions", "enumerations"]);
  const [depth, setDepth] = useState("balanced");
  const [premium, setPremium] = useState(false);

  // ── الحالة ──
  const [phase, setPhase] = useState<Phase>("idle");
  const [live, setLive] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bal, setBal] = useState(balance);
  const [summaries, setSummaries] = useState<SummaryMeta[]>(initialSummaries);
  const [viewer, setViewer] = useState<{ meta: SummaryMeta; markdown: string } | null>(null);
  const [runMeta, setRunMeta] = useState<{ id: string; title: string } | null>(null);

  const bufRef = useRef("");
  const resultRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // تفريغ مجمّع للنصّ المبثوث كي لا نعيد الرسم لكلّ توكن
  useEffect(() => {
    if (phase !== "running") return;
    const t = setInterval(() => setLive(bufRef.current), 250);
    return () => clearInterval(t);
  }, [phase]);

  const selectedJob = jobs.find((j) => j.id === jobId);
  const sourcePages =
    source === "doc" ? selectedJob?.totalPages ?? 0 : estimateSourcePages(text.trim().length);
  const cost = isAdmin ? 0 : sourcePages > 0 ? calcStudyCost(sourcePages, premium, pricing) : 0;
  const insufficient = !isAdmin && cost > bal;
  const tooLong = source === "text" && text.length > pricing.maxChars;
  const canGenerate =
    phase !== "running" &&
    focus.length > 0 &&
    !insufficient &&
    !tooLong &&
    (source === "doc" ? Boolean(selectedJob) : text.trim().length >= 500);

  const refreshList = async () => {
    try {
      const res = await fetch("/api/study");
      if (res.ok) setSummaries((await res.json()).summaries);
    } catch {
      /* تجاهل — القائمة ستتحدّث لاحقاً */
    }
  };

  const toggleFocus = (id: string) =>
    setFocus((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  // ── التوليد ──
  async function runStream(id: string, displayTitle: string) {
    setPhase("running");
    setViewer(null);
    setError(null);
    setNotice(null);
    bufRef.current = "";
    setLive("");
    setRunMeta({ id, title: displayTitle });
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);

    try {
      const res = await fetch(`/api/study/${id}/run`, { method: "POST" });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "تعذّر بدء التوليد");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let finished = false;

      while (!finished) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        const events = acc.split("\n\n");
        acc = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          switch (payload.type) {
            case "delta":
              bufRef.current += String(payload.t ?? "");
              break;
            case "notice":
              setNotice(String(payload.message ?? ""));
              break;
            case "done": {
              setLive(bufRef.current);
              const charged = Number(payload.pagesCharged ?? 0);
              if (!isAdmin && charged > 0) setBal((b) => Math.max(0, b - charged));
              setPhase("done");
              finished = true;
              await refreshList();
              break;
            }
            case "error":
              throw new Error(String(payload.message ?? "تعذّر التوليد"));
          }
        }
      }
      if (!finished) {
        // انقطع البثّ دون حدث نهاية — السجلّ محفوظ ويمكن استكماله من القائمة
        setPhase("idle");
        setNotice("انقطع الاتّصال أثناء التوليد — تجد الملخّص في القائمة أدناه، وأعد المحاولة إن لم يكتمل.");
        await refreshList();
      }
    } catch (err) {
      setPhase("idle");
      setError(err instanceof Error ? err.message : "تعذّر توليد الملخّص");
      await refreshList();
    }
  }

  async function generate() {
    setError(null);
    try {
      const body =
        source === "doc"
          ? { jobId, focus, depth, premium, title: title.trim() || undefined }
          : { text, focus, depth, premium, title: title.trim() || undefined };
      const res = await fetch("/api/study", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => null);
      if (!res.ok) throw new Error(j?.error ?? "تعذّر إنشاء الطلب");
      const displayTitle =
        title.trim() ||
        (source === "doc" ? selectedJob?.fileName.replace(/\.[^.]+$/, "") ?? "" : "ملخّص دراسي");
      await runStream(j.id, displayTitle);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر إنشاء الطلب");
    }
  }

  async function openSummary(id: string) {
    try {
      const res = await fetch(`/api/study/${id}`);
      if (!res.ok) return;
      const { summary } = await res.json();
      if (summary?.markdown) {
        setPhase("idle");
        setViewer({ meta: summary, markdown: summary.markdown });
        setTimeout(
          () => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
          80,
        );
      }
    } catch {
      /* تجاهل */
    }
  }

  async function remove(s: SummaryMeta) {
    if (!confirm(`حذف «${s.title}»؟${s.status !== "COMPLETED" && s.pagesCharged > 0 ? " سيُردّ المخصوم إلى رصيدك." : ""}`)) return;
    const res = await fetch(`/api/study/${s.id}`, { method: "DELETE" });
    if (res.ok) {
      const j = await res.json().catch(() => null);
      if (j?.refunded > 0 && !isAdmin) setBal((b) => b + j.refunded);
      if (viewer?.meta.id === s.id) setViewer(null);
      await refreshList();
    }
  }

  // ── العرض ──
  const showResult = phase !== "idle" || viewer !== null;
  const doneVerification =
    viewer?.meta.verification ?? summaries.find((s) => s.id === runMeta?.id)?.verification ?? null;

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {/* ١. بطاقة الإعداد */}
      <div className="card" style={{ borderRadius: 16 }}>
        <SectionTitle icon={<Sparkles size={15} />} text="مادّة الملخّص" />

        {/* المصدر */}
        <div className="flex" style={{ gap: 8, marginBottom: 14 }}>
          <TabButton
            active={source === "doc"}
            onClick={() => setSource("doc")}
            label="من مستنداتي المفرّغة"
          />
          <TabButton
            active={source === "text"}
            onClick={() => setSource("text")}
            label="نصّ مستقلّ (لصق أو رفع)"
          />
        </div>

        {source === "doc" ? (
          jobs.length === 0 ? (
            <div
              style={{
                padding: "20px 16px",
                background: "var(--fog)",
                borderRadius: 12,
                fontSize: 13,
                color: "var(--stone)",
                fontFamily: font,
              }}
            >
              لا توجد مستندات مفرّغة مكتملة بعد —{" "}
              <Link href="/upload" style={{ color: "var(--orange)" }}>
                ارفع ملفاً
              </Link>{" "}
              أو استعمل تبويب «نصّ مستقلّ».
            </div>
          ) : (
            <div>
              <label className="label">المستند</label>
              <select
                className="field"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                style={{ fontFamily: font }}
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.fileName} — {ar(j.totalPages)} صفحة
                  </option>
                ))}
              </select>
            </div>
          )
        ) : (
          <div>
            <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
              <label className="label" style={{ marginBottom: 0 }}>
                النصّ (Markdown أو نصّ صِرف — يُستحسن إبقاء علامات «## صفحة N»)
              </label>
              <button
                type="button"
                className="btn-ghost"
                style={{ fontSize: 12, padding: "6px 14px" }}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={13} /> رفع ملفّ ‎.txt / .md
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,text/plain,text/markdown"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setText(await f.text());
                  if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
                  e.target.value = "";
                }}
              />
            </div>
            <textarea
              className="field"
              rows={9}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="الصق هنا نصّ المقرّر أو الفصل المراد تلخيصه…"
              style={{ fontFamily: font, lineHeight: 1.9, resize: "vertical" }}
            />
            <div style={{ fontSize: 11.5, color: tooLong ? "#c97b84" : "var(--pebble)", fontFamily: font, marginTop: 4 }}>
              {ar(text.trim().length)} حرف ≈ {ar(sourcePages)} صفحة
              {tooLong &&
                ` — تجاوز الحدّ (${ar(Math.round(pricing.maxChars / 1000))} ألف حرف): قسّم المادّة ولخّص كلّ جزء على حدة`}
              {!tooLong && text.trim().length > 0 && text.trim().length < 500 && " — الحدّ الأدنى ٥٠٠ حرف"}
            </div>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <label className="label">عنوان الملخّص (اختياري)</label>
          <input
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={source === "doc" ? selectedJob?.fileName.replace(/\.[^.]+$/, "") ?? "" : "مثل: مقرّر الفرق — الفصل الأوّل"}
            style={{ fontFamily: font }}
          />
        </div>
      </div>

      {/* ٢. محاور التركيز + العمق + الدقّة */}
      <div className="card" style={{ borderRadius: 16 }}>
        <SectionTitle icon={<BookOpenCheck size={15} />} text="ماذا تريد من الملخّص؟" />

        <div
          className="grid wq-grid-4"
          style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 18 }}
        >
          {FOCUS_OPTIONS.map((o) => {
            const active = focus.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => toggleFocus(o.id)}
                style={{
                  textAlign: "right",
                  cursor: "pointer",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: active ? "1.5px solid var(--orange)" : "1px solid var(--border)",
                  background: active ? "var(--orange-soft)" : "var(--snow)",
                  transition: "all .15s",
                }}
              >
                <div className="flex items-center" style={{ gap: 6, marginBottom: 4 }}>
                  <span
                    className="flex items-center justify-center"
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 5,
                      border: active ? "none" : "1.5px solid var(--border)",
                      background: active ? "var(--orange)" : "transparent",
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {active && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--carbon)", fontFamily: font }}>
                    {o.label}
                  </span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--stone)", fontFamily: font, lineHeight: 1.7 }}>
                  {o.desc}
                </div>
              </button>
            );
          })}
        </div>
        {focus.length === 0 && (
          <div style={{ fontSize: 12, color: "#c97b84", fontFamily: font, marginBottom: 12 }}>
            اختر محور تركيز واحداً على الأقلّ
          </div>
        )}

        <div className="flex flex-wrap items-end" style={{ gap: 24 }}>
          <div>
            <label className="label">حجم الملخّص</label>
            <div className="flex" style={{ gap: 8 }}>
              {DEPTH_OPTIONS.map((d) => (
                <TabButton
                  key={d.id}
                  active={depth === d.id}
                  onClick={() => setDepth(d.id)}
                  label={d.label}
                  title={d.desc}
                />
              ))}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <label className="label">مستوى الدقّة</label>
            <button
              type="button"
              onClick={() => setPremium((p) => !p)}
              className="flex items-center justify-between w-full"
              style={{
                cursor: "pointer",
                padding: "10px 14px",
                borderRadius: 12,
                border: premium ? "1.5px solid var(--midnight)" : "1px solid var(--border)",
                background: premium ? "rgba(24,24,37,0.04)" : "var(--snow)",
                fontFamily: font,
              }}
            >
              <span style={{ fontSize: 13, color: "var(--carbon)" }}>
                <span style={{ fontWeight: 500 }}>
                  {premium ? "الدقّة القصوى" : "الدقّة العالية (الموصى بها)"}
                </span>
                <span style={{ color: "var(--stone)", fontSize: 12 }}>
                  {premium
                    ? " — النموذج الأعلى من Claude، ثلاثة أضعاف التكلفة"
                    : " — اضغط للترقية إلى النموذج الأعلى"}
                </span>
              </span>
              <span
                style={{
                  width: 34,
                  height: 20,
                  borderRadius: 100,
                  background: premium ? "var(--midnight)" : "var(--border)",
                  position: "relative",
                  flexShrink: 0,
                  transition: "background .15s",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    insetInlineStart: premium ? 16 : 2,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "inset-inline-start .15s",
                  }}
                />
              </span>
            </button>
          </div>
        </div>

        {/* التكلفة + التوليد */}
        <div
          className="flex flex-wrap items-center justify-between"
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid var(--border-sub)",
            gap: 12,
          }}
        >
          <div style={{ fontFamily: font, fontSize: 13, color: "var(--stone)" }}>
            {sourcePages > 0 ? (
              <>
                التكلفة:{" "}
                <span style={{ color: "var(--carbon)", fontWeight: 700 }}>
                  {isAdmin ? "مجاناً (مالك)" : `${ar(cost)} صفحة`}
                </span>
                {!isAdmin && (
                  <>
                    {" "}
                    من رصيدك ({ar(bal)} متاح)
                    {insufficient && (
                      <span style={{ color: "#c97b84" }}>
                        {" "}
                        — الرصيد لا يكفي،{" "}
                        <Link href="/billing" style={{ color: "var(--orange)" }}>
                          اشحن رصيدك
                        </Link>
                      </span>
                    )}
                  </>
                )}
                <span style={{ color: "var(--pebble)", fontSize: 12 }}>
                  {" "}
                  · لا يُخصم شيء إلا مع بدء التوليد، والفشل يُردّ كاملاً
                </span>
              </>
            ) : (
              "حدّد المادّة لعرض التكلفة"
            )}
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={!canGenerate}
            onClick={generate}
            style={{ opacity: canGenerate ? 1 : 0.5, cursor: canGenerate ? "pointer" : "default" }}
          >
            {phase === "running" ? (
              <>
                <Loader2 size={15} className="animate-spin" /> يجري التوليد…
              </>
            ) : (
              <>
                <Sparkles size={15} /> ولّد الملخّص
              </>
            )}
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(201,123,132,0.10)",
              border: "1px solid rgba(201,123,132,0.20)",
              color: "#a8525e",
              fontSize: 13,
              fontFamily: font,
            }}
          >
            {error}
          </div>
        )}
      </div>

      {/* ٣. العرض الحيّ / النتيجة */}
      {showResult && (
        <div ref={resultRef} className="card" style={{ borderRadius: 16 }}>
          <div className="flex items-center justify-between flex-wrap" style={{ gap: 10, marginBottom: 14 }}>
            <div className="flex items-center" style={{ gap: 10 }}>
              <FileText size={16} color="var(--orange)" />
              <span style={{ fontSize: 15, fontWeight: 500, color: "var(--carbon)", fontFamily: font }}>
                {viewer ? viewer.meta.title : runMeta?.title ?? "الملخّص"}
              </span>
              {phase === "running" && (
                <span className="flex items-center" style={{ gap: 6, fontSize: 12, color: "var(--stone)", fontFamily: font }}>
                  <Loader2 size={13} className="animate-spin" /> يُكتب الآن — قد يستغرق دقائق للمقرّرات الكبيرة
                </span>
              )}
            </div>
            {(phase === "done" || viewer) && (
              <div className="flex items-center" style={{ gap: 8 }}>
                <a
                  className="btn-primary no-underline"
                  style={{ fontSize: 12, padding: "8px 16px" }}
                  href={`/api/study/${viewer?.meta.id ?? runMeta?.id}/export?format=docx`}
                >
                  <Download size={13} /> Word
                </a>
                <a
                  className="btn-ghost no-underline"
                  style={{ fontSize: 12, padding: "8px 16px" }}
                  href={`/api/study/${viewer?.meta.id ?? runMeta?.id}/export?format=md`}
                >
                  <Download size={13} /> Markdown
                </a>
              </div>
            )}
          </div>

          {notice && (
            <div
              style={{
                marginBottom: 12,
                padding: "9px 13px",
                borderRadius: 10,
                background: "var(--orange-soft)",
                border: "1px solid rgba(246,146,81,0.25)",
                color: "var(--graphite)",
                fontSize: 12.5,
                fontFamily: font,
              }}
            >
              {notice}
            </div>
          )}

          {(phase === "done" || viewer) && (
            <VerificationBadge v={viewer ? viewer.meta.verification : doneVerification} />
          )}

          <div
            style={{
              maxHeight: phase === "running" ? 420 : undefined,
              overflowY: phase === "running" ? "auto" : undefined,
              padding: "4px 2px",
            }}
          >
            <MarkdownView content={viewer ? viewer.markdown : live || "​"} />
          </div>
        </div>
      )}

      {/* ٤. الملخّصات السابقة */}
      <div className="card" style={{ borderRadius: 16 }}>
        <SectionTitle icon={<BookOpenCheck size={15} />} text="ملخّصاتي السابقة" />
        {summaries.length === 0 ? (
          <div
            className="text-center"
            style={{ padding: "32px 16px", color: "var(--pebble)", fontFamily: font, fontSize: 13.5 }}
          >
            لا ملخّصات بعد — ولّد أوّل ملخّص من الأعلى.
          </div>
        ) : (
          summaries.map((s, i) => (
            <div
              key={s.id}
              className="flex items-center flex-wrap"
              style={{
                gap: 12,
                padding: "12px 8px",
                borderBottom: i < summaries.length - 1 ? "1px solid var(--border-sub)" : "none",
              }}
            >
              <div className="flex-1 min-w-0" style={{ minWidth: 220 }}>
                <div className="flex items-center" style={{ gap: 8, marginBottom: 3 }}>
                  <span
                    className="truncate"
                    style={{ fontSize: 13.5, fontWeight: 500, color: "var(--carbon)", fontFamily: font }}
                  >
                    {s.title}
                  </span>
                  <SummaryStatusPill status={s.status} />
                </div>
                <div style={{ fontSize: 11.5, color: "var(--pebble)", fontFamily: font }}>
                  {ar(s.sourcePages)} صفحة مصدر · {s.pagesCharged > 0 ? `${ar(s.pagesCharged)} صفحة رصيد` : "بلا خصم"} ·{" "}
                  {modelLabel(s.model)} · {new Date(s.createdAt).toLocaleDateString("ar-SA")}
                  {s.status === "COMPLETED" && s.verification && s.verification.total > 0 && (
                    <span style={{ color: s.verification.verified === s.verification.total ? "#3d8a5f" : "#b8860b" }}>
                      {" "}
                      · النقول {ar(s.verification.verified)}/{ar(s.verification.total)}
                    </span>
                  )}
                </div>
                {s.status === "FAILED" && s.errorMessage && (
                  <div style={{ fontSize: 11.5, color: "#c97b84", fontFamily: font, marginTop: 2 }}>
                    {s.errorMessage}
                  </div>
                )}
              </div>
              <div className="flex items-center" style={{ gap: 6 }}>
                {s.status === "COMPLETED" && (
                  <>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 12, padding: "6px 14px" }}
                      onClick={() => openSummary(s.id)}
                    >
                      عرض
                    </button>
                    <a
                      className="btn-ghost no-underline"
                      style={{ fontSize: 12, padding: "6px 14px" }}
                      href={`/api/study/${s.id}/export?format=docx`}
                    >
                      <Download size={12} /> Word
                    </a>
                  </>
                )}
                {(s.status === "FAILED" || s.status === "PROCESSING") && phase !== "running" && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ fontSize: 12, padding: "6px 14px" }}
                    onClick={() => runStream(s.id, s.title)}
                    title={s.status === "PROCESSING" ? "استكمال معالجة عالقة" : "إعادة المحاولة (تخصم من جديد)"}
                  >
                    <RotateCcw size={12} /> {s.status === "PROCESSING" ? "استكمال" : "إعادة"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(s)}
                  title="حذف"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--pebble)",
                    padding: 6,
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── مكوّنات مساعدة ──
function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center" style={{ gap: 8, marginBottom: 14 }}>
      <span style={{ color: "var(--orange)", display: "flex" }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--carbon)", fontFamily: font }}>
        {text}
      </span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  title,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        cursor: "pointer",
        padding: "8px 16px",
        borderRadius: 100,
        fontSize: 12.5,
        fontFamily: font,
        fontWeight: active ? 500 : 400,
        border: active ? "1.5px solid var(--orange)" : "1px solid var(--border)",
        background: active ? "var(--orange-soft)" : "var(--snow)",
        color: active ? "var(--orange)" : "var(--stone)",
        transition: "all .15s",
      }}
    >
      {label}
    </button>
  );
}

function VerificationBadge({
  v,
}: {
  v: { total: number; verified: number; missing: string[] } | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  if (!v) return null;
  if (v.total === 0) return null;
  const ok = v.verified === v.total;
  return (
    <div
      style={{
        marginBottom: 14,
        padding: "10px 14px",
        borderRadius: 10,
        background: ok ? "rgba(61,138,95,0.08)" : "rgba(184,134,11,0.08)",
        border: `1px solid ${ok ? "rgba(61,138,95,0.2)" : "rgba(184,134,11,0.25)"}`,
        fontFamily: font,
        fontSize: 12.5,
        color: ok ? "#3d8a5f" : "#8a6a08",
      }}
    >
      {ok ? (
        <span>✓ تحقّقنا آلياً: كلّ النقول الحرفيّة «...» ({ar(v.total)}) موجودة بنصّها في المادّة</span>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontFamily: font, fontSize: 12.5, padding: 0 }}
          >
            ⚠ تحقّق {ar(v.verified)} من {ar(v.total)} من النقول الحرفيّة — {ar(v.missing.length)} تحتاج مراجعتك ({open ? "إخفاء" : "عرض"})
          </button>
          {open && (
            <ul style={{ margin: "8px 0 0", paddingInlineStart: 18 }}>
              {v.missing.map((m, i) => (
                <li key={i} style={{ marginBottom: 4, lineHeight: 1.8 }}>
                  «{m}»
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function SummaryStatusPill({ status }: { status: string }) {
  const map: Record<string, { l: string; v: "success" | "processing" | "danger" | "neutral" }> = {
    COMPLETED: { l: "مكتمل", v: "success" },
    PROCESSING: { l: "قيد التوليد", v: "processing" },
    FAILED: { l: "فشل", v: "danger" },
    PENDING: { l: "بانتظار", v: "neutral" },
  };
  const e = map[status] ?? { l: status, v: "neutral" as const };
  return <StatusPill status={e.l} variant={e.v} />;
}

function modelLabel(model: string): string {
  return model.includes("fable") || model.includes("mythos") ? "دقّة قصوى" : "دقّة عالية";
}
