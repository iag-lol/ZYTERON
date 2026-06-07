import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { AccountingDashboardData } from "@/lib/admin/accounting";
import { ZYTERON_COMPANY } from "@/lib/company";

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 34;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const palette = {
  ink: rgb(0.08, 0.11, 0.16),
  soft: rgb(0.44, 0.5, 0.58),
  line: rgb(0.87, 0.9, 0.95),
  blue: rgb(0.06, 0.37, 1),
  blueSoft: rgb(0.94, 0.97, 1),
  greenSoft: rgb(0.93, 0.98, 0.95),
  amberSoft: rgb(1, 0.97, 0.9),
  roseSoft: rgb(1, 0.94, 0.94),
  white: rgb(1, 1, 1),
} as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function truncate(value: string, max = 62) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function drawText(page: PDFPage, font: PDFFont, text: string, x: number, y: number, size: number, color = palette.ink) {
  page.drawText(text, { x, y, size, font, color });
}

function drawCard(args: {
  page: PDFPage;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  value: string;
  helper?: string;
  fill: ReturnType<typeof rgb>;
  fontBold: PDFFont;
  fontRegular: PDFFont;
}) {
  const { page, x, y, width, height, title, value, helper, fill, fontBold, fontRegular } = args;
  page.drawRectangle({
    x,
    y: y - height,
    width,
    height,
    color: fill,
    borderColor: palette.line,
    borderWidth: 1,
  });
  drawText(page, fontRegular, title, x + 12, y - 18, 9, palette.soft);
  drawText(page, fontBold, value, x + 12, y - 40, 16, palette.ink);
  if (helper) {
    drawText(page, fontRegular, helper, x + 12, y - 56, 8.5, palette.soft);
  }
}

function drawSectionTitle(page: PDFPage, fontBold: PDFFont, title: string, subtitle: string, y: number) {
  drawText(page, fontBold, title, MARGIN, y, 12, palette.ink);
  drawText(page, fontBold, subtitle, PAGE_WIDTH - MARGIN - fontBold.widthOfTextAtSize(subtitle, 9), y + 1, 9, palette.soft);
}

function drawRows(args: {
  page: PDFPage;
  fontBold: PDFFont;
  fontRegular: PDFFont;
  y: number;
  rows: Array<[string, string, string, string]>;
  headers: [string, string, string, string];
}) {
  const { page, fontBold, fontRegular, rows, headers } = args;
  let y = args.y;
  const columns = [0, 240, 355, 465];

  page.drawRectangle({
    x: MARGIN,
    y: y - 16,
    width: CONTENT_WIDTH,
    height: 18,
    color: palette.blueSoft,
    borderColor: palette.line,
    borderWidth: 1,
  });

  headers.forEach((header, index) => {
    drawText(page, fontBold, header, MARGIN + 10 + columns[index], y - 10, 8.5, palette.soft);
  });
  y -= 24;

  rows.forEach((row, rowIndex) => {
    page.drawRectangle({
      x: MARGIN,
      y: y - 12,
      width: CONTENT_WIDTH,
      height: 18,
      color: rowIndex % 2 === 0 ? palette.white : palette.blueSoft,
      borderColor: palette.line,
      borderWidth: 0.5,
    });
    row.forEach((cell, index) => {
      drawText(page, fontRegular, truncate(cell, index === 0 ? 38 : 24), MARGIN + 10 + columns[index], y - 7.5, 8.2, palette.ink);
    });
    y -= 18;
  });
}

export async function generateAccountingPdfReport(data: AccountingDashboardData) {
  const pdf = await PDFDocument.create();
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const firstPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  drawText(firstPage, fontBold, "Contador Auditor Inteligente", MARGIN, y, 22, palette.ink);
  drawText(firstPage, fontRegular, `Panel administrativo de ${ZYTERON_COMPANY.legalName}`, MARGIN, y - 20, 10, palette.soft);
  drawText(
    firstPage,
    fontRegular,
    `Periodo ${data.selectedPeriod} · Generado ${new Date().toLocaleString("es-CL")}`,
    MARGIN,
    y - 34,
    9,
    palette.soft,
  );

  y -= 62;

  const cardWidth = (CONTENT_WIDTH - 24) / 4;
  drawCard({
    page: firstPage,
    x: MARGIN,
    y,
    width: cardWidth,
    height: 70,
    title: "Ingresos",
    value: formatCurrency(Number(data.summary.income_total || 0)),
    helper: `${data.summary.income_count || 0} documentos`,
    fill: palette.blueSoft,
    fontBold,
    fontRegular,
  });
  drawCard({
    page: firstPage,
    x: MARGIN + cardWidth + 8,
    y,
    width: cardWidth,
    height: 70,
    title: "Egresos",
    value: formatCurrency(Number(data.summary.expense_total || 0)),
    helper: `${data.summary.expense_count || 0} movimientos`,
    fill: palette.roseSoft,
    fontBold,
    fontRegular,
  });
  drawCard({
    page: firstPage,
    x: MARGIN + (cardWidth + 8) * 2,
    y,
    width: cardWidth,
    height: 70,
    title: "IVA balance",
    value: formatCurrency(Number(data.summary.iva_balance || 0)),
    helper: `Debito ${formatCurrency(Number(data.summary.iva_debito || 0))}`,
    fill: palette.amberSoft,
    fontBold,
    fontRegular,
  });
  drawCard({
    page: firstPage,
    x: MARGIN + (cardWidth + 8) * 3,
    y,
    width: cardWidth,
    height: 70,
    title: "Pendiente",
    value: formatCurrency(Number(data.summary.pending_total || 0)),
    helper: data.summary.declared_in_sii ? "Periodo declarado" : "Periodo abierto",
    fill: palette.greenSoft,
    fontBold,
    fontRegular,
  });

  y -= 98;
  drawSectionTitle(firstPage, fontBold, "Libro contable", `${data.transactions.length} filas del periodo`, y);
  y -= 18;

  drawRows({
    page: firstPage,
    fontBold,
    fontRegular,
    y,
    headers: ["Documento", "Categoria", "Estado", "Total"],
    rows: data.transactions.slice(0, 12).map((item) => [
      `${formatDate(item.document_date)} · ${item.document_number || item.id.slice(0, 8)}`,
      item.category,
      item.status,
      formatCurrency(Number(item.total || 0)),
    ]),
  });

  const secondPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = PAGE_HEIGHT - MARGIN;

  drawSectionTitle(secondPage, fontBold, "Alertas y trazabilidad", `Periodo ${data.selectedPeriod}`, y);
  y -= 24;

  drawRows({
    page: secondPage,
    fontBold,
    fontRegular,
    y,
    headers: ["Severidad", "Titulo", "Modulo", "Fecha"],
    rows: (data.alerts.length ? data.alerts : [{
      alert_key: "NONE",
      severity: "INFO",
      title: "Sin alertas abiertas",
      message: "",
      module: "system",
      created_at: new Date().toISOString(),
    }]).slice(0, 8).map((item) => [
      item.severity,
      item.title,
      item.module,
      formatDate(item.created_at),
    ]),
  });

  y -= 190;
  drawSectionTitle(secondPage, fontBold, "Proyectos auditables", `${data.projectTraceability.length} registros`, y);
  y -= 18;

  drawRows({
    page: secondPage,
    fontBold,
    fontRegular,
    y,
    headers: ["Proyecto", "Cliente", "OT/Cotizacion", "Pagado"],
    rows: data.projectTraceability.slice(0, 8).map((item) => [
      item.project_name,
      item.client_name || "Sin cliente",
      item.ot_number || item.quote_id || "Sin OT",
      formatCurrency(Number(item.paid_total || 0)),
    ]),
  });

  const thirdPage = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  y = PAGE_HEIGHT - MARGIN;

  drawSectionTitle(thirdPage, fontBold, "Respaldo documental", `${data.documents.length} archivos`, y);
  y -= 24;

  drawRows({
    page: thirdPage,
    fontBold,
    fontRegular,
    y,
    headers: ["Archivo", "Tipo", "Proyecto", "Fecha"],
    rows: data.documents.slice(0, 12).map((item) => [
      item.file_name,
      item.document_kind,
      item.project_name || "Sin proyecto",
      formatDate(item.document_date || item.created_at),
    ]),
  });

  [firstPage, secondPage, thirdPage].forEach((page, index) => {
    const text = `Zyteron · Contador Auditor Inteligente · Pagina ${index + 1}`;
    drawText(page, fontRegular, text, MARGIN, 18, 8, palette.soft);
  });

  return pdf.save();
}
