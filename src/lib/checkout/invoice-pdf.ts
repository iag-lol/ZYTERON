import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ZYTERON_COMPANY } from "@/lib/company";
import type { CheckoutMeta } from "@/lib/checkout/orders";

type Input = {
  orderId: string;
  createdAt?: string | null;
  flowOrder?: number | null;
  meta: CheckoutMeta;
};

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

export async function generateCheckoutInvoicePdf(input: Input) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const colors = {
    title: rgb(0.05, 0.16, 0.48),
    text: rgb(0.1, 0.14, 0.2),
    soft: rgb(0.4, 0.45, 0.55),
    line: rgb(0.86, 0.9, 0.95),
    panel: rgb(0.96, 0.98, 1),
    ok: rgb(0.02, 0.48, 0.3),
  } as const;

  let y = 800;
  const margin = 38;
  const contentWidth = 595.28 - margin * 2;

  const orderRef = `WEB-${input.orderId.slice(0, 8).toUpperCase()}`;
  const customer = input.meta.customer;
  const netSubtotal = getNetSubtotal(input.meta);
  const taxAmount = getTaxAmount(input.meta);

  page.drawRectangle({
    x: 0,
    y: 760,
    width: 595.28,
    height: 84,
    color: colors.panel,
  });

  page.drawText(ZYTERON_COMPANY.legalName, {
    x: margin,
    y: y,
    size: 19,
    font: bold,
    color: colors.title,
  });
  y -= 20;
  page.drawText(`RUT emisor: ${ZYTERON_COMPANY.rut} · ${ZYTERON_COMPANY.location}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: colors.soft,
  });
  y -= 14;
  page.drawText(`Documento: ${customer.documentType === "FACTURA" ? "Factura (referencial)" : "Boleta electrónica (referencial)"}`, {
    x: margin,
    y,
    size: 10,
    font: bold,
    color: colors.text,
  });

  page.drawText("COMPRA CONFIRMADA", {
    x: 405,
    y: 800,
    size: 11,
    font: bold,
    color: colors.ok,
  });
  page.drawText(orderRef, {
    x: 405,
    y: 784,
    size: 13,
    font: bold,
    color: colors.title,
  });
  page.drawText(`Emisión: ${formatDate(input.createdAt || input.meta.flow.updatedAt)}`, {
    x: 405,
    y: 770,
    size: 9.5,
    font,
    color: colors.soft,
  });
  if (input.flowOrder) {
    page.drawText(`Flow #${input.flowOrder}`, {
      x: 405,
      y: 757,
      size: 9.5,
      font,
      color: colors.soft,
    });
  }

  y = 730;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 1, color: colors.line });
  y -= 20;

  page.drawText("Comprador", { x: margin, y, size: 11, font: bold, color: colors.title });
  page.drawText("Despacho", { x: 300, y, size: 11, font: bold, color: colors.title });
  y -= 14;
  page.drawText(safeText(customer.buyerName), { x: margin, y, size: 10.5, font: bold, color: colors.text });
  page.drawText(safeText(customer.address), { x: 300, y, size: 10, font, color: colors.text });
  y -= 13;
  page.drawText(`RUT: ${safeText(customer.buyerRut)}`, { x: margin, y, size: 10, font, color: colors.text });
  page.drawText(`Comuna/Ciudad: ${safeText(customer.commune)} / ${safeText(customer.city)}`, {
    x: 300,
    y,
    size: 10,
    font,
    color: colors.text,
  });
  y -= 13;
  page.drawText(`Correo: ${safeText(customer.buyerEmail)}`, { x: margin, y, size: 10, font, color: colors.text });
  page.drawText(`Teléfono: ${safeText(customer.buyerPhone)}`, { x: 300, y, size: 10, font, color: colors.text });

  if (customer.documentType === "FACTURA") {
    y -= 16;
    page.drawText(`Empresa: ${safeText(customer.companyName)}`, { x: margin, y, size: 10, font, color: colors.text });
    page.drawText(`RUT empresa: ${safeText(customer.companyRut)}`, { x: 300, y, size: 10, font, color: colors.text });
    y -= 13;
    page.drawText(`Giro: ${safeText(customer.companyBusinessLine)}`, { x: margin, y, size: 10, font, color: colors.text });
  }

  y -= 20;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 1, color: colors.line });
  y -= 18;

  page.drawText("Detalle del pedido", { x: margin, y, size: 11, font: bold, color: colors.title });
  y -= 14;

  page.drawRectangle({ x: margin, y: y - 18, width: contentWidth, height: 18, color: colors.panel });
  page.drawText("Producto", { x: margin + 6, y: y - 12, size: 9.5, font: bold, color: colors.soft });
  page.drawText("Cant", { x: 340, y: y - 12, size: 9.5, font: bold, color: colors.soft });
  page.drawText("Unit.", { x: 395, y: y - 12, size: 9.5, font: bold, color: colors.soft });
  page.drawText("Total", { x: 500, y: y - 12, size: 9.5, font: bold, color: colors.soft });
  y -= 24;

  for (const item of input.meta.items) {
    if (y < 180) break;
    page.drawText(`${item.name}`, { x: margin + 6, y, size: 9.8, font, color: colors.text });
    page.drawText(String(item.quantity), { x: 346, y, size: 9.8, font, color: colors.text });
    page.drawText(currency(item.finalUnitPrice), { x: 392, y, size: 9.8, font, color: colors.text });
    page.drawText(currency(item.lineTotal), { x: 490, y, size: 9.8, font: bold, color: colors.text });
    y -= 14;
    page.drawLine({ start: { x: margin, y: y + 4 }, end: { x: margin + contentWidth, y: y + 4 }, thickness: 0.6, color: colors.line });
    y -= 3;
  }

  y = Math.max(154, y - 2);
  const summaryX = 360;
  const amountX = margin + contentWidth - 2;
  const drawSummaryRow = (label: string, amount: string, isStrong = false) => {
    page.drawText(label, {
      x: summaryX,
      y,
      size: isStrong ? 10.8 : 9.8,
      font: isStrong ? bold : font,
      color: colors.text,
    });
    const width = (isStrong ? bold : font).widthOfTextAtSize(amount, isStrong ? 10.8 : 9.8);
    page.drawText(amount, {
      x: amountX - width,
      y,
      size: isStrong ? 10.8 : 9.8,
      font: isStrong ? bold : font,
      color: isStrong ? colors.title : colors.text,
    });
    y -= isStrong ? 16 : 13;
  };

  drawSummaryRow("Subtotal bruto", currency(input.meta.subtotal));
  drawSummaryRow("Descuento", `-${currency(input.meta.discount)}`);
  drawSummaryRow("Subtotal neto", currency(netSubtotal));
  drawSummaryRow("IVA", currency(taxAmount));
  page.drawLine({ start: { x: summaryX, y: y + 10 }, end: { x: amountX, y: y + 10 }, thickness: 1, color: colors.line });
  drawSummaryRow("TOTAL PAGADO", currency(input.meta.total), true);

  const comments = safeText(customer.comments, "");
  if (comments) {
    page.drawText("Comentarios del cliente:", { x: margin, y: 116, size: 9.8, font: bold, color: colors.soft });
    page.drawText(comments.slice(0, 130), { x: margin, y: 102, size: 9.3, font, color: colors.text });
  }

  page.drawLine({ start: { x: margin, y: 76 }, end: { x: margin + contentWidth, y: 76 }, thickness: 1, color: colors.line });
  page.drawText(`${ZYTERON_COMPANY.legalName} · ${ZYTERON_COMPANY.salesEmail} · ${ZYTERON_COMPANY.phone}`, {
    x: margin,
    y: 62,
    size: 8.8,
    font,
    color: colors.soft,
  });
  page.drawText("Documento generado automáticamente tras confirmación de pago Flow.", {
    x: margin,
    y: 49,
    size: 8.5,
    font,
    color: colors.soft,
  });

  return doc.save();
}

