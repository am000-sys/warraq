// src/app/api/jobs/[id]/export/route.ts — تصدير نتائج الوظيفة
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  const format = (new URL(req.url).searchParams.get("format") ?? "txt").toLowerCase();

  const job = await db.job.findUnique({
    where: { id },
    include: {
      pages: {
        orderBy: { sequentialNumber: "asc" },
        select: { sequentialNumber: true, printedNumber: true, textContent: true },
      },
    },
  });

  if (!job) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  if (job.userId !== session.user.id && session.user.systemRole !== "SYSTEM_ADMIN") {
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });
  }

  const baseName = job.fileName.replace(/\.[^.]+$/, "");

  // يستبدل الأشكال المضمّنة (data URI) بعلامة نصّيّة — للصيغ غير Markdown
  const stripFigures = (s: string) =>
    (s ?? "").replace(/!\[[^\]]*\]\(data:[^)]*\)/g, "[شكل]");

  if (format === "json") {
    const body = JSON.stringify(
      {
        job: { id: job.id, fileName: job.fileName, totalPages: job.totalPages },
        pages: job.pages.map((p) => ({
          sequential: p.sequentialNumber,
          printed: p.printedNumber,
          text: stripFigures(p.textContent ?? ""),
        })),
      },
      null,
      2,
    );
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}.json"`,
      },
    });
  }

  if (format === "md") {
    const body = job.pages
      .map(
        (p) =>
          `## صفحة ${p.printedNumber ?? p.sequentialNumber}\n\n${p.textContent ?? ""}`,
      )
      .join("\n\n---\n\n");
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}.md"`,
      },
    });
  }

  if (format === "docx") {
    // DOCX حقيقي يحتاج مكتبة docx — نُصدّر HTML متوافق مع Word كحلّ مبدئي
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>body{font-family:'Tajawal',Arial;direction:rtl;line-height:2}</style></head><body>${job.pages
      .map(
        (p) =>
          `<h2>صفحة ${p.printedNumber ?? p.sequentialNumber}</h2><p>${stripFigures(p.textContent ?? "").replace(/\n/g, "<br>")}</p>`,
      )
      .join("<hr>")}</body></html>`;
    return new NextResponse(html, {
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}.doc"`,
      },
    });
  }

  // الافتراضي: TXT
  const body = job.pages
    .map((p) => `[صفحة ${p.printedNumber ?? p.sequentialNumber}]\n${stripFigures(p.textContent ?? "")}`)
    .join("\n\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(baseName)}.txt"`,
    },
  });
}
