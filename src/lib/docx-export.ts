// src/lib/docx-export.ts — توليد ملفّ Word (.docx) حقيقيّ بحواشي Word الأصليّة
// (ترقيم تلقائي، قابلة للنقر، أسفل الصفحة). يحوّل نصّ الصفحات المستخرَج إلى فقرات،
// ويربط مراجع (N) داخل النصّ بحواشي Word عبر FootnoteReferenceRun.
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  FootnoteReferenceRun,
} from "docx";

const FN_SEP = "———— الحواشي ————";
const AR_DIGITS = "0-9\\u0660-\\u0669";
const ARABIC_FONT = "Arial";

type Page = { sequentialNumber: number; printedNumber: string | null; textContent: string | null };

// يزيل رموز markdown الخفيفة للحصول على نصّ نظيف في Word
function stripMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^#{1,6}\s*/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .trim();
}

// يفصل المتن عن الحواشي، ويبني خريطة رقم→نصّ الحاشية
function splitBodyNotes(raw: string): { body: string; notes: Map<string, string> } {
  let body = raw;
  let notesBlock = "";
  const sepIdx = raw.indexOf(FN_SEP);
  if (sepIdx >= 0) {
    body = raw.slice(0, sepIdx);
    notesBlock = raw.slice(sepIdx + FN_SEP.length);
  }
  const notes = new Map<string, string>();
  if (notesBlock.trim()) {
    // كلّ سطر حاشية: (N) نصّ...
    const re = new RegExp(`^\\s*\\(([${AR_DIGITS}]{1,3})\\)\\s*(.*)$`);
    let current: string | null = null;
    for (const line of notesBlock.split("\n")) {
      const m = line.match(re);
      if (m) {
        current = m[1];
        notes.set(current, stripMd(m[2]));
      } else if (current && line.trim()) {
        notes.set(current, (notes.get(current) ?? "") + " " + stripMd(line));
      }
    }
  }
  return { body, notes };
}

// يبني فقرة Word من سطر نصّ، مع ربط مراجع (N) بحواشي Word
function buildParagraph(
  line: string,
  notes: Map<string, string>,
  footnotes: Record<number, { children: Paragraph[] }>,
  nextId: { v: number },
): Paragraph {
  const children: (TextRun | FootnoteReferenceRun)[] = [];
  const refRe = new RegExp(`\\(([${AR_DIGITS}]{1,3})\\)`, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = refRe.exec(line)) !== null) {
    const noteText = notes.get(m[1]);
    // نصّ قبل المرجع
    if (m.index > last) {
      children.push(new TextRun({ text: line.slice(last, m.index), rightToLeft: true, font: ARABIC_FONT }));
    }
    if (noteText) {
      // حاشية Word حقيقيّة
      const id = nextId.v++;
      footnotes[id] = {
        children: [
          new Paragraph({
            bidirectional: true,
            children: [new TextRun({ text: noteText, rightToLeft: true, font: ARABIC_FONT, size: 18 })],
          }),
        ],
      };
      children.push(new FootnoteReferenceRun(id));
    } else {
      // لا حاشية مطابقة → أبقِ الرقم كنصّ
      children.push(new TextRun({ text: m[0], rightToLeft: true, font: ARABIC_FONT }));
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) {
    children.push(new TextRun({ text: line.slice(last), rightToLeft: true, font: ARABIC_FONT }));
  }
  if (children.length === 0) {
    children.push(new TextRun({ text: line, rightToLeft: true, font: ARABIC_FONT }));
  }
  return new Paragraph({ bidirectional: true, spacing: { line: 360 }, children });
}

export async function buildDocx(fileName: string, pages: Page[]): Promise<Buffer> {
  const footnotes: Record<number, { children: Paragraph[] }> = {};
  const nextId = { v: 1 };
  const blocks: Paragraph[] = [];

  for (const p of pages) {
    const raw = p.textContent ?? "";
    const { body, notes } = splitBodyNotes(raw);

    // ترويسة الصفحة
    blocks.push(
      new Paragraph({
        bidirectional: true,
        heading: HeadingLevel.HEADING_2,
        children: [
          new TextRun({
            text: `صفحة ${p.printedNumber ?? p.sequentialNumber}`,
            rightToLeft: true,
            font: ARABIC_FONT,
            bold: true,
          }),
        ],
      }),
    );

    for (const line of body.split("\n")) {
      const t = stripMd(line);
      if (!t) continue;
      blocks.push(buildParagraph(t, notes, footnotes, nextId));
    }
  }

  const doc = new Document({
    creator: "Warraq",
    title: fileName,
    footnotes,
    sections: [{ children: blocks }],
  });
  return Packer.toBuffer(doc);
}
