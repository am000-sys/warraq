// src/app/survey/page.tsx — الاستبيان: رابطٌ شخصيّ يصل بالبريد، فيُجاب بلا دخول
//
// نموذج HTML عاديّ مع إجراء خادم: يعمل بلا JavaScript، والمتصفّح يفرض الأسئلة
// الفرديّة المطلوبة (required)، والخادم يتحقّق من كلّ خيار قبل الحفظ.
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import {
  SURVEY_QUESTIONS,
  verifySurveyToken,
  parseSurveyAnswers,
  hasResponded,
  saveSurveyResponse,
} from "@/lib/survey";
import { ar } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "استبيان قصير",
  robots: { index: false, follow: false },
};

const F = "Tajawal, sans-serif";

async function submitSurvey(formData: FormData) {
  "use server";
  const token = String(formData.get("t") ?? "");
  const userId = verifySurveyToken(token);
  if (!userId) redirect("/survey");
  const answers = parseSurveyAnswers(formData);
  if (!answers) redirect(`/survey?t=${encodeURIComponent(token)}&e=1`);
  await saveSurveyResponse(userId, answers);
  redirect(`/survey?t=${encodeURIComponent(token)}`);
}

export default async function SurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; e?: string }>;
}) {
  const { t, e } = await searchParams;
  const userId = verifySurveyToken(t);
  const done = userId ? await hasResponded(userId) : false;

  return (
    <main style={{ minHeight: "100vh", background: "var(--fog)", padding: "48px 16px" }}>
      <div className="mx-auto" style={{ maxWidth: 620 }}>
        <div className="flex justify-center" style={{ marginBottom: 28 }}>
          <Link href="/" className="no-underline" aria-label="وَرَّاق">
            <Logo />
          </Link>
        </div>

        <div className="card" style={{ borderRadius: 24, padding: 28 }}>
          {!userId ? (
            <Notice
              title="الرابط غير صالح"
              text="افتح الاستبيان من الرابط الذي وصلك بالبريد."
            />
          ) : done ? (
            <Notice
              title="شكراً لك"
              text="وصلتنا إجابتك، وستساعدنا في تطوير وَرَّاق."
            />
          ) : (
            <>
              <h1 style={{ fontFamily: F, fontSize: 24, fontWeight: 500, color: "var(--carbon)", marginBottom: 8 }}>
                استبيان قصير · دقيقة واحدة
              </h1>
              <p className="font-light" style={{ fontFamily: F, fontSize: 15, color: "var(--stone)", lineHeight: 1.8, marginBottom: 24 }}>
                نطوّر وَرَّاق ليخدم الباحثين والمحقّقين على أحسن وجه، وإجابتك تحدّد ما نعمل عليه
                بعد ذلك.
              </p>

              {e && (
                <p role="alert" style={{ fontFamily: F, fontSize: 14, color: "var(--orange)", marginBottom: 18 }}>
                  أجب عن الأسئلة المطلوبة، ثمّ أرسل.
                </p>
              )}

              <form action={submitSurvey} className="flex flex-col" style={{ gap: 26 }}>
                <input type="hidden" name="t" value={t ?? ""} />
                {SURVEY_QUESTIONS.map((q, i) => (
                  <fieldset key={q.key} style={{ border: "none", padding: 0, margin: 0, minWidth: 0 }}>
                    <legend style={{ fontFamily: F, fontSize: 15, fontWeight: 500, color: "var(--carbon)", marginBottom: 12 }}>
                      {ar(i + 1)}. {q.label}
                    </legend>
                    {q.kind === "text" ? (
                      <textarea
                        name={q.key}
                        maxLength={q.maxLength}
                        rows={3}
                        className="field"
                        style={{ width: "100%", fontFamily: F, resize: "vertical" }}
                      />
                    ) : (
                      <div className="flex flex-col" style={{ gap: 10 }}>
                        {q.options.map((o) => (
                          <label
                            key={o.v}
                            className="flex items-center gap-2.5 cursor-pointer"
                            style={{ fontFamily: F, fontSize: 14.5, color: "var(--stone)" }}
                          >
                            <input
                              type={q.kind === "single" ? "radio" : "checkbox"}
                              name={q.key}
                              value={o.v}
                              required={q.kind === "single"}
                              style={{ accentColor: "var(--orange)", width: 17, height: 17, flexShrink: 0 }}
                            />
                            {o.l}
                          </label>
                        ))}
                      </div>
                    )}
                  </fieldset>
                ))}
                <button type="submit" className="btn-primary justify-center" style={{ fontSize: 15, padding: 13 }}>
                  أرسل إجابتي
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="text-center" style={{ padding: "12px 0" }}>
      <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 500, color: "var(--carbon)", marginBottom: 8 }}>
        {title}
      </h1>
      <p className="font-light m-0" style={{ fontFamily: F, fontSize: 15, color: "var(--stone)", lineHeight: 1.8 }}>
        {text}
      </p>
    </div>
  );
}
