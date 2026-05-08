import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { ZYTERON_COMPANY } from "@/lib/company";
import type { CheckoutMeta } from "@/lib/checkout/orders";

type Input = {
  orderId: string;
  createdAt?: string | null;
  flowOrder?: number | null;
  meta: CheckoutMeta;
};

type PageContext = {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
};

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4
const PAGE_WIDTH = PAGE_SIZE[0];
const PAGE_HEIGHT = PAGE_SIZE[1];
const MARGIN = 34;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const FOOTER_LIMIT = 86;

const palette = {
  primary: rgb(0.05, 0.14, 0.38),
  primaryStrong: rgb(0.03, 0.11, 0.31),
  accent: rgb(0.05, 0.36, 0.98),
  success: rgb(0.05, 0.5, 0.28),
  white: rgb(1, 1, 1),
  text: rgb(0.08, 0.11, 0.17),
  muted: rgb(0.38, 0.44, 0.53),
  line: rgb(0.85, 0.89, 0.94),
  panel: rgb(0.96, 0.97, 0.99),
  panelStrong: rgb(0.93, 0.95, 0.98),
  rowAlt: rgb(0.985, 0.988, 0.995),
} as const;

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value || 0)));
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function safeText(value?: string | null, fallback = "—") {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function getNetSubtotal(meta: CheckoutMeta) {
  if (typeof meta.netSubtotal === "number" && Number.isFinite(meta.netSubtotal)) {
    return Math.max(0, Math.round(meta.netSubtotal));
  }
  return Math.max(0, Math.round(meta.subtotal - meta.discount));
}

function getTaxAmount(meta: CheckoutMeta) {
  if (typeof meta.taxAmount === "number" && Number.isFinite(meta.taxAmount)) {
    return Math.max(0, Math.round(meta.taxAmount));
  }
  return Math.max(0, Math.round(meta.total - getNetSubtotal(meta)));
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const source = String(text || "").trim();
  if (!source) return ["—"];
  const words = source.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : ["—"];
}

function drawRightText(args: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  size: number;
  xRight: number;
  y: number;
  color: ReturnType<typeof rgb>;
}) {
  const width = args.font.widthOfTextAtSize(args.text, args.size);
  args.page.drawText(args.text, {
    x: args.xRight - width,
    y: args.y,
    size: args.size,
    font: args.font,
    color: args.color,
  });
}

function drawPanel(args: {
  ctx: PageContext;
  x: number;
  yTop: number;
  width: number;
  height: number;
  title: string;
  rows: string[];
}) {
  const { ctx, x, yTop, width, height, title, rows } = args;
  const { page, font, bold } = ctx;
  page.drawRectangle({
    x,
    y: yTop - height,
    width,
    height,
    color: palette.panel,
    borderColor: palette.line,
    borderWidth: 1,
  });

  page.drawText(title, {
    x: x + 10,
    y: yTop - 16,
    size: 8.8,
    font: bold,
    color: palette.muted,
  });

  let y = yTop - 32;
  const rowWidth = width - 20;
  for (const row of rows) {
    const lines = wrapText(row, font, 9.2, rowWidth);
    for (const line of lines.slice(0, 2)) {
      page.drawText(line, {
        x: x + 10,
        y,
        size: 9.2,
        font,
        color: palette.text,
      });
      y -= 11;
      if (y < yTop - height + 10) return;
    }
    y -= 2;
  }
}

function drawHeader(ctx: PageContext, input: Input, continuation = false) {
  const { page, font, bold } = ctx;
  const orderRef = `WEB-${input.orderId.slice(0, 8).toUpperCase()}`;
  const docLabel = input.meta.customer.documentType === "FACTURA" ? "FACTURA REFERENCIAL" : "BOLETA REFERENCIAL";
  const issueAt = formatDate(input.createdAt || input.meta.flow.updatedAt);

  const headerHeight = continuation ? 74 : 108;
  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - headerHeight,
    width: PAGE_WIDTH,
    height: headerHeight,
    color: palette.primary,
  });
  page.drawRectangle({
    x: PAGE_WIDTH - 176,
    y: PAGE_HEIGHT - headerHeight,
    width: 176,
    height: headerHeight,
    color: palette.accent,
    opacity: 0.9,
  });

  page.drawText("Z", {
    x: MARGIN + 2,
    y: PAGE_HEIGHT - (continuation ? 38 : 52),
    size: continuation ? 18 : 24,
    font: bold,
    color: palette.white,
  });
  page.drawText(ZYTERON_COMPANY.legalName, {
    x: MARGIN + 26,
    y: PAGE_HEIGHT - (continuation ? 36 : 46),
    size: continuation ? 12 : 14,
    font: bold,
    color: palette.white,
  });
  page.drawText(
    continuation ? "Detalle de pedido (continuación)" : "Comprobante de compra online confirmada",
    {
      x: MARGIN + 26,
      y: PAGE_HEIGHT - (continuation ? 50 : 62),
      size: continuation ? 8.8 : 10,
      font,
      color: rgb(0.88, 0.92, 0.98),
    },
  );

  if (!continuation) {
    const badgeX = MARGIN + 26;
    const badgeY = PAGE_HEIGHT - 84;
    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: 118,
      height: 16,
      color: rgb(0.09, 0.57, 0.31),
    });
    page.drawText("PAGO CONFIRMADO", {
      x: badgeX + 9,
      y: badgeY + 4.6,
      size: 8.2,
      font: bold,
      color: palette.white,
    });
  }

  const rightX = PAGE_WIDTH - MARGIN;
  drawRightText({
    page,
    font: bold,
    text: orderRef,
    size: continuation ? 11.5 : 13.5,
    xRight: rightX,
    y: PAGE_HEIGHT - (continuation ? 33 : 44),
    color: palette.white,
  });
  drawRightText({
    page,
    font,
    text: docLabel,
    size: 8.8,
    xRight: rightX,
    y: PAGE_HEIGHT - (continuation ? 46 : 58),
    color: rgb(0.91, 0.95, 0.99),
  });
  drawRightText({
    page,
    font,
    text: `Emitido: ${issueAt}`,
    size: 8.8,
    xRight: rightX,
    y: PAGE_HEIGHT - (continuation ? 58 : 70),
    color: rgb(0.91, 0.95, 0.99),
  });
  if (input.flowOrder) {
    drawRightText({
      page,
      font,
      text: `Número de orden: ${input.flowOrder}`,
      size: 8.4,
      xRight: rightX,
      y: PAGE_HEIGHT - (continuation ? 69 : 82),
      color: rgb(0.91, 0.95, 0.99),
    });
  }

  return PAGE_HEIGHT - headerHeight - 18;
}

function drawTableHeader(ctx: PageContext, y: number) {
  const { page, bold } = ctx;
  page.drawRectangle({
    x: MARGIN,
    y: y - 18,
    width: CONTENT_WIDTH,
    height: 18,
    color: palette.panelStrong,
    borderColor: palette.line,
    borderWidth: 1,
  });

  page.drawText("Producto", { x: MARGIN + 8, y: y - 12.2, size: 8.8, font: bold, color: palette.muted });
  page.drawText("Cant.", { x: MARGIN + 330, y: y - 12.2, size: 8.8, font: bold, color: palette.muted });
  page.drawText("Unitario", { x: MARGIN + 390, y: y - 12.2, size: 8.8, font: bold, color: palette.muted });
  page.drawText("Total", { x: MARGIN + 472, y: y - 12.2, size: 8.8, font: bold, color: palette.muted });
  return y - 22;
}

export async function generateCheckoutInvoicePdf(input: Input) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const netSubtotal = getNetSubtotal(input.meta);
  const taxAmount = getTaxAmount(input.meta);
  const customer = input.meta.customer;

  const createPage = (continuation = false) => {
    const page = pdf.addPage(PAGE_SIZE);
    const ctx: PageContext = { page, font, bold };
    const yTop = drawHeader(ctx, input, continuation);
    return { ctx, yTop };
  };

  const firstPage = createPage(false);
  let ctx = firstPage.ctx;
  let y = firstPage.yTop;

  const colGap = 10;
  const leftWidth = (CONTENT_WIDTH - colGap) / 2;
  const rightX = MARGIN + leftWidth + colGap;

  drawPanel({
    ctx,
    x: MARGIN,
    yTop: y,
    width: leftWidth,
    height: 112,
    title: "DATOS DEL COMPRADOR",
    rows: [
      `Nombre: ${safeText(customer.buyerName)}`,
      `RUT: ${safeText(customer.buyerRut)}`,
      `Correo: ${safeText(customer.buyerEmail)}`,
      `Teléfono: ${safeText(customer.buyerPhone)}`,
    ],
  });
  drawPanel({
    ctx,
    x: rightX,
    yTop: y,
    width: leftWidth,
    height: 112,
    title: "DATOS DE DESPACHO Y TRIBUTACIÓN",
    rows: [
      `Dirección: ${safeText(customer.address)}`,
      `Comuna/Ciudad: ${safeText(customer.commune)} / ${safeText(customer.city)}`,
      `Documento: ${customer.documentType}`,
      customer.documentType === "FACTURA"
        ? `Empresa: ${safeText(customer.companyName)} · RUT: ${safeText(customer.companyRut)}`
        : "Boleta consumidor final",
      customer.documentType === "FACTURA" ? `Giro: ${safeText(customer.companyBusinessLine)}` : "",
    ].filter(Boolean),
  });
  y -= 128;

  ctx.page.drawText("DETALLE DE PRODUCTOS", {
    x: MARGIN,
    y,
    size: 10.2,
    font: bold,
    color: palette.primaryStrong,
  });
  y -= 10;
  y = drawTableHeader(ctx, y);

  let rowIndex = 0;
  for (const item of input.meta.items) {
    const nameLines = wrapText(item.name, font, 9.2, 300).slice(0, 3);
    const rowHeight = Math.max(21, nameLines.length * 10.8 + 8);

    if (y - rowHeight < 190) {
      const next = createPage(true);
      ctx = next.ctx;
      y = drawTableHeader(ctx, next.yTop - 8);
    }

    if (rowIndex % 2 === 1) {
      ctx.page.drawRectangle({
        x: MARGIN,
        y: y - rowHeight + 4,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: palette.rowAlt,
      });
    }

    let rowY = y - 8;
    for (const line of nameLines) {
      ctx.page.drawText(line, {
        x: MARGIN + 8,
        y: rowY,
        size: 9.2,
        font,
        color: palette.text,
      });
      rowY -= 10.6;
    }

    ctx.page.drawText(String(item.quantity), {
      x: MARGIN + 338,
      y: y - 9,
      size: 9.2,
      font,
      color: palette.text,
    });
    drawRightText({
      page: ctx.page,
      font,
      text: currency(item.finalUnitPrice),
      size: 9.2,
      xRight: MARGIN + 460,
      y: y - 9,
      color: palette.text,
    });
    drawRightText({
      page: ctx.page,
      font: bold,
      text: currency(item.lineTotal),
      size: 9.4,
      xRight: MARGIN + CONTENT_WIDTH - 8,
      y: y - 9,
      color: palette.text,
    });

    y -= rowHeight;
    ctx.page.drawLine({
      start: { x: MARGIN, y: y + 4 },
      end: { x: MARGIN + CONTENT_WIDTH, y: y + 4 },
      thickness: 0.7,
      color: palette.line,
    });
    y -= 2;
    rowIndex += 1;
  }

  if (y < 220) {
    const next = createPage(true);
    ctx = next.ctx;
    y = next.yTop - 8;
  }

  const summaryWidth = 222;
  const summaryX = MARGIN + CONTENT_WIDTH - summaryWidth;
  const summaryHeight = 126;
  const summaryTop = y - 8;

  ctx.page.drawRectangle({
    x: summaryX,
    y: summaryTop - summaryHeight,
    width: summaryWidth,
    height: summaryHeight,
    color: palette.panel,
    borderColor: palette.line,
    borderWidth: 1,
  });
  ctx.page.drawText("RESUMEN FINANCIERO", {
    x: summaryX + 12,
    y: summaryTop - 16,
    size: 9,
    font: bold,
    color: palette.primaryStrong,
  });

  let sumY = summaryTop - 32;
  const drawSummary = (label: string, amount: string, strong = false) => {
    ctx.page.drawText(label, {
      x: summaryX + 12,
      y: sumY,
      size: strong ? 10.2 : 9.1,
      font: strong ? bold : font,
      color: palette.text,
    });
    drawRightText({
      page: ctx.page,
      font: strong ? bold : font,
      text: amount,
      size: strong ? 10.6 : 9.2,
      xRight: summaryX + summaryWidth - 12,
      y: sumY,
      color: strong ? palette.accent : palette.text,
    });
    sumY -= strong ? 16 : 13;
  };

  drawSummary("Subtotal bruto", currency(input.meta.subtotal));
  drawSummary("Descuento", `-${currency(input.meta.discount)}`);
  drawSummary("Subtotal neto", currency(netSubtotal));
  drawSummary("IVA", currency(taxAmount));
  ctx.page.drawLine({
    start: { x: summaryX + 12, y: sumY + 8 },
    end: { x: summaryX + summaryWidth - 12, y: sumY + 8 },
    thickness: 0.8,
    color: palette.line,
  });
  drawSummary("TOTAL PAGADO", currency(input.meta.total), true);

  const comments = safeText(customer.comments, "");
  if (comments && comments !== "—") {
    const commentsTop = summaryTop - summaryHeight - 12;
    const notesLines = wrapText(comments, font, 8.8, CONTENT_WIDTH - 20).slice(0, 3);
    const commentsHeight = 26 + notesLines.length * 10.4;
    ctx.page.drawRectangle({
      x: MARGIN,
      y: commentsTop - commentsHeight,
      width: CONTENT_WIDTH,
      height: commentsHeight,
      color: palette.panel,
      borderColor: palette.line,
      borderWidth: 1,
    });
    ctx.page.drawText("COMENTARIOS DEL CLIENTE", {
      x: MARGIN + 10,
      y: commentsTop - 14,
      size: 8.6,
      font: bold,
      color: palette.muted,
    });
    let noteY = commentsTop - 26;
    for (const line of notesLines) {
      ctx.page.drawText(line, {
        x: MARGIN + 10,
        y: noteY,
        size: 8.8,
        font,
        color: palette.text,
      });
      noteY -= 10.4;
    }
  }

  ctx.page.drawLine({
    start: { x: MARGIN, y: FOOTER_LIMIT + 20 },
    end: { x: MARGIN + CONTENT_WIDTH, y: FOOTER_LIMIT + 20 },
    thickness: 1,
    color: palette.line,
  });
  ctx.page.drawText(
    `${ZYTERON_COMPANY.legalName} · RUT ${ZYTERON_COMPANY.rut} · ${ZYTERON_COMPANY.salesEmail} · ${ZYTERON_COMPANY.phone}`,
    {
      x: MARGIN,
      y: FOOTER_LIMIT + 6,
      size: 8.4,
      font,
      color: palette.muted,
    },
  );
  ctx.page.drawText(
    "Documento comercial referencial generado automáticamente tras confirmación de pago en Flow. La emisión tributaria oficial depende del proceso SII.",
    {
      x: MARGIN,
      y: FOOTER_LIMIT - 8,
      size: 7.9,
      font,
      color: palette.muted,
    },
  );

  return pdf.save();
}
