// src/app/(app)/study/page.tsx — صفحة الملخّص الدراسي (ميزة مستقلّة عن التفريغ)
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { StudyClient, type SummaryMeta } from "@/components/study-client";
import { getStudyConfig, isStudyConfigured } from "@/lib/study";

export const metadata = { title: "الملخّص الدراسي — ورّاق" };

export default async function StudyPage() {
  const user = (await getCurrentUser())!;

  const [jobs, summaries, cfg] = await Promise.all([
    db.job.findMany({
      where: { userId: user.id, status: "COMPLETED", totalPages: { gt: 0 } },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, fileName: true, totalPages: true, createdAt: true },
    }),
    db.studySummary.findMany({
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
    }),
    getStudyConfig(),
  ]);

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
          isAdmin={user.systemRole === "SYSTEM_ADMIN"}
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
