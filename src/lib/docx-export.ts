// src/lib/docx-export.ts — توليد ملفّ Word (.docx) بحواشي سفليّة حقيقيّة (Footnotes)
// يحوّل نصّ الصفحات المستخرَج إلى فقرات ويربط مراجع (N) داخل المتن بحواشٍ سفليّة
// أصليّة في أسفل الصفحة عبر FootnoteReferenceRun — مرقّمة تلقائيًّا وقابلة للنقر،
// وتنتقل مع النصّ إن نُقل (سلوك حواشي Word القياسي).
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
// خطّ عربيّ تقليدي (نسخيّ) مناسب للنصوص التراثيّة، مدعوم في Word افتراضيّاً
const ARABIC_FONT = "Traditional Arabic";
const BODY_SIZE = 28; // 14pt (docx بأنصاف النقاط)
const NOTE_SIZE = 22; // 11pt للحواشي
const LINE_SPACING = 360; // تباعد سطور ١٫٥

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

// يكشف سطر فاصل أفقي (قاعدة) يفصل المتن عن الحواشي: --- · *** · ___ · ـــــ
function isRuleLine(line: string): boolean {
  const t = line.trim().replace(/[‏‎*_]/g, "");
  if (t === "---" || t === "***" || t === "___") return true;
  return /^[-_—–=ـ.\s]{4,}$/.test(t) && /[-_—–=ـ]/.test(t);
}

// بداية تعريف حاشية مرقّمة بأشكالها الشائعة: (N) · N) · N- · N. · [N] · ⁽N⁾
// يعيد [الرقم، بقيّة السطر] أو null
function matchNoteStart(line: string): [string, string] | null {
  const t = line.trim().replace(/^[*_>\s]+/, "");
  const re = new RegExp(
    `^[\\[\\(⁽]?\\s*([${AR_DIGITS}]{1,3})\\s*[\\)\\]\\.\\-–—⁾:]\\s*(.*)$`,
  );
  const m = t.match(re);
  if (!m) return null;
  return [m[1], m[2] ?? ""];
}

// يحدّد كتلة الحواشي: يفضّل الفاصل الصريح FN_SEP، وإلّا يبحث عن سطر فاصل أفقي
// في النصف الأسفل يتبعه أسطر حواشٍ مرقّمة (يغطّي الصفحات التي لم تُفصَل سابقاً —
// كصفحات الجداول/الأشكال التي تتخطّاها طبقة التنسيق).
function locateNotesBlock(raw: string): { body: string; notesBlock: string } {
  const sepIdx = raw.indexOf(FN_SEP);
  if (sepIdx >= 0) {
    return {
      body: raw.slice(0, sepIdx),
      notesBlock: raw.slice(sepIdx + FN_SEP.length),
    };
  }
  // احتياط: ابحث عن قاعدة أفقيّة في النصف الأسفل متبوعة بحاشية مرقّمة
  const lines = raw.split("\n");
  const startScan = Math.floor(lines.length / 2);
  for (let i = startScan; i < lines.length; i++) {
    if (!isRuleLine(lines[i])) continue;
    const after = lines.slice(i + 1);
    const firstAfter = after.find((l) => l.trim());
    if (firstAfter && matchNoteStart(firstAfter)) {
      return {
        body: lines.slice(0, i).join("\n"),
        notesBlock: after.join("\n"),
      };
    }
  }
  return { body: raw, notesBlock: "" };
}

// مرجع حاشية «داخل المتن»: رقم محصور (N) · [N] · ⁽N⁾ — يُستثنى ما كان في صدر السطر
// (لأنّ صدر السطر يكون تعريف حاشية أو بند قائمة، لا مرجعاً).
function collectInlineRefs(raw: string): Set<string> {
  const refs = new Set<string>();
  const re = new RegExp(`[\\(\\[⁽]([${AR_DIGITS}]{1,3})[\\)\\]⁾]`, "g");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(line)) !== null) {
      // تجاهل المطابقة إن كانت في صدر السطر (تعريف/بند لا مرجع)
      const lead = line.slice(0, m.index).trim();
      if (lead === "" && trimmed.startsWith(m[0])) continue;
      refs.add(m[1]);
    }
  }
  return refs;
}

// يبني كتلة الحواشي بالاعتماد على المراجع: تعريف الحاشية سطرٌ يبدأ بـ (N)
// ورقمُه N ظهر مرجعاً داخل المتن — هذا يميّز الحاشية عن «بند قائمة مرقّم»
// (مثل «(١) حجة إبراهيم») الذي لا يُشار إليه مرجعاً. مستقلّ عن وجود فاصل.
function locateNotesByRefs(raw: string): { body: string; notesBlock: string } {
  const refs = collectInlineRefs(raw);
  if (refs.size === 0) return { body: raw, notesBlock: "" };
  const lines = raw.split("\n");
  const minIdx = Math.floor(lines.length * 0.4); // الحواشي في أسفل الصفحة
  for (let i = minIdx; i < lines.length; i++) {
    const m = matchNoteStart(lines[i]);
    if (m && refs.has(m[0])) {
      return {
        body: lines.slice(0, i).join("\n"),
        notesBlock: lines.slice(i).join("\n"),
      };
    }
  }
  return { body: raw, notesBlock: "" };
}

// يفصل المتن عن الحواشي، ويبني خريطة رقم→نصّ الحاشية
function splitBodyNotes(raw: string): { body: string; notes: Map<string, string> } {
  // (١) الفاصل الصريح أو القاعدة الأفقيّة، ثمّ (٢) الاعتماد على المراجع كاحتياط
  let { body, notesBlock } = locateNotesBlock(raw);
  if (!notesBlock.trim()) {
    ({ body, notesBlock } = locateNotesByRefs(raw));
  }
  const notes = new Map<string, string>();
  if (notesBlock.trim()) {
    let current: string | null = null;
    for (const line of notesBlock.split("\n")) {
      if (isRuleLine(line)) continue; // تجاهل سطر الفصل إن بقي
      const m = matchNoteStart(line);
      if (m) {
        current = m[0];
        notes.set(current, stripMd(m[1]));
      } else if (current && line.trim()) {
        // سطر متابعة لنصّ الحاشية السابقة
        notes.set(current, (notes.get(current) ?? "") + " " + stripMd(line));
      }
    }
  }
  return { body, notes };
}

// يبني فقرة Word من سطر نصّ، مع ربط مراجع (N) بحواشي Word السفليّة الحقيقيّة
function buildParagraph(
  line: string,
  notes: Map<string, string>,
  footnotes: Record<number, { children: Paragraph[] }>,
  nextId: { v: number },
): Paragraph {
  const children: (TextRun | FootnoteReferenceRun)[] = [];
  const run = (text: string) =>
    new TextRun({ text, rightToLeft: true, font: ARABIC_FONT, size: BODY_SIZE });
  // مرجع داخل المتن: رقم محصور بقوسين/معقوفين (N) · [N] · ⁽N⁾ — آمن لأنّ الحاشية
  // لا تُنشأ إلّا إذا وُجد تعريف مطابق لها في خريطة الحواشي.
  const refRe = new RegExp(`[\\(\\[⁽]([${AR_DIGITS}]{1,3})[\\)\\]⁾]`, "g");
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = refRe.exec(line)) !== null) {
    const noteText = notes.get(m[1]);
    // نصّ قبل المرجع
    if (m.index > last) {
      children.push(run(line.slice(last, m.index)));
    }
    if (noteText) {
      // حاشية سفليّة حقيقيّة: Word يضع رقمها تلقائياً في المتن وفي أسفل الصفحة
      const id = nextId.v++;
      footnotes[id] = {
        children: [
          new Paragraph({
            bidirectional: true,
            children: [new TextRun({ text: noteText, rightToLeft: true, font: ARABIC_FONT, size: NOTE_SIZE })],
          }),
        ],
      };
      children.push(new FootnoteReferenceRun(id));
    } else {
      // لا حاشية مطابقة → أبقِ الرقم كنصّ كما هو
      children.push(run(m[0]));
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) {
    children.push(run(line.slice(last)));
  }
  if (children.length === 0) {
    children.push(run(line));
  }
  return new Paragraph({ bidirectional: true, spacing: { line: LINE_SPACING }, children });
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
    // نمط افتراضيّ للمستند: خطّ عربيّ تقليدي + حجم المتن + تباعد ١٫٥
    styles: {
      default: {
        document: {
          run: { font: ARABIC_FONT, size: BODY_SIZE },
          paragraph: { spacing: { line: LINE_SPACING } },
        },
      },
    },
    footnotes,
    sections: [{ children: blocks }],
  });
  return Packer.toBuffer(doc);
}
