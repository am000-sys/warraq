// src/components/study-client.tsx — واجهة الملخّص الدراسي التفاعليّة
// اختيار المصدر (مستند مفرّغ / نصّ مستقلّ) + محاور التركيز + العمق + مستوى الدقّة.
// التوليد «دفعة واحدة» على خوادم المزوّد: المستخدم يرسل المهمة ويستطيع إغلاق
// الصفحة — رسالة بريديّة تصله عند الاكتمال، والواجهة تطالع الحالة دوريّاً ما
// دامت مفتوحة وتعرض الناتج فور جهوزه، مع شارة فحص النقول والتصدير إلى Word.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  Check,
  Download,
  FileText,
  Loader2,
  MailCheck,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { MarkdownView } from "@/components/markdown-view";
import { StatusPill } from "@/components/page-header";
import { ar } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  FOCUS_OPTIONS,
  DEPTH_OPTIONS,
  calcStudyCost,
  estimateSourcePages,
  type StudyPricing,
} from "@/lib/study-options";

const font = "Tajawal, sans-serif";
const POLL_MS = 12_000;

type Verification = { total: number; verified: number; missing: string[] };

export type SummaryMeta = {
  id: string;
  title: string;
  sourcePages: number;
  focus: string[];
  depth: string;
  model: string;
  status: string;
  pagesCharged: number;
  verification: Verification | null;
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
  pricing: StudyPricing & { maxChars: number; premiumEnabled: boolean };
};

// شارة فحص النقول تُعرض فقط لنتيجة فحص حقيقيّة (الحقل يحمل معرّف الدفعة مؤقّتاً)
function asVerification(v: unknown): Verification | null {
  if (v && typeof v === "object" && typeof (v as Verification).total === "number") {
    return v as Verification;
  }
  return null;
}

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
  const [queued, setQueued] = useState(false); // مهمّتنا الحاليّة قيد المعالجة
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bal, setBal] = useState(balance);
  const [summaries, setSummaries] = useState<SummaryMeta[]>(initialSummaries);
  const [viewer, setViewer] = useState<{ meta: SummaryMeta; markdown: string } | null>(null);
  const [runId, setRunId] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const adjustedRef = useRef<Set<string>>(new Set()); // منع خصم العرض مرّتين

  const selectedJob = jobs.find((j) => j.id === jobId);
  const sourcePages =
    source === "doc" ? selectedJob?.totalPages ?? 0 : estimateSourcePages(text.trim().length);
  const cost = isAdmin ? 0 : sourcePages > 0 ? calcStudyCost(sourcePages, premium, pricing) : 0;
  const insufficient = !isAdmin && cost > bal;
  const tooLong = source === "text" && text.length > pricing.maxChars;
  const canGenerate =
    !queued &&
    focus.length > 0 &&
    !insufficient &&
    !tooLong &&
    (source === "doc" ? Boolean(selectedJob) : text.trim().length >= 500);

  const hasPending = queued || summaries.some((s) => s.status === "PROCESSING");

  // ── مطالعة دوريّة ما دامت ثمّة مهمّة قيد المعالجة ──
  useEffect(() => {
    if (!hasPending) return;
    let stop = false;

    const tick = async () => {
      try {
        const res = await fetch("/api/study/poll");
        if (!res.ok || stop) return;
        const j = (await res.json()) as { summaries: SummaryMeta[] };
        setSummaries(j.summaries);

        const cur = runId ? j.summaries.find((s) => s.id === runId) : undefined;
        if (cur?.status === "COMPLETED") {
          setQueued(false);
          setNotice(null);
          if (!isAdmin && cur.pagesCharged > 0 && !adjustedRef.current.has(cur.id)) {
            adjustedRef.current.add(cur.id);
            setBal((b) => Math.max(0, b - cur.pagesCharged));
          }
          await openSummary(cur.id);
        } else if (cur?.status === "FAILED") {
          setQueued(false);
          setNotice(null);
          setError(cur.errorMessage ?? "تعذّر توليد الملخّص — أعد المحاولة.");
        }
      } catch {
        /* جولة قادمة */
      }
    };

    tick();
    const t = setInterval(tick, POLL_MS);
    return () => {
      stop = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPending, runId]);

  const refreshList = async () => {
    try {
      const res = await fetch("/api/study");
      if (res.ok) setSummaries((await res.json()).summaries);
    } catch {
      /* تجاهل */
    }
  };

  const toggleFocus = (id: string) =>
    setFocus((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  // ── إرسال المهمة (دفعة واحدة) ──
  async function submitRun(id: string) {
    const res = await fetch(`/api/study/${id}/run`, { method: "POST" });
    const j = await res.json().catch(() => null);
    if (!res.ok) throw new Error(j?.error ?? "تعذّر إرسال المهمة");
    if (j?.completed) {
      await openSummary(id);
      await refreshList();
      return;
    }
    setRunId(id);
    setQueued(true);
    setViewer(null);
    setNotice(
      "أُرسلت المهمة وتُعالَج كاملةً على الخادم — تكتمل عادةً خلال دقائق. يمكنك إغلاق الصفحة بأمان: ستصلك رسالة بريديّة عند الاكتمال، وسيظهر الملخّص هنا تلقائياً.",
    );
    await refreshList();
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
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
      await submitRun(j.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر إرسال المهمة");
    }
  }

  async function resume(s: SummaryMeta) {
    setError(null);
    try {
      await submitRun(s.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر إرسال المهمة");
      await refreshList();
    }
  }

  async function openSummary(id: string) {
    try {
      const res = await fetch(`/api/study/${id}`);
      if (!res.ok) return;
      const { summary } = await res.json();
      if (summary?.markdown) {
        setViewer({
          meta: { ...summary, verification: asVerification(summary.verification) },
          markdown: summary.markdown,
        });
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
    if (
      !confirm(
        `حذف «${s.title}»؟${s.status !== "COMPLETED" && s.pagesCharged > 0 ? " سيُردّ المخصوم إلى رصيدك." : ""}`,
      )
    )
      return;
    const res = await fetch(`/api/study/${s.id}`, { method: "DELETE" });
    if (res.ok) {
      const j = await res.json().catch(() => null);
      if (j?.refunded > 0 && !isAdmin) setBal((b) => b + j.refunded);
      if (viewer?.meta.id === s.id) setViewer(null);
      if (runId === s.id) {
        setQueued(false);
        setNotice(null);
      }
      await refreshList();
    }
  }

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
            <Textarea
              rows={9}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="الصق هنا نصّ المقرّر أو الفصل المراد تلخيصه…"
              style={{ fontFamily: font, lineHeight: 1.9 }}
            />
            <div
              style={{
                fontSize: 11.5,
                color: tooLong ? "#c97b84" : "var(--pebble)",
                fontFamily: font,
                marginTop: 4,
              }}
            >
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
            placeholder={
              source === "doc"
                ? selectedJob?.fileName.replace(/\.[^.]+$/, "") ?? ""
                : "مثل: مقرّر الفرق — الفصل الأوّل"
            }
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

          {pricing.premiumEnabled && (
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
          )}
        </div>

        {/* التكلفة + الإرسال */}
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
                  · لا يُخصم إلا مع الإرسال، والفشل يُردّ كاملاً
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
            {queued ? (
              <>
                <Loader2 size={15} className="animate-spin" /> قيد المعالجة…
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

      {/* ٣. بطاقة المعالجة الجارية / النتيجة */}
      {(queued || viewer) && (
        <div ref={resultRef} className="card" style={{ borderRadius: 16 }}>
          {queued && !viewer && (
            <div className="flex items-start" style={{ gap: 12 }}>
              <span
                className="flex items-center justify-center flex-shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: "var(--orange-soft)",
                  color: "var(--orange)",
                }}
              >
                <MailCheck size={18} />
              </span>
              <div style={{ fontFamily: font }}>
                <div
                  className="flex items-center"
                  style={{ gap: 8, fontSize: 14, fontWeight: 500, color: "var(--carbon)", marginBottom: 4 }}
                >
                  <Loader2 size={14} className="animate-spin" /> المهمة قيد المعالجة كاملةً على الخادم
                </div>
                <div style={{ fontSize: 13, color: "var(--stone)", lineHeight: 1.9 }}>
                  {notice ??
                    "تكتمل عادةً خلال دقائق. يمكنك إغلاق الصفحة بأمان — ستصلك رسالة بريديّة عند الاكتمال وسيظهر الملخّص هنا تلقائياً."}
                </div>
              </div>
            </div>
          )}

          {viewer && (
            <>
              <div
                className="flex items-center justify-between flex-wrap"
                style={{ gap: 10, marginBottom: 14 }}
              >
                <div className="flex items-center" style={{ gap: 10 }}>
                  <FileText size={16} color="var(--orange)" />
                  <span style={{ fontSize: 15, fontWeight: 500, color: "var(--carbon)", fontFamily: font }}>
                    {viewer.meta.title}
                  </span>
                </div>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <a
                    className="btn-primary no-underline"
                    style={{ fontSize: 12, padding: "8px 16px" }}
                    href={`/api/study/${viewer.meta.id}/export?format=docx`}
                  >
                    <Download size={13} /> Word
                  </a>
                  <a
                    className="btn-ghost no-underline"
                    style={{ fontSize: 12, padding: "8px 16px" }}
                    href={`/api/study/${viewer.meta.id}/export?format=md`}
                  >
                    <Download size={13} /> Markdown
                  </a>
                </div>
              </div>
              <VerificationBadge v={viewer.meta.verification} />
              <div className="wq-md-sheet" style={{ padding: "4px 2px" }}>
                <MarkdownView content={viewer.markdown} variant="study" />
              </div>
            </>
          )}
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
          summaries.map((s, i) => {
            const v = asVerification(s.verification);
            return (
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
                    {ar(s.sourcePages)} صفحة مصدر ·{" "}
                    {s.pagesCharged > 0 ? `${ar(s.pagesCharged)} صفحة رصيد` : "بلا خصم"} ·{" "}
                    {modelLabel(s.model)} · {new Date(s.createdAt).toLocaleDateString("ar-SA")}
                    {s.status === "COMPLETED" && v && v.total > 0 && (
                      <span style={{ color: v.verified === v.total ? "#3d8a5f" : "#b8860b" }}>
                        {" "}
                        · النقول {ar(v.verified)}/{ar(v.total)}
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
                  {(s.status === "FAILED" || s.status === "PENDING") && (
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ fontSize: 12, padding: "6px 14px" }}
                      onClick={() => resume(s)}
                      title={
                        s.status === "FAILED"
                          ? "إعادة المحاولة — يُخصم من جديد ويُردّ عند الفشل"
                          : "إرسال المهمة"
                      }
                    >
                      <RotateCcw size={12} /> {s.status === "FAILED" ? "إعادة" : "إرسال"}
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
            );
          })
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

function VerificationBadge({ v }: { v: Verification | null | undefined }) {
  const [open, setOpen] = useState(false);
  if (!v || typeof v.total !== "number" || v.total === 0) return null;
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
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              fontFamily: font,
              fontSize: 12.5,
              padding: 0,
            }}
          >
            ⚠ تحقّق {ar(v.verified)} من {ar(v.total)} من النقول الحرفيّة — {ar(v.missing.length)} تحتاج
            مراجعتك ({open ? "إخفاء" : "عرض"})
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
    PROCESSING: { l: "قيد المعالجة", v: "processing" },
    FAILED: { l: "فشل", v: "danger" },
    PENDING: { l: "بانتظار الإرسال", v: "neutral" },
  };
  const e = map[status] ?? { l: status, v: "neutral" as const };
  return <StatusPill status={e.l} variant={e.v} />;
}

function modelLabel(model: string): string {
  return model.includes("fable") || model.includes("mythos") ? "دقّة قصوى" : "دقّة عالية";
}
