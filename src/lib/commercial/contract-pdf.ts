import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { CONTRACT_COMPANY, CONTRACT_TYPE_INFO } from "@/config/contracts";
import { CONTRACT_TEMPLATES, ESSENTIAL_TERMS_LABELS } from "@/content/commercial-contracts";
import { assertVariablesComplete, renderTemplateText, type ContractConfig } from "@/lib/commercial/contract-model";

/**
 * Generación del PDF contractual con pdf-lib.
 *
 * El documento se dibuja siempre igual: encabezado corporativo sobrio,
 * comparecencia, resumen de condiciones, cláusulas numeradas, firmas y
 * anexo bancario. Sin portada, sin fondos oscuros y optimizado para
 * impresión en blanco y negro.
 *
 * La generación falla si queda cualquier variable sin resolver: antes de
 * emitir un contrato con huecos, no se emite nada.
 */

const PAGE: [number, number] = [595.28, 841.89];
const [PAGE_W, PAGE_H] = PAGE;
const MARGIN_X = 56;
const TOP = 46;
const BOTTOM = 58;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const INK = {
  text: rgb(0.09, 0.12, 0.18),
  soft: rgb(0.36, 0.42, 0.52),
  line: rgb(0.78, 0.83, 0.89),
  hairline: rgb(0.88, 0.91, 0.95),
  panel: rgb(0.965, 0.975, 0.99),
  brand: rgb(0.06, 0.37, 1),
};

/**
 * Las fuentes estándar de PDF usan WinAnsi (Latin-1). Los caracteres
 * tipográficos habituales al redactar (rayas, comillas curvas, puntos
 * suspensivos) están fuera de ese juego y harían fallar la escritura, así
 * que se sustituyen por su equivalente imprimible.
 */
function sanitize(value: string): string {
  return value
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”‟]/g, '"')
    .replace(/[–—―]/g, "-")
    .replace(/…/g, "...")
    .replace(/[•●]/g, "-")
    .replace(/ /g, " ")
    .replace(/[−]/g, "-")
    // Fuera del juego Latin-1 no hay glifo en las fuentes estandar del PDF.
    .replace(/[^\x00-\xFF]/g, "");
}

const ORDINALS = [
  "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA", "OCTAVA", "NOVENA", "DÉCIMA",
  "DÉCIMO PRIMERA", "DÉCIMO SEGUNDA", "DÉCIMO TERCERA", "DÉCIMO CUARTA", "DÉCIMO QUINTA", "DÉCIMO SEXTA",
  "DÉCIMO SÉPTIMA", "DÉCIMO OCTAVA", "DÉCIMO NOVENA", "VIGÉSIMA", "VIGÉSIMO PRIMERA", "VIGÉSIMO SEGUNDA",
  "VIGÉSIMO TERCERA", "VIGÉSIMO CUARTA", "VIGÉSIMO QUINTA", "VIGÉSIMO SEXTA", "VIGÉSIMO SÉPTIMA",
  "VIGÉSIMO OCTAVA", "VIGÉSIMO NOVENA", "TRIGÉSIMA", "TRIGÉSIMO PRIMERA", "TRIGÉSIMO SEGUNDA",
  "TRIGÉSIMO TERCERA", "TRIGÉSIMO CUARTA", "TRIGÉSIMO QUINTA", "TRIGÉSIMO SEXTA", "TRIGÉSIMO SÉPTIMA",
  "TRIGÉSIMO OCTAVA", "TRIGÉSIMO NOVENA", "CUADRAGÉSIMA",
];

function ordinal(index: number): string {
  return ORDINALS[index] ?? `CLÁUSULA ${index + 1}`;
}

function wrap(value: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitize(value).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);
    // Palabra más larga que la caja: se parte por caracteres.
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      let chunk = "";
      for (const char of word) {
        if (font.widthOfTextAtSize(chunk + char, size) > maxWidth) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      current = chunk;
    } else {
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

type Ctx = {
  pdf: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  logo: Awaited<ReturnType<PDFDocument["embedPng"]>> | null;
  pages: PDFPage[];
  page: PDFPage;
  y: number;
  header: { number: string; date: string; docType: string };
};

function drawHeader(ctx: Ctx) {
  const { page, regular, bold } = ctx;
  let x = MARGIN_X;
  const top = PAGE_H - TOP;

  if (ctx.logo) {
    const size = 26;
    page.drawImage(ctx.logo, { x, y: top - size + 6, width: size, height: size });
    x += size + 10;
  }

  page.drawText(sanitize(CONTRACT_COMPANY.legalName), {
    x,
    y: top - 4,
    size: 10.5,
    font: bold,
    color: INK.text,
  });
  page.drawText(sanitize(`RUT ${CONTRACT_COMPANY.rut} · ${CONTRACT_COMPANY.address}, ${CONTRACT_COMPANY.comuna}`), {
    x,
    y: top - 16,
    size: 7.5,
    font: regular,
    color: INK.soft,
  });

  const right = [
    `N° ${ctx.header.number}`,
    ctx.header.date,
    ctx.header.docType,
  ];
  right.forEach((line, index) => {
    const size = index === 0 ? 8.5 : 7.5;
    const font = index === 0 ? bold : regular;
    const width = font.widthOfTextAtSize(sanitize(line), size);
    page.drawText(sanitize(line), {
      x: PAGE_W - MARGIN_X - width,
      y: top - 4 - index * 10,
      size,
      font,
      color: index === 0 ? INK.text : INK.soft,
    });
  });

  page.drawRectangle({
    x: MARGIN_X,
    y: top - 28,
    width: CONTENT_W,
    height: 1.2,
    color: INK.brand,
  });
}

function drawFooter(ctx: Ctx, page: PDFPage, index: number, total: number, subject: string) {
  page.drawRectangle({
    x: MARGIN_X,
    y: BOTTOM + 16,
    width: CONTENT_W,
    height: 0.6,
    color: INK.hairline,
  });
  page.drawText(sanitize(subject), {
    x: MARGIN_X,
    y: BOTTOM + 5,
    size: 7,
    font: ctx.regular,
    color: INK.soft,
  });
  const label = `Página ${index + 1} de ${total}`;
  const width = ctx.regular.widthOfTextAtSize(label, 7);
  page.drawText(label, {
    x: PAGE_W - MARGIN_X - width,
    y: BOTTOM + 5,
    size: 7,
    font: ctx.regular,
    color: INK.soft,
  });
}

function newPage(ctx: Ctx) {
  const page = ctx.pdf.addPage(PAGE);
  ctx.pages.push(page);
  ctx.page = page;
  drawHeader(ctx);
  ctx.y = PAGE_H - TOP - 46;
}

function ensure(ctx: Ctx, needed: number) {
  if (ctx.y - needed < BOTTOM + 30) newPage(ctx);
}

/**
 * Dibuja una línea repartiendo el espacio sobrante entre las palabras, que es
 * como se compone el texto a caja en un documento legal. La última línea de
 * cada párrafo se deja alineada a la izquierda.
 */
function drawJustified(
  ctx: Ctx,
  line: string,
  font: PDFFont,
  size: number,
  x: number,
  y: number,
  width: number,
  color: ReturnType<typeof rgb>,
) {
  const words = line.split(" ").filter(Boolean);
  if (words.length < 2) {
    ctx.page.drawText(line, { x, y, size, font, color });
    return;
  }
  const wordsWidth = words.reduce((sum, word) => sum + font.widthOfTextAtSize(word, size), 0);
  const gap = (width - wordsWidth) / (words.length - 1);
  // Un espaciado excesivo se ve peor que la línea sin justificar.
  if (gap > font.widthOfTextAtSize(" ", size) * 3.2) {
    ctx.page.drawText(line, { x, y, size, font, color });
    return;
  }
  let cursor = x;
  for (const word of words) {
    ctx.page.drawText(word, { x: cursor, y, size, font, color });
    cursor += font.widthOfTextAtSize(word, size) + gap;
  }
}

function paragraph(
  ctx: Ctx,
  value: string,
  options: {
    size?: number;
    font?: PDFFont;
    color?: ReturnType<typeof rgb>;
    indent?: number;
    gap?: number;
    justify?: boolean;
  } = {},
) {
  const size = options.size ?? 9.2;
  const font = options.font ?? ctx.regular;
  const indent = options.indent ?? 0;
  const leading = size * 1.62;
  const width = CONTENT_W - indent;
  const lines = wrap(value, font, size, width);
  const color = options.color ?? INK.text;

  lines.forEach((line, index) => {
    ensure(ctx, leading);
    const isLast = index === lines.length - 1;
    if (options.justify && !isLast) {
      drawJustified(ctx, line, font, size, MARGIN_X + indent, ctx.y, width, color);
    } else {
      ctx.page.drawText(line, { x: MARGIN_X + indent, y: ctx.y, size, font, color });
    }
    ctx.y -= leading;
  });
  ctx.y -= options.gap ?? 4;
}

/**
 * Altura aproximada de un bloque de texto, para decidir si cabe antes del
 * salto de página y evitar que un título quede huérfano al pie.
 */
function blockHeight(ctx: Ctx, value: string, size: number, font: PDFFont): number {
  return wrap(value, font, size, CONTENT_W).length * size * 1.62;
}

function summaryTable(ctx: Ctx, rows: Array<[string, string]>, heading = "RESUMEN DE CONDICIONES ESENCIALES") {
  const rowH = 17;
  const height = rows.length * rowH + 22;
  ensure(ctx, height + 10);

  const top = ctx.y + 6;
  ctx.page.drawRectangle({
    x: MARGIN_X,
    y: top - height,
    width: CONTENT_W,
    height,
    color: INK.panel,
    borderColor: INK.hairline,
    borderWidth: 0.6,
  });

  ctx.page.drawText(sanitize(heading), {
    x: MARGIN_X + 12,
    y: top - 15,
    size: 7.5,
    font: ctx.bold,
    color: INK.soft,
  });

  let y = top - 32;
  for (const [label, value] of rows) {
    ctx.page.drawText(sanitize(label), {
      x: MARGIN_X + 12,
      y,
      size: 8.5,
      font: ctx.regular,
      color: INK.soft,
    });
    const lines = wrap(value, ctx.bold, 8.5, CONTENT_W - 190);
    ctx.page.drawText(lines[0] ?? "", {
      x: MARGIN_X + 170,
      y,
      size: 8.5,
      font: ctx.bold,
      color: INK.text,
    });
    y -= rowH;
  }
  ctx.y = top - height - 14;
}

function signatureBlock(
  ctx: Ctx,
  left: { name: string; rut: string; role: string },
  right: { name: string; rut: string; role: string },
) {
  // Espacio real para firmar: la línea va bien por debajo del último texto.
  ensure(ctx, 132);
  const y = ctx.y - 54;
  const gutter = 46;
  const colW = (CONTENT_W - gutter) / 2;

  [left, right].forEach((party, index) => {
    const x = MARGIN_X + index * (colW + gutter);
    ctx.page.drawRectangle({ x, y, width: colW, height: 0.9, color: INK.line });
    ctx.page.drawText(sanitize(party.name), {
      x,
      y: y - 14,
      size: 9.2,
      font: ctx.bold,
      color: INK.text,
    });
    ctx.page.drawText(sanitize(party.rut), {
      x,
      y: y - 25,
      size: 8,
      font: ctx.regular,
      color: INK.soft,
    });
    ctx.page.drawText(sanitize(party.role), {
      x,
      y: y - 35,
      size: 8,
      font: ctx.regular,
      color: INK.soft,
    });
    ctx.page.drawText("Firma", {
      x,
      y: y + 6,
      size: 7,
      font: ctx.regular,
      color: rgb(0.72, 0.77, 0.84),
    });
  });

  ctx.y = y - 54;
}

export type ContractPdfInput = {
  config: ContractConfig;
  variables: Record<string, string>;
  contractNumber: string;
  /** Marca de agua para la vista previa; el definitivo va sin ella. */
  draft?: boolean;
};

export async function generateContractPdf(input: ContractPdfInput): Promise<Uint8Array> {
  const { config, variables, contractNumber } = input;

  const check = assertVariablesComplete(config.contractType, variables);
  if (!check.ok) {
    throw new Error(
      `No se puede generar el documento: faltan datos para ${check.missing.join(", ")}.`,
    );
  }

  const template = CONTRACT_TEMPLATES[config.contractType];
  const info = CONTRACT_TYPE_INFO[config.contractType];
  const render = (value: string) => renderTemplateText(value, variables).text;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${info.label} - ${variables.nombre_completo}`);
  pdf.setAuthor(CONTRACT_COMPANY.legalName);
  pdf.setSubject(contractNumber);
  pdf.setProducer("Zyteron");

  let logo: Awaited<ReturnType<PDFDocument["embedPng"]>> | null = null;
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "icon-512.png"));
    logo = await pdf.embedPng(bytes);
  } catch {
    // Sin logo el documento sigue siendo válido: no se interrumpe la emisión.
  }

  const ctx: Ctx = {
    pdf,
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    logo,
    pages: [],
    page: null as unknown as PDFPage,
    y: 0,
    header: {
      number: contractNumber,
      date: variables.fecha_contrato,
      docType: input.draft ? "BORRADOR - SIN VALIDEZ" : info.label,
    },
  };

  newPage(ctx);

  // --- Título ---------------------------------------------------------
  const title = sanitize(render(template.documentTitle));
  const titleLines = wrap(title, ctx.bold, 13, CONTENT_W);
  for (const line of titleLines) {
    const width = ctx.bold.widthOfTextAtSize(line, 13);
    ctx.page.drawText(line, {
      x: (PAGE_W - width) / 2,
      y: ctx.y,
      size: 13,
      font: ctx.bold,
      color: INK.text,
    });
    ctx.y -= 18;
  }

  const subtitle = sanitize(render(template.subtitle));
  const subWidth = ctx.regular.widthOfTextAtSize(subtitle, 9.5);
  ctx.page.drawText(subtitle, {
    x: (PAGE_W - subWidth) / 2,
    y: ctx.y - 2,
    size: 9.5,
    font: ctx.regular,
    color: INK.soft,
  });

  // Filete corto y centrado que separa el título del cuerpo.
  ctx.page.drawRectangle({
    x: (PAGE_W - 84) / 2,
    y: ctx.y - 16,
    width: 84,
    height: 0.9,
    color: INK.line,
  });
  ctx.y -= 34;

  // --- Comparecencia --------------------------------------------------
  for (const item of template.appearance) paragraph(ctx, render(item), { gap: 6, justify: true });

  // --- Resumen de condiciones ----------------------------------------
  summaryTable(
    ctx,
    ESSENTIAL_TERMS_LABELS.map(({ label, variable }) => {
      const raw = variables[variable] ?? "";
      if (variable === "porcentaje_comision") return [label, `${raw}%`] as [string, string];
      if (variable === "dias_aviso_termino") return [label, `${raw} días corridos`] as [string, string];
      if (variable === "dias_cola_comisiones")
        return [label, `${raw} días corridos desde la aceptación del referido`] as [string, string];
      return [label, raw] as [string, string];
    }),
  );

  // --- Cláusulas ------------------------------------------------------
  template.clauses.forEach((clause, index) => {
    const heading = `${ordinal(index)}: ${sanitize(render(clause.title))}.`;
    const first = render(clause.paragraphs[0] ?? "");
    // El título nunca queda solo al pie: se reserva su alto más las dos
    // primeras líneas del primer párrafo.
    const needed =
      blockHeight(ctx, heading, 9.4, ctx.bold) + Math.min(blockHeight(ctx, first, 9.2, ctx.regular), 9.2 * 1.62 * 2) + 10;
    ensure(ctx, needed);
    paragraph(ctx, heading, { font: ctx.bold, size: 9.4, gap: 3 });
    clause.paragraphs.forEach((text) => paragraph(ctx, render(text), { gap: 3.5, justify: true }));
    ctx.y -= 5;
  });

  // --- Cierre y firmas ------------------------------------------------
  ctx.y -= 6;
  for (const line of template.closing) paragraph(ctx, render(line), { gap: 10, justify: true });

  signatureBlock(
    ctx,
    {
      name: variables.nombre_representante,
      rut: `RUT ${variables.rut_representante}`,
      role: `p.p. ${variables.razon_social_zyteron}`,
    },
    {
      name: variables.nombre_completo,
      rut: `RUT ${variables.rut_prestador}`,
      role: variables.cargo_funcional,
    },
  );

  if (config.observations?.trim()) {
    paragraph(ctx, `Observaciones: ${config.observations.trim()}`, { size: 8.2, color: INK.soft });
  }

  // --- Anexo bancario --------------------------------------------------
  if (config.includeBankAnnex) {
    newPage(ctx);
    paragraph(ctx, template.bankAnnexTitle, { font: ctx.bold, size: 11, gap: 8 });
    paragraph(ctx, render(template.bankAnnexIntro), { gap: 8, justify: true });

    summaryTable(
      ctx,
      [
        ["Titular", variables.titular_cuenta],
        ["RUT del titular", variables.rut_titular],
        ["Banco", variables.banco],
        ["Tipo de cuenta", variables.tipo_cuenta],
        ["Número de cuenta", variables.numero_cuenta],
        ["Correo para comprobantes", variables.correo_personal],
      ],
      "CUENTA PARA EL PAGO DE COMISIONES",
    );

    paragraph(ctx, template.bankAnnexNote, { size: 8.2, color: INK.soft, gap: 14, justify: true });

    signatureBlock(
      ctx,
      {
        name: variables.nombre_representante,
        rut: `RUT ${variables.rut_representante}`,
        role: `p.p. ${variables.razon_social_zyteron}`,
      },
      {
        name: variables.nombre_completo,
        rut: `RUT ${variables.rut_prestador}`,
        role: "Titular de la cuenta",
      },
    );
  }

  // --- Pies de página --------------------------------------------------
  const subject = `${contractNumber} · ${variables.nombre_completo} · ${variables.cargo_funcional}`;
  ctx.pages.forEach((page, index) => drawFooter(ctx, page, index, ctx.pages.length, subject));

  if (input.draft) {
    for (const page of ctx.pages) {
      page.drawText("BORRADOR", {
        x: 120,
        y: PAGE_H / 2 - 40,
        size: 74,
        font: ctx.bold,
        color: rgb(0.93, 0.95, 0.98),
        rotate: { type: "degrees", angle: 32 } as never,
      });
    }
  }

  return pdf.save();
}

/** Nombre de archivo estable y legible para descargas y adjuntos. */
export function contractFileName(
  contractType: ContractPdfInput["config"]["contractType"],
  fullName: string,
  year: number,
): string {
  const slug = sanitize(fullName)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join("_");
  return `${CONTRACT_TYPE_INFO[contractType].fileLabel}_${slug || "Prestador"}_${year}.pdf`;
}
