import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { ZYTERON_COMPANY } from "@/lib/company";
import { currencyCLP } from "@/lib/admin/quote";

export type WorkOrderPdfLineItem = {
  description: string;
  detail?: string | null;
  qty?: number | null;
  unit?: string | null;
  unitPrice?: number | null;
  total?: number | null;
};

type WorkOrderPdfInput = {
  code: string;
  title: string;
  sourceLabel: string;
  statusLabel: string;
  priorityLabel: string;
  clientName: string;
  clientCompany?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  budget?: number | null;
  plannedDate?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
  notes?: string | null;
  description?: string | null;
  scope: string[];
  quoteNumber?: string | null;
  paymentMethod?: string | null;
  paymentTerms?: string | null;
  validUntil?: string | null;
  lineItems?: WorkOrderPdfLineItem[];
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 34;
const HEADER_HEIGHT = 102;
const FOOTER_HEIGHT = 52;

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = String(text || "").split(/\r?\n/);
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }

    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next;
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }
    if (line) lines.push(line);
  }

  return lines.length ? lines : [""];
}

function safeText(value?: string | null, fallback = "—") {
  const normalized = String(value || "").trim();
  return normalized.length ? normalized : fallback;
}

export async function generateWorkOrderPdf(input: WorkOrderPdfInput) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const contentTop = PAGE_HEIGHT - HEADER_HEIGHT - 14;
  const contentBottom = MARGIN_X + FOOTER_HEIGHT;
  const contentWidth = PAGE_WIDTH - MARGIN_X * 2;

  const drawHeader = (target: PDFPage, pageIndex: number) => {
    target.drawRectangle({ x: 0, y: PAGE_HEIGHT - HEADER_HEIGHT, width: PAGE_WIDTH, height: HEADER_HEIGHT, color: rgb(0.06, 0.11, 0.22) });
    target.drawRectangle({ x: PAGE_WIDTH - 170, y: PAGE_HEIGHT - HEADER_HEIGHT, width: 170, height: HEADER_HEIGHT, color: rgb(0.06, 0.37, 1), opacity: 0.85 });

    target.drawText("ORDEN DE TRABAJO", {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 48,
      size: 16,
      font: bold,
      color: rgb(1, 1, 1),
    });

    target.drawText(`${ZYTERON_COMPANY.brandName} · ${ZYTERON_COMPANY.legalName}`, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 66,
      size: 9,
      font: regular,
      color: rgb(0.86, 0.92, 1),
    });

    const code = input.code || "OT";
    const codeWidth = bold.widthOfTextAtSize(code, 13);
    target.drawText(code, {
      x: PAGE_WIDTH - MARGIN_X - codeWidth,
      y: PAGE_HEIGHT - 48,
      size: 13,
      font: bold,
      color: rgb(1, 1, 1),
    });

    target.drawText(`Emisión OT: ${dateLabel(input.createdAt)}`, {
      x: PAGE_WIDTH - MARGIN_X - 150,
      y: PAGE_HEIGHT - 66,
      size: 8.5,
      font: regular,
      color: rgb(0.88, 0.93, 1),
    });

    target.drawText(`Página ${pageIndex}`, {
      x: MARGIN_X,
      y: PAGE_HEIGHT - 84,
      size: 8,
      font: regular,
      color: rgb(0.82, 0.88, 0.95),
    });
  };

  const drawFooter = (target: PDFPage, pageIndex: number, totalPages: number) => {
    target.drawLine({
      start: { x: MARGIN_X, y: MARGIN_X + 22 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: MARGIN_X + 22 },
      thickness: 1,
      color: rgb(0.88, 0.91, 0.95),
    });

    target.drawText(`${ZYTERON_COMPANY.legalName} · ${ZYTERON_COMPANY.rut} · ${ZYTERON_COMPANY.email}`, {
      x: MARGIN_X,
      y: MARGIN_X + 10,
      size: 7.8,
      font: regular,
      color: rgb(0.45, 0.53, 0.62),
    });

    const pageText = `Página ${pageIndex} de ${totalPages}`;
    const pageWidth = regular.widthOfTextAtSize(pageText, 7.8);
    target.drawText(pageText, {
      x: PAGE_WIDTH - MARGIN_X - pageWidth,
      y: MARGIN_X + 10,
      size: 7.8,
      font: regular,
      color: rgb(0.45, 0.53, 0.62),
    });
  };

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    drawHeader(page, pages.length);
    y = contentTop;
  };

  const ensureSpace = (heightNeeded: number) => {
    if (y - heightNeeded < contentBottom) {
      newPage();
    }
  };

  const drawSectionTitle = (title: string) => {
    ensureSpace(24);
    page.drawText(title, {
      x: MARGIN_X,
      y,
      size: 10.5,
      font: bold,
      color: rgb(0.08, 0.1, 0.15),
    });
    y -= 16;
  };

  const drawParagraph = (text: string, size = 9, indent = 0) => {
    const lines = wrapText(text, regular, size, contentWidth - indent);
    for (const line of lines) {
      ensureSpace(size + 5);
      page.drawText(line, {
        x: MARGIN_X + indent,
        y,
        size,
        font: regular,
        color: rgb(0.24, 0.31, 0.4),
      });
      y -= size + 3;
    }
  };

  const drawBullet = (text: string) => {
    const lines = wrapText(text, regular, 9, contentWidth - 16);
    lines.forEach((line, index) => {
      ensureSpace(13);
      page.drawText(index === 0 ? `- ${line}` : `  ${line}`, {
        x: MARGIN_X + 6,
        y,
        size: 9,
        font: regular,
        color: rgb(0.24, 0.31, 0.4),
      });
      y -= 12;
    });
    y -= 1;
  };

  newPage();

  ensureSpace(98);
  page.drawRectangle({
    x: MARGIN_X,
    y: y - 94,
    width: contentWidth,
    height: 94,
    color: rgb(0.97, 0.98, 1),
    borderColor: rgb(0.85, 0.89, 0.95),
    borderWidth: 1,
  });

  page.drawText(input.title, {
    x: MARGIN_X + 10,
    y: y - 18,
    size: 12,
    font: bold,
    color: rgb(0.08, 0.1, 0.15),
  });

  const headerRows = [
    `Cliente: ${safeText(input.clientName)}`,
    `Empresa: ${safeText(input.clientCompany)}`,
    `Email: ${safeText(input.clientEmail)} · Tel: ${safeText(input.clientPhone)}`,
    `Origen: ${safeText(input.sourceLabel)} · Estado: ${safeText(input.statusLabel)} · Prioridad: ${safeText(input.priorityLabel)}`,
  ];

  let headerY = y - 34;
  headerRows.forEach((row) => {
    page.drawText(row, {
      x: MARGIN_X + 10,
      y: headerY,
      size: 8.8,
      font: regular,
      color: rgb(0.25, 0.3, 0.38),
    });
    headerY -= 13;
  });

  y -= 110;

  drawSectionTitle("Fechas y control");
  const controlRows = [
    `Fecha OT: ${dateLabel(input.createdAt)}`,
    `Inicio planificado: ${dateLabel(input.plannedDate)}`,
    `Fecha compromiso: ${dateLabel(input.dueDate)}`,
    `Presupuesto referencial: ${currencyCLP(input.budget || 0)}`,
    `Cotización vinculada: ${safeText(input.quoteNumber)}`,
    `Forma de pago: ${safeText(input.paymentMethod)}`,
    `Plazo de pago: ${safeText(input.paymentTerms)}`,
    `Validez cotización: ${dateLabel(input.validUntil)}`,
  ];
  controlRows.forEach((row) => drawParagraph(row, 8.8));
  y -= 6;

  drawSectionTitle("Descripción operativa");
  drawParagraph(
    safeText(
      input.description,
      "Ejecución operativa según alcance técnico definido, validando avances, entregables y conformidad del cliente.",
    ),
    9,
  );
  y -= 6;

  drawSectionTitle("Detalle del trabajo y entregables");
  const scope = input.scope.length > 0 ? input.scope : ["Sin alcance detallado."];
  scope.forEach((item) => drawBullet(item));
  y -= 6;

  if (Array.isArray(input.lineItems) && input.lineItems.length > 0) {
    drawSectionTitle("Partidas asociadas");

    input.lineItems.forEach((item, index) => {
      const title = `${index + 1}. ${safeText(item.description)}`;
      ensureSpace(22);
      page.drawText(title, {
        x: MARGIN_X,
        y,
        size: 9.3,
        font: bold,
        color: rgb(0.12, 0.18, 0.28),
      });
      y -= 12;

      const detail = safeText(item.detail, "Sin detalle adicional");
      drawParagraph(detail, 8.5, 8);

      const qty = typeof item.qty === "number" ? item.qty : 0;
      const unitPrice = typeof item.unitPrice === "number" ? item.unitPrice : 0;
      const lineTotal = typeof item.total === "number" ? item.total : qty * unitPrice;
      drawParagraph(
        `Cantidad: ${qty} ${safeText(item.unit, "unidad")} · Unitario: ${currencyCLP(unitPrice)} · Total: ${currencyCLP(lineTotal)}`,
        8.4,
        8,
      );
      y -= 2;
    });
  }

  if (input.notes) {
    y -= 4;
    drawSectionTitle("Notas internas");
    drawParagraph(input.notes, 9);
  }

  const totalPages = pages.length;
  pages.forEach((existingPage, index) => {
    drawFooter(existingPage, index + 1, totalPages);
  });

  return pdf.save();
}
