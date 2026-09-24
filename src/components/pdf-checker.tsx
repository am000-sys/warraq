// src/components/pdf-checker.tsx — فاحص ملفّات PDF العربيّة (يعمل في المتصفّح وحده)
//
// الملفّ لا يغادر جهاز المستخدم: pdfjs وعامله مجمَّعان من node_modules ويُخدمان من
// نطاقنا، ولا يُضبط cMapUrl ولا standardFontDataUrl فلا يُجلب شيءٌ من الشبكة.
// وهذا ليس ميزةً تسويقيّة فحسب — هو ما يجعل الأداة مجّانيّة بلا كلفة خادم.
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FileSearch, Check, AlertTriangle, ImageOff, Upload } from "lucide-react";
import {
  classifyPage,
  samplePages,
  emptyTally,
  verdictOf,
  type Tally,
  type Verdict,
} from "@/lib/pdf-diagnose";

type Result = {
  verdict: Verdict;
  pages: number;
  sampled: number;
  tally: Tally;
  sample: string | null;
};

type State =
  | { s: "idle" }
  | { s: "working"; done: number; of: number }
  | { s: "done"; r: Result; name: string }
  | { s: "error"; msg: string };

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerPort) {
    // webpack يجمّع العامل بنفسه من هذه الصيغة — فلا مصدر خارجيّ ولا نسخة يدويّة في public/
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url),
      { type: "module" },
    );
  }
  return pdfjs;
}

async function diagnose(file: File, onProgress: (done: number, of: number) => void): Promise<Result> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  try {
    const picks = samplePages(doc.numPages);
    const tally = emptyTally();
    let sample: string | null = null;
    for (let i = 0; i < picks.length; i++) {
      const page = await doc.getPage(picks[i]);
      const content = await page.getTextContent();
      const text = content.items.map((it) => ("str" in it ? it.str : "")).join(" ");
      const kind = classifyPage(text);
      tally[kind]++;
      // مقتطفٌ ممّا سيُنسخ فعلاً — يرى المستخدم بعينه ما يحصل عليه
      if (!sample && kind !== "image" && kind !== "other") {
        sample = text.replace(/\s+/g, " ").trim().slice(0, 180);
      }
      page.cleanup();
      onProgress(i + 1, picks.length);
    }
    return { verdict: verdictOf(tally), pages: doc.numPages, sampled: picks.length, tally, sample };
  } finally {
    await doc.destroy();
  }
}

const COPY: Record<Verdict, { title: string; body: string; tone: "good" | "bad" | "warn"; cta: boolean }> = {
  scanned: {
    title: "ملفّك مصوَّر — لا نصّ فيه",
    body: "صفحاته صورٌ لا تحمل طبقة نصّ، فلا شيء يُنسخ منها ولا يُبحث فيها. تحتاج إلى تفريغٍ يقرأ الصورة ويستخرج منها النصّ.",
    tone: "bad",
    cta: true,
  },
  broken: {
    title: "في ملفّك نصٌّ، لكنّه تالف",
    body: "للملفّ طبقة نصّ، غير أنّ حروفها مخزَّنةٌ بصيغةٍ تُفسد النسخ: أشكالٌ متّصلة بدل الحروف الأساسيّة، أو ترميزٌ قديم، أو خطٌّ بلا جدول تحويل. لذلك يخرج النصّ عند اللصق في كثيرٍ من البرامج رموزاً أو حروفاً مقطّعة أو مقلوبة، ولا يعثر عليه البحث. والحلّ تفريغٌ جديد من الصورة لا إصلاح النصّ القائم.",
    tone: "bad",
    cta: true,
  },
  mixed: {
    title: "ملفّك مختلط",
    body: "بعض صفحاته نصٌّ سليم وبعضها صورٌ أو نصٌّ تالف. النسخ ينجح في بعض المواضع ويفشل في غيرها. تفريغ الملفّ كاملاً يُوحّد النتيجة.",
    tone: "warn",
    cta: true,
  },
  ok: {
    title: "ملفّك نصّيّ سليم",
    body: "في ملفّك طبقة نصٍّ عربيّ صحيحة الحروف: تستطيع النسخ منه والبحث فيه مباشرةً، ولا تحتاج إلى تفريغ. وإن ظهر النصّ مقلوباً عند اللصق فالعلّة غالباً في البرنامج الذي تلصق فيه لا في الملفّ.",
    tone: "good",
    cta: false,
  },
  latin: {
    title: "النصّ المستخرج ليس عربيّاً",
    body: "في الملفّ طبقة نصّ، لكنّ أكثر ما فيها حروفٌ لاتينيّة. إن كان كتابك عربيّاً فهذه على الأرجح طبقةٌ من تفريغٍ آليٍّ سابق قرأه بلغةٍ أخرى، ونصّها لا يُعتمد عليه.",
    tone: "warn",
    cta: true,
  },
};

const TONE = {
  good: { color: "var(--success)", Icon: Check },
  warn: { color: "var(--orange)", Icon: AlertTriangle },
  bad: { color: "var(--rose)", Icon: ImageOff },
} as const;

const F = "Tajawal, sans-serif";

export default function PdfChecker() {
  const [state, setState] = useState<State>({ s: "idle" });
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function run(file: File | undefined) {
    if (!file) return;
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setState({ s: "error", msg: "هذه الأداة تفحص ملفّات PDF وحدها." });
      return;
    }
    setState({ s: "working", done: 0, of: 0 });
    try {
      const r = await diagnose(file, (done, of) => setState({ s: "working", done, of }));
      setState({ s: "done", r, name: file.name });
    } catch (e) {
      const name = (e as { name?: string })?.name;
      setState({
        s: "error",
        msg:
          name === "PasswordException"
            ? "الملفّ محميّ بكلمة مرور، فلا يمكن فحصه."
            : name === "InvalidPDFException"
              ? "تعذّرت قراءة الملفّ — يبدو تالفاً أو ليس PDF حقيقيّاً."
              : "تعذّر فحص الملفّ في هذا المتصفّح. جرّب متصفّحاً أحدث.",
      });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          run(e.dataTransfer.files?.[0]);
        }}
        className="card flex flex-col items-center justify-center text-center cursor-pointer"
        style={{
          padding: "36px 24px",
          borderRadius: "var(--r-card)",
          border: `1.5px dashed ${drag ? "var(--orange)" : "var(--border)"}`,
          background: drag ? "var(--orange-soft)" : "var(--snow)",
          gap: 10,
          transition: "border-color .15s, background .15s",
        }}
      >
        <input
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => run(e.target.files?.[0])}
        />
        <Upload size={26} color="var(--orange)" strokeWidth={1.6} />
        <div style={{ fontFamily: F, fontSize: 16, fontWeight: 500, color: "var(--carbon)" }}>
          اختر ملفّ PDF أو اسحبه إلى هنا
        </div>
        <div style={{ fontFamily: F, fontSize: 13, color: "var(--pebble)", lineHeight: 1.8 }}>
          يُفحص في متصفّحك — لا يُرفع ملفّك إلى أيّ خادم
        </div>
      </label>

      <div aria-live="polite">
        {state.s === "working" && (
          <div
            className="flex items-center"
            style={{ gap: 10, marginTop: 18, fontFamily: F, fontSize: 14, color: "var(--stone)" }}
          >
            <FileSearch size={16} color="var(--orange)" />
            {state.of ? `يفحص الصفحة ${state.done} من ${state.of} المختارة…` : "يقرأ الملفّ…"}
          </div>
        )}

        {state.s === "error" && (
          <div
            style={{ marginTop: 18, fontFamily: F, fontSize: 14, color: "var(--rose)", lineHeight: 1.9 }}
          >
            {state.msg}
          </div>
        )}

        {state.s === "done" &&
          (() => {
            const c = COPY[state.r.verdict];
            const { color, Icon } = TONE[c.tone];
            const t = state.r.tally;
            return (
              <div className="card" style={{ marginTop: 18, padding: 24, borderRadius: "var(--r-card)" }}>
                <div className="flex items-center" style={{ gap: 10, marginBottom: 12 }}>
                  <Icon size={20} color={color} />
                  <h2 style={{ fontFamily: F, fontSize: 19, fontWeight: 500, color: "var(--carbon)" }}>
                    {c.title}
                  </h2>
                </div>
                <p style={{ fontFamily: F, fontSize: 15, lineHeight: 2, color: "var(--stone)" }}>{c.body}</p>

                {state.r.sample && state.r.verdict !== "scanned" && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontFamily: F, fontSize: 12.5, color: "var(--pebble)", marginBottom: 6 }}>
                      هذا ما ستحصل عليه لو نسخت من الملفّ:
                    </div>
                    <div
                      dir="auto"
                      style={{
                        fontSize: 14,
                        lineHeight: 1.9,
                        background: "var(--fog)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        wordBreak: "break-word",
                        color: "var(--carbon)",
                      }}
                    >
                      {state.r.sample}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    marginTop: 16,
                    fontFamily: F,
                    fontSize: 12.5,
                    color: "var(--pebble)",
                    lineHeight: 1.9,
                  }}
                >
                  فُحصت {state.r.sampled} صفحة موزّعة على {state.r.pages} — نصٌّ سليم: {t.ok} · صور: {t.image}
                  {" "}· نصٌّ تالف: {t.presentation + t.encoding}
                  {t.latin ? ` · لاتينيّ: ${t.latin}` : ""}
                </div>

                <div className="flex flex-wrap items-center" style={{ gap: 10, marginTop: 20 }}>
                  {c.cta && (
                    <Link href="/try" className="btn-primary no-underline" style={{ fontSize: 14, padding: "11px 24px" }}>
                      فرّغه في وَرَّاق
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => input.current?.click()}
                    className="btn-ghost"
                    style={{ fontSize: 14, padding: "11px 24px" }}
                  >
                    افحص ملفّاً آخر
                  </button>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
