// src/app/api/study/route.ts — الملخّص الدراسي: القائمة + إنشاء طلب جديد
// POST ينشئ السجلّ ويتحقّق من الرصيد مسبقاً (402 واضحة) — الخصم الفعلي يتمّ
// ذرّياً في مسار التشغيل /run مع بدء المعالجة (لا خصم بلا عمل).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentBalance, insufficientUpfrontMessage } from "@/lib/billing";
import {
  FOCUS_IDS,
  DEPTH_IDS,
  type StudyFocus,
  type StudyDepth,
  calcStudyCost,
  estimateSourcePages,
  getStudyConfig,
  isStudyConfigured,
} from "@/lib/study";

export const runtime = "nodejs";

const SUMMARY_LIST_SELECT = {
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
} as const;

// قائمة ملخّصات المستخدم (بلا متن Markdown — يُجلب من مسار العنصر)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  const summaries = await db.studySummary.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: SUMMARY_LIST_SELECT,
  });
  return NextResponse.json({ summaries });
}

const createSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    jobId: z.string().trim().min(1).optional(),
    text: z.string().optional(),
    focus: z
      .array(z.enum(FOCUS_IDS as [StudyFocus, ...StudyFocus[]]))
      .min(1)
      .max(FOCUS_IDS.length),
    depth: z.enum(DEPTH_IDS as [StudyDepth, ...StudyDepth[]]).default("balanced"),
    premium: z.boolean().default(false),
  })
  .refine((d) => Boolean(d.jobId) !== Boolean(d.text?.trim()), {
    message: "حدّد مصدراً واحداً: مستنداً مفرّغاً أو نصّاً مستقلاً",
  });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }
  if (!isStudyConfigured) {
    return NextResponse.json(
      { error: "خدمة الملخّص الدراسي غير مهيّأة بعد", configRequired: true },
      { status: 503 },
    );
  }

  const cfg = await getStudyConfig();
  if (!cfg.enabled) {
    return NextResponse.json({ error: "خدمة الملخّص الدراسي موقوفة حالياً" }, { status: 403 });
  }

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (err) {
    const msg =
      err instanceof z.ZodError
        ? err.errors[0]?.message ?? "طلب غير صالح"
        : "طلب غير صالح";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // بوّابة تحكّم بالتكلفة: المالك يستطيع إيقاف «الدقّة القصوى» بمفتاح إعداد واحد
  if (body.premium && !cfg.premiumEnabled) {
    return NextResponse.json({ error: "خيار الدقّة القصوى غير متاح حالياً" }, { status: 403 });
  }

  const userId = session.user.id;
  const isAdmin = session.user.systemRole === "SYSTEM_ADMIN";

  // تحديد المصدر وحجمه (أساس التسعير) — دون أيّ اقتطاع صامت
  let title = body.title ?? "";
  let sourceJobId: string | null = null;
  let sourceText: string | null = null;
  let sourcePages = 0;

  if (body.jobId) {
    const job = await db.job.findUnique({
      where: { id: body.jobId },
      select: { id: true, userId: true, status: true, fileName: true, totalPages: true },
    });
    if (!job || job.userId !== userId) {
      return NextResponse.json({ error: "المستند غير موجود" }, { status: 404 });
    }
    if (job.status !== "COMPLETED") {
      return NextResponse.json({ error: "المستند لم تكتمل معالجته بعد" }, { status: 409 });
    }
    sourceJobId = job.id;
    sourcePages = Math.max(1, job.totalPages);
    if (!title) title = job.fileName.replace(/\.[^.]+$/, "");
  } else {
    const text = (body.text ?? "").trim();
    if (text.length < 500) {
      return NextResponse.json(
        { error: "النصّ أقصر من أن يُلخّص — الحدّ الأدنى ٥٠٠ حرف" },
        { status: 400 },
      );
    }
    if (text.length > cfg.maxChars) {
      return NextResponse.json(
        {
          error: `المادّة أكبر من الحدّ المسموح (${Math.round(cfg.maxChars / 1000)} ألف حرف). قسّمها إلى أجزاء ولخّص كلّ جزء على حدة.`,
        },
        { status: 413 },
      );
    }
    sourceText = text;
    sourcePages = estimateSourcePages(text.length);
    if (!title) title = text.slice(0, 60).split("\n")[0].trim() || "ملخّص دراسي";
  }

  const cost = isAdmin ? 0 : calcStudyCost(sourcePages, body.premium, cfg);

  // فحص مسبق للرصيد برسالة واضحة — الخصم الحقيقي عند التشغيل
  if (cost > 0) {
    const balance = await currentBalance(userId);
    if (balance < cost) {
      return NextResponse.json(
        {
          error: insufficientUpfrontMessage(cost, balance),
          required: cost,
          available: balance,
        },
        { status: 402 },
      );
    }
  }

  const record = await db.studySummary.create({
    data: {
      userId,
      title,
      sourceJobId,
      sourceText,
      sourcePages,
      focus: body.focus,
      depth: body.depth,
      model: body.premium ? cfg.modelPremium : cfg.model,
      status: "PENDING",
    },
    select: { id: true },
  });

  return NextResponse.json({ id: record.id, cost, sourcePages });
}
