// src/app/(admin)/admin/survey/page.tsx — الاستبيان: الإرسال إلى شريحة، ثمّ النتائج
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SurveySendForm } from "@/components/survey-send-form";
import { auth } from "@/lib/auth";
import {
  SURVEY_QUESTIONS,
  SURVEY_SEGMENTS,
  getSurveyAudience,
  getSurveyResults,
  surveyToken,
} from "@/lib/survey";
import { ar } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SurveyAdminPage() {
  const session = await auth();
  const results = await getSurveyResults();
  const audiences = await Promise.all(SURVEY_SEGMENTS.map((s) => getSurveyAudience(s.v)));
  const segments = SURVEY_SEGMENTS.map((s, i) => ({ ...s, count: audiences[i].length }));
  // معاينة بحساب المالك — إجابته لا تُحتسب في النتائج
  const previewToken = session?.user?.id ? surveyToken(session.user.id) : null;
  const rate = results.sent ? Math.round((results.responded / results.sent) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="الاستبيان"
        subtitle="استبيانٌ قصير يصل رابطه بالبريد، ويقيس حاجة المستخدم دون أن يذكر أنّه لم يرفع أو لم يشترِ."
      />

      <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginBottom: 20 }}>
        <div className="card" style={{ borderRadius: 16, padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--carbon)", marginBottom: 14 }}>الإرسال</h2>
          <SurveySendForm segments={segments} />
          {previewToken && (
            <p style={{ fontSize: 12.5, color: "var(--pebble)", marginTop: 16 }}>
              <Link href={`/survey?t=${encodeURIComponent(previewToken)}`} target="_blank" style={{ color: "var(--orange)" }}>
                معاينة الاستبيان
              </Link>{" "}
              كما يراه المستخدم (إجابتك لا تُحتسب).
            </p>
          )}
        </div>

        <div className="card" style={{ borderRadius: 16, padding: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--carbon)", marginBottom: 14 }}>الحصيلة</h2>
          <div className="flex gap-8">
            <Stat n={results.sent} l="أُرسل إليهم" />
            <Stat n={results.responded} l="أجابوا" />
            <Stat n={rate} l="نسبة الإجابة ٪" />
          </div>
          {results.failed.length > 0 && (
            <details style={{ marginTop: 16, fontSize: 12.5, color: "var(--stone)" }}>
              <summary className="cursor-pointer" style={{ color: "var(--orange)" }}>
                تعذّر الإرسال إلى {ar(results.failed.length)} عنوان
              </summary>
              <ul className="list-none flex flex-col" style={{ gap: 6, marginTop: 10 }}>
                {results.failed.map((f, i) => (
                  <li key={i}>
                    <span style={{ direction: "ltr", unicodeBidi: "isolate", color: "var(--carbon)" }}>{f.email}</span>
                    {f.error && <span style={{ color: "var(--pebble)" }}> — {f.error}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>

      {/* النتائج: لكلّ سؤال عدد من اختار كلّ خيار */}
      <div className="card" style={{ borderRadius: 16, padding: 20 }}>
        {results.responded === 0 ? (
          <p style={{ fontSize: 13, color: "var(--pebble)", textAlign: "center", padding: 12 }}>
            لا إجابات بعد.
          </p>
        ) : (
          <div className="flex flex-col" style={{ gap: 26 }}>
            {SURVEY_QUESTIONS.map((q) =>
              q.kind === "text" ? (
                <div key={q.key}>
                  <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--carbon)", marginBottom: 10 }}>{q.label}</h3>
                  {results.comments.length === 0 ? (
                    <p style={{ fontSize: 13, color: "var(--pebble)" }}>لا ملاحظات.</p>
                  ) : (
                    <ul className="list-none flex flex-col" style={{ gap: 10 }}>
                      {results.comments.map((c, i) => (
                        <li key={i} style={{ fontSize: 13, color: "var(--carbon)", lineHeight: 1.7 }}>
                          «{c.text}»
                          <span style={{ color: "var(--pebble)", fontSize: 12 }}>
                            {" "}— {c.name || "—"}{" "}
                            <a href={`mailto:${c.email}`} style={{ direction: "ltr", color: "var(--stone)" }}>
                              {c.email}
                            </a>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div key={q.key}>
                  <h3 style={{ fontSize: 14, fontWeight: 500, color: "var(--carbon)", marginBottom: 10 }}>{q.label}</h3>
                  <div className="flex flex-col" style={{ gap: 6 }}>
                    {q.options.map((o) => {
                      const n = results.counts[q.key]?.[o.v] ?? 0;
                      const pct = Math.round((n / results.responded) * 100);
                      return (
                        <div key={o.v} className="flex items-center gap-3" style={{ fontSize: 13 }}>
                          <span style={{ width: 230, flexShrink: 0, color: "var(--carbon)" }}>{o.l}</span>
                          <div style={{ flex: 1, background: "var(--fog)", borderRadius: 100, height: 18, overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "var(--orange)", borderRadius: 100 }} />
                          </div>
                          <span style={{ width: 70, flexShrink: 0, color: "var(--stone)", fontSize: 12 }}>
                            {ar(n)} ({ar(pct)}٪)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div>
      <div style={{ fontSize: 30, fontWeight: 300, color: "var(--carbon)", lineHeight: 1 }}>{ar(n)}</div>
      <div style={{ fontSize: 12, color: "var(--stone)", marginTop: 6 }}>{l}</div>
    </div>
  );
}
