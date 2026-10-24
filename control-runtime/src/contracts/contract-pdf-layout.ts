import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

type Section = { code: string; name: string; text: string };
type Block = { kind: "body" | "heading" | "identity" | "signature" | "divider"; text: string };
export type ContractTextPlacement = {
  page: number;
  kind: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};
export type ContractPdfOptions = { onText?: (placement: ContractTextPlacement) => void };

const PAGE = { width: 595.28, height: 841.89, left: 60, right: 535.28, top: 749, bottom: 73 };
const CONTENT = PAGE.right - PAGE.left;
const color = {
  ink: rgb(0.13, 0.18, 0.15),
  forest: rgb(0.14, 0.28, 0.21),
  muted: rgb(0.43, 0.48, 0.43),
  accent: rgb(0.55, 0.65, 0.39),
  line: rgb(0.84, 0.88, 0.82),
  panel: rgb(0.96, 0.97, 0.94),
};

export const normalizeContractPdfText = (value: string) =>
  value
    .replaceAll("\u00a0", " ")
    .replaceAll("—", "-")
    .replaceAll("“", '"')
    .replaceAll("”", '"')
    .replaceAll("’", "'")
    .replaceAll("N.º", "N.o");

const clause =
  /^(?:(?:PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|S[ÉE]PTIMA|OCTAVA|NOVENA|D[ÉE]CIM[A-ZÁÉÍÓÚÑ]+|UND[ÉE]CIMA|DUOD[ÉE]CIMA|DECIMO|VIG[ÉE]SIM[A-ZÁÉÍÓÚÑ]+|TRIG[ÉE]SIM[A-ZÁÉÍÓÚÑ]+)(?:\s+[A-ZÁÉÍÓÚÑ]+)*[.:]|\d+[.)])(?:\s|$)/;

export function contractBlocks(text: string): Block[] {
  const blocks = text.split(/\n\s*\n/).flatMap((paragraph): Block[] => {
    const value = paragraph.trim();
    if (!value) return [];
    if (/^[=]{4,}$/.test(value)) return [{ kind: "divider", text: value }];
    const lines = value.split("\n"),
      first = lines[0]!.trim();
    if (/^firmas?(?:\s+de\s+.*)?\s*:?$/i.test(first)) return [{ kind: "signature", text: value }];
    if (clause.test(first) || /^MODALIDAD [ABC]\s/.test(first) || /^REGLA APLICABLE/.test(first)) {
      return [
        { kind: "heading", text: first },
        ...(lines.length > 1 ? [{ kind: "body" as const, text: lines.slice(1).join("\n") }] : []),
      ];
    }
    if (/^(?:CONTRATO N|ANEXO \d|PROYECTO )/.test(first))
      return [{ kind: "identity", text: value }];
    return [{ kind: "body", text: value }];
  });
  const signature = blocks.findIndex((block) => block.kind === "signature");
  if (signature >= 0 && blocks.slice(signature + 1).every((block) => block.kind !== "heading")) {
    return [
      ...blocks.slice(0, signature),
      {
        kind: "signature",
        text: blocks
          .slice(signature)
          .map((block) => block.text)
          .join("\n\n"),
      },
    ];
  }
  return blocks;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  return normalizeContractPdfText(text)
    .split("\n")
    .flatMap((paragraph) => {
      const lines: string[] = [];
      let current = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          current = candidate;
          continue;
        }
        if (current) lines.push(current);
        let fragment = "";
        for (const char of word) {
          if (font.widthOfTextAtSize(fragment + char, size) > maxWidth) {
            if (fragment) lines.push(fragment);
            fragment = char;
          } else fragment += char;
        }
        current = fragment;
      }
      if (current) lines.push(current);
      return lines.length ? lines : [""];
    });
}

export async function renderContractPdf(
  contract: { contractNumber: string; name: string },
  sections: Section[],
  options: ContractPdfOptions = {},
) {
  const pdf = await PDFDocument.create();
  const body = await pdf.embedFont(StandardFonts.TimesRoman);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages: PDFPage[] = [];
  const placements: ContractTextPlacement[] = [];
  let current!: PDFPage;
  let y = PAGE.top,
    sectionCode = "";

  function text(
    value: string,
    x: number,
    baseline: number,
    font: PDFFont,
    size: number,
    ink: ReturnType<typeof rgb>,
    kind: string,
    page = current,
  ) {
    const normalized = normalizeContractPdfText(value);
    page.drawText(normalized, { x, y: baseline, font, size, color: ink });
    if (options.onText)
      placements.push({
        page: pages.indexOf(page),
        kind,
        text: normalized,
        x,
        y: baseline,
        width: font.widthOfTextAtSize(normalized, size),
        height: font.heightAtSize(size),
      });
  }

  function newPage() {
    current = pdf.addPage([PAGE.width, PAGE.height]);
    pages.push(current);
    y = PAGE.top;
    current.drawRectangle({ x: PAGE.left, y: 817, width: 31, height: 3, color: color.accent });
    text("ZYTERON", PAGE.left, 795, bold, 14.5, color.forest, "header");
    text("CONTROL", PAGE.left + 83, 796, sans, 7.3, color.muted, "header");
    const number = normalizeContractPdfText(contract.contractNumber);
    text(
      number,
      PAGE.right - bold.widthOfTextAtSize(number, 8.5),
      799,
      bold,
      8.5,
      color.forest,
      "header",
    );
    if (sectionCode)
      text(
        sectionCode,
        PAGE.right - sans.widthOfTextAtSize(sectionCode, 7),
        785,
        sans,
        7,
        color.muted,
        "header",
      );
    current.drawLine({
      start: { x: PAGE.left, y: 772 },
      end: { x: PAGE.right, y: 772 },
      color: color.line,
      thickness: 0.7,
    });
  }

  function ensure(height: number) {
    if (y - Math.min(height, PAGE.top - PAGE.bottom) < PAGE.bottom) newPage();
  }

  function lines(
    values: string[],
    font: PDFFont,
    size: number,
    leading: number,
    kind: string,
    x = PAGE.left,
    ink = color.ink,
  ) {
    for (let index = 0; index < values.length; index++) {
      // Two lines travel together at a page break; no isolated last line.
      ensure(leading * (values.length - index === 2 ? 2 : 1));
      text(values[index]!, x, y, font, size, ink, kind);
      y -= leading;
    }
  }

  function signatureMeasure(value: string) {
    const columns =
      /^(FIRMAS)\s*\n\n(Por ZYTERON:[\s\S]*?)\n\n(Por el CLIENTE:[\s\S]*?)\n\n(Mecanismo y evidencias:[\s\S]*)$/i.exec(
        value,
      );
    const colWidth = (CONTENT - 58) / 2;
    if (columns) {
      const left = wrap(columns[2]!, body, 10.1, colWidth),
        right = wrap(columns[3]!, body, 10.1, colWidth);
      const mechanism = wrap(columns[4]!, body, 9.8, CONTENT - 32);
      const colHeight = 44 + (Math.max(left.length, right.length) - 1) * 14.5;
      return {
        height: 37 + colHeight + 18 + mechanism.length * 13.5 + 18,
        columns: { heading: columns[1]!, left, right, mechanism, colWidth, colHeight },
      };
    }
    const values = wrap(value, body, 10.1, CONTENT - 32);
    return { height: values.length * 17 + 38, values };
  }

  function signature(value: string) {
    const measured = signatureMeasure(value),
      total = measured.height;
    if (total > PAGE.top - PAGE.bottom) {
      ensure(55);
      lines(wrap(value, body, 10.1, CONTENT), body, 10.1, 17, "signature");
      y -= 16;
      return;
    }
    ensure(total + 13);
    const top = y;
    current.drawRectangle({
      x: PAGE.left,
      y: top - total + 10,
      width: CONTENT,
      height: total,
      color: color.panel,
      borderColor: color.line,
      borderWidth: 0.6,
    });
    if (measured.columns) {
      const c = measured.columns;
      text(c.heading, PAGE.left + 16, top - 12, bold, 9.3, color.forest, "signature");
      [c.left, c.right].forEach((values, index) => {
        const x = PAGE.left + 16 + index * (c.colWidth + 26),
          baseline = top - 37;
        text(values[0]!, x, baseline, bold, 9.2, color.forest, "signature");
        current.drawLine({
          start: { x, y: baseline - 29 },
          end: { x: x + c.colWidth, y: baseline - 29 },
          color: color.line,
          thickness: 0.7,
        });
        values
          .slice(1)
          .forEach((line, lineIndex) =>
            text(line, x, baseline - 44 - lineIndex * 14.5, body, 10.1, color.ink, "signature"),
          );
      });
      const baseline = top - 37 - c.colHeight - 18;
      c.mechanism.forEach((line, index) =>
        text(line, PAGE.left + 16, baseline - index * 13.5, body, 9.8, color.muted, "signature"),
      );
      y = top - total - 12;
    } else {
      y -= 12;
      lines(measured.values!, body, 10.1, 17, "signature", PAGE.left + 16);
      y -= 26;
    }
  }

  function drawSection(section: Section, density: number) {
    const leading = 13.5 * density;
    sectionCode = section.code;
    newPage();
    const title = wrap(section.name, bold, 23, CONTENT - 14);
    lines(title, bold, 23, 28, "section", PAGE.left, color.forest);
    y -= 8;
    current.drawRectangle({ x: PAGE.left, y: y - 3, width: 34, height: 2, color: color.accent });
    y -= 28;
    const blocks = contractBlocks(section.text);
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index]!;
      if (block.kind === "divider") continue;
      if (block.kind === "signature") {
        signature(block.text);
        continue;
      }
      if (block.kind === "heading") {
        const heading = wrap(block.text, bold, 9.3, CONTENT);
        const following = blocks[index + 1];
        const firstLines = following
          ? Math.min(2, wrap(following.text, body, 10.1, CONTENT).length)
          : 0;
        ensure(13 * density + heading.length * leading + firstLines * leading);
        y -= 6 * density;
        lines(heading, bold, 9.3, leading, "heading", PAGE.left, color.forest);
        y -= 3 * density;
      } else if (block.kind === "identity") {
        const identity = wrap(block.text, bold, 9.2, CONTENT);
        ensure(identity.length * 14 + 22);
        lines(identity, bold, 9.2, 14, "identity", PAGE.left, color.forest);
        y -= 10;
      } else {
        const paragraph = wrap(block.text, body, 10.1, CONTENT);
        const next = blocks[index + 1];
        const signatureHeight =
          next?.kind === "signature" ? signatureMeasure(next.text).height + 13 : 0;
        ensure(
          signatureHeight
            ? paragraph.length * leading + 5 + signatureHeight
            : Math.min(paragraph.length, 3) * leading,
        );
        lines(paragraph, body, 10.1, leading, "body");
        y -= 2.8 * density;
      }
    }
  }
  for (const section of sections) {
    const firstPage = pages.length,
      firstPlacement = placements.length;
    // A short closing block should not create an otherwise empty annex page.
    for (const density of [1, 0.95, 0.9]) {
      drawSection(section, density);
      if (pages.length - firstPage <= 1 || PAGE.top - y >= 190 || density === 0.9) break;
      while (pages.length > firstPage) {
        pdf.removePage(pages.length - 1);
        pages.pop();
      }
      placements.length = firstPlacement;
    }
  }
  if (!pages.length) newPage();
  pages.forEach((page, index) => {
    page.drawLine({
      start: { x: PAGE.left, y: 52 },
      end: { x: PAGE.right, y: 52 },
      color: color.line,
      thickness: 0.7,
    });
    text(
      `${contract.contractNumber} · Página ${index + 1} de ${pages.length}`,
      PAGE.left,
      35,
      sans,
      7,
      color.muted,
      "footer",
      page,
    );
    const notice = "Documento contractual generado electrónicamente";
    text(
      notice,
      PAGE.right - sans.widthOfTextAtSize(notice, 7),
      35,
      sans,
      7,
      color.muted,
      "footer",
      page,
    );
  });
  pdf.setTitle(`${contract.contractNumber} · ${contract.name}`);
  pdf.setAuthor("Zyteron SpA");
  pdf.setCreator("Zyteron Control · ContractDocumentService");
  if (options.onText) placements.forEach(options.onText);
  return Buffer.from(await pdf.save());
}
