// src/app/api/jobs/[id]/export/route.ts — تصدير نتائج الوظيفة
import { NextRequest, NextResponse } from "next/server";
import { marked } from "marked";
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
    // HTML متوافق مع Word — جداول + صور + حواشٍ بأسلوب Word (مراجع علويّة + قسم مفصول)
    const FN_SEP = "———— الحواشي ————";
    // يجعل مراجع الحواشي (N) علويّة superscript (أرقام فقط بين قوسين)
    const supRefs = (html: string) =>
      html.replace(/\(([0-9٠-٩]{1,3})\)/g, "<sup>($1)</sup>");

    const pagesHtml = job.pages
      .map((p) => {
        const raw = p.textContent ?? "";
        const [body, notes] = raw.includes(FN_SEP)
          ? [raw.slice(0, raw.indexOf(FN_SEP)), raw.slice(raw.indexOf(FN_SEP) + FN_SEP.length)]
          : [raw, ""];
        const bodyHtml = supRefs(marked.parse(body, { async: false }) as string);
        const notesHtml = notes.trim()
          ? `<div class="footnotes"><hr class="fn-sep">${supRefs(
              marked.parse(notes, { async: false }) as string,
            )}</div>`
          : "";
        return `<h2>صفحة ${p.printedNumber ?? p.sequentialNumber}</h2>${bodyHtml}${notesHtml}`;
      })
      .join("<hr>");
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>
body{font-family:'Tajawal',Arial;direction:rtl;line-height:2}
table{border-collapse:collapse;width:100%;margin:8px 0}
th,td{border:1px solid #999;padding:6px 10px;text-align:right}
th{background:#f2f2f2}
img{max-width:100%;height:auto}
h2{font-size:16pt}
sup{font-size:9pt;vertical-align:super}
.footnotes{font-size:9pt;color:#333;margin-top:10px}
.fn-sep{width:33%;margin:6px 0;border:none;border-top:1px solid #000;margin-inline-start:0}
</style></head><body>${pagesHtml}</body></html>`;
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
