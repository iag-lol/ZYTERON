import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { ZYTERON_COMPANY } from "@/lib/company";
import { siteConfig } from "@/config/site";
import { buildDefaultQuoteTerms, type QuoteMeta } from "@/lib/admin/quote";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT = 36;
const RIGHT = PAGE_WIDTH - 36;
const CONTENT_WIDTH = RIGHT - LEFT;
const BODY_BOTTOM = 62;
const BODY_SIZE = 8.5;
const BODY_LEADING = 11.5;

const navy = rgb(0.035, 0.075, 0.17);
const blue = rgb(0.055, 0.35, 0.93);
const teal = rgb(0.02, 0.72, 0.68);
const slate = rgb(0.32, 0.4, 0.53);
const lightSlate = rgb(0.54, 0.61, 0.7);
const line = rgb(0.84, 0.88, 0.93);
const soft = rgb(0.965, 0.975, 0.985);
const white = rgb(1, 1, 1);

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

const clean = (value?: string | null) =>
  (value ?? "")
    .split("")
    .map((character) => (character.charCodeAt(0) < 32 ? " " : character))
    .join("")
    .replace(/\s+/g, " ")
    .trim();

const formatDate = (value?: string | null) => {
  if (!value) return "No informada";
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00Z` : value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(parsed)
    .replaceAll("/", "-");
};

const money = (value: number, currency: string) => {
  const formatted = new Intl.NumberFormat("es-CL", {
    minimumFractionDigits: currency === "CLP" ? 0 : 2,
    maximumFractionDigits: currency === "CLP" ? 0 : 2,
  }).format(Math.abs(value));
  const sign = value < 0 ? "-" : "";
  if (currency === "CLP") return `${sign}$${formatted}`;
  if (currency === "USD") return `${sign}US$ ${formatted}`;
  return `${sign}UF ${formatted}`;
};

// Standard-font text is drawn without kerning by pdf-lib; measure the same glyph advances.
const textWidth = (value: string, font: PDFFont, size: number) =>
  Array.from(value).reduce(
    (width, character) => width + font.widthOfTextAtSize(character, size),
    0,
  );

const wrap = (value: string, font: PDFFont, size: number, maximumWidth: number) => {
  const lines: string[] = [];
  // Preserve intentional paragraph breaks while wrapping long URLs and account names.
  for (const paragraph of sanitizeText(value, font).split("\n")) {
    const words = clean(paragraph).split(" ").filter(Boolean);
    if (!words.length) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (textWidth(candidate, font, size) <= maximumWidth) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      let fragment = "";
      for (const character of word) {
        if (fragment && textWidth(fragment + character, font, size) > maximumWidth) {
          lines.push(fragment);
          fragment = "";
        }
        fragment += character;
      }
      current = fragment;
    }
    if (current) lines.push(current);
  }
  return lines;
};

const rightText = (
  page: PDFPage,
  value: string,
  x: number,
  y: number,
  width: number,
  font: PDFFont,
  size: number,
  color = navy,
) => {
  const safe = sanitizeInline(value, font);
  page.drawText(safe, { x: x + width - textWidth(safe, font, size), y, font, size, color });
};

let logoBytesCache: Uint8Array | null | undefined;

/**
 * pdf-lib no acepta SVG, así que el logo se incrusta desde PNG. Se prefiere
 * public/logo-cotizacion.png (el arte oficial de la marca a buena resolución);
 * si no existe, se usa el ícono del sitio para no dejar el encabezado vacío.
 */
async function loadLogoBytes(): Promise<Uint8Array | null> {
  if (logoBytesCache !== undefined) return logoBytesCache;
  const [{ readFile }, path] = await Promise.all([import("node:fs/promises"), import("node:path")]);
  for (const candidate of ["logo-cotizacion.png", "icon-512.png"]) {
    try {
      const bytes = await readFile(path.join(process.cwd(), "public", candidate));
      logoBytesCache = new Uint8Array(bytes);
      return logoBytesCache;
    } catch {
      // Se intenta el siguiente candidato.
    }
  }
  logoBytesCache = null;
  return logoBytesCache;
}

/** Dibuja el logo ajustado a la altura dada, sin deformarlo. Devuelve el ancho usado. */
function drawLogo(
  page: PDFPage,
  image: PDFImage | null,
  fontBold: PDFFont,
  x: number,
  y: number,
  size: number,
): number {
  if (image) {
    const ratio = image.width > 0 && image.height > 0 ? image.width / image.height : 1;
    const width = Math.min(size * ratio, size * 1.8);
    page.drawImage(image, { x, y, width, height: size });
    return width;
  }
  // Sin logo disponible, un monograma sobrio evita un hueco en el encabezado.
  page.drawEllipse({
    x: x + size / 2,
    y: y + size / 2,
    xScale: size / 2,
    yScale: size / 2,
    color: blue,
  });
  const letter = "Z";
  const letterSize = size * 0.52;
  const width = fontBold.widthOfTextAtSize(letter, letterSize);
  page.drawText(letter, {
    x: x + (size - width) / 2,
    y: y + size * 0.28,
    size: letterSize,
    font: fontBold,
    color: white,
  });
  return size;
}

const finite = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? value! : fallback;
const lineTotal = (item: QuoteMeta["items"][number]) =>
  Math.round(
    (Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 1) *
      finite(item.unitPrice, 0) *
      (1 - Math.min(Math.max(finite(item.discountPct, 0), 0), 100) / 100),
  );

export async function generateQuotePdf(input: QuotePdfInput) {
  const items = input.meta.items ?? [];
  const subtotal = finite(
    input.meta.subtotal,
    items.reduce((total, item) => total + lineTotal(item), 0),
  );
  const taxAmount = finite(
    input.meta.iva,
    input.meta.includeIva !== false ? Math.round(subtotal * (input.meta.ivaRate ?? 0.19)) : 0,
  );
  const quote = {
    quoteNumber:
      input.meta.quoteNumber?.trim() ||
      input.meta.quoteCode?.trim() ||
      `COT-${input.quoteId.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    companyName: input.clientCompany?.trim() || input.clientName,
    contactName: input.meta.clientContact?.trim() || (input.clientCompany ? input.clientName : ""),
    contactEmail: input.clientEmail,
    createdAt: input.meta.quoteDate || input.createdAt,
    validUntil: input.meta.validUntil,
    notes: input.meta.notes,
    paymentTerms: [
      `Forma de pago: ${input.meta.paymentMethod?.trim() || "Transferencia bancaria"}`,
      input.meta.paymentTerms?.trim() ? `Plazo: ${input.meta.paymentTerms.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    commercialTerms:
      input.meta.terms?.trim() || buildDefaultQuoteTerms(input.meta.includeIva ?? true),
    currency: "CLP",
    subtotal,
    discountTotal: finite(input.meta.totalDescuento, 0),
    taxRate: (input.meta.ivaRate ?? 0.19) * 100,
    taxAmount,
    totalAmount: finite(input.meta.grandTotal, subtotal + taxAmount),
    items: items.map((item) => ({
      description: [item.description, item.detail].filter(Boolean).join("\n"),
      quantity: Number.isFinite(item.qty) && item.qty > 0 ? item.qty : 1,
      unit: item.unit,
      unitPrice: finite(item.unitPrice, 0),
      discountPercent: item.discountPct,
      subtotal: lineTotal(item),
    })),
  };
  const recipient = {
    rut: input.meta.clientRut,
    address: [input.meta.clientAddress, input.meta.clientCity].filter(Boolean).join(", "),
    phone: input.clientPhone,
  };
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await loadLogoBytes();
  let logo: PDFImage | null = null;
  if (logoBytes) {
    try {
      logo = await pdf.embedPng(logoBytes);
    } catch {
      logo = null;
    }
  }
  const pages: PDFPage[] = [];
  const issuedAt = formatDate(quote.createdAt || new Date().toISOString());
  const issuer = {
    name: ZYTERON_COMPANY.legalName,
    rut: ZYTERON_COMPANY.rut,
    activity: "Servicios de informática y desarrollo de software",
    address: siteConfig.address.display.split(", Región")[0],
    website: siteConfig.url.replace(/^https?:\/\//, ""),
    email: ZYTERON_COMPANY.salesEmail,
    phone: siteConfig.contact.phoneDisplay,
  };

  pdf.setTitle(`Cotización ${quote.quoteNumber}`);
  pdf.setAuthor(issuer.name);
  pdf.setSubject(`Propuesta comercial para ${quote.companyName}`);
  pdf.setCreator("Zyteron · Cotizaciones V3");
  pdf.setKeywords(["cotización", quote.quoteNumber, quote.companyName]);

  const fittedRightText = (
    target: PDFPage,
    value: string,
    x: number,
    baseline: number,
    width: number,
    font: PDFFont,
    size: number,
    color = navy,
  ) => {
    const fittedSize = Math.min(
      size,
      (size * width) / Math.max(textWidth(sanitizeInline(value, font), font, size), 1),
    );
    rightText(target, value, x, baseline, width, font, fittedSize, color);
  };

  const header = (continuation = false) => {
    const current = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(current);
    current.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 5,
      width: PAGE_WIDTH * 0.46,
      height: 5,
      color: teal,
    });
    current.drawRectangle({
      x: PAGE_WIDTH * 0.46,
      y: PAGE_HEIGHT - 5,
      width: PAGE_WIDTH * 0.54,
      height: 5,
      color: blue,
    });
    if (continuation) {
      current.drawText("ZYTERON", {
        x: LEFT,
        y: PAGE_HEIGHT - 37,
        font: bold,
        size: 15,
        color: navy,
      });
      fittedRightText(current, quote.quoteNumber, 280, PAGE_HEIGHT - 35, RIGHT - 280, bold, 10);
      fittedRightText(
        current,
        "COTIZACIÓN · CONTINUACIÓN",
        280,
        PAGE_HEIGHT - 49,
        RIGHT - 280,
        regular,
        7,
        slate,
      );
    } else {
      drawLogo(current, logo, bold, LEFT, PAGE_HEIGHT - 81, 46);
      current.drawText("ZYTERON", {
        x: LEFT + 66,
        y: PAGE_HEIGHT - 43,
        font: bold,
        size: 20,
        color: navy,
      });
      current.drawText("Desarrollo web y soluciones tecnológicas", {
        x: LEFT + 66,
        y: PAGE_HEIGHT - 58,
        font: regular,
        size: 7.2,
        color: slate,
      });
      current.drawText(issuer.website, {
        x: LEFT + 66,
        y: PAGE_HEIGHT - 71,
        font: regular,
        size: 7.2,
        color: slate,
      });
      current.drawText("C O T I Z A C I Ó N", {
        x: RIGHT - 166,
        y: PAGE_HEIGHT - 32,
        font: bold,
        size: 8,
        color: slate,
      });
      fittedRightText(current, quote.quoteNumber, 339, PAGE_HEIGHT - 51, RIGHT - 339, bold, 16);
      fittedRightText(
        current,
        `Emitida el ${issuedAt}`,
        339,
        PAGE_HEIGHT - 66,
        RIGHT - 339,
        regular,
        7.5,
        slate,
      );
      fittedRightText(
        current,
        quote.validUntil
          ? `Válida hasta el ${formatDate(quote.validUntil)}`
          : `Válida por ${input.meta.validityDays?.trim() || "30 días"} desde su emisión`,
        339,
        PAGE_HEIGHT - 80,
        RIGHT - 339,
        regular,
        7.5,
        blue,
      );
    }
    const divider = PAGE_HEIGHT - (continuation ? 61 : 96);
    current.drawLine({
      start: { x: LEFT, y: divider },
      end: { x: RIGHT, y: divider },
      color: line,
      thickness: 0.8,
    });
    return current;
  };

  let page = header();
  let y = PAGE_HEIGHT - 111;
  const nextPage = () => {
    page = header(true);
    y = PAGE_HEIGHT - 77;
  };
  const ensureSpace = (height: number) => {
    if (y - height < BODY_BOTTOM) nextPage();
  };
  const sectionHeading = (title: string, continued = false) => {
    page.drawText(`${title}${continued ? " · CONTINUACIÓN" : ""}`, {
      x: LEFT,
      y: y - 8,
      font: bold,
      size: 7.5,
      color: blue,
    });
    y -= 18;
  };
  const textSection = (
    title: string,
    value: string,
    size = BODY_SIZE,
    leading = BODY_LEADING,
    color = navy,
  ) => {
    const lines = wrap(value, regular, size, CONTENT_WIDTH);
    ensureSpace(18 + leading * Math.min(2, lines.length));
    sectionHeading(title);
    for (let index = 0; index < lines.length; index += 1) {
      if (y - leading < BODY_BOTTOM) {
        nextPage();
        sectionHeading(title, true);
      }
      page.drawText(lines[index]!, { x: LEFT, y: y - size, font: regular, size, color });
      y -= leading;
    }
    y -= 12;
  };

  // Both party columns grow with their contents and can continue on another page.
  const partyWidth = (CONTENT_WIDTH - 28) / 2;
  const partyLines = (name: string, details: string[]) => [
    ...wrap(name, regular, 10, partyWidth - 24).map((value) => ({ value, size: 10, color: navy })),
    ...details.filter(Boolean).flatMap((detail) =>
      wrap(detail, regular, 7.8, partyWidth - 24).map((value) => ({
        value,
        size: 7.8,
        color: slate,
      })),
    ),
  ];
  const issuerLines = partyLines(issuer.name, [
    `RUT ${issuer.rut}`,
    issuer.activity,
    issuer.address,
    [issuer.email, issuer.phone].filter(Boolean).join(" · "),
  ]);
  const recipientLines = partyLines(clean(quote.companyName), [
    ...new Set([
      clean(quote.contactName),
      clean(quote.contactEmail),
      recipient.rut ? `RUT ${clean(recipient.rut)}` : "",
      clean(recipient.address),
      clean(recipient.phone),
    ]),
  ]);
  const partyCount = Math.max(issuerLines.length, recipientLines.length);
  let partyOffset = 0;
  while (partyOffset < partyCount) {
    ensureSpace(70);
    const count = Math.min(partyCount - partyOffset, Math.floor((y - BODY_BOTTOM - 34) / 11.5));
    const height = 34 + count * 11.5;
    page.drawRectangle({ x: LEFT, y: y - height, width: CONTENT_WIDTH, height, color: soft });
    [issuerLines, recipientLines].forEach((lines, column) => {
      const x = LEFT + 12 + column * (partyWidth + 28);
      page.drawText(column ? "PREPARADA PARA" : "EMISOR", {
        x,
        y: y - 16,
        font: bold,
        size: 7,
        color: blue,
      });
      lines.slice(partyOffset, partyOffset + count).forEach((entry, index) => {
        page.drawText(entry.value, {
          x,
          y: y - 32 - index * 11.5,
          font: regular,
          size: entry.size,
          color: entry.color,
        });
      });
    });
    partyOffset += count;
    y -= height + 17;
    if (partyOffset < partyCount) nextPage();
  }

  const summary =
    quote.notes?.trim() ||
    `Propuesta comercial preparada para ${quote.companyName}, que considera ${quote.items.length} ${quote.items.length === 1 ? "servicio" : "servicios"} según el alcance y las condiciones detalladas en este documento.`;
  textSection("RESUMEN DE LA PROPUESTA", summary);

  const tableHeader = () => {
    page.drawRectangle({ x: LEFT, y: y - 23, width: CONTENT_WIDTH, height: 23, color: navy });
    page.drawText("DESCRIPCIÓN", { x: LEFT + 10, y: y - 15, font: bold, size: 7, color: white });
    rightText(page, "CANT.", 339, y - 15, 36, bold, 6.3, white);
    rightText(page, "P. UNITARIO", 381, y - 15, 65, bold, 6.3, white);
    rightText(page, "DCTO.", 452, y - 15, 31, bold, 6.3, white);
    rightText(page, "TOTAL", 489, y - 15, RIGHT - 499, bold, 7, white);
    y -= 23;
  };
  const continueTable = () => {
    nextPage();
    sectionHeading("DETALLE DE SERVICIOS", true);
    tableHeader();
  };
  ensureSpace(82);
  sectionHeading("DETALLE DE SERVICIOS");
  tableHeader();
  const fullRowCapacity = PAGE_HEIGHT - 77 - 18 - 23 - BODY_BOTTOM;
  for (let index = 0; index < quote.items.length; index += 1) {
    const item = quote.items[index]!;
    const description = wrap(item.description, regular, BODY_SIZE, 283);
    const quantity = wrap(
      [
        new Intl.NumberFormat("es-CL", { maximumFractionDigits: 3 }).format(item.quantity),
        item.unit,
      ]
        .filter(Boolean)
        .join(" "),
      regular,
      7.5,
      36,
    );
    const lineCount = Math.max(description.length, quantity.length);
    const rowHeight = 18 + lineCount * BODY_LEADING;
    // Keep ordinary rows together; oversized rows flow across as many pages as needed.
    if (
      rowHeight <= fullRowCapacity
        ? y - rowHeight < BODY_BOTTOM
        : y - BODY_BOTTOM < 18 + 4 * BODY_LEADING
    )
      continueTable();
    let offset = 0;
    while (offset < lineCount) {
      const continuationHeight = offset ? 12 : 0;
      const count = Math.min(
        lineCount - offset,
        Math.floor((y - BODY_BOTTOM - 18 - continuationHeight) / BODY_LEADING),
      );
      if (count < 1) {
        continueTable();
        continue;
      }
      const height = 18 + continuationHeight + count * BODY_LEADING;
      if (index % 2 === 1)
        page.drawRectangle({ x: LEFT, y: y - height, width: CONTENT_WIDTH, height, color: soft });
      if (offset)
        page.drawText(`Ítem ${index + 1} · continuación`, {
          x: LEFT + 10,
          y: y - 13,
          font: regular,
          size: 6.8,
          color: blue,
        });
      description.slice(offset, offset + count).forEach((value, lineIndex) => {
        page.drawText(value, {
          x: LEFT + 10,
          y: y - 16 - continuationHeight - lineIndex * BODY_LEADING,
          font: regular,
          size: BODY_SIZE,
          color: navy,
        });
      });
      quantity.slice(offset, offset + count).forEach((value, lineIndex) => {
        rightText(
          page,
          value,
          339,
          y - 16 - continuationHeight - lineIndex * BODY_LEADING,
          36,
          regular,
          7.5,
          slate,
        );
      });
      if (!offset) {
        fittedRightText(
          page,
          money(item.unitPrice, quote.currency),
          381,
          y - 16,
          65,
          regular,
          7.7,
          slate,
        );
        fittedRightText(
          page,
          item.discountPercent ? `${item.discountPercent}%` : "—",
          452,
          y - 16,
          31,
          regular,
          7.7,
          slate,
        );
        fittedRightText(
          page,
          money(item.subtotal, quote.currency),
          489,
          y - 16,
          RIGHT - 499,
          bold,
          8,
        );
      }
      page.drawLine({
        start: { x: LEFT, y: y - height },
        end: { x: RIGHT, y: y - height },
        color: line,
        thickness: 0.55,
      });
      y -= height;
      offset += count;
      if (offset < lineCount) continueTable();
    }
  }
  y -= 18;
  textSection(
    "CONDICIONES DE PAGO",
    quote.paymentTerms?.trim() || "Condiciones de pago por acordar.",
  );

  const totalsX = RIGHT - 204;
  const totalsWidth = RIGHT - totalsX;
  const bankWidth = totalsX - LEFT - 20;
  const bankConfigured = Boolean(ZYTERON_COMPANY.transferAccountNumber);
  const bankText = bankConfigured
    ? [
        [ZYTERON_COMPANY.transferBank, ZYTERON_COMPANY.transferAccountType]
          .filter(Boolean)
          .join(" · "),
        `Cuenta N° ${ZYTERON_COMPANY.transferAccountNumber}`,
        `${issuer.name} · RUT ${issuer.rut}`,
        `Enviar comprobante a ${ZYTERON_COMPANY.transferAccountEmail}`,
      ].join("\n")
    : "Datos bancarios informados por el canal comercial autorizado.";
  const bankLines = wrap(bankText, regular, 8, bankWidth - 24);
  const totalsHeight = quote.discountTotal > 0 ? 103 : 90;
  // An unusually long banking configuration uses the full-width flowing section.
  const separateBank = 40 + bankLines.length * 11 > totalsHeight;
  if (separateBank) textSection("DATOS PARA TRANSFERENCIA", bankText, 8, 11);
  ensureSpace(totalsHeight);
  const blockTop = y;
  if (!separateBank) {
    page.drawRectangle({
      x: LEFT,
      y: blockTop - totalsHeight,
      width: bankWidth,
      height: totalsHeight,
      color: soft,
    });
    page.drawText("DATOS PARA TRANSFERENCIA", {
      x: LEFT + 12,
      y: blockTop - 20,
      font: bold,
      size: 7,
      color: blue,
    });
    bankLines.forEach((value, index) =>
      page.drawText(value, {
        x: LEFT + 12,
        y: blockTop - 39 - index * 11,
        font: regular,
        size: 8,
        color: navy,
      }),
    );
  }
  page.drawRectangle({
    x: totalsX,
    y: blockTop - totalsHeight,
    width: totalsWidth,
    height: totalsHeight,
    borderColor: line,
    borderWidth: 0.7,
  });
  const totals = [
    ["Subtotal", money(quote.subtotal, quote.currency)],
    ...(quote.discountTotal > 0
      ? [["Descuento incluido", money(-quote.discountTotal, quote.currency)]]
      : []),
    input.meta.includeIva !== false
      ? [`IVA (${quote.taxRate}%)`, money(quote.taxAmount, quote.currency)]
      : ["Impuestos", "Se aplican al facturar"],
  ];
  totals.forEach(([label, value], index) => {
    page.drawText(label, {
      x: totalsX + 12,
      y: blockTop - 18 - index * 15,
      font: regular,
      size: 8,
      color: slate,
    });
    fittedRightText(
      page,
      value,
      totalsX + 96,
      blockTop - 18 - index * 15,
      totalsWidth - 108,
      regular,
      8.5,
    );
  });
  page.drawRectangle({
    x: totalsX,
    y: blockTop - totalsHeight + 14,
    width: totalsWidth,
    height: 30,
    color: navy,
  });
  page.drawText("TOTAL", {
    x: totalsX + 12,
    y: blockTop - totalsHeight + 25,
    font: bold,
    size: 9,
    color: white,
  });
  fittedRightText(
    page,
    money(quote.totalAmount, quote.currency),
    totalsX + 70,
    blockTop - totalsHeight + 24,
    totalsWidth - 82,
    bold,
    13,
    white,
  );
  page.drawText(
    input.meta.includeIva !== false ? "Valores en CLP, IVA incluido." : "Valores netos en CLP.",
    { x: totalsX + 8, y: blockTop - totalsHeight + 4, font: regular, size: 6.8, color: slate },
  );
  y -= totalsHeight + 20;

  const terms = quote.commercialTerms;
  textSection("TÉRMINOS Y CONDICIONES", terms, 8, 10.8, slate);
  ensureSpace(65);
  page.drawText("ACEPTACIÓN DEL CLIENTE", {
    x: LEFT,
    y: y - 8,
    font: bold,
    size: 7.5,
    color: blue,
  });
  page.drawLine({
    start: { x: LEFT, y: y - 43 },
    end: { x: LEFT + 260, y: y - 43 },
    color: lightSlate,
    thickness: 0.75,
  });
  page.drawText("Nombre, RUT y firma", {
    x: LEFT,
    y: y - 56,
    font: regular,
    size: 7,
    color: slate,
  });

  pages.forEach((current, index) => {
    current.drawLine({
      start: { x: LEFT, y: 44 },
      end: { x: RIGHT, y: 44 },
      color: line,
      thickness: 0.65,
    });
    current.drawText(`${issuer.name} · RUT ${issuer.rut}`, {
      x: LEFT,
      y: 30,
      font: regular,
      size: 6.6,
      color: slate,
    });
    fittedRightText(
      current,
      `${issuer.website} · Página ${index + 1} de ${pages.length}`,
      345,
      30,
      RIGHT - 345,
      regular,
      6.6,
      blue,
    );
    fittedRightText(
      current,
      [issuer.email, issuer.phone].filter(Boolean).join(" · "),
      LEFT,
      18,
      CONTENT_WIDTH,
      regular,
      6.6,
      slate,
    );
    current.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH * 0.46, height: 3, color: teal });
    current.drawRectangle({
      x: PAGE_WIDTH * 0.46,
      y: 0,
      width: PAGE_WIDTH * 0.54,
      height: 3,
      color: blue,
    });
  });

  return pdf.save();
}
