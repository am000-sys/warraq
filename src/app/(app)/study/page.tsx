// src/app/(app)/study/page.tsx — صفحة الملخّص الدراسي (ميزة مستقلّة عن التفريغ)
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { InitDbButton } from "@/components/init-db-button";
import { StudyClient, type SummaryMeta } from "@/components/study-client";
import { getStudyConfig, isStudyConfigured } from "@/lib/study";

export const metadata = { title: "الملخّص الدراسي — ورّاق" };

// P2021/P2022: الجدول/العمود غير موجود بعد في قاعدة البيانات (لم تُشغَّل التهيئة)
function isMissingTableError(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    (err.code === "P2021" || err.code === "P2022")
  );
}

export default async function StudyPage() {
  const user = (await getCurrentUser())!;
  const isAdmin = user.systemRole === "SYSTEM_ADMIN";

  const [jobs, cfg] = await Promise.all([
    db.job.findMany({
      where: { userId: user.id, status: "COMPLETED", totalPages: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, fileName: true, totalPages: true, createdAt: true },
    }),
    getStudyConfig(),
  ]);

  // لا تُسقط الصفحة كاملة إن كان جدول StudySummary لم يُهيَّأ بعد —
  // اعرض بطاقة تهيئة واضحة بدلاً من Application error.
  let summaries: DbSummary[] = [];
  let tableMissing = false;
  try {
    summaries = await db.studySummary.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        sourcePages: true,
        focus: true,
        depth: true,
        model: true,
        status: true,
        pagesCharged: true,
        verification: true,
        errorMessage: true,
        createdAt: true,
        completedAt: true,
      },
    });
  } catch (err) {
    if (isMissingTableError(err)) tableMissing = true;
    else throw err;
  }

  if (tableMissing) {
    return (
      <>
        <PageHeader
          title="الملخّص الدراسي"
          subtitle="حوّل مقرّرك أو كتابك إلى ملخّص منظّم للمذاكرة — بنقولٍ موثّقة وأرقام صفحات من المادّة نفسها"
        />
        {isAdmin ? (
          <>
            <div
              className="card"
              style={{
                borderRadius: 16,
                marginBottom: 16,
                padding: "20px 24px",
                fontFamily: "Tajawal, sans-serif",
                fontSize: 14,
                color: "var(--stone)",
                lineHeight: 1.9,
              }}
            >
              الميزة مثبّتة لكنّ جدولها لم يُنشأ في قاعدة البيانات بعد. اضغط زرّ
              التهيئة أدناه مرّة واحدة ثمّ حدّث الصفحة.
            </div>
            <InitDbButton />
          </>
        ) : (
          <div
            className="card text-center"
            style={{
              borderRadius: 16,
              padding: "48px 24px",
              color: "var(--stone)",
              fontFamily: "Tajawal, sans-serif",
              fontSize: 14,
            }}
          >
            خدمة الملخّص الدراسي قيد التجهيز — عُد بعد قليل.
          </div>
        )}
      </>
    );
  }

  const available = cfg.enabled && isStudyConfigured;

  return (
    <>
      <PageHeader
        title="الملخّص الدراسي"
        subtitle="حوّل مقرّرك أو كتابك إلى ملخّص منظّم للمذاكرة — بنقولٍ موثّقة وأرقام صفحات من المادّة نفسها"
      />
      {!available ? (
        <div
          className="card text-center"
          style={{
            borderRadius: 16,
            padding: "48px 24px",
            color: "var(--stone)",
            fontFamily: "Tajawal, sans-serif",
            fontSize: 14,
          }}
        >
          خدمة الملخّص الدراسي غير متاحة حالياً. عُد لاحقاً أو تواصل مع الدعم.
        </div>
      ) : (
        <StudyClient
          jobs={jobs.map((j) => ({
            id: j.id,
            fileName: j.fileName,
            totalPages: j.totalPages,
            createdAt: j.createdAt.toISOString(),
          }))}
          initialSummaries={summaries.map(serializeSummary)}
          balance={user.pagesBalance}
          isAdmin={isAdmin}
          pricing={{
            rate: cfg.rate,
            minCost: cfg.minCost,
            ratePremium: cfg.ratePremium,
            minCostPremium: cfg.minCostPremium,
            maxChars: cfg.maxChars,
          }}
        />
      )}
    </>
  );
}

type DbSummary = {
  id: string;
  title: string;
  sourcePages: number;
  focus: string[];
  depth: string;
  model: string;
  status: string;
  pagesCharged: number;
  verification: unknown;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
};

function serializeSummary(s: DbSummary): SummaryMeta {
  return {
    id: s.id,
    title: s.title,
    sourcePages: s.sourcePages,
    focus: s.focus,
    depth: s.depth,
    model: s.model,
    status: s.status,
    pagesCharged: s.pagesCharged,
    verification: (s.verification as SummaryMeta["verification"]) ?? null,
    errorMessage: s.errorMessage,
    createdAt: s.createdAt.toISOString(),
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
  };
}
