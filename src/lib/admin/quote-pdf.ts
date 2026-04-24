import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { ZYTERON_COMPANY } from "@/lib/company";
import { currencyCLP, type QuoteLineItem, type QuoteMeta } from "@/lib/admin/quote";

type QuotePdfInput = {
  quoteId: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  clientCompany?: string | null;
  status?: string | null;
  createdAt?: string | null;
  meta: QuoteMeta;
};

type Color = ReturnType<typeof rgb>;

const PAGE_SIZE: [number, number] = [595.28, 841.89];
const PAGE_WIDTH = PAGE_SIZE[0];
const PAGE_HEIGHT = PAGE_SIZE[1];
const MARGIN = 34;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_RESERVED = 60;

const colors = {
  navy: rgb(0.06, 0.11, 0.22),
  navySoft: rgb(0.13, 0.2, 0.33),
  blue: rgb(0.06, 0.37, 1),
  slate: rgb(0.38, 0.46, 0.57),
  line: rgb(0.86, 0.9, 0.95),
  soft: rgb(0.96, 0.98, 1),
  white: rgb(1, 1, 1),
  dark: rgb(0.08, 0.1, 0.15),
  muted: rgb(0.48, 0.56, 0.66),
} as const;

function safeText(value?: string | null, fallback = "—") {
  const normalized = String(value ?? "").trim();
  return normalized.length ? normalized : fallback;
}

function formatDate(date?: string | null) {
  if (!date) return "—";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function quoteStatusLabel(status?: string | null) {
  switch (status) {
    case "WON":
      return "Ganada";
    case "SENT":
      return "Enviada";
    case "LOST":
      return "Perdida";
    default:
      return "Pendiente";
  }
}

function itemTotal(item: QuoteLineItem) {
  const gross = item.qty * item.unitPrice;
  const discount = gross * ((item.discountPct || 0) / 100);
  return gross - discount;
}

function splitLongWord(word: string, font: PDFFont, fontSize: number, maxWidth: number) {
  if (!word) return [""];
  if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) return [word];

  const chars = Array.from(word);
  const chunks: string[] = [];
  let current = "";

  for (const char of chars) {
    const candidate = current + char;
    if (!current || font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }
    chunks.push(current);
    current = char;
  }

  if (current) chunks.push(current);
  return chunks.length ? chunks : [word];
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const paragraphs = String(text ?? "").split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraphRaw of paragraphs) {
    const paragraph = paragraphRaw.trim();
    if (!paragraph) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/).filter(Boolean);
    const tokens: Array<{ text: string; withSpace: boolean }> = [];
    for (const word of words) {
      const parts = splitLongWord(word, font, fontSize, maxWidth);
      parts.forEach((part, index) => {
        tokens.push({ text: part, withSpace: index === 0 });
      });
    }

    let current = "";
    for (const token of tokens) {
      const candidate = current
        ? `${current}${token.withSpace ? " " : ""}${token.text}`
        : token.text;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = token.text;
      }
    }

    if (current) lines.push(current);
  }

  return lines.length ? lines : [""];
}

function drawRightAlignedText(args: {
  page: PDFPage;
  text: string;
  rightX: number;
  y: number;
  size: number;
  font: PDFFont;
  color: Color;
}) {
  const { page, text, rightX, y, size, font, color } = args;
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: rightX - width,
    y,
    size,
    font,
    color,
  });
}

function drawTextLines(args: {
  page: PDFPage;
  lines: string[];
  x: number;
  y: number;
  width: number;
  font: PDFFont;
  fontSize: number;
  lineHeight: number;
  color: Color;
  align?: "left" | "center" | "right";
}) {
  const { page, lines, x, y, width, font, fontSize, lineHeight, color, align = "left" } = args;

  lines.forEach((line, index) => {
    let drawX = x;
    const lineWidth = font.widthOfTextAtSize(line, fontSize);

    if (align === "center") {
      drawX = x + (width - lineWidth) / 2;
    } else if (align === "right") {
      drawX = x + width - lineWidth;
    }

    page.drawText(line, {
      x: drawX,
      y: y - index * lineHeight,
      size: fontSize,
      font,
      color,
    });
  });
}

function drawWrappedText(args: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  width: number;
  font: PDFFont;
  fontSize: number;
  lineHeight: number;
  color: Color;
  align?: "left" | "center" | "right";
}) {
  const { page, text, x, y, width, font, fontSize, lineHeight, color, align } = args;
  const lines = wrapText(text, font, fontSize, width);
  drawTextLines({
    page,
    lines,
    x,
    y,
    width,
    font,
    fontSize,
    lineHeight,
    color,
    align,
  });
  return lines;
}

type PartyCard = {
  title: string;
  primary: string;
  rows: string[];
  soft: boolean;
};

function measurePartyCardHeight(card: PartyCard, width: number, fontRegular: PDFFont, fontBold: PDFFont) {
  const innerWidth = width - 24;
  const primaryLines = wrapText(card.primary, fontBold, 12.2, innerWidth);
  let height = 12 + 10 + 10; // top + title + spacing
  height += primaryLines.length * 14 + 6;
  card.rows.forEach((row) => {
    if (!row.trim()) return;
    height += wrapText(row, fontRegular, 8.8, innerWidth).length * 11 + 2;
  });
  return Math.max(112, height + 10);
}

function drawPartyCard(args: {
  page: PDFPage;
  card: PartyCard;
  x: number;
  y: number;
  width: number;
  height: number;
  fontRegular: PDFFont;
  fontBold: PDFFont;
}) {
  const { page, card, x, y, width, height, fontRegular, fontBold } = args;
  const innerX = x + 12;
  const innerWidth = width - 24;

  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: card.soft ? colors.soft : colors.white,
    borderColor: colors.line,
    borderWidth: 1,
  });

  page.drawText(card.title, {
    x: innerX,
    y: y - 17,
    size: 9,
    font: fontBold,
    color: colors.slate,
  });

  let cursor = y - 34;

  const primaryLines = drawWrappedText({
    page,
    text: card.primary,
    x: innerX,
    y: cursor,
    width: innerWidth,
    font: fontBold,
    fontSize: 12.2,
    lineHeight: 14,
    color: colors.dark,
  });
  cursor -= primaryLines.length * 14 + 4;

  for (const row of card.rows) {
    if (!row.trim()) continue;
    const rowLines = drawWrappedText({
      page,
      text: row,
      x: innerX,
      y: cursor,
      width: innerWidth,
      font: fontRegular,
      fontSize: 8.8,
      lineHeight: 11,
      color: colors.muted,
    });
    cursor -= rowLines.length * 11 + 2;
  }
}

function drawHeader(args: {
  page: PDFPage;
  input: QuotePdfInput;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  continuation?: boolean;
}) {
  const { page, input, fontRegular, fontBold, continuation = false } = args;
  const headerHeight = 122;
  const rightEdge = PAGE_WIDTH - MARGIN;
  const quoteCode = input.meta.quoteNumber || `COT-${input.quoteId.slice(0, 8).toUpperCase()}`;
  const issueDate = formatDate(input.meta.quoteDate || input.createdAt);
  const validDate = formatDate(input.meta.validUntil);

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - headerHeight,
    width: PAGE_WIDTH,
    height: headerHeight,
    color: colors.navy,
  });

  page.drawRectangle({
    x: PAGE_WIDTH - 168,
    y: PAGE_HEIGHT - headerHeight,
    width: 168,
    height: headerHeight,
    color: colors.blue,
    opacity: 0.9,
  });

  page.drawRectangle({
    x: MARGIN,
    y: PAGE_HEIGHT - headerHeight + 22,
    width: 34,
    height: 34,
    color: colors.white,
    opacity: 0.12,
  });

  page.drawText("Z", {
    x: MARGIN + 10,
    y: PAGE_HEIGHT - 82,
    size: 22,
    font: fontBold,
    color: colors.white,
  });

  page.drawText(ZYTERON_COMPANY.brandName, {
    x: MARGIN + 50,
    y: PAGE_HEIGHT - 60,
    size: 16,
    font: fontBold,
    color: colors.white,
  });
  page.drawText(continuation ? "Cotización comercial · Continuación" : "Cotización comercial", {
    x: MARGIN + 50,
    y: PAGE_HEIGHT - 79,
    size: 10,
    font: fontRegular,
    color: rgb(0.86, 0.91, 1),
  });

  drawRightAlignedText({
    page,
    text: quoteCode,
    rightX: rightEdge,
    y: PAGE_HEIGHT - 56,
    size: 14,
    font: fontBold,
    color: colors.white,
  });
  drawRightAlignedText({
    page,
    text: `Estado: ${quoteStatusLabel(input.status)}`,
    rightX: rightEdge,
    y: PAGE_HEIGHT - 74,
    size: 9,
    font: fontRegular,
    color: rgb(0.93, 0.96, 1),
  });
  drawRightAlignedText({
    page,
    text: `Emisión: ${issueDate}`,
    rightX: rightEdge,
    y: PAGE_HEIGHT - 88,
    size: 9,
    font: fontRegular,
    color: rgb(0.93, 0.96, 1),
  });
  drawRightAlignedText({
    page,
    text: `Válida hasta: ${validDate}`,
    rightX: rightEdge,
    y: PAGE_HEIGHT - 102,
    size: 9,
    font: fontRegular,
    color: rgb(0.93, 0.96, 1),
  });

  return PAGE_HEIGHT - headerHeight - 20;
}

function drawFooter(args: {
  page: PDFPage;
  pageNumber: number;
  totalPages: number;
  fontRegular: PDFFont;
  fontBold: PDFFont;
}) {
  const { page, pageNumber, totalPages, fontRegular, fontBold } = args;
  const footerY = 42;

  page.drawLine({
    start: { x: MARGIN, y: footerY + 16 },
    end: { x: PAGE_WIDTH - MARGIN, y: footerY + 16 },
    thickness: 1,
    color: colors.line,
  });

  page.drawText(`${ZYTERON_COMPANY.legalName} · RUT ${ZYTERON_COMPANY.rut}`, {
    x: MARGIN,
    y: footerY + 4,
    size: 7.8,
    font: fontBold,
    color: colors.muted,
  });
  page.drawText(`${ZYTERON_COMPANY.website.replace("https://", "")} · ${ZYTERON_COMPANY.salesEmail}`, {
    x: MARGIN,
    y: footerY - 8,
    size: 7.8,
    font: fontRegular,
    color: colors.muted,
  });

  drawRightAlignedText({
    page,
    text: `Página ${pageNumber} de ${totalPages}`,
    rightX: PAGE_WIDTH - MARGIN,
    y: footerY - 2,
    size: 7.8,
    font: fontRegular,
    color: colors.muted,
  });
}

function valueNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export async function generateQuotePdf(input: QuotePdfInput) {
  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage(PAGE_SIZE);
  let y = drawHeader({ page, input, fontRegular, fontBold });

  const newContinuationPage = () => {
    page = pdf.addPage(PAGE_SIZE);
    y = drawHeader({ page, input, fontRegular, fontBold, continuation: true });
  };

  const cardGap = 12;
  const cardWidth = (CONTENT_WIDTH - cardGap) / 2;
  const issuerCard: PartyCard = {
    title: "Emisor",
    primary: safeText(ZYTERON_COMPANY.legalName),
    rows: [
      `RUT: ${safeText(ZYTERON_COMPANY.rut)}`,
      safeText(ZYTERON_COMPANY.businessLine),
      safeText(ZYTERON_COMPANY.addressLine),
      safeText(ZYTERON_COMPANY.location),
      `${safeText(ZYTERON_COMPANY.salesEmail)} · ${safeText(ZYTERON_COMPANY.phone)}`,
    ],
    soft: false,
  };

  const clientName = safeText(input.clientName, "Cliente no informado");
  const clientMain = safeText(input.clientCompany) !== "—" ? safeText(input.clientCompany) : clientName;
  const clientCard: PartyCard = {
    title: "Cliente",
    primary: clientMain,
    rows: [
      clientName,
      input.meta.clientRut ? `RUT: ${input.meta.clientRut}` : "RUT: no informado",
      [safeText(input.meta.clientAddress, ""), safeText(input.meta.clientCity, "")]
        .filter((part) => part.length > 0)
        .join(", "),
      [safeText(input.clientEmail, ""), safeText(input.clientPhone, "")]
        .filter((part) => part.length > 0)
        .join(" · "),
    ],
    soft: true,
  };

  const issuerHeight = measurePartyCardHeight(issuerCard, cardWidth, fontRegular, fontBold);
  const clientHeight = measurePartyCardHeight(clientCard, cardWidth, fontRegular, fontBold);
  const cardsHeight = Math.max(issuerHeight, clientHeight);

  if (y - cardsHeight < MARGIN + FOOTER_RESERVED) {
    newContinuationPage();
  }

  drawPartyCard({
    page,
    card: issuerCard,
    x: MARGIN,
    y,
    width: cardWidth,
    height: cardsHeight,
    fontRegular,
    fontBold,
  });
  drawPartyCard({
    page,
    card: clientCard,
    x: MARGIN + cardWidth + cardGap,
    y,
    width: cardWidth,
    height: cardsHeight,
    fontRegular,
    fontBold,
  });
  y -= cardsHeight + 18;

  const summaryText =
    safeText(input.meta.notes, "") ||
    "Propuesta comercial elaborada para una ejecución profesional, con alcance, plazos y costos claramente definidos.";
  const summaryLines = wrapText(summaryText, fontRegular, 9, CONTENT_WIDTH - 24);
  const summaryHeight = Math.max(64, 30 + Math.min(summaryLines.length, 6) * 12);

  if (y - summaryHeight < MARGIN + FOOTER_RESERVED) {
    newContinuationPage();
  }

  page.drawRectangle({
    x: MARGIN,
    y: y - summaryHeight,
    width: CONTENT_WIDTH,
    height: summaryHeight,
    color: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
  });
  page.drawText("Resumen ejecutivo", {
    x: MARGIN + 12,
    y: y - 18,
    size: 9,
    font: fontBold,
    color: colors.slate,
  });
  drawWrappedText({
    page,
    text: summaryText,
    x: MARGIN + 12,
    y: y - 34,
    width: CONTENT_WIDTH - 24,
    font: fontRegular,
    fontSize: 9,
    lineHeight: 12,
    color: colors.dark,
  });
  y -= summaryHeight + 16;

  const tableCols = [
    { key: "concepto", label: "Concepto", width: CONTENT_WIDTH * 0.41 },
    { key: "detalle", label: "Detalle", width: CONTENT_WIDTH * 0.23 },
    { key: "cantidad", label: "Cant.", width: CONTENT_WIDTH * 0.1 },
    { key: "desc", label: "Desc.", width: CONTENT_WIDTH * 0.1 },
    { key: "total", label: "Total", width: CONTENT_WIDTH * 0.16 },
  ] as const;

  const drawTableHeader = () => {
    const headerHeight = 24;
    page.drawRectangle({
      x: MARGIN,
      y: y - headerHeight,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: colors.soft,
      borderColor: colors.line,
      borderWidth: 1,
    });

    let cursorX = MARGIN;
    tableCols.forEach((col) => {
      const x = cursorX + 8;
      page.drawText(col.label, {
        x,
        y: y - 16,
        size: 8.4,
        font: fontBold,
        color: colors.slate,
      });
      cursorX += col.width;
    });
    y -= headerHeight;
  };

  page.drawText("Detalle de la cotización", {
    x: MARGIN,
    y,
    size: 10,
    font: fontBold,
    color: colors.slate,
  });
  y -= 14;
  drawTableHeader();

  const items = input.meta.items.length ? input.meta.items : [];
  if (!items.length) {
    const emptyHeight = 28;
    page.drawRectangle({
      x: MARGIN,
      y: y - emptyHeight,
      width: CONTENT_WIDTH,
      height: emptyHeight,
      color: colors.white,
      borderColor: colors.line,
      borderWidth: 1,
    });
    page.drawText("Sin ítems registrados.", {
      x: MARGIN + 10,
      y: y - 17,
      size: 8.8,
      font: fontRegular,
      color: colors.muted,
    });
    y -= emptyHeight;
  } else {
    for (const item of items) {
      const descMax = tableCols[0].width - 12;
      const detailMax = tableCols[1].width - 12;
      const descLines = wrapText(safeText(item.description), fontBold, 9, descMax);
      const detailLines = wrapText(
        safeText(item.detail || item.unit || "Servicio"),
        fontRegular,
        8.5,
        detailMax,
      );
      const lineCount = Math.max(descLines.length, detailLines.length, 1);
      const rowHeight = Math.max(28, lineCount * 11 + 10);

      if (y - rowHeight < MARGIN + FOOTER_RESERVED) {
        newContinuationPage();
        page.drawText("Detalle de la cotización (continuación)", {
          x: MARGIN,
          y,
          size: 10,
          font: fontBold,
          color: colors.slate,
        });
        y -= 14;
        drawTableHeader();
      }

      page.drawRectangle({
        x: MARGIN,
        y: y - rowHeight,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: colors.white,
        borderColor: colors.line,
        borderWidth: 1,
      });

      let colX = MARGIN;
      drawTextLines({
        page,
        lines: descLines,
        x: colX + 6,
        y: y - 8,
        width: tableCols[0].width - 12,
        font: fontBold,
        fontSize: 9,
        lineHeight: 11,
        color: colors.dark,
      });
      colX += tableCols[0].width;

      drawTextLines({
        page,
        lines: detailLines,
        x: colX + 6,
        y: y - 8,
        width: tableCols[1].width - 12,
        font: fontRegular,
        fontSize: 8.5,
        lineHeight: 11,
        color: colors.muted,
      });
      colX += tableCols[1].width;

      drawTextLines({
        page,
        lines: [String(valueNumber(item.qty, 0))],
        x: colX,
        y: y - rowHeight / 2 + 3,
        width: tableCols[2].width,
        font: fontRegular,
        fontSize: 8.8,
        lineHeight: 10,
        color: colors.dark,
        align: "center",
      });
      colX += tableCols[2].width;

      drawTextLines({
        page,
        lines: [`${valueNumber(item.discountPct, 0)}%`],
        x: colX,
        y: y - rowHeight / 2 + 3,
        width: tableCols[3].width,
        font: fontRegular,
        fontSize: 8.8,
        lineHeight: 10,
        color: colors.dark,
        align: "center",
      });
      colX += tableCols[3].width;

      drawTextLines({
        page,
        lines: [currencyCLP(itemTotal(item))],
        x: colX + 6,
        y: y - rowHeight / 2 + 3,
        width: tableCols[4].width - 12,
        font: fontBold,
        fontSize: 8.8,
        lineHeight: 10,
        color: colors.dark,
        align: "right",
      });

      y -= rowHeight;
    }
  }

  y -= 16;

  const subtotalFallback = items.reduce((acc, item) => acc + itemTotal(item), 0);
  const subtotal = valueNumber(input.meta.subtotal, subtotalFallback);
  const discount = valueNumber(input.meta.totalDescuento, 0);
  const iva = valueNumber(input.meta.iva, input.meta.includeIva ? subtotal * 0.19 : 0);
  const total = valueNumber(input.meta.grandTotal, subtotal + iva);

  const conditionsText =
    safeText(input.meta.terms, "") ||
    "La presente cotización considera los alcances descritos. Cualquier servicio adicional será evaluado y cotizado por separado.";
  let conditionsLines = wrapText(conditionsText, fontRegular, 8.5, CONTENT_WIDTH * 0.62 - 24);
  if (conditionsLines.length > 14) {
    conditionsLines = [...conditionsLines.slice(0, 13), "…"];
  }

  const leftWidth = CONTENT_WIDTH * 0.62;
  const rightWidth = CONTENT_WIDTH - leftWidth - 12;
  const leftHeight = Math.max(116, 74 + conditionsLines.length * 11);
  const rightHeight = 126;
  const boxesHeight = Math.max(leftHeight, rightHeight);

  if (y - boxesHeight < MARGIN + FOOTER_RESERVED) {
    newContinuationPage();
  }

  page.drawRectangle({
    x: MARGIN,
    y: y - boxesHeight,
    width: leftWidth,
    height: boxesHeight,
    color: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
  });
  page.drawText("Condiciones", {
    x: MARGIN + 12,
    y: y - 17,
    size: 9,
    font: fontBold,
    color: colors.slate,
  });

  page.drawText(`Pago: ${safeText(input.meta.paymentMethod, "Transferencia bancaria")}`, {
    x: MARGIN + 12,
    y: y - 35,
    size: 8.6,
    font: fontRegular,
    color: colors.dark,
  });
  page.drawText(`Plazo: ${safeText(input.meta.paymentTerms, "30 días")}`, {
    x: MARGIN + 12,
    y: y - 48,
    size: 8.6,
    font: fontRegular,
    color: colors.dark,
  });
  page.drawText(
    `Validez: ${safeText(input.meta.validityDays, "30 días")} · hasta ${formatDate(input.meta.validUntil)}`,
    {
      x: MARGIN + 12,
      y: y - 61,
      size: 8.6,
      font: fontRegular,
      color: colors.dark,
    },
  );

  drawTextLines({
    page,
    lines: conditionsLines,
    x: MARGIN + 12,
    y: y - 80,
    width: leftWidth - 24,
    font: fontRegular,
    fontSize: 8.5,
    lineHeight: 11,
    color: colors.muted,
  });

  const totalsX = MARGIN + leftWidth + 12;
  page.drawRectangle({
    x: totalsX,
    y: y - boxesHeight,
    width: rightWidth,
    height: boxesHeight,
    color: colors.navy,
  });

  page.drawText("Totales", {
    x: totalsX + 14,
    y: y - 18,
    size: 10,
    font: fontBold,
    color: colors.white,
  });

  const entries = [
    { label: "Subtotal", value: currencyCLP(subtotal) },
    { label: "Descuentos", value: `-${currencyCLP(discount)}` },
    { label: input.meta.includeIva ? "IVA" : "Impuestos", value: currencyCLP(iva) },
    { label: "Total", value: currencyCLP(total), emphasize: true },
  ];

  entries.forEach((entry, index) => {
    const rowY = y - 42 - index * 20;
    page.drawText(entry.label, {
      x: totalsX + 14,
      y: rowY,
      size: entry.emphasize ? 10 : 9,
      font: entry.emphasize ? fontBold : fontRegular,
      color: rgb(0.84, 0.9, 1),
    });
    drawRightAlignedText({
      page,
      text: entry.value,
      rightX: totalsX + rightWidth - 14,
      y: rowY,
      size: entry.emphasize ? 14 : 9.5,
      font: entry.emphasize ? fontBold : fontBold,
      color: colors.white,
    });
  });

  const pages = pdf.getPages();
  pages.forEach((pdfPage, index) => {
    drawFooter({
      page: pdfPage,
      pageNumber: index + 1,
      totalPages: pages.length,
      fontRegular,
      fontBold,
    });
  });

  return pdf.save();
}
