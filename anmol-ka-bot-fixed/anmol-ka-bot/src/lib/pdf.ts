import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

/**
 * Minimal, dependency-light Markdown → PDF renderer.
 * Deliberately avoids headless-Chrome/Puppeteer so it runs inside a Vercel
 * serverless function without bundle-size or cold-start problems.
 *
 * Supports: # / ## / ### headings, - and * bullets, 1. numbered lists,
 * **bold** (rendered as bold runs), --- rules, blank-line paragraphs.
 */

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
};

export async function markdownToPdf(markdown: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { doc, page: doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]), y: PAGE_HEIGHT - MARGIN, regular, bold };

  const lines = (markdown || 'No content generated.').replace(/\r\n/g, '\n').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      ctx.y -= 8;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      drawRule(ctx);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const size = level === 1 ? 20 : level === 2 ? 14 : 11.5;
      ctx.y -= level === 1 ? 6 : 10;
      writeParagraph(ctx, stripInline(heading[2]), { font: ctx.bold, size, color: rgb(0.1, 0.12, 0.2) });
      if (level <= 2) drawRule(ctx, 4);
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.*)$/);
    if (bullet) {
      writeParagraph(ctx, `•  ${stripInline(bullet[1])}`, { font: ctx.regular, size: 10, indent: 12 });
      continue;
    }

    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (numbered) {
      writeParagraph(ctx, `${numbered[1]}.  ${stripInline(numbered[2])}`, { font: ctx.regular, size: 10, indent: 12 });
      continue;
    }

    const isAllBold = /^\*\*[^*]+\*\*$/.test(line.trim());
    writeParagraph(ctx, stripInline(line), {
      font: isAllBold ? ctx.bold : ctx.regular,
      size: 10
    });
  }

  return doc.save();
}

function writeParagraph(
  ctx: Ctx,
  text: string,
  opts: { font: PDFFont; size: number; indent?: number; color?: ReturnType<typeof rgb> }
) {
  const indent = opts.indent ?? 0;
  const color = opts.color ?? rgb(0.15, 0.15, 0.18);
  const maxWidth = CONTENT_WIDTH - indent;
  const lineHeight = opts.size * 1.42;

  for (const line of wrapText(sanitise(text), opts.font, opts.size, maxWidth)) {
    ensureSpace(ctx, lineHeight);
    ctx.page.drawText(line, {
      x: MARGIN + indent,
      y: ctx.y,
      size: opts.size,
      font: opts.font,
      color
    });
    ctx.y -= lineHeight;
  }
}

function drawRule(ctx: Ctx, padding = 6) {
  ensureSpace(ctx, padding + 6);
  ctx.y -= padding / 2;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.y },
    thickness: 0.6,
    color: rgb(0.78, 0.8, 0.85)
  });
  ctx.y -= padding;
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN) {
    ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx.y = PAGE_HEIGHT - MARGIN;
  }
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      // hard-break a single word that is wider than the line
      while (font.widthOfTextAtSize(current, size) > maxWidth && current.length > 1) {
        let cut = current.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(current.slice(0, cut), size) > maxWidth) cut--;
        lines.push(current.slice(0, cut));
        current = current.slice(cut);
      }
    }
  }

  if (current) lines.push(current);
  return lines;
}

function stripInline(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/(^|\s)\*(?!\s)(.*?)\*/g, '$1$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1 ($2)')
    .trim();
}

/** WinAnsi (the StandardFonts encoding) can't render smart quotes/dashes/emoji. */
function sanitise(text: string): string {
  return text
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u2022/g, '•')
    .replace(/[^\x20-\x7E\u00A0-\u00FF•]/g, '');
}
