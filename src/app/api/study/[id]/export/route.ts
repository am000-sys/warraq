// src/app/api/study/[id]/export/route.ts — تصدير الملخّص الدراسي (Word / Markdown)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildStudyDocx } from "@/lib/study-docx";
import { FOCUS_OPTIONS, DEPTH_OPTIONS } from "@/lib/study";

// مكتبة docx تحتاج بيئة Node كاملة
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const rec = await db.studySummary.findUnique({
    where: { id },
    select: {
      userId: true,
      title: true,
      markdown: true,
      status: true,
      focus: true,
      depth: true,
      completedAt: true,
    },
  });
  if (!rec) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (rec.userId !== session.user.id && session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });
  }
  if (rec.status !== "COMPLETED" || !rec.markdown) {
    return NextResponse.json({ error: "الملخّص غير جاهز بعد" }, { status: 409 });
  }

  const format = (new URL(req.url).searchParams.get("format") ?? "docx").toLowerCase();
  const baseName = `ملخص ${rec.title}`.slice(0, 80);

  if (format === "md") {
    return new NextResponse(rec.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}.md"`,
      },
    });
  }

  // الافتراضي: Word حقيقيّ (.docx) — عناوين وجداول وصناديق خلاصة أصليّة RTL
  try {
    const focusLabels = (rec.focus as string[])
      .map((f) => FOCUS_OPTIONS.find((o) => o.id === f)?.label)
      .filter(Boolean)
      .join(" · ");
    const depthLabel = DEPTH_OPTIONS.find((d) => d.id === rec.depth)?.label ?? rec.depth;
    const date = (rec.completedAt ?? new Date()).toLocaleDateString("ar-SA");
    const metaLine = `${focusLabels} — ${depthLabel} — ${date} — أُعدّ عبر منصّة ورّاق`;

    const buf = await buildStudyDocx(rec.title, metaLine, rec.markdown);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}.docx"`,
      },
    });
  } catch (err) {
    console.error("[study.export.docx]", err);
    return NextResponse.json(
      {
        error: "تعذّر توليد ملفّ Word — نزّل صيغة Markdown كبديل.",
        detail: err instanceof Error ? err.message.slice(0, 300) : String(err).slice(0, 300),
      },
      { status: 500 },
    );
  }
}
