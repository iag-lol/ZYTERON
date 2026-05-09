import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { ZYTERON_COMPANY } from "@/lib/company";
import { currencyCLP } from "@/lib/admin/quote";

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
};

const width = 595.28;
const height = 841.89;
const margin = 34;

function dateLabel(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }

  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export async function generateWorkOrderPdf(input: WorkOrderPdfInput) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([width, height]);

  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({ x: 0, y: height - 120, width, height: 120, color: rgb(0.06, 0.11, 0.22) });
  page.drawRectangle({ x: width - 180, y: height - 120, width: 180, height: 120, color: rgb(0.06, 0.37, 1), opacity: 0.85 });

  page.drawText("ORDEN DE TRABAJO", {
    x: margin,
    y: height - 58,
    size: 18,
    font: bold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`${ZYTERON_COMPANY.brandName} · ${ZYTERON_COMPANY.legalName}`, {
    x: margin,
    y: height - 78,
    size: 10,
    font: regular,
    color: rgb(0.86, 0.92, 1),
  });

  const codeWidth = bold.widthOfTextAtSize(input.code, 14);
  page.drawText(input.code, {
    x: width - margin - codeWidth,
    y: height - 58,
    size: 14,
    font: bold,
    color: rgb(1, 1, 1),
  });

  page.drawText(`Emitida: ${dateLabel(input.createdAt)}`, {
    x: width - margin - 150,
    y: height - 78,
    size: 9,
    font: regular,
    color: rgb(0.88, 0.93, 1),
  });

  let y = height - 150;

  page.drawRectangle({
    x: margin,
    y: y - 88,
    width: width - margin * 2,
    height: 88,
    color: rgb(0.97, 0.98, 1),
    borderColor: rgb(0.85, 0.89, 0.95),
    borderWidth: 1,
  });

  page.drawText(input.title, {
    x: margin + 12,
    y: y - 24,
    size: 13,
    font: bold,
    color: rgb(0.08, 0.1, 0.15),
  });

  page.drawText(`Cliente: ${input.clientName}`, {
    x: margin + 12,
    y: y - 42,
    size: 10,
    font: regular,
    color: rgb(0.25, 0.3, 0.38),
  });

  page.drawText(`Empresa: ${input.clientCompany || "—"}`, {
    x: margin + 12,
    y: y - 56,
    size: 10,
    font: regular,
    color: rgb(0.25, 0.3, 0.38),
  });

  page.drawText(`Email: ${input.clientEmail || "—"} · Tel: ${input.clientPhone || "—"}`, {
    x: margin + 12,
    y: y - 70,
    size: 9,
    font: regular,
    color: rgb(0.35, 0.42, 0.5),
  });

  y -= 108;

  const cards = [
    { label: "Origen", value: input.sourceLabel },
    { label: "Estado", value: input.statusLabel },
    { label: "Prioridad", value: input.priorityLabel },
    { label: "Presupuesto", value: currencyCLP(input.budget || 0) },
    { label: "Inicio", value: dateLabel(input.plannedDate) },
    { label: "Entrega", value: dateLabel(input.dueDate) },
  ];

  const cardWidth = (width - margin * 2 - 16) / 3;
  cards.forEach((card, index) => {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const x = margin + col * (cardWidth + 8);
    const boxY = y - row * 54;
    page.drawRectangle({
      x,
      y: boxY - 48,
      width: cardWidth,
      height: 48,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.88, 0.91, 0.95),
      borderWidth: 1,
    });
    page.drawText(card.label, {
      x: x + 10,
      y: boxY - 18,
      size: 8.5,
      font: bold,
      color: rgb(0.45, 0.53, 0.62),
    });
    page.drawText(card.value, {
      x: x + 10,
      y: boxY - 34,
      size: 10,
      font: regular,
      color: rgb(0.08, 0.1, 0.15),
    });
  });

  y -= 124;

  page.drawText("Alcance y entregables", {
    x: margin,
    y,
    size: 11,
    font: bold,
    color: rgb(0.08, 0.1, 0.15),
  });

  y -= 18;
  const scopeItems = input.scope.length ? input.scope : ["Sin alcance detallado."];
  scopeItems.slice(0, 12).forEach((item) => {
    const lines = wrap(item, regular, 9.6, width - margin * 2 - 18);
    lines.forEach((line, lineIndex) => {
      const prefix = lineIndex === 0 ? "- " : "  ";
      page.drawText(`${prefix}${line}`, {
        x: margin + 8,
        y,
        size: 9.6,
        font: regular,
        color: rgb(0.23, 0.29, 0.36),
      });
      y -= 13;
    });
    y -= 1;
  });

  if (input.description) {
    y -= 6;
    page.drawText("Descripción operativa", {
      x: margin,
      y,
      size: 11,
      font: bold,
      color: rgb(0.08, 0.1, 0.15),
    });
    y -= 16;

    const descriptionLines = wrap(input.description, regular, 9.4, width - margin * 2);
    descriptionLines.slice(0, 9).forEach((line) => {
      page.drawText(line, {
        x: margin,
        y,
        size: 9.4,
        font: regular,
        color: rgb(0.23, 0.29, 0.36),
      });
      y -= 12;
    });
  }

  if (input.notes) {
    y -= 8;
    page.drawRectangle({
      x: margin,
      y: y - 66,
      width: width - margin * 2,
      height: 66,
      color: rgb(0.98, 0.99, 1),
      borderColor: rgb(0.87, 0.91, 0.96),
      borderWidth: 1,
    });

    page.drawText("Notas internas", {
      x: margin + 10,
      y: y - 16,
      size: 9,
      font: bold,
      color: rgb(0.35, 0.42, 0.5),
    });

    const noteLines = wrap(input.notes, regular, 9, width - margin * 2 - 20);
    noteLines.slice(0, 3).forEach((line, index) => {
      page.drawText(line, {
        x: margin + 10,
        y: y - 31 - index * 12,
        size: 9,
        font: regular,
        color: rgb(0.23, 0.29, 0.36),
      });
    });
  }

  page.drawLine({
    start: { x: margin, y: 72 },
    end: { x: width - margin, y: 72 },
    thickness: 1,
    color: rgb(0.88, 0.91, 0.95),
  });

  page.drawText(`${ZYTERON_COMPANY.legalName} · ${ZYTERON_COMPANY.rut} · ${ZYTERON_COMPANY.email}`, {
    x: margin,
    y: 56,
    size: 8.4,
    font: regular,
    color: rgb(0.45, 0.53, 0.62),
  });

  page.drawText("Documento operacional interno", {
    x: margin,
    y: 43,
    size: 8,
    font: bold,
    color: rgb(0.55, 0.62, 0.69),
  });

  return pdf.save();
}
