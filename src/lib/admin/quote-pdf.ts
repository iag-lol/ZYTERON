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

const colors = {
  navy: rgb(0.06, 0.11, 0.22),
  blue: rgb(0.06, 0.37, 1),
  teal: rgb(0.05, 0.55, 0.49),
  slate: rgb(0.41, 0.49, 0.59),
  line: rgb(0.87, 0.9, 0.94),
  soft: rgb(0.96, 0.98, 1),
  white: rgb(1, 1, 1),
  dark: rgb(0.07, 0.09, 0.15),
};

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, fontSize);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [text];
}

function drawWrappedText(args: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: PDFFont;
  fontSize: number;
  color?: ReturnType<typeof rgb>;
  lineHeight?: number;
}) {
  const {
    page,
    text,
    x,
    y,
    maxWidth,
    font,
    fontSize,
    color = colors.dark,
    lineHeight = fontSize + 3,
  } = args;

  const lines = wrapText(text, font, fontSize, maxWidth);
  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size: fontSize,
      font,
      color,
    });
  });

  return y - lines.length * lineHeight;
}

function itemTotal(item: QuoteLineItem) {
  const gross = item.qty * item.unitPrice;
  const discount = gross * ((item.discountPct || 0) / 100);
  return gross - discount;
}

function formatDate(date?: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-CL", {
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

export async function generateQuotePdf(input: QuotePdfInput) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const margin = 34;
  const contentWidth = width - margin * 2;
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x: 0,
    y: height - 132,
    width,
    height: 132,
    color: colors.navy,
  });

  page.drawRectangle({
    x: width - 124,
    y: height - 132,
    width: 124,
    height: 132,
    color: colors.blue,
  });

  page.drawCircle({
    x: width - 86,
    y: height - 36,
    size: 72,
    color: colors.teal,
    opacity: 0.09,
  });

  page.drawText("Z", {
    x: margin,
    y: height - 86,
    size: 30,
    font: fontBold,
    color: colors.white,
  });

  page.drawText(ZYTERON_COMPANY.brandName, {
    x: margin + 32,
    y: height - 58,
    size: 24,
    font: fontBold,
    color: colors.white,
  });

  page.drawText("Cotizacion comercial", {
    x: margin + 32,
    y: height - 83,
    size: 11,
    font: fontRegular,
    color: rgb(0.86, 0.91, 1),
  });

  page.drawText(input.meta.quoteNumber || `COT-${input.quoteId.slice(0, 8).toUpperCase()}`, {
    x: width - 188,
    y: height - 54,
    size: 20,
    font: fontBold,
    color: colors.white,
  });

  page.drawText(`Estado: ${quoteStatusLabel(input.status)}`, {
    x: width - 188,
    y: height - 78,
    size: 10,
    font: fontRegular,
    color: rgb(0.93, 0.96, 1),
  });

  page.drawText(`Emision ${formatDate(input.meta.quoteDate || input.createdAt)}`, {
    x: width - 188,
    y: height - 94,
    size: 10,
    font: fontRegular,
    color: rgb(0.93, 0.96, 1),
  });

  let y = height - 162;

  page.drawRectangle({
    x: margin,
    y: y - 92,
    width: contentWidth * 0.52,
    height: 92,
    color: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: margin + contentWidth * 0.54,
    y: y - 92,
    width: contentWidth * 0.46,
    height: 92,
    color: colors.soft,
    borderColor: colors.line,
    borderWidth: 1,
  });

  page.drawText("Emisor", {
    x: margin + 14,
    y: y - 18,
    size: 9,
    font: fontBold,
    color: colors.slate,
  });
  page.drawText(ZYTERON_COMPANY.legalName, {
    x: margin + 14,
    y: y - 38,
    size: 13,
    font: fontBold,
    color: colors.dark,
  });
  page.drawText(`RUT ${ZYTERON_COMPANY.rut}`, {
    x: margin + 14,
    y: y - 54,
    size: 9,
    font: fontRegular,
    color: colors.slate,
  });
  page.drawText(ZYTERON_COMPANY.businessLine, {
    x: margin + 14,
    y: y - 68,
    size: 8.5,
    font: fontRegular,
    color: colors.dark,
  });
  page.drawText(`${ZYTERON_COMPANY.addressLine} · ${ZYTERON_COMPANY.location}`, {
    x: margin + 14,
    y: y - 81,
    size: 8.5,
    font: fontRegular,
    color: colors.slate,
  });

  const clientX = margin + contentWidth * 0.54 + 14;
  page.drawText("Cliente", {
    x: clientX,
    y: y - 18,
    size: 9,
    font: fontBold,
    color: colors.slate,
  });
  page.drawText(input.clientCompany || input.clientName, {
    x: clientX,
    y: y - 38,
    size: 13,
    font: fontBold,
    color: colors.dark,
  });
  page.drawText(input.clientName, {
    x: clientX,
    y: y - 54,
    size: 9,
    font: fontRegular,
    color: colors.dark,
  });
  page.drawText(input.meta.clientRut ? `RUT ${input.meta.clientRut}` : "RUT no informado", {
    x: clientX,
    y: y - 68,
    size: 8.5,
    font: fontRegular,
    color: colors.slate,
  });
  page.drawText(
    [input.clientEmail, input.clientPhone].filter(Boolean).join(" · ") || "Sin contacto registrado",
    {
      x: clientX,
      y: y - 81,
      size: 8.5,
      font: fontRegular,
      color: colors.slate,
    },
  );

  y -= 118;

  page.drawText("Resumen ejecutivo", {
    x: margin,
    y,
    size: 10,
    font: fontBold,
    color: colors.slate,
  });
  drawWrappedText({
    page,
    text:
      input.meta.notes ||
      "Propuesta comercial diseñada para ejecución profesional, con alcance, tiempos y cobros claramente definidos.",
    x: margin + 108,
    y,
    maxWidth: contentWidth - 108,
    font: fontRegular,
    fontSize: 9,
    color: colors.dark,
    lineHeight: 12,
  });

  y -= 24;

  const tableTop = y;
  const tableHeaderHeight = 24;
  const rowHeight = 34;
  const visibleItems = input.meta.items.slice(0, 7);
  const hiddenCount = Math.max(0, input.meta.items.length - visibleItems.length);
  const tableHeight = tableHeaderHeight + visibleItems.length * rowHeight + (hiddenCount ? 22 : 0);

  page.drawRectangle({
    x: margin,
    y: tableTop - tableHeight,
    width: contentWidth,
    height: tableHeight,
    color: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: margin,
    y: tableTop - tableHeaderHeight,
    width: contentWidth,
    height: tableHeaderHeight,
    color: colors.soft,
  });

  const col1 = margin + 12;
  const col2 = margin + 250;
  const col3 = margin + 380;
  const col4 = margin + 430;
  const col5 = margin + 485;

  page.drawText("Concepto", { x: col1, y: tableTop - 16, size: 8.5, font: fontBold, color: colors.slate });
  page.drawText("Detalle", { x: col2, y: tableTop - 16, size: 8.5, font: fontBold, color: colors.slate });
  page.drawText("Cant.", { x: col3, y: tableTop - 16, size: 8.5, font: fontBold, color: colors.slate });
  page.drawText("Desc.", { x: col4, y: tableTop - 16, size: 8.5, font: fontBold, color: colors.slate });
  page.drawText("Total", { x: col5, y: tableTop - 16, size: 8.5, font: fontBold, color: colors.slate });

  visibleItems.forEach((item, index) => {
    const rowTop = tableTop - tableHeaderHeight - index * rowHeight;
    if (index > 0) {
      page.drawLine({
        start: { x: margin, y: rowTop },
        end: { x: margin + contentWidth, y: rowTop },
        thickness: 1,
        color: colors.line,
      });
    }

    drawWrappedText({
      page,
      text: item.description,
      x: col1,
      y: rowTop - 15,
      maxWidth: 220,
      font: fontBold,
      fontSize: 8.5,
    });
    drawWrappedText({
      page,
      text: item.detail || item.unit || "Servicio",
      x: col2,
      y: rowTop - 15,
      maxWidth: 110,
      font: fontRegular,
      fontSize: 8,
      color: colors.slate,
    });
    page.drawText(String(item.qty), {
      x: col3,
      y: rowTop - 15,
      size: 8.5,
      font: fontRegular,
      color: colors.dark,
    });
    page.drawText(`${item.discountPct || 0}%`, {
      x: col4,
      y: rowTop - 15,
      size: 8.5,
      font: fontRegular,
      color: colors.dark,
    });
    page.drawText(currencyCLP(itemTotal(item)), {
      x: col5,
      y: rowTop - 15,
      size: 8.5,
      font: fontBold,
      color: colors.dark,
    });
  });

  if (hiddenCount) {
    const lineY = tableTop - tableHeaderHeight - visibleItems.length * rowHeight;
    page.drawLine({
      start: { x: margin, y: lineY },
      end: { x: margin + contentWidth, y: lineY },
      thickness: 1,
      color: colors.line,
    });
    page.drawText(`+ ${hiddenCount} item(s) adicional(es) incluidos en el registro interno`, {
      x: col1,
      y: lineY - 14,
      size: 8,
      font: fontRegular,
      color: colors.slate,
    });
  }

  y = tableTop - tableHeight - 24;

  const leftBoxWidth = 324;
  const rightBoxWidth = contentWidth - leftBoxWidth - 12;
  const boxHeight = 118;

  page.drawRectangle({
    x: margin,
    y: y - boxHeight,
    width: leftBoxWidth,
    height: boxHeight,
    color: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: margin + leftBoxWidth + 12,
    y: y - boxHeight,
    width: rightBoxWidth,
    height: boxHeight,
    color: colors.navy,
  });

  page.drawText("Condiciones", {
    x: margin + 14,
    y: y - 18,
    size: 9,
    font: fontBold,
    color: colors.slate,
  });
  page.drawText(`Pago: ${input.meta.paymentMethod || "Transferencia bancaria"}`, {
    x: margin + 14,
    y: y - 38,
    size: 8.5,
    font: fontRegular,
    color: colors.dark,
  });
  page.drawText(`Plazo: ${input.meta.paymentTerms || "30 dias"}`, {
    x: margin + 14,
    y: y - 52,
    size: 8.5,
    font: fontRegular,
    color: colors.dark,
  });
  page.drawText(`Validez: ${input.meta.validityDays || "30 dias"} hasta ${formatDate(input.meta.validUntil)}`, {
    x: margin + 14,
    y: y - 66,
    size: 8.5,
    font: fontRegular,
    color: colors.dark,
  });
  drawWrappedText({
    page,
    text:
      input.meta.terms ||
      "La presente cotizacion considera los alcances descritos. Cualquier servicio adicional se evaluara y cotizara por separado.",
    x: margin + 14,
    y: y - 84,
    maxWidth: leftBoxWidth - 28,
    font: fontRegular,
    fontSize: 7.8,
    color: colors.slate,
    lineHeight: 11,
  });

  const totalsX = margin + leftBoxWidth + 28;
  const totalEntries = [
    { label: "Subtotal", value: currencyCLP(input.meta.subtotal) },
    { label: "Descuentos", value: `-${currencyCLP(input.meta.totalDescuento)}` },
    { label: input.meta.includeIva ? "IVA" : "Impuestos", value: currencyCLP(input.meta.iva) },
    { label: "Total", value: currencyCLP(input.meta.grandTotal) },
  ];

  page.drawText("Totales", {
    x: totalsX,
    y: y - 18,
    size: 9,
    font: fontBold,
    color: colors.white,
  });

  totalEntries.forEach((entry, index) => {
    const rowY = y - 40 - index * 19;
    page.drawText(entry.label, {
      x: totalsX,
      y: rowY,
      size: index === totalEntries.length - 1 ? 9 : 8.5,
      font: index === totalEntries.length - 1 ? fontBold : fontRegular,
      color: rgb(0.84, 0.9, 1),
    });
    page.drawText(entry.value, {
      x: totalsX + 108,
      y: rowY,
      size: index === totalEntries.length - 1 ? 12 : 9,
      font: index === totalEntries.length - 1 ? fontBold : fontRegular,
      color: colors.white,
    });
  });

  page.drawRectangle({
    x: margin,
    y: 30,
    width: contentWidth,
    height: 26,
    color: colors.soft,
  });
  page.drawText(
    `${ZYTERON_COMPANY.legalName} · ${ZYTERON_COMPANY.rut} · ${ZYTERON_COMPANY.website.replace("https://", "")} · ${ZYTERON_COMPANY.salesEmail}`,
    {
      x: margin + 12,
      y: 40,
      size: 8,
      font: fontRegular,
      color: colors.slate,
    },
  );

  return pdf.save();
}
