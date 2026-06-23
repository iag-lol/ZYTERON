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

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89; // A4
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Colors (Enterprise Palette)
const C_DARK = rgb(0.08, 0.12, 0.18); // Slate Very Dark
const C_ACCENT = rgb(0.12, 0.35, 0.75); // Cobalt Blue
const C_TEXT = rgb(0.2, 0.25, 0.32); // Slate text
const C_MUTED = rgb(0.45, 0.5, 0.55); // Muted text
const C_BORDER = rgb(0.88, 0.9, 0.93); // Light border
const C_BG_LIGHT = rgb(0.97, 0.98, 0.99); // Off-white/Gray
const C_WHITE = rgb(1, 1, 1);

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

function safeText(value?: string | null, fallback = "—") {
  const normalized = String(value || "").trim();
  return normalized.length ? normalized : fallback;
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

export async function generateWorkOrderPdf(input: WorkOrderPdfInput) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let y = 0;

  const rightAlign = (text: string, font: PDFFont, size: number, rightX: number) => {
    return rightX - font.widthOfTextAtSize(text, size);
  };

  const centerAlign = (text: string, font: PDFFont, size: number, x: number, width: number) => {
    return x + (width - font.widthOfTextAtSize(text, size)) / 2;
  };

  const drawHeader = (target: PDFPage) => {
    // Top Accent Line
    target.drawRectangle({ x: 0, y: PAGE_HEIGHT - 6, width: PAGE_WIDTH, height: 6, color: C_ACCENT });

    // Logo / Company Name
    target.drawText(ZYTERON_COMPANY.brandName.toUpperCase(), {
      x: MARGIN,
      y: PAGE_HEIGHT - 45,
      size: 22,
      font: bold,
      color: C_DARK,
    });
    target.drawText("INGENIERÍA Y DESARROLLO", {
      x: MARGIN,
      y: PAGE_HEIGHT - 58,
      size: 8,
      font: regular,
      color: C_MUTED,
    });

    // Document Title & Info (Right side)
    const title = "ORDEN DE TRABAJO";
    target.drawText(title, {
      x: rightAlign(title, bold, 18, PAGE_WIDTH - MARGIN),
      y: PAGE_HEIGHT - 42,
      size: 18,
      font: bold,
      color: C_ACCENT,
    });

    const code = input.code || "OT-0000";
    target.drawText(code, {
      x: rightAlign(code, bold, 12, PAGE_WIDTH - MARGIN),
      y: PAGE_HEIGHT - 60,
      size: 12,
      font: bold,
      color: C_DARK,
    });

    const dateStr = `Emitida el ${dateLabel(input.createdAt)}`;
    target.drawText(dateStr, {
      x: rightAlign(dateStr, regular, 9, PAGE_WIDTH - MARGIN),
      y: PAGE_HEIGHT - 72,
      size: 9,
      font: regular,
      color: C_MUTED,
    });

    // Header Divider
    target.drawLine({
      start: { x: MARGIN, y: PAGE_HEIGHT - 90 },
      end: { x: PAGE_WIDTH - MARGIN, y: PAGE_HEIGHT - 90 },
      thickness: 1,
      color: C_BORDER,
    });
  };

  const drawFooter = (target: PDFPage, pageIndex: number, totalPages: number) => {
    target.drawLine({
      start: { x: MARGIN, y: 50 },
      end: { x: PAGE_WIDTH - MARGIN, y: 50 },
      thickness: 1,
      color: C_BORDER,
    });

    target.drawText(`${ZYTERON_COMPANY.legalName} · RUT: ${ZYTERON_COMPANY.rut} · ${ZYTERON_COMPANY.email}`, {
      x: MARGIN,
      y: 35,
      size: 8,
      font: regular,
      color: C_MUTED,
    });

    const pageText = `Página ${pageIndex} de ${totalPages}`;
    target.drawText(pageText, {
      x: rightAlign(pageText, regular, 8, PAGE_WIDTH - MARGIN),
      y: 35,
      size: 8,
      font: regular,
      color: C_MUTED,
    });
  };

  const newPage = () => {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    drawHeader(page);
    y = PAGE_HEIGHT - 120;
  };

  const ensureSpace = (heightNeeded: number) => {
    if (y - heightNeeded < 70) {
      newPage();
    }
  };

  // Initialize first page
  newPage();

  // --- Title Section ---
  ensureSpace(40);
  page.drawText(input.title, {
    x: MARGIN,
    y: y,
    size: 14,
    font: bold,
    color: C_DARK,
  });
  y -= 25;

  // --- Client & OT Info Box (2 Columns) ---
  const boxHeight = 70;
  ensureSpace(boxHeight + 20);
  
  page.drawRectangle({
    x: MARGIN,
    y: y - boxHeight,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: C_BG_LIGHT,
    borderColor: C_BORDER,
    borderWidth: 1,
  });

  const col1X = MARGIN + 15;
  const col2X = MARGIN + CONTENT_WIDTH / 2 + 15;
  const boxY = y - 18;

  // Col 1: Client Info
  page.drawText("Datos del Cliente", { x: col1X, y: boxY, size: 9, font: bold, color: C_DARK });
  page.drawText(`Cliente: ${safeText(input.clientName)}`, { x: col1X, y: boxY - 14, size: 8.5, font: regular, color: C_TEXT });
  page.drawText(`Empresa: ${safeText(input.clientCompany)}`, { x: col1X, y: boxY - 26, size: 8.5, font: regular, color: C_TEXT });
  page.drawText(`Email: ${safeText(input.clientEmail)}`, { x: col1X, y: boxY - 38, size: 8.5, font: regular, color: C_TEXT });

  // Col 2: OT Info
  page.drawText("Detalles Operativos", { x: col2X, y: boxY, size: 9, font: bold, color: C_DARK });
  page.drawText(`Origen: ${safeText(input.sourceLabel)}`, { x: col2X, y: boxY - 14, size: 8.5, font: regular, color: C_TEXT });
  page.drawText(`Estado: ${safeText(input.statusLabel)}`, { x: col2X, y: boxY - 26, size: 8.5, font: regular, color: C_TEXT });
  page.drawText(`Prioridad: ${safeText(input.priorityLabel)}`, { x: col2X, y: boxY - 38, size: 8.5, font: regular, color: C_TEXT });

  y -= boxHeight + 25;

  // --- Grid Data Helper ---
  const drawDataGrid = (title: string, data: { label: string; value: string }[]) => {
    ensureSpace(30 + data.length * 15);
    page.drawText(title, { x: MARGIN, y: y, size: 11, font: bold, color: C_ACCENT });
    y -= 10;

    data.forEach((row, idx) => {
      const rowY = y - 15 * idx - 12;
      // Border top
      if (idx === 0) {
        page.drawLine({ start: { x: MARGIN, y: rowY + 12 }, end: { x: PAGE_WIDTH - MARGIN, y: rowY + 12 }, thickness: 1, color: C_BORDER });
      }
      
      page.drawRectangle({ x: MARGIN, y: rowY - 3, width: 140, height: 15, color: C_BG_LIGHT });
      page.drawText(row.label, { x: MARGIN + 5, y: rowY + 1, size: 8.5, font: bold, color: C_DARK });
      page.drawText(row.value, { x: MARGIN + 150, y: rowY + 1, size: 8.5, font: regular, color: C_TEXT });

      // Border bottom
      page.drawLine({ start: { x: MARGIN, y: rowY - 3 }, end: { x: PAGE_WIDTH - MARGIN, y: rowY - 3 }, thickness: 1, color: C_BORDER });
    });
    
    y -= data.length * 15 + 25;
  };

  drawDataGrid("Fechas y Condiciones", [
    { label: "Fecha Compromiso", value: dateLabel(input.dueDate) },
    { label: "Inicio Planificado", value: dateLabel(input.plannedDate) },
    { label: "Presupuesto Asignado", value: currencyCLP(input.budget || 0) },
    { label: "Cotización Vinculada", value: safeText(input.quoteNumber) },
    { label: "Condiciones de Pago", value: safeText(input.paymentTerms) },
    { label: "Medio de Pago", value: safeText(input.paymentMethod) },
  ]);

  // --- Description & Scope ---
  const drawSection = (title: string, lines: string[], isBullet = false) => {
    ensureSpace(30);
    page.drawText(title, { x: MARGIN, y: y, size: 11, font: bold, color: C_ACCENT });
    y -= 15;

    for (const item of lines) {
      const textLines = wrapText(item, regular, 9, CONTENT_WIDTH - (isBullet ? 15 : 0));
      for (let i = 0; i < textLines.length; i++) {
        ensureSpace(15);
        const text = isBullet && i === 0 ? `•  ${textLines[i]}` : (isBullet ? `    ${textLines[i]}` : textLines[i]);
        page.drawText(text, { x: MARGIN, y: y, size: 9, font: regular, color: C_TEXT });
        y -= 14;
      }
    }
    y -= 10;
  };

  drawSection("Descripción Operativa", [safeText(input.description, "Ejecución operativa según alcance técnico definido.")]);
  drawSection("Alcance y Entregables", input.scope.length > 0 ? input.scope : ["Sin alcance detallado registrado."], true);

  // --- Line Items Table ---
  if (Array.isArray(input.lineItems) && input.lineItems.length > 0) {
    ensureSpace(50);
    page.drawText("Detalle Económico / Partidas", { x: MARGIN, y: y, size: 11, font: bold, color: C_ACCENT });
    y -= 15;

    // Table Header
    page.drawRectangle({ x: MARGIN, y: y - 15, width: CONTENT_WIDTH, height: 18, color: C_DARK });
    
    const colDescX = MARGIN + 10;
    const colQtyX = MARGIN + 260;
    const colPriceX = MARGIN + 350;
    const colTotalX = MARGIN + 430;

    page.drawText("Descripción", { x: colDescX, y: y - 10, size: 8.5, font: bold, color: C_WHITE });
    page.drawText("Cant.", { x: colQtyX, y: y - 10, size: 8.5, font: bold, color: C_WHITE });
    page.drawText("P. Unitario", { x: colPriceX, y: y - 10, size: 8.5, font: bold, color: C_WHITE });
    page.drawText("Total", { x: colTotalX, y: y - 10, size: 8.5, font: bold, color: C_WHITE });

    y -= 15;

    // Table Rows
    input.lineItems.forEach((item, index) => {
      const qty = typeof item.qty === "number" ? item.qty : 0;
      const unitPrice = typeof item.unitPrice === "number" ? item.unitPrice : 0;
      const lineTotal = typeof item.total === "number" ? item.total : qty * unitPrice;

      const descLines = wrapText(safeText(item.description), bold, 8.5, 230);
      const detailLines = item.detail ? wrapText(item.detail, regular, 8, 230) : [];
      
      const rowHeight = (descLines.length + detailLines.length) * 12 + 10;
      ensureSpace(rowHeight);

      // Alternating background
      if (index % 2 === 0) {
        page.drawRectangle({ x: MARGIN, y: y - rowHeight, width: CONTENT_WIDTH, height: rowHeight, color: C_BG_LIGHT });
      }

      let textY = y - 12;
      
      // Values (Right aligned where needed)
      page.drawText(`${qty} ${safeText(item.unit, "un")}`, { x: colQtyX, y: textY, size: 8.5, font: regular, color: C_TEXT });
      page.drawText(currencyCLP(unitPrice), { x: colPriceX, y: textY, size: 8.5, font: regular, color: C_TEXT });
      page.drawText(currencyCLP(lineTotal), { x: colTotalX, y: textY, size: 8.5, font: bold, color: C_DARK });

      // Description & Details
      descLines.forEach((line) => {
        page.drawText(line, { x: colDescX, y: textY, size: 8.5, font: bold, color: C_DARK });
        textY -= 12;
      });
      detailLines.forEach((line) => {
        page.drawText(line, { x: colDescX, y: textY, size: 8, font: regular, color: C_MUTED });
        textY -= 12;
      });

      y -= rowHeight;
      
      // Row separator
      page.drawLine({ start: { x: MARGIN, y: y }, end: { x: PAGE_WIDTH - MARGIN, y: y }, thickness: 0.5, color: C_BORDER });
    });

    y -= 20;
  }

  // --- Notes ---
  if (input.notes) {
    drawSection("Notas Internas", [input.notes]);
  }

  // --- Approval / Signatures ---
  ensureSpace(60);
  y -= 25; // Add some breathing room before signatures

  const sigWidth = 180;
  const sigY = y;
  const sig1X = MARGIN + 40;
  const sig2X = PAGE_WIDTH - MARGIN - sigWidth - 40;

  // Client Signature
  page.drawLine({ start: { x: sig1X, y: sigY }, end: { x: sig1X + sigWidth, y: sigY }, thickness: 1, color: C_DARK });
  page.drawText("Aprobación Cliente", { x: centerAlign("Aprobación Cliente", bold, 9, sig1X, sigWidth), y: sigY - 14, size: 9, font: bold, color: C_DARK });
  page.drawText("Firma y Timbre", { x: centerAlign("Firma y Timbre", regular, 8, sig1X, sigWidth), y: sigY - 26, size: 8, font: regular, color: C_MUTED });

  // Company Signature
  page.drawLine({ start: { x: sig2X, y: sigY }, end: { x: sig2X + sigWidth, y: sigY }, thickness: 1, color: C_DARK });
  page.drawText(`Por ${ZYTERON_COMPANY.brandName}`, { x: centerAlign(`Por ${ZYTERON_COMPANY.brandName}`, bold, 9, sig2X, sigWidth), y: sigY - 14, size: 9, font: bold, color: C_DARK });
  page.drawText("Responsable Técnico", { x: centerAlign("Responsable Técnico", regular, 8, sig2X, sigWidth), y: sigY - 26, size: 8, font: regular, color: C_MUTED });


  // --- Apply Footers to all pages ---
  const totalPages = pages.length;
  pages.forEach((existingPage, index) => {
    drawFooter(existingPage, index + 1, totalPages);
  });

  return pdf.save();
}
