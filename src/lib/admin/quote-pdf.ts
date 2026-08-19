import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { ZYTERON_COMPANY } from "@/lib/company";
import { siteConfig } from "@/config/site";
import { buildDefaultQuoteTerms, currencyCLP, type QuoteLineItem, type QuoteMeta } from "@/lib/admin/quote";

/**
 * Cotización comercial en una sola hoja A4.
 *
 * Este documento se comparte con clientes: todo el diseño está al servicio de
 * que la propuesta se lea completa de un vistazo. La página se arma en tres
 * zonas — encabezado con marca, detalle de servicios, y cierre comercial con
 * totales y datos de pago — y la tabla es la única zona elástica: si los
 * servicios no caben, los últimos se consolidan en una fila con su suma para
 * no pasar nunca a una segunda hoja.
 */

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
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const colors = {
  ink: rgb(0.063, 0.094, 0.157),
  navy: rgb(0.059, 0.09, 0.165),
  accent: rgb(0.059, 0.373, 1),
  accentDark: rgb(0.043, 0.227, 0.643),
  slate: rgb(0.392, 0.455, 0.545),
  muted: rgb(0.58, 0.64, 0.72),
  hairline: rgb(0.886, 0.91, 0.941),
  soft: rgb(0.973, 0.98, 0.988),
  softBlue: rgb(0.937, 0.957, 1),
  white: rgb(1, 1, 1),
} as const;

/** Tres paradas del degradado del logo: teal → cian → azul. */
const GRADIENT_STOPS: Array<[number, number, number]> = [
  [45, 212, 191],
  [34, 184, 230],
  [37, 99, 235],
];

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

/**
 * Helvetica estándar solo codifica WinAnsi: un carácter fuera de ese set hace
 * lanzar a pdf-lib y aborta el documento entero. Los textos de la cotización
 * incluyen contenido escrito a mano por el administrador, así que todo pasa
 * por aquí antes de dibujarse.
 */
const CHAR_REPLACEMENTS: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "✓": "si",
  "✔": "si",
  "•": "·",
  " ": " ",
  " ": " ",
  " ": " ",
  "−": "-",
  "⁤": "",
  "️": "",
};

const encodableCache = new Map<string, boolean>();

function sanitizeText(value: string, font: PDFFont): string {
  let result = "";
  for (const char of value.replace(/\r\n?/g, "\n")) {
    const mapped = CHAR_REPLACEMENTS[char];
    if (mapped !== undefined) {
      result += mapped;
      continue;
    }
    if (char === "\n" || char === "\t") {
      result += char === "\t" ? " " : "\n";
      continue;
    }
    let ok = encodableCache.get(char);
    if (ok === undefined) {
      try {
        font.widthOfTextAtSize(char, 10);
        ok = true;
      } catch {
        ok = false;
      }
      encodableCache.set(char, ok);
    }
    result += ok ? char : "?";
  }
  return result;
}

/**
 * Para textos de UNA línea: un salto de línea que llegue a widthOfTextAtSize
 * o drawText hace lanzar a pdf-lib ("WinAnsi cannot encode 0x0A") y aborta el
 * documento completo. Todo lo que no pase por wrapText usa esta variante.
 */
function sanitizeInline(value: string, font: PDFFont): string {
  return sanitizeText(value, font).replace(/\n+/g, " ").trim();
}

function safeText(value?: string | null, fallback = "") {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

/**
 * "2026-09-18" sin hora se parsea como medianoche UTC, que en Chile es el día
 * anterior: la cotización mostraría una fecha corrida. Las fechas de solo día
 * se interpretan como fecha local.
 */
function parseDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  return new Date(value);
}

function formatDateLong(value?: string | null): string {
  const date = value ? parseDate(value) : new Date();
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "long", year: "numeric" }).format(safe);
}

function formatDateShort(value?: string | null): string | null {
  if (!value) return null;
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "1";
  return Number.isInteger(value) ? String(value) : value.toLocaleString("es-CL", { maximumFractionDigits: 2 });
}

function itemTotal(item: QuoteLineItem) {
  const qty = Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 1;
  const unit = Number.isFinite(item.unitPrice) ? item.unitPrice : 0;
  const discount = Number.isFinite(item.discountPct ?? 0) ? (item.discountPct ?? 0) : 0;
  return Math.round(qty * unit * (1 - Math.min(Math.max(discount, 0), 100) / 100));
}

function valueNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function splitLongWord(word: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const parts: string[] = [];
  let current = "";
  for (const char of word) {
    const candidate = current + char;
    if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && current.length > 0) {
      parts.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) parts.push(current);
  return parts;
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of sanitizeText(text, font).split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let current = "";
    for (const word of words) {
      const pieces =
        font.widthOfTextAtSize(word, fontSize) > maxWidth
          ? splitLongWord(word, font, fontSize, maxWidth)
          : [word];
      for (const piece of pieces) {
        const candidate = current.length > 0 ? `${current} ${piece}` : piece;
        if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && current.length > 0) {
          lines.push(current);
          current = piece;
        } else {
          current = candidate;
        }
      }
    }
    if (current.length > 0) lines.push(current);
  }
  return lines;
}

function ellipsize(text: string, font: PDFFont, fontSize: number, maxWidth: number): string {
  const clean = sanitizeInline(text, font);
  if (font.widthOfTextAtSize(clean, fontSize) <= maxWidth) return clean;
  let result = clean;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}…`, fontSize) > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

type DrawArgs = {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  font: PDFFont;
  size: number;
  color: Color;
};

function drawText({ page, text, x, y, font, size, color }: DrawArgs) {
  page.drawText(sanitizeInline(text, font), { x, y, size, font, color });
}

function drawTextRight({ page, text, x, y, font, size, color }: DrawArgs) {
  const clean = sanitizeInline(text, font);
  const width = font.widthOfTextAtSize(clean, size);
  page.drawText(clean, { x: x - width, y, size, font, color });
}

/** Texto con interletrado manual; pdf-lib no ofrece letter-spacing. */
function drawTracked(args: DrawArgs & { tracking: number; align?: "left" | "right" }) {
  const { page, x, y, font, size, color, tracking } = args;
  const clean = sanitizeInline(args.text, font);
  const chars = [...clean];
  const total =
    chars.reduce((acc, char) => acc + font.widthOfTextAtSize(char, size), 0) +
    tracking * Math.max(chars.length - 1, 0);
  let cursor = args.align === "right" ? x - total : x;
  for (const char of chars) {
    page.drawText(char, { x: cursor, y, size, font, color });
    cursor += font.widthOfTextAtSize(char, size) + tracking;
  }
  return total;
}

function drawTextLines(args: {
  page: PDFPage;
  lines: string[];
  x: number;
  y: number;
  font: PDFFont;
  size: number;
  lineHeight: number;
  color: Color;
}) {
  let cursor = args.y;
  for (const line of args.lines) {
    args.page.drawText(line, { x: args.x, y: cursor, size: args.size, font: args.font, color: args.color });
    cursor -= args.lineHeight;
  }
  return cursor;
}

function drawHairline(page: PDFPage, x: number, y: number, width: number, color: Color = colors.hairline) {
  page.drawRectangle({ x, y, width, height: 0.7, color });
}

/**
 * Banda con el degradado de marca, simulada con segmentos: pdf-lib no dibuja
 * degradados nativos.
 */
function drawGradientBand(page: PDFPage, x: number, y: number, width: number, height: number) {
  const segments = 64;
  const segmentWidth = width / segments;
  for (let i = 0; i < segments; i += 1) {
    const t = i / (segments - 1);
    const scaled = t * (GRADIENT_STOPS.length - 1);
    const idx = Math.min(Math.floor(scaled), GRADIENT_STOPS.length - 2);
    const local = scaled - idx;
    const from = GRADIENT_STOPS[idx];
    const to = GRADIENT_STOPS[idx + 1];
    const channel = (a: number, b: number) => (a + (b - a) * local) / 255;
    page.drawRectangle({
      // Los segmentos se solapan medio punto para que no queden costuras.
      x: x + i * segmentWidth,
      y,
      width: segmentWidth + (i < segments - 1 ? 0.5 : 0),
      height,
      color: rgb(channel(from[0], to[0]), channel(from[1], to[1]), channel(from[2], to[2])),
    });
  }
}

// ---------------------------------------------------------------------------
// Logo
// ---------------------------------------------------------------------------

let logoBytesCache: Uint8Array | null | undefined;

/**
 * El logo se incrusta desde el PNG de 512px del sitio. pdf-lib no acepta SVG,
 * y este PNG ya existe, pesa 18 KB y se ve nítido al tamaño del encabezado.
 */
async function loadLogoBytes(): Promise<Uint8Array | null> {
  if (logoBytesCache !== undefined) return logoBytesCache;
  try {
    const [{ readFile }, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);
    const bytes = await readFile(path.join(process.cwd(), "public", "icon-512.png"));
    logoBytesCache = new Uint8Array(bytes);
  } catch {
    logoBytesCache = null;
  }
  return logoBytesCache;
}

function drawLogo(page: PDFPage, image: PDFImage | null, fontBold: PDFFont, x: number, y: number, size: number) {
  if (image) {
    page.drawImage(image, { x, y, width: size, height: size });
    return;
  }
  // Sin logo disponible, un monograma sobrio evita un hueco en el encabezado.
  page.drawEllipse({
    x: x + size / 2,
    y: y + size / 2,
    xScale: size / 2,
    yScale: size / 2,
    color: colors.accent,
  });
  const letter = "Z";
  const letterSize = size * 0.52;
  const width = fontBold.widthOfTextAtSize(letter, letterSize);
  page.drawText(letter, {
    x: x + (size - width) / 2,
    y: y + size * 0.28,
    size: letterSize,
    font: fontBold,
    color: colors.white,
  });
}

// ---------------------------------------------------------------------------
// Zonas del documento
// ---------------------------------------------------------------------------

type Fonts = { regular: PDFFont; bold: PDFFont };

function resolveQuoteNumber(input: QuotePdfInput): string {
  return (
    safeText(input.meta.quoteNumber) ||
    safeText(input.meta.quoteCode) ||
    `COT-${input.quoteId.replace(/-/g, "").slice(0, 8).toUpperCase()}`
  );
}

function drawHeader(page: PDFPage, fonts: Fonts, input: QuotePdfInput, logo: PDFImage | null): number {
  drawGradientBand(page, 0, PAGE_HEIGHT - 5, PAGE_WIDTH, 5);

  const logoSize = 46;
  const logoTop = PAGE_HEIGHT - 5 - 22;
  drawLogo(page, logo, fonts.bold, MARGIN, logoTop - logoSize, logoSize);

  const brandX = MARGIN + logoSize + 12;
  drawTracked({
    page,
    text: "ZYTERON",
    x: brandX,
    y: logoTop - 17,
    font: fonts.bold,
    size: 18,
    color: colors.navy,
    tracking: 2.4,
  });
  drawText({
    page,
    text: "Desarrollo web y soluciones tecnológicas empresariales",
    x: brandX,
    y: logoTop - 30,
    font: fonts.regular,
    size: 7.6,
    color: colors.slate,
  });
  drawText({
    page,
    text: `${siteConfig.url.replace(/^https?:\/\//, "")} · ${ZYTERON_COMPANY.salesEmail} · ${siteConfig.contact.phoneDisplay}`,
    x: brandX,
    y: logoTop - 41,
    font: fonts.regular,
    size: 7.2,
    color: colors.muted,
  });

  const rightX = PAGE_WIDTH - MARGIN;
  drawTracked({
    page,
    text: "COTIZACIÓN",
    x: rightX,
    y: logoTop - 12,
    font: fonts.bold,
    size: 9.5,
    color: colors.slate,
    tracking: 3,
    align: "right",
  });
  drawTextRight({
    page,
    text: ellipsize(resolveQuoteNumber(input), fonts.bold, 15, 210),
    x: rightX,
    y: logoTop - 29,
    font: fonts.bold,
    size: 15,
    color: colors.navy,
  });
  drawTextRight({
    page,
    text: `Emitida el ${formatDateLong(input.meta.quoteDate ?? input.createdAt)}`,
    x: rightX,
    y: logoTop - 41,
    font: fonts.regular,
    size: 7.6,
    color: colors.slate,
  });

  const validUntil = formatDateShort(input.meta.validUntil) ? formatDateLong(input.meta.validUntil) : null;
  const validityDays = safeText(input.meta.validityDays);
  const chipText = ellipsize(
    validUntil
      ? `Válida hasta el ${validUntil}`
      : `Válida por ${validityDays || "30 días"} desde su emisión`,
    fonts.bold,
    7.4,
    190,
  );
  const chipTextWidth = fonts.bold.widthOfTextAtSize(sanitizeInline(chipText, fonts.bold), 7.4);
  const chipWidth = chipTextWidth + 16;
  const chipY = logoTop - 60;
  page.drawRectangle({
    x: rightX - chipWidth,
    y: chipY,
    width: chipWidth,
    height: 15,
    color: colors.softBlue,
    borderColor: colors.accent,
    borderWidth: 0.6,
  });
  drawText({
    page,
    text: chipText,
    x: rightX - chipWidth + 8,
    y: chipY + 4.4,
    font: fonts.bold,
    size: 7.4,
    color: colors.accentDark,
  });

  const headerBottom = logoTop - logoSize - 14;
  drawHairline(page, MARGIN, headerBottom, CONTENT_WIDTH);
  return headerBottom - 12;
}

type PartyColumn = { label: string; name: string; rows: string[] };

function drawParties(page: PDFPage, fonts: Fonts, input: QuotePdfInput, top: number): number {
  const clientCompany = safeText(input.clientCompany);
  const clientName = safeText(input.clientName, "Cliente");
  const clientContact = safeText(input.meta.clientContact);

  const compactAddress = siteConfig.address.display.split(", Región")[0];
  const issuer: PartyColumn = {
    label: "EMISOR",
    name: ZYTERON_COMPANY.legalName,
    rows: [
      `RUT ${ZYTERON_COMPANY.rut}`,
      "Servicios de informática y desarrollo de software",
      compactAddress,
    ],
  };
  const client: PartyColumn = {
    label: "PREPARADA PARA",
    name: clientCompany || clientName,
    rows: [
      clientCompany ? (clientContact || clientName) : clientContact,
      input.meta.clientRut ? `RUT ${input.meta.clientRut}` : "",
      [safeText(input.meta.clientAddress), safeText(input.meta.clientCity)].filter(Boolean).join(", "),
      [safeText(input.clientEmail), safeText(input.clientPhone)].filter(Boolean).join(" · "),
    ].filter(Boolean),
  };

  const panelHeight = 84;
  page.drawRectangle({
    x: MARGIN,
    y: top - panelHeight,
    width: CONTENT_WIDTH,
    height: panelHeight,
    color: colors.soft,
    borderColor: colors.hairline,
    borderWidth: 0.7,
  });
  const columnWidth = CONTENT_WIDTH / 2;
  page.drawRectangle({
    x: MARGIN + columnWidth,
    y: top - panelHeight + 10,
    width: 0.7,
    height: panelHeight - 20,
    color: colors.hairline,
  });

  const columns: Array<{ column: PartyColumn; x: number }> = [
    { column: issuer, x: MARGIN + 14 },
    { column: client, x: MARGIN + columnWidth + 14 },
  ];
  const textWidth = columnWidth - 28;
  for (const { column, x } of columns) {
    drawTracked({
      page,
      text: column.label,
      x,
      y: top - 17,
      font: fonts.bold,
      size: 6.8,
      color: colors.accent,
      tracking: 1.4,
    });
    drawText({
      page,
      text: ellipsize(column.name, fonts.bold, 9.8, textWidth),
      x,
      y: top - 31,
      font: fonts.bold,
      size: 9.8,
      color: colors.ink,
    });
    let rowY = top - 43;
    for (const row of column.rows.slice(0, 4)) {
      drawText({
        page,
        text: ellipsize(row, fonts.regular, 7.4, textWidth),
        x,
        y: rowY,
        font: fonts.regular,
        size: 7.4,
        color: colors.slate,
      });
      rowY -= 10.2;
    }
  }

  return top - panelHeight - 14;
}

function drawSummary(page: PDFPage, fonts: Fonts, notes: string, top: number): number {
  const lines = wrapText(notes, fonts.regular, 8, CONTENT_WIDTH - 14).slice(0, 2);
  if (lines.length === 0) return top;
  page.drawRectangle({ x: MARGIN, y: top - 12 - lines.length * 10.6, width: 2.4, height: 8 + lines.length * 10.6, color: colors.accent });
  drawTracked({
    page,
    text: "RESUMEN DE LA PROPUESTA",
    x: MARGIN + 10,
    y: top - 10,
    font: fonts.bold,
    size: 6.8,
    color: colors.slate,
    tracking: 1.4,
  });
  drawTextLines({
    page,
    lines,
    x: MARGIN + 10,
    y: top - 21,
    font: fonts.regular,
    size: 8,
    lineHeight: 10.6,
    color: colors.ink,
  });
  return top - 21 - lines.length * 10.6 - 4;
}

// ---------------------------------------------------------------------------
// Tabla de servicios
// ---------------------------------------------------------------------------

type TableColumn = { label: string; width: number; align: "left" | "right" };

type MeasuredRow = {
  item: QuoteLineItem;
  titleLines: string[];
  detailLines: string[];
  height: number;
};

function buildColumns(hasDiscounts: boolean): TableColumn[] {
  const discountWidth = hasDiscounts ? CONTENT_WIDTH * 0.08 : 0;
  return [
    { label: "DESCRIPCIÓN", width: CONTENT_WIDTH * (hasDiscounts ? 0.5 : 0.58), align: "left" },
    { label: "CANT.", width: CONTENT_WIDTH * 0.09, align: "right" },
    { label: "PRECIO UNIT.", width: CONTENT_WIDTH * 0.15, align: "right" },
    ...(hasDiscounts ? [{ label: "DCTO.", width: discountWidth, align: "right" as const }] : []),
    { label: "TOTAL", width: CONTENT_WIDTH * 0.18, align: "right" },
  ];
}

function measureRow(item: QuoteLineItem, fonts: Fonts, descriptionWidth: number): MeasuredRow {
  const titleLines = wrapText(safeText(item.description, "Servicio"), fonts.bold, 8.6, descriptionWidth).slice(0, 2);
  const detailLines = safeText(item.detail)
    ? wrapText(item.detail as string, fonts.regular, 7.2, descriptionWidth).slice(0, 2)
    : [];
  const textHeight = titleLines.length * 10.4 + detailLines.length * 8.8;
  return { item, titleLines, detailLines, height: Math.max(21, textHeight + 11) };
}

function drawItemsTable(
  page: PDFPage,
  fonts: Fonts,
  items: QuoteLineItem[],
  top: number,
  bottomLimit: number,
): number {
  const hasDiscounts = items.some((item) => (item.discountPct ?? 0) > 0);
  const columns = buildColumns(hasDiscounts);
  const descriptionWidth = columns[0].width - 20;

  drawTracked({ page, text: "DETALLE DE SERVICIOS", x: MARGIN, y: top, font: fonts.bold, size: 6.8, color: colors.accent, tracking: 1.4 });
  let y = top - 13;

  const headerHeight = 19;
  page.drawRectangle({ x: MARGIN, y: y - headerHeight, width: CONTENT_WIDTH, height: headerHeight, color: colors.navy });
  let headerX = MARGIN;
  for (const column of columns) {
    const textY = y - headerHeight + 6;
    if (column.align === "left") {
      drawTracked({ page, text: column.label, x: headerX + 10, y: textY, font: fonts.bold, size: 6.8, color: colors.white, tracking: 0.9 });
    } else {
      drawTracked({ page, text: column.label, x: headerX + column.width - 10, y: textY, font: fonts.bold, size: 6.8, color: colors.white, tracking: 0.9, align: "right" });
    }
    headerX += column.width;
  }
  y -= headerHeight;

  if (items.length === 0) {
    page.drawRectangle({ x: MARGIN, y: y - 24, width: CONTENT_WIDTH, height: 24, color: colors.soft, borderColor: colors.hairline, borderWidth: 0.7 });
    drawText({ page, text: "El detalle de servicios se encuentra en preparación.", x: MARGIN + 10, y: y - 15, font: fonts.regular, size: 8, color: colors.slate });
    return y - 24;
  }

  const measured = items.map((item) => measureRow(item, fonts, descriptionWidth));
  const consolidatedRowHeight = 21;

  // Se dibujan las filas que caben; el resto se consolida en una sola con su
  // suma, para que la cotización jamás pase de una hoja.
  let visibleCount = 0;
  let used = 0;
  for (let i = 0; i < measured.length; i += 1) {
    const remainingNeedsConsolidation = i < measured.length - 1;
    const reserve = remainingNeedsConsolidation ? consolidatedRowHeight : 0;
    if (y - (used + measured[i].height + reserve) < bottomLimit) break;
    used += measured[i].height;
    visibleCount += 1;
  }
  if (visibleCount === 0) visibleCount = 1;

  const visible = measured.slice(0, visibleCount);
  const consolidated = measured.slice(visibleCount);

  for (let i = 0; i < visible.length; i += 1) {
    const row = visible[i];
    if (i % 2 === 1) {
      page.drawRectangle({ x: MARGIN, y: y - row.height, width: CONTENT_WIDTH, height: row.height, color: colors.soft });
    }

    let x = MARGIN;
    const firstBaseline = y - 13.6;
    drawTextLines({ page, lines: row.titleLines, x: x + 10, y: firstBaseline, font: fonts.bold, size: 8.6, lineHeight: 10.4, color: colors.ink });
    if (row.detailLines.length > 0) {
      drawTextLines({
        page,
        lines: row.detailLines,
        x: x + 10,
        y: firstBaseline - row.titleLines.length * 10.4 + 1,
        font: fonts.regular,
        size: 7.2,
        lineHeight: 8.8,
        color: colors.slate,
      });
    }
    x += columns[0].width;

    const qty = ellipsize(
      `${formatQty(row.item.qty || 1)}${safeText(row.item.unit) ? ` ${safeText(row.item.unit)}` : ""}`,
      fonts.regular,
      8.2,
      columns[1].width - 12,
    );
    const cells: string[] = [qty, currencyCLP(row.item.unitPrice || 0)];
    if (hasDiscounts) cells.push((row.item.discountPct ?? 0) > 0 ? `${row.item.discountPct}%` : "—");
    cells.push(currencyCLP(itemTotal(row.item)));

    for (let c = 0; c < cells.length; c += 1) {
      const column = columns[c + 1];
      const isTotal = c === cells.length - 1;
      drawTextRight({
        page,
        text: cells[c],
        x: x + column.width - 10,
        y: firstBaseline,
        font: isTotal ? fonts.bold : fonts.regular,
        size: isTotal ? 8.6 : 8.2,
        color: isTotal ? colors.ink : colors.slate,
      });
      x += column.width;
    }

    y -= row.height;
    drawHairline(page, MARGIN, y, CONTENT_WIDTH);
  }

  if (consolidated.length > 0) {
    const sum = consolidated.reduce((acc, row) => acc + itemTotal(row.item), 0);
    page.drawRectangle({ x: MARGIN, y: y - consolidatedRowHeight, width: CONTENT_WIDTH, height: consolidatedRowHeight, color: colors.softBlue });
    drawText({
      page,
      text: `Servicios adicionales cotizados (${consolidated.length})`,
      x: MARGIN + 10,
      y: y - 14,
      font: fonts.bold,
      size: 8,
      color: colors.accentDark,
    });
    drawTextRight({
      page,
      text: currencyCLP(sum),
      x: MARGIN + CONTENT_WIDTH - 10,
      y: y - 14,
      font: fonts.bold,
      size: 8.6,
      color: colors.accentDark,
    });
    y -= consolidatedRowHeight;
    drawHairline(page, MARGIN, y, CONTENT_WIDTH);
  }

  return y;
}

// ---------------------------------------------------------------------------
// Cierre comercial: condiciones, transferencia, términos y totales
// ---------------------------------------------------------------------------

type Totals = { subtotal: number; discount: number; iva: number; total: number; includeIva: boolean };

function computeTotals(meta: QuoteMeta): Totals {
  const items = meta.items ?? [];
  const subtotalFallback = items.reduce((acc, item) => acc + itemTotal(item), 0);
  const subtotal = valueNumber(meta.subtotal, subtotalFallback);
  const discount = valueNumber(meta.totalDescuento, 0);
  const includeIva = meta.includeIva ?? true;
  const iva = valueNumber(meta.iva, includeIva ? Math.round(subtotal * (meta.ivaRate ?? 0.19)) : 0);
  // En toda la app subtotal ya es neto de descuentos y grandTotal = subtotal + iva.
  const total = valueNumber(meta.grandTotal, subtotal + iva);
  return { subtotal, discount, iva, total, includeIva };
}

const BOTTOM_LEFT_WIDTH = CONTENT_WIDTH * 0.56;
const BOTTOM_RIGHT_WIDTH = CONTENT_WIDTH - BOTTOM_LEFT_WIDTH - 16;

function termsLinesFor(meta: QuoteMeta, fonts: Fonts, maxLines: number): string[] {
  const source = safeText(meta.terms) || buildDefaultQuoteTerms(meta.includeIva ?? true);
  const lines = wrapText(source, fonts.regular, 6.6, BOTTOM_LEFT_WIDTH - 4);
  return lines.length > maxLines ? [...lines.slice(0, maxLines - 1), "…"] : lines;
}

/** Zona anclada al pie: términos a la izquierda, aceptación a la derecha. */
function measureTermsZone(meta: QuoteMeta, fonts: Fonts): { height: number; termsLines: string[] } {
  // 16 líneas alcanzan para los términos legales completos por defecto; ante
  // términos escritos a mano más largos, la tabla cede espacio consolidando.
  const termsLines = termsLinesFor(meta, fonts, 16);
  return { height: Math.max(12 + termsLines.length * 8.6, 50), termsLines };
}

/**
 * Zona que fluye pegada a la tabla, como en una factura: condiciones y datos
 * de transferencia a la izquierda, totales a la derecha.
 */
function measureMiddleZone(meta: QuoteMeta): number {
  const totals = computeTotals(meta);
  const rows = 1 + (totals.discount > 0 ? 1 : 0) + 1;
  const cardHeight = 10 + rows * 15 + 30 + 16;
  return Math.max(110, cardHeight + 14);
}

function drawMiddleZone(page: PDFPage, fonts: Fonts, input: QuotePdfInput, top: number) {
  const meta = input.meta;
  const totals = computeTotals(meta);
  const leftX = MARGIN;

  // Condiciones de pago
  let y = top;
  drawTracked({ page, text: "CONDICIONES DE PAGO", x: leftX, y: y - 9, font: fonts.bold, size: 6.8, color: colors.accent, tracking: 1.4 });
  drawText({
    page,
    text: ellipsize(`Forma de pago: ${safeText(meta.paymentMethod, "Transferencia bancaria")}`, fonts.regular, 7.6, BOTTOM_LEFT_WIDTH),
    x: leftX,
    y: y - 22,
    font: fonts.regular,
    size: 7.6,
    color: colors.ink,
  });
  if (safeText(meta.paymentTerms)) {
    drawText({
      page,
      text: ellipsize(`Plazo: ${safeText(meta.paymentTerms)}`, fonts.regular, 7.6, BOTTOM_LEFT_WIDTH),
      x: leftX,
      y: y - 33,
      font: fonts.regular,
      size: 7.6,
      color: colors.ink,
    });
  }
  y -= 46 + 8;

  // Datos para transferencia
  const transferHeight = 56;
  page.drawRectangle({
    x: leftX,
    y: y - transferHeight,
    width: BOTTOM_LEFT_WIDTH,
    height: transferHeight,
    color: colors.softBlue,
    borderColor: colors.accent,
    borderWidth: 0.6,
  });
  drawTracked({ page, text: "DATOS PARA TRANSFERENCIA", x: leftX + 10, y: y - 13, font: fonts.bold, size: 6.8, color: colors.accentDark, tracking: 1.4 });
  drawText({
    page,
    text: `${ZYTERON_COMPANY.transferBank} · ${ZYTERON_COMPANY.transferAccountType} N° ${ZYTERON_COMPANY.transferAccountNumber}`,
    x: leftX + 10,
    y: y - 26,
    font: fonts.regular,
    size: 7.6,
    color: colors.ink,
  });
  drawText({
    page,
    text: `${ZYTERON_COMPANY.legalName} · RUT ${ZYTERON_COMPANY.rut}`,
    x: leftX + 10,
    y: y - 37,
    font: fonts.regular,
    size: 7.6,
    color: colors.ink,
  });
  drawText({
    page,
    text: `Enviar comprobante a ${ZYTERON_COMPANY.transferAccountEmail}`,
    x: leftX + 10,
    y: y - 48,
    font: fonts.regular,
    size: 7.2,
    color: colors.slate,
  });

  // Totales
  const rightX = MARGIN + BOTTOM_LEFT_WIDTH + 16;
  const rows: Array<{ label: string; value: string }> = [
    { label: "Subtotal", value: currencyCLP(totals.subtotal) },
  ];
  // El subtotal ya viene con el descuento aplicado: la fila lo informa como
  // beneficio, sin volver a restarlo (Subtotal + IVA = TOTAL debe cuadrar).
  if (totals.discount > 0) rows.push({ label: "Incluye descuento ya aplicado", value: `-${currencyCLP(totals.discount)}` });
  rows.push(
    totals.includeIva
      ? { label: "IVA (19%)", value: currencyCLP(totals.iva) }
      : { label: "Impuestos", value: "Se aplican al facturar" },
  );

  const cardPadding = 10;
  const totalBlockHeight = 30;
  const cardHeight = cardPadding + rows.length * 15 + totalBlockHeight + 16;
  page.drawRectangle({
    x: rightX,
    y: top - cardHeight,
    width: BOTTOM_RIGHT_WIDTH,
    height: cardHeight,
    color: colors.white,
    borderColor: colors.hairline,
    borderWidth: 0.8,
  });

  let rowY = top - cardPadding - 10;
  for (const row of rows) {
    drawText({ page, text: row.label, x: rightX + 12, y: rowY, font: fonts.regular, size: 8, color: colors.slate });
    drawTextRight({ page, text: row.value, x: rightX + BOTTOM_RIGHT_WIDTH - 12, y: rowY, font: fonts.bold, size: 8.4, color: colors.ink });
    rowY -= 15;
  }

  const totalY = top - cardHeight + 16;
  page.drawRectangle({ x: rightX, y: totalY, width: BOTTOM_RIGHT_WIDTH, height: totalBlockHeight, color: colors.navy });
  page.drawRectangle({ x: rightX, y: totalY, width: 3, height: totalBlockHeight, color: colors.accent });
  drawTracked({ page, text: "TOTAL", x: rightX + 12, y: totalY + 11, font: fonts.bold, size: 8.4, color: colors.white, tracking: 1.6 });
  drawTextRight({ page, text: currencyCLP(totals.total), x: rightX + BOTTOM_RIGHT_WIDTH - 12, y: totalY + 10, font: fonts.bold, size: 13, color: colors.white });
  drawText({
    page,
    text: totals.includeIva ? "Valores en pesos chilenos (CLP), IVA incluido." : "Valores netos en pesos chilenos (CLP).",
    x: rightX + 2,
    y: totalY - 10,
    font: fonts.regular,
    size: 6.4,
    color: colors.muted,
  });
}

function drawTermsZone(page: PDFPage, fonts: Fonts, termsLines: string[], top: number) {
  drawTracked({ page, text: "TÉRMINOS Y CONDICIONES", x: MARGIN, y: top - 9, font: fonts.bold, size: 6.8, color: colors.slate, tracking: 1.4 });
  drawTextLines({ page, lines: termsLines, x: MARGIN, y: top - 20, font: fonts.regular, size: 6.6, lineHeight: 8.6, color: colors.slate });

  const rightX = MARGIN + BOTTOM_LEFT_WIDTH + 16;
  drawTracked({ page, text: "ACEPTACIÓN DEL CLIENTE", x: rightX + 2, y: top - 9, font: fonts.bold, size: 6.8, color: colors.slate, tracking: 1.4 });
  drawHairline(page, rightX + 2, top - 38, BOTTOM_RIGHT_WIDTH - 4, colors.muted);
  drawText({ page, text: "Nombre, RUT y firma", x: rightX + 2, y: top - 47, font: fonts.regular, size: 6.4, color: colors.muted });
}

function drawFooter(page: PDFPage, fonts: Fonts, quoteNumber: string) {
  drawHairline(page, MARGIN, 74, CONTENT_WIDTH);
  drawText({
    page,
    text: `${ZYTERON_COMPANY.legalName} · RUT ${ZYTERON_COMPANY.rut} · ${siteConfig.address.display}`,
    x: MARGIN,
    y: 62,
    font: fonts.regular,
    size: 6.6,
    color: colors.slate,
  });
  drawTextRight({
    page,
    text: siteConfig.url.replace(/^https?:\/\//, ""),
    x: PAGE_WIDTH - MARGIN,
    y: 62,
    font: fonts.bold,
    size: 6.6,
    color: colors.accent,
  });
  drawText({
    page,
    text: `Documento generado electrónicamente · ${quoteNumber} · Página 1 de 1`,
    x: MARGIN,
    y: 51,
    font: fonts.regular,
    size: 6.2,
    color: colors.muted,
  });
  drawTextRight({
    page,
    text: `${ZYTERON_COMPANY.salesEmail} · ${siteConfig.contact.phoneDisplay}`,
    x: PAGE_WIDTH - MARGIN,
    y: 51,
    font: fonts.regular,
    size: 6.2,
    color: colors.slate,
  });
  drawGradientBand(page, 0, 0, PAGE_WIDTH, 3);
}

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------

export async function generateQuotePdf(input: QuotePdfInput) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Cotización ${resolveQuoteNumber(input)} · Zyteron`);
  pdf.setAuthor(ZYTERON_COMPANY.legalName);
  pdf.setSubject("Cotización de servicios");
  pdf.setCreator("Zyteron");

  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  const logoBytes = await loadLogoBytes();
  let logo: PDFImage | null = null;
  if (logoBytes) {
    try {
      logo = await pdf.embedPng(logoBytes);
    } catch {
      logo = null;
    }
  }

  const page = pdf.addPage(PAGE_SIZE);

  let y = drawHeader(page, fonts, input, logo);
  y = drawParties(page, fonts, input, y);

  const notes = safeText(input.meta.notes);
  if (notes) y = drawSummary(page, fonts, notes, y);

  // Todo fluye de arriba hacia abajo; el espacio libre queda al final, como
  // en cualquier documento. La tabla recibe como límite el espacio mínimo que
  // exigen totales y términos sobre el pie de página.
  const terms = measureTermsZone(input.meta, fonts);
  const termsFloor = 84 + terms.height;
  const middleHeight = measureMiddleZone(input.meta);

  const tableEnd = drawItemsTable(page, fonts, input.meta.items ?? [], y, termsFloor + 14 + middleHeight + 16);
  let middleTop = tableEnd - 16;
  if (middleTop - middleHeight < termsFloor + 12) middleTop = termsFloor + 12 + middleHeight;
  drawMiddleZone(page, fonts, input, middleTop);
  const termsTop = Math.max(middleTop - middleHeight - 18, termsFloor);
  drawTermsZone(page, fonts, terms.termsLines, termsTop);
  drawFooter(page, fonts, resolveQuoteNumber(input));

  return pdf.save();
}
