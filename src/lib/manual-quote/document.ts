import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { clp } from "@/config/pricing";
import { siteConfig } from "@/config/site";
import { exclusionText, type ManualSnapshot } from "./catalog";

export type ManualDocumentInput = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  acceptedAt?: string;
  snapshot: ManualSnapshot;
};

const W = 595.28,
  H = 841.89,
  M = 42,
  CW = W - M * 2,
  BOTTOM = 66;
const ink = rgb(0.055, 0.09, 0.17),
  blue = rgb(0.06, 0.34, 0.9),
  teal = rgb(0, 0.59, 0.62);
const muted = rgb(0.35, 0.4, 0.48),
  line = rgb(0.84, 0.88, 0.93),
  paper = rgb(0.96, 0.975, 0.99),
  white = rgb(1, 1, 1);
const date = (value: string) =>
  new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(new Date(value))
    .replaceAll("/", "-");
let logoBytes: Promise<Uint8Array | null> | undefined;

/** Usa el alcance guardado; nunca recalcula precios de un pedido aceptado. */
export async function generateManualQuoteDocument(input: ManualDocumentInput) {
  const q = input.snapshot;
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  logoBytes ||= readFile(join(process.cwd(), "public", "logo-cotizacion.png")).catch(() => null);
  const bytes = await logoBytes;
  const logo = bytes ? await pdf.embedPng(bytes).catch(() => null) : null;
  const ref = `COT-${input.id.slice(0, 8).toUpperCase()}`;
  pdf.setTitle(`Cotización ${ref} - ${q.base.name}`);
  pdf.setAuthor(siteConfig.legalName);
  pdf.setSubject(`Propuesta de desarrollo para ${input.name}`);
  pdf.setCreator("Zyteron - Propuestas comerciales");

  const safe = (value: string) =>
    Array.from(
      String(value)
        .replace(/[–—−]/g, "-")
        .replace(/[\u00a0\u202f]/g, " "),
    )
      .map((c) => {
        if (c === "\n") return c;
        if (/\s/.test(c)) return " ";
        try {
          normal.encodeText(c);
          return c;
        } catch {
          return "?";
        }
      })
      .join("");
  const widths = new Map<string, number>();
  const width = (value: string, size: number, strong = false) =>
    Array.from(safe(value)).reduce((sum, c) => {
      const key = `${strong}:${c}`;
      if (!widths.has(key)) widths.set(key, (strong ? bold : normal).widthOfTextAtSize(c, 1));
      return sum + widths.get(key)! * size;
    }, 0);
  const wrap = (value: string, size: number, max = CW, strong = false) => {
    const result: string[] = [];
    for (const paragraph of safe(value).split("\n")) {
      let current = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        if (current && width(`${current} ${word}`, size, strong) > max) {
          result.push(current);
          current = "";
        }
        for (const character of word) {
          if (current && width(current + character, size, strong) > max) {
            result.push(current);
            current = "";
          }
          current += character;
        }
        current += " ";
      }
      result.push(current.trimEnd());
    }
    return result;
  };
  let page!: PDFPage,
    y = 0;
  const draw = (
    value: string,
    x: number,
    baseline: number,
    size = 9.5,
    strong = false,
    color = ink,
  ) => {
    page.drawText(safe(value).replaceAll("\n", " "), {
      x,
      y: baseline,
      size,
      font: strong ? bold : normal,
      color,
    });
  };
  const right = (
    value: string,
    end: number,
    baseline: number,
    size = 9.5,
    strong = false,
    color = ink,
  ) => draw(value, end - width(value, size, strong), baseline, size, strong, color);
  function newPage() {
    page = pdf.addPage([W, H]);
    page.drawRectangle({ x: 0, y: H - 4, width: W, height: 4, color: ink });
    page.drawRectangle({ x: M, y: H - 4, width: 88, height: 4, color: teal });
    if (logo) page.drawImage(logo, { x: M, y: H - 77, width: 42, height: 42 });
    draw("ZYTERON", M + (logo ? 52 : 0), H - 53, 20, true);
    draw("Software y soluciones digitales", M + (logo ? 52 : 0), H - 69, 8.5, false, muted);
    right("PROPUESTA COMERCIAL", W - M, H - 46, 8, true, blue);
    right(ref, W - M, H - 64, 11, true);
    page.drawLine({
      start: { x: M, y: H - 96 },
      end: { x: W - M, y: H - 96 },
      thickness: 0.7,
      color: line,
    });
    y = H - 124;
  }
  const room = (height: number) => {
    if (y - height < BOTTOM) newPage();
  };
  function paragraph(
    value: string,
    options: {
      size?: number;
      strong?: boolean;
      color?: typeof ink;
      indent?: number;
      after?: number;
    } = {},
  ) {
    const { size = 9.5, strong = false, color = ink, indent = 0, after = 9 } = options;
    const lines = wrap(value, size, CW - indent, strong),
      leading = size * 1.48;
    const height = lines.length * leading + after;
    if (height < H - 220) room(height);
    for (const text of lines) {
      room(leading);
      draw(text, M + indent, y, size, strong, color);
      y -= leading;
    }
    y -= after;
  }
  function section(number: string, title: string, intro?: string) {
    room(82);
    draw(number, M, y, 10, true, blue);
    draw(title, M + 30, y - 1, 18, true);
    y -= 20;
    page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.7, color: line });
    y -= 21;
    if (intro) paragraph(intro, { color: muted, after: 15 });
  }
  newPage();
  paragraph("Tu proyecto, con un alcance claro.", { size: 25, strong: true, after: 13 });
  paragraph(
    input.acceptedAt
      ? "Alcance aceptado para preparar el pago. Este documento no acredita una transacción pagada."
      : "Cotización de desarrollo. Revisa los entregables y condiciones antes de contratar.",
    { color: muted, after: 20 },
  );

  const nameLines = wrap(input.name, 12, 283, true),
    emailLines = wrap(input.email, 9, 283);
  const clientHeight = Math.max(86, 36 + nameLines.length * 17 + emailLines.length * 13);
  room(clientHeight + 155);
  page.drawRectangle({
    x: M,
    y: y - clientHeight + 12,
    width: CW,
    height: clientHeight,
    color: paper,
  });
  const top = y - 6;
  draw("PREPARADA PARA", M + 16, top, 8, true, muted);
  nameLines.forEach((text, i) => draw(text, M + 16, top - 21 - i * 17, 12, true));
  emailLines.forEach((text, i) =>
    draw(text, M + 16, top - 23 - nameLines.length * 17 - i * 13, 9, false, muted),
  );
  draw("Fecha de emisión", M + 335, top, 8, false, muted);
  draw(date(input.createdAt), M + 335, top - 17, 10, true);
  draw("Catálogo de referencia", M + 335, top - 38, 8, false, muted);
  draw(q.version, M + 335, top - 55, 9, true);
  y -= clientHeight + 13;

  const planLines = wrap(q.base.name, 17, 265, true);
  const overviewHeight = Math.max(95, planLines.length * 22 + 62);
  page.drawRectangle({
    x: M,
    y: y - overviewHeight,
    width: CW,
    height: overviewHeight,
    color: ink,
  });
  draw("PLAN BASE", M + 17, y - 22, 8, true, rgb(0.64, 0.76, 0.94));
  planLines.forEach((text, i) => draw(text, M + 17, y - 46 - i * 22, 17, true, white));
  draw(
    `${q.days.join(" a ")} días hábiles de desarrollo*`,
    M + 17,
    y - overviewHeight + 17,
    9,
    false,
    white,
  );
  right("INVERSIÓN TOTAL", W - M - 17, y - 22, 8, true, rgb(0.64, 0.76, 0.94));
  right(clp(q.total), W - M - 17, y - 51, 23, true, white);
  right("CLP · IVA incluido · pago único", W - M - 17, y - 72, 8, false, white);
  y -= overviewHeight + 16;
  paragraph(
    "*El plazo comienza con el pago confirmado y la entrega completa de contenidos y accesos. Incluye los adicionales seleccionados.",
    { size: 8, color: muted, after: 20 },
  );

  section("01", "Resumen económico");
  function tableHeader() {
    page.drawRectangle({ x: M, y: y - 12, width: CW, height: 28, color: paper });
    draw("DESARROLLO / MÓDULO", M + 10, y - 2, 7.5, true, muted);
    right("CANT.", M + 292, y - 2, 7.5, true, muted);
    right("UNITARIO NETO", M + 397, y - 2, 7.5, true, muted);
    right("TOTAL NETO", W - M - 10, y - 2, 7.5, true, muted);
    y -= 32;
  }
  tableHeader();
  const rows = [
    { name: q.base.name, quantity: 1, amount: q.base.amount, lineTotal: q.base.amount },
    ...q.addons,
  ];
  for (const row of rows) {
    const lines = wrap(row.name, 9, 247),
      height = Math.max(32, lines.length * 13 + 14);
    if (y - height < BOTTOM) {
      newPage();
      section("01", "Resumen económico / continuación");
      tableHeader();
    }
    lines.forEach((text, i) => draw(text, M + 10, y - i * 13, 9, row === rows[0]));
    right(String(row.quantity), M + 292, y, 9);
    right(clp(row.amount), M + 397, y, 9, false, muted);
    right(clp(row.lineTotal), W - M - 10, y, 9, true);
    y -= height;
    page.drawLine({
      start: { x: M, y: y + 10 },
      end: { x: W - M, y: y + 10 },
      thickness: 0.5,
      color: line,
    });
  }
  room(142);
  y -= 10;
  draw("Subtotal neto", M + 278, y, 9.5, false, muted);
  right(clp(q.net), W - M - 10, y, 10, true);
  y -= 21;
  draw("IVA (19%)", M + 278, y, 9.5, false, muted);
  right(clp(q.tax), W - M - 10, y, 10, true);
  y -= 15;
  page.drawRectangle({ x: M + 265, y: y - 35, width: CW - 265, height: 40, color: blue });
  draw("TOTAL CLP", M + 278, y - 19, 9, true, white);
  right(clp(q.total), W - M - 10, y - 20, 17, true, white);
  y -= 58;
  paragraph(
    "El precio corresponde a la implementación descrita. Las licencias, renovaciones, infraestructura y consumos de terceros se contratan por separado.",
    { size: 8.5, color: muted },
  );

  newPage();
  section(
    "02",
    "Alcance del proyecto",
    "Cada módulo se entrega con los límites indicados. Las ampliaciones se acuerdan por escrito antes de ejecutarse.",
  );
  paragraph(q.base.name, { size: 17, strong: true, after: 6 });
  paragraph(`${clp(q.base.amount)} netos · ${q.base.days.join(" a ")} días hábiles base`, {
    color: blue,
    strong: true,
    after: 16,
  });
  for (const value of q.base.includes) {
    const lines = wrap(value, 9.5, CW - 15);
    room(lines.length * 14.1 + 9);
    page.drawRectangle({ x: M + 1, y: y + 2, width: 4, height: 4, color: teal });
    paragraph(value, { indent: 15 });
  }
  paragraph(
    `Fuera del plan base: ${exclusionText(q.base.excludes.join(" "))} Las funciones adicionales se rigen por los módulos seleccionados a continuación.`,
    { size: 8.5, color: muted, after: 18 },
  );

  for (const a of q.addons) {
    const title = wrap(a.name, 12, CW - 145, true);
    const body = [
      { value: a.scope, size: 9.5, color: ink },
      { value: `No incluye: ${exclusionText(a.excludes)}`, size: 8.5, color: muted },
      {
        value: `Plazo adicional: ${a.days * a.quantity} días hábiles · Cantidad: ${a.quantity} · Unitario neto: ${clp(a.amount)}`,
        size: 8.5,
        color: blue,
      },
    ];
    const height =
      48 +
      title.length * 16 +
      body.reduce((sum, p) => sum + wrap(p.value, p.size, CW - 30).length * p.size * 1.48 + 9, 0);
    room(height + 13);
    // Los alcances del catálogo son acotados; textos externos largos continúan con paginación normal.
    if (height <= H - 220) {
      page.drawRectangle({
        x: M,
        y: y - height + 13,
        width: CW,
        height,
        borderColor: line,
        borderWidth: 0.7,
        color: white,
      });
      page.drawRectangle({ x: M, y: y - height + 13, width: 3, height, color: blue });
      const initialY = y;
      draw(a.category.toUpperCase(), M + 15, y - 6, 7, true, muted);
      y -= 27;
      title.forEach((text) => {
        draw(text, M + 15, y, 12, true);
        y -= 16;
      });
      right(`${clp(a.lineTotal)} netos`, W - M - 15, initialY - 27, 11, true, blue);
      y -= 4;
      for (const p of body) {
        for (const text of wrap(p.value, p.size, CW - 30)) {
          draw(text, M + 15, y, p.size, false, p.color);
          y -= p.size * 1.48;
        }
        y -= 9;
      }
      y = initialY - height - 3;
    } else {
      paragraph(`${a.name} · ${clp(a.lineTotal)} netos`, { size: 12, strong: true });
      for (const p of body) paragraph(p.value, { size: p.size, color: p.color });
    }
  }

  newPage();
  section("03", "Condiciones de contratación");
  const terms: [string, string][] = [
    ["Entrega y plazo", `${q.days.join(" a ")} días hábiles en total. ${q.terms.delivery}`],
    ["Revisiones del proyecto", q.terms.changes],
    ["Entrega y garantía", q.terms.handover],
    ["Servicios de terceros", q.terms.exclusions],
    ["Forma de pago", q.terms.payment],
    [
      "Vigencia y aceptación",
      `Cotización válida durante 7 días desde ${date(input.createdAt)}, sujeta a catálogo vigente antes de aceptar el pago. Los pedidos aceptados conservan el alcance y los valores guardados. ${input.acceptedAt ? `Alcance aceptado el ${date(input.acceptedAt)}.` : "Esta cotización no constituye una compra ni acredita un pago."} No reemplaza el documento tributario.`,
    ],
  ];
  for (const [label, value] of terms) {
    room(78);
    paragraph(label, { size: 11, strong: true, after: 5 });
    paragraph(value, { size: 9, color: muted, after: 17 });
  }
  room(72);
  page.drawRectangle({ x: M, y: y - 54, width: CW, height: 70, color: paper });
  draw("Conversemos sobre tu proyecto.", M + 16, y - 5, 13, true);
  draw(
    `${siteConfig.contact.email}  |  ${siteConfig.contact.phoneDisplay}`,
    M + 16,
    y - 26,
    9,
    false,
    blue,
  );
  draw(
    siteConfig.address.streetAddress + ", " + siteConfig.address.commune + ", Santiago",
    M + 16,
    y - 43,
    8,
    false,
    muted,
  );

  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    page = p;
    page.drawLine({
      start: { x: M, y: 47 },
      end: { x: W - M, y: 47 },
      thickness: 0.6,
      color: line,
    });
    draw(`${siteConfig.legalName} · RUT ${siteConfig.taxId}`, M, 32, 7.3, false, muted);
    draw(`www.zyteron.cl  |  ${ref}`, M, 20, 7.3, false, muted);
    right(`${i + 1} / ${pages.length}`, W - M, 29, 8, true, muted);
  });
  return pdf.save();
}
