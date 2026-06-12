// src/lib/study-docx.ts — تحويل ملخّص Markdown إلى ملفّ Word (.docx) عربيّ RTL
// يحوّل بنية الملخّص الدراسي (عناوين هرميّة، قوائم، جداول مقارنة، صناديق خلاصة)
// إلى عناصر Word أصليّة قابلة للتحرير — لا HTML مضمّناً.
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { marked } from "marked";
import type { Token, Tokens } from "marked";

const ARABIC_FONT = "Traditional Arabic";
const BODY_SIZE = 28; // 14pt بأنصاف النقاط
const NOTE_SIZE = 22; // 11pt
const LINE_SPACING = 360; // تباعد ١٫٥
const ORANGE = "F69251";
const BOX_FILL = "FDF1E7"; // خلفيّة صناديق الخلاصة (برتقالي فاتح)
const OL_REF = "study-ol";

type RunStyle = { bold?: boolean; italics?: boolean; size?: number };

// يحوّل توكنات marked السطريّة (نصّ/غامق/مائل/كود) إلى TextRuns مع وراثة النمط
function inlineRuns(tokens: Token[] | undefined, style: RunStyle = {}): TextRun[] {
  if (!tokens || tokens.length === 0) return [];
  const runs: TextRun[] = [];
  const mk = (text: string, s: RunStyle) =>
    new TextRun({
      text,
      rightToLeft: true,
      font: ARABIC_FONT,
      size: s.size ?? BODY_SIZE,
      bold: s.bold,
      italics: s.italics,
    });

  for (const t of tokens) {
    switch (t.type) {
      case "strong":
        runs.push(...inlineRuns((t as Tokens.Strong).tokens, { ...style, bold: true }));
        break;
      case "em":
        runs.push(...inlineRuns((t as Tokens.Em).tokens, { ...style, italics: true }));
        break;
      case "codespan":
        runs.push(mk((t as Tokens.Codespan).text, style));
        break;
      case "link":
        runs.push(...inlineRuns((t as Tokens.Link).tokens, style));
        break;
      case "br":
        runs.push(new TextRun({ break: 1 }));
        break;
      case "del":
        runs.push(...inlineRuns((t as Tokens.Del).tokens, style));
        break;
      case "text": {
        const tt = t as Tokens.Text;
        if (tt.tokens && tt.tokens.length) runs.push(...inlineRuns(tt.tokens, style));
        else runs.push(mk(tt.text, style));
        break;
      }
      case "escape":
        runs.push(mk((t as Tokens.Escape).text, style));
        break;
      default: {
        const raw = (t as { raw?: string }).raw ?? "";
        if (raw.trim()) runs.push(mk(raw, style));
      }
    }
  }
  return runs;
}

const HEADINGS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
] as const;

// حالة التحويل: عدّاد نسخ القوائم المرقّمة (لإعادة بدء الترقيم لكلّ قائمة)
type Ctx = { olInstance: number };

function headingParagraph(token: Tokens.Heading): Paragraph {
  const depth = Math.min(Math.max(token.depth, 1), 4);
  return new Paragraph({
    bidirectional: true,
    heading: HEADINGS[depth - 1],
    spacing: { before: depth === 1 ? 240 : 180, after: 120 },
    children: inlineRuns(token.tokens, { bold: true }),
  });
}

function listBlocks(token: Tokens.List, ctx: Ctx, level = 0): Paragraph[] {
  const out: Paragraph[] = [];
  const instance = token.ordered ? ++ctx.olInstance : 0;
  for (const item of token.items) {
    let first = true;
    for (const child of item.tokens) {
      if (child.type === "text" || child.type === "paragraph") {
        const runs = inlineRuns(
          (child as Tokens.Text | Tokens.Paragraph).tokens ?? [],
        );
        out.push(
          new Paragraph({
            bidirectional: true,
            spacing: { line: LINE_SPACING },
            ...(first
              ? token.ordered
                ? { numbering: { reference: OL_REF, level: Math.min(level, 2), instance } }
                : { bullet: { level: Math.min(level, 2) } }
              : { indent: { start: 720 * (level + 1) } }),
            children: runs.length ? runs : [new TextRun({ text: "" })],
          }),
        );
        first = false;
      } else if (child.type === "list") {
        out.push(...listBlocks(child as Tokens.List, ctx, level + 1));
      }
    }
  }
  return out;
}

// صندوق «خلاصة/مربط الفهم»: فقرات مظلّلة بحدّ برتقالي جهة البداية
function blockquoteParagraphs(token: Tokens.Blockquote, ctx: Ctx): Paragraph[] {
  const inner: Paragraph[] = [];
  for (const t of token.tokens) {
    if (t.type === "paragraph") {
      inner.push(
        new Paragraph({
          bidirectional: true,
          spacing: { line: LINE_SPACING, before: 60, after: 60 },
          shading: { type: ShadingType.CLEAR, fill: BOX_FILL },
          border: {
            right: { style: BorderStyle.SINGLE, size: 24, color: ORANGE },
          },
          indent: { start: 240, end: 240 },
          children: inlineRuns((t as Tokens.Paragraph).tokens),
        }),
      );
    } else if (t.type === "list") {
      inner.push(...listBlocks(t as Tokens.List, ctx));
    }
  }
  return inner;
}

function tableBlock(token: Tokens.Table): Table {
  const cell = (tokens: Token[] | undefined, header: boolean) =>
    new TableCell({
      shading: header ? { type: ShadingType.CLEAR, fill: "F2F2F2" } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [
        new Paragraph({
          bidirectional: true,
          children: inlineRuns(tokens, { bold: header }),
        }),
      ],
    });

  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: token.header.map((h) => cell(h.tokens, true)),
    }),
    ...token.rows.map(
      (r) => new TableRow({ children: r.map((c) => cell(c.tokens, false)) }),
    ),
  ];

  return new Table({
    visuallyRightToLeft: true,
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

function tokenToBlocks(token: Token, ctx: Ctx): (Paragraph | Table)[] {
  switch (token.type) {
    case "heading":
      return [headingParagraph(token as Tokens.Heading)];
    case "paragraph":
      return [
        new Paragraph({
          bidirectional: true,
          spacing: { line: LINE_SPACING, after: 120 },
          children: inlineRuns((token as Tokens.Paragraph).tokens),
        }),
      ];
    case "list":
      return listBlocks(token as Tokens.List, ctx);
    case "blockquote":
      return blockquoteParagraphs(token as Tokens.Blockquote, ctx);
    case "table":
      return [tableBlock(token as Tokens.Table)];
    case "hr":
      return [new Paragraph({ thematicBreak: true, spacing: { before: 120, after: 120 } })];
    case "code":
      return [
        new Paragraph({
          spacing: { line: LINE_SPACING },
          children: [
            new TextRun({ text: (token as Tokens.Code).text, font: "Consolas", size: NOTE_SIZE }),
          ],
        }),
      ];
    case "space":
      return [];
    default: {
      const raw = (token as { raw?: string }).raw ?? "";
      if (!raw.trim()) return [];
      return [
        new Paragraph({
          bidirectional: true,
          spacing: { line: LINE_SPACING },
          children: [new TextRun({ text: raw.trim(), rightToLeft: true, font: ARABIC_FONT, size: BODY_SIZE })],
        }),
      ];
    }
  }
}

// يبني ملفّ Word كاملاً من عنوان الملخّص وسطر بياناته ومحتواه Markdown
export async function buildStudyDocx(
  title: string,
  metaLine: string,
  markdown: string,
): Promise<Buffer> {
  const tokens = marked.lexer(markdown);
  const ctx: Ctx = { olInstance: 0 };

  const blocks: (Paragraph | Table)[] = [
    new Paragraph({
      bidirectional: true,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({ text: title, rightToLeft: true, font: ARABIC_FONT, bold: true, size: 40 }),
      ],
    }),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({ text: metaLine, rightToLeft: true, font: ARABIC_FONT, size: NOTE_SIZE, color: "636363" }),
      ],
    }),
  ];

  for (const token of tokens) {
    blocks.push(...tokenToBlocks(token, ctx));
  }

  const doc = new Document({
    creator: "Warraq",
    title,
    styles: {
      default: {
        document: {
          run: { font: ARABIC_FONT, size: BODY_SIZE },
          paragraph: { spacing: { line: LINE_SPACING } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: OL_REF,
          levels: [0, 1, 2].map((level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            alignment: AlignmentType.START,
            style: { paragraph: { indent: { start: 720 * (level + 1), hanging: 360 } } },
          })),
        },
      ],
    },
    sections: [{ children: blocks }],
  });

  return Packer.toBuffer(doc);
}
