// src/app/api/study/poll/route.ts — مطالعة دفعات الملخّص الدراسي وتسويتها
// يستدعيه العميل دوريّاً ما دام لديه ملخّص قيد المعالجة (وتستدعيه صفحة /study
// عند التحميل، وcron يوميّ كشبكة أمان للإشعار البريدي حتى لو لم يفتح أحد الموقع).
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { settleStudyBatches } from "@/lib/study-poll";
import { isValidChainToken, kickStudyChain, MAX_CHAIN_HOPS } from "@/lib/study-chain";

export const runtime = "nodejs";
// التسوية قد تولّد دفعات متابعة/بديلة بنداء Qwen متزامن — مهلة أوسع.
export const maxDuration = 300;

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

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // وضع السلسلة: دالّة استطلاع تستدعي أختها لتُكمل المقاطع بعد إغلاق الصفحة.
  // الرمز مشتقّ من AUTH_SECRET فلا يُطلقها أحد من الخارج، والسلسلة تتوقّف من
  // نفسها متى لم يعد ثمّة تقدّم — فلا تدور بلا عمل (انظر study-chain.ts).
  if (url.searchParams.get("chain") === "1") {
    if (!isValidChainToken(req.headers.get("x-study-chain"))) {
      return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
    }
    const hop = Math.max(0, Number(url.searchParams.get("hop")) || 0) + 1;
    const result = await settleStudyBatches();
    if (result.advanced > 0 && hop < MAX_CHAIN_HOPS) await kickStudyChain(hop);
    return NextResponse.json({ ...result, hop });
  }

  // وضع cron (شبكة الأمان اليوميّة): يسوّي دفعات الجميع. يتحقّق من CRON_SECRET
  // إن ضُبط (Vercel يرسله تلقائياً في ترويسة Authorization).
  if (url.searchParams.get("cron") === "1") {
    const secret = process.env.CRON_SECRET;
    const authz = req.headers.get("authorization");
    if (secret && authz !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
    }
    const result = await settleStudyBatches();
    return NextResponse.json(result);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  await settleStudyBatches(session.user.id).catch(() => {});
  const summaries = await db.studySummary.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: SUMMARY_LIST_SELECT,
  });
  return NextResponse.json({ summaries });
}
