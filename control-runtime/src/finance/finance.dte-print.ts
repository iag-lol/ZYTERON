import { UnprocessableEntityException } from "@nestjs/common";
import { createPublicKey, verify } from "node:crypto";
import bwipjs from "bwip-js";
import {
  PDFDocument,
  PDFName,
  PDFString,
  StandardFonts,
  rgb,
  setCharacterSpacing,
  type Color,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { children, local, parseXml, textOf, type XmlNode } from "./finance.formats.js";
import { normalizeRut } from "./finance.util.js";
import { verifySiiXmlSignatures } from "./finance.sii-signatures.js";

export interface PrintedDteRecord {
  documentTypeCode: number;
  folio: number | null;
  environment: string;
  status: string;
  emitterRut: string;
  receiverRut: string;
  issueDate: string;
  totalAmount: number;
}
const labels: Record<number, string> = {
  33: "FACTURA ELECTRÓNICA",
  34: "FACTURA NO AFECTA O EXENTA ELECTRÓNICA",
  56: "NOTA DE DÉBITO ELECTRÓNICA",
  61: "NOTA DE CRÉDITO ELECTRÓNICA",
  39: "BOLETA ELECTRÓNICA",
  41: "BOLETA EXENTA ELECTRÓNICA",
  43: "LIQUIDACIÓN FACTURA ELECTRÓNICA",
  46: "FACTURA DE COMPRA ELECTRÓNICA",
  52: "GUÍA DE DESPACHO ELECTRÓNICA",
  110: "FACTURA DE EXPORTACIÓN ELECTRÓNICA",
  111: "NOTA DE DÉBITO DE EXPORTACIÓN ELECTRÓNICA",
  112: "NOTA DE CRÉDITO DE EXPORTACIÓN ELECTRÓNICA",
};
const reject = (message: string): never => {
  throw new UnprocessableEntityException(message);
};
const exactlyOne = (node: XmlNode, name: string) => {
  const found = children(node, name);
  return found.length === 1
    ? found[0]!
    : reject(`Representación DTE: se requiere un único ${name}.`);
};
const oneFragment = (xml: string, tag: string) => {
  const fragments = [...xml.matchAll(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "g"))];
  return fragments.length === 1
    ? fragments[0]![0]
    : reject(`Representación DTE: ${tag} ausente o ambiguo.`);
};
const compact = (value: string) => value.replace(/>\s+</g, "><");
const amount = (value: string) =>
  /^\d+$/.test(value) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : reject("Monto del DTE inválido.");
const sameRut = (a: string, b: string) => normalizeRut(a) === normalizeRut(b);
const base64 = (value: string) => {
  const normalized = value.replace(/\s/g, "");
  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized))
    reject("Firma del timbre inválida.");
  return Buffer.from(normalized, "base64");
};

/** Lee únicamente archivos archivados del mismo DTE; nunca obtiene folios ni firma un documento nuevo. */
export function printedDteData(signed: Buffer, envelope: Buffer, expected: PrintedDteRecord) {
  if (
    !labels[expected.documentTypeCode] ||
    !Number.isSafeInteger(expected.folio) ||
    Number(expected.folio) <= 0
  )
    reject("El documento no tiene un tipo y folio imprimibles.");
  if (
    !["CERTIFICATION", "PRODUCTION"].includes(expected.environment) ||
    ![
      "SIGNED",
      "SUBMITTED",
      "RECEIVED_BY_SII",
      "ACCEPTED",
      "ACCEPTED_WITH_REPAIRS",
      "REJECTED",
    ].includes(expected.status)
  )
    reject("El documento todavía no tiene un XML firmado imprimible.");
  const signedXml = signed.toString("latin1"),
    envelopeXml = envelope.toString("latin1");
  const root = parseXml(signedXml),
    outer = parseXml(envelopeXml);
  const documentTag =
    expected.documentTypeCode === 43
      ? "Liquidacion"
      : expected.documentTypeCode >= 110
        ? "Exportaciones"
        : "Documento";
  if (local(root.name) !== "DTE" || !["EnvioDTE", "EnvioBOLETA"].includes(local(outer.name)))
    reject("Se requiere el DTE firmado y su envío original.");
  const document = exactlyOne(root, documentTag),
    signature = exactlyOne(root, "Signature");
  const set = exactlyOne(outer, "SetDTE"),
    cover = exactlyOne(set, "Caratula"),
    archivedCandidates = children(set, "DTE").filter((d) =>
      children(d, documentTag).some(
        (n) => n.attrs.ID === `F${expected.folio}T${expected.documentTypeCode}`,
      ),
    );
  if (archivedCandidates.length !== 1)
    reject("El XML firmado no coincide con un documento único del envío original.");
  const archivedDte = archivedCandidates[0]!,
    archivedDocument = exactlyOne(archivedDte, documentTag);
  const id = `F${expected.folio}T${expected.documentTypeCode}`;
  if (
    document.attrs.ID !== id ||
    archivedDocument.attrs.ID !== id ||
    oneFragment(signedXml, documentTag) !==
      [
        ...envelopeXml.matchAll(
          new RegExp(`<${documentTag}\\b[^>]*>[\\s\\S]*?<\\/${documentTag}>`, "g"),
        ),
      ]
        .map((m) => m[0])
        .find((fragment) => fragment.includes(`ID="${id}"`))
  )
    reject("El XML firmado no coincide con el envío original.");
  if (
    !textOf(signature, "SignatureValue") ||
    textOf(signature, "SignatureValue") !==
      textOf(exactlyOne(archivedDte, "Signature"), "SignatureValue")
  )
    reject("La firma del documento no coincide con su envío archivado.");
  const header = exactlyOne(document, "Encabezado"),
    identity = exactlyOne(header, "IdDoc");
  const issuer = exactlyOne(header, "Emisor"),
    receiver = exactlyOne(header, "Receptor"),
    totals = exactlyOne(header, "Totales");
  const type = amount(textOf(identity, "TipoDTE")),
    folio = amount(textOf(identity, "Folio")),
    total = Number(textOf(totals, "MntTotal"));
  if (
    !Number.isFinite(total) ||
    !/^-?\d+(?:\.\d{1,2})?$/.test(textOf(totals, "MntTotal")) ||
    (expected.documentTypeCode !== 43 && total < 0)
  )
    reject("Monto del DTE inválido.");
  const date = textOf(identity, "FchEmis"),
    issuerRut = textOf(issuer, "RUTEmisor"),
    receiverRut = textOf(receiver, "RUTRecep");
  if (
    type !== expected.documentTypeCode ||
    folio !== expected.folio ||
    total !== Number(expected.totalAmount) ||
    date !== String(expected.issueDate).slice(0, 10) ||
    !sameRut(issuerRut, expected.emitterRut) ||
    !sameRut(receiverRut, expected.receiverRut) ||
    !sameRut(textOf(cover, "RutEmisor"), issuerRut)
  )
    reject("El documento archivado no coincide con su registro tributario.");
  const resolutionDate = textOf(cover, "FchResol"),
    resolutionNumber = textOf(cover, "NroResol");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolutionDate) || !/^\d+$/.test(resolutionNumber))
    reject("El envío no contiene la resolución original.");
  const tedNode = exactlyOne(document, "TED"),
    ddNode = exactlyOne(tedNode, "DD"),
    stampSignature = exactlyOne(tedNode, "FRMT");
  if (tedNode.attrs.version !== "1.0" || stampSignature.attrs.algoritmo !== "SHA1withRSA")
    reject("Formato de timbre no soportado.");
  if (
    amount(textOf(ddNode, "TD")) !== type ||
    amount(textOf(ddNode, "F")) !== folio ||
    (!/^\d+(?:\.\d{1,4})?$/.test(textOf(ddNode, "MNT")) ||
      Number(textOf(ddNode, "MNT")) !== (type >= 110 ? total : Math.round(total))) ||
    textOf(ddNode, "FE") !== date ||
    !sameRut(textOf(ddNode, "RE"), issuerRut) ||
    !sameRut(textOf(ddNode, "RR"), receiverRut)
  )
    reject("El timbre no corresponde al documento.");
  const caf = exactlyOne(ddNode, "CAF"),
    authorization = exactlyOne(caf, "DA");
  if (
    !sameRut(textOf(authorization, "RE"), issuerRut) ||
    amount(textOf(authorization, "TD")) !== type ||
    folio < amount(textOf(authorization, "RNG", "D")) ||
    folio > amount(textOf(authorization, "RNG", "H"))
  )
    reject("El folio no corresponde al CAF del timbre.");
  const ted = compact(oneFragment(signedXml, "TED"));
  if (/[^\x09\x0a\x0d\x20-\xff]/.test(ted) || /<!--|<!\[CDATA\[/i.test(ted))
    reject("Codificación del timbre no soportada.");
  const dd = compact(oneFragment(ted, "DD"));
  try {
    const key = createPublicKey({
      key: {
        kty: "RSA",
        n: base64(textOf(authorization, "RSAPK", "M")).toString("base64url"),
        e: base64(textOf(authorization, "RSAPK", "E")).toString("base64url"),
      },
      format: "jwk",
    });
    if (!verify("RSA-SHA1", Buffer.from(dd, "latin1"), key, base64(textOf(stampSignature))))
      reject("La firma del timbre no es válida.");
  } catch {
    reject("La firma del timbre no es válida.");
  }
  const lines = children(document, "Detalle");
  if (
    textOf(ddNode, "RSR") !== textOf(receiver, "RznSocRecep").slice(0, 40).trim() ||
    textOf(ddNode, "IT1") !== textOf(lines[0], "NmbItem").slice(0, 40).trim()
  )
    reject("El receptor o detalle del timbre no coincide con el documento.");
  if (
    totals.children.some(
      (node) =>
        ![
          "MntNeto",
          "MntExe",
          "TasaIVA",
          "IVA",
          "MntTotal",
          ...(type >= 110 ? ["TpoMoneda"] : []),
          ...(type === 43 ? ["Comisiones", "IVAProp", "IVATerc"] : []),
          ...([46, 56, 61].includes(type) ? ["ImptoReten"] : []),
        ].includes(local(node.name)),
    )
  )
    reject("Los impuestos adicionales requieren un formato de impresión específico.");
  for (const line of lines) {
    const value = textOf(line, "MontoItem");
    if (!(type === 43 ? /^-?\d+$/ : type >= 110 ? /^\d+(?:\.\d{1,2})?$/ : /^\d+$/).test(value))
      reject("Monto de línea inválido.");
    for (const field of ["QtyItem", "PrcItem"]) {
      const value = textOf(line, field);
      if (value && !/^\d+(?:\.\d{1,6})?$/.test(value))
        reject("Cantidad o precio unitario inválido.");
    }
  }
  if (!lines.length || lines.length > 60)
    reject("El documento no tiene un detalle imprimible en una hoja.");
  verifySiiXmlSignatures(envelopeXml);
  return {
    type,
    folio,
    total,
    date,
    issuerRut,
    receiverRut,
    issuer,
    receiver,
    totals,
    lines,
    ted,
    resolutionDate,
    resolutionNumber,
    references: children(document, "Referencia"),
    adjustments: children(document, "DscRcgGlobal"),
    commissions: children(document, "Comisiones"),
    transport: children(header, "Transporte")[0],
    identity,
    environment: expected.environment,
    status: expected.status,
  };
}

/** Byte Compaction explícita: 924 para bloques de seis octetos y 901 para el resto. */
export function pdf417ByteCodewords(bytes: Buffer) {
  const words: number[] = [];
  const groups = Math.floor(bytes.length / 6);
  if (groups) words.push(924);
  for (let group = 0; group < groups; group++) {
    let value = bytes.readUIntBE(group * 6, 6);
    const block = new Array<number>(5);
    for (let index = 4; index >= 0; index--) {
      block[index] = value % 900;
      value = Math.floor(value / 900);
    }
    words.push(...block);
  }
  if (bytes.length % 6) words.push(901, ...bytes.subarray(groups * 6));
  if (!words.length || words.length > 863)
    reject("El timbre excede la capacidad PDF417 con nivel de corrección 5.");
  return words.map((value) => `^${String(value).padStart(3, "0")}`).join("");
}
export async function printedDteBarcode(ted: string): Promise<Buffer> {
  const options: bwipjs.RenderOptions & {
    raw: boolean;
    eclevel: number;
    fixedeclevel: boolean;
    columns: number;
    rowmult: number;
  } = {
    bcid: "pdf417",
    text: pdf417ByteCodewords(Buffer.from(ted, "latin1")),
    raw: true,
    eclevel: 5,
    fixedeclevel: true,
    columns: 17,
    rowmult: 3,
    scale: 3,
    padding: 0,
    backgroundcolor: "FFFFFF",
  };
  return bwipjs.toBuffer(options);
}
const currency = (value: string | number) =>
  "$" + new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 }).format(Number(value));
const presentDate = (value: string) => value.slice(0, 10).split("-").reverse().join("-");
const wrap = (value: string, font: PDFFont, size: number, width: number) => {
  const lines: string[] = [];
  let line = "";
  for (const word of value.replace(/\s+/g, " ").trim().split(" ")) {
    try {
      font.encodeText(word);
    } catch {
      reject("El texto del DTE contiene caracteres no representables por la fuente de impresión.");
    }
    const next = line ? line + " " + word : word;
    if (font.widthOfTextAtSize(next, size) <= width) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = "";
    for (const character of word) {
      if (font.widthOfTextAtSize(line + character, size) > width && line) {
        lines.push(line);
        line = "";
      }
      line += character;
    }
  }
  if (line) lines.push(line.trim());
  return lines.length ? lines : [""];
};

// ===================================================================== Representación impresa
// Ancho exigido por el SII (21,5 cm). El contenido se mantiene entre 36 y 559 pt para que
// también conserve márgenes simétricos al imprimirse en una hoja A4.
const PAGE_WIDTH = (21.5 / 2.54) * 72;
const PAGE_HEIGHT = 841.89;
const LEFT = 36;
const RIGHT = 559;
const WIDTH = RIGHT - LEFT;
/** Límite inferior del detalle; bajo él se reservan referencias, monto en palabras, totales y timbre. */
const DETAIL_FLOOR = 283;
const EXTRAS_FLOOR = 252;
const ZYTERON_RUT = "78398774-0";
const palette = {
  ink: rgb(0.035, 0.075, 0.17),
  blue: rgb(0.055, 0.35, 0.93),
  teal: rgb(0.02, 0.72, 0.68),
  slate: rgb(0.32, 0.4, 0.53),
  mist: rgb(0.54, 0.61, 0.7),
  line: rgb(0.84, 0.88, 0.93),
  hairline: rgb(0.9, 0.925, 0.955),
  soft: rgb(0.965, 0.975, 0.988),
  zebra: rgb(0.978, 0.984, 0.994),
  white: rgb(1, 1, 1),
  red: rgb(0.76, 0.08, 0.08),
};
const tones = {
  alert: { fg: rgb(0.72, 0.09, 0.09), bg: rgb(0.995, 0.94, 0.94) },
  ok: { fg: rgb(0.02, 0.45, 0.29), bg: rgb(0.91, 0.97, 0.94) },
  pending: { fg: rgb(0.66, 0.4, 0.02), bg: rgb(1, 0.965, 0.9) },
};
/** Falta de espacio: se reintenta con la variante compacta antes de rechazar. */
class PrintOverflow extends Error {}
const overflow = (message: string): never => {
  throw new PrintOverflow(message);
};

const UNITS = [
  "", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez",
  "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho",
  "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro",
  "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve",
];
const TENS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const HUNDREDS = [
  "", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos",
  "setecientos", "ochocientos", "novecientos",
];
const belowThousand = (n: number) => {
  if (n === 100) return "cien";
  const rest = n % 100;
  const tail =
    rest < 30 ? UNITS[rest]! : TENS[Math.floor(rest / 10)]! + (rest % 10 ? " y " + UNITS[rest % 10] : "");
  return [HUNDREDS[Math.floor(n / 100)], tail].filter(Boolean).join(" ");
};
const apocope = (words: string) => words.replace(/veintiuno$/, "veintiún").replace(/(^|\s)uno$/, "$1un");
const belowMillion = (n: number) => {
  const thousands = Math.floor(n / 1000),
    rest = n % 1000;
  return [
    thousands === 0 ? "" : thousands === 1 ? "mil" : apocope(belowThousand(thousands)) + " mil",
    rest ? apocope(belowThousand(rest)) : "",
  ]
    .filter(Boolean)
    .join(" ");
};
/** Monto entero en pesos chilenos escrito en palabras ("ciento diecinueve mil pesos"). */
export function amountInWords(value: number) {
  if (!Number.isSafeInteger(value) || value < 0 || value >= 1e12) return "";
  if (value === 0) return "cero pesos";
  if (value === 1) return "un peso";
  const millions = Math.floor(value / 1e6),
    rest = value % 1e6;
  const words = [
    millions === 0 ? "" : millions === 1 ? "un millón" : belowMillion(millions) + " millones",
    rest ? belowMillion(rest) : "",
  ]
    .filter(Boolean)
    .join(" ");
  return words + (millions && !rest ? " de pesos" : " pesos");
}

let brandLogo: Buffer | null | undefined;
/** Logotipo oficial de Zyteron. Si el recurso no está disponible se usa el monograma; nunca bloquea la impresión. */
const zyteronLogo = () => {
  if (brandLogo !== undefined) return brandLogo;
  for (const candidate of [
    fileURLToPath(new URL("../../resources/brand/zyteron-logo.png", import.meta.url)),
    resolve(process.cwd(), "resources/brand/zyteron-logo.png"),
    resolve(process.cwd(), "control-runtime/resources/brand/zyteron-logo.png"),
  ])
    if (existsSync(candidate)) return (brandLogo = readFileSync(candidate));
  return (brandLogo = null);
};
const initials = (name: string) => {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word && !/^(spa|ltda|limitada|s\.?a|eirl|y|de|del|la|el|cia|cía)$/i.test(word));
  return (words.slice(0, 2).map((word) => word[0]).join("") || name.trim()[0] || "?").toUpperCase();
};

export async function renderPrintedDte(
  signed: Buffer,
  envelope: Buffer,
  expected: PrintedDteRecord,
  siiOffice?: string,
  copy: "TRIBUTARY" | "TRANSFERABLE" = "TRIBUTARY",
  verificationUrl?: string,
) {
  const data = printedDteData(signed, envelope, expected);
  if (
    verificationUrl &&
    (!/^https:\/\/www\.zyteron\.cl\/boletas\/consulta#v[12]\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(
      verificationUrl,
    ) ||
      ![39, 41].includes(data.type))
  )
    reject("URL de consulta de boleta inválida.");
  if ([39, 41].includes(data.type) && expected.environment === "PRODUCTION" && !verificationUrl)
    reject("La representación de boleta requiere su consulta web disponible.");
  if (
    copy === "TRANSFERABLE" &&
    ![
      33,
      34,
      43,
      46,
      ...(data.type === 52 && [1, 9].includes(Number(textOf(data.identity, "IndTraslado")))
        ? [52]
        : []),
    ].includes(data.type)
  )
    reject("Este documento o traslado no admite copia cedible.");
  if (expected.environment === "PRODUCTION" && !siiOffice?.trim())
    reject(
      "Configura la oficina regional real del SII (DTE_SII_OFFICE) antes de generar la representación de producción.",
    );
  const currencyCode =
    ({ "DOLAR USA": "USD", EURO: "EUR", "PESO CL": "CLP" } as Record<string, string>)[
      textOf(data.totals, "TpoMoneda")
    ] || textOf(data.totals, "TpoMoneda");
  const displayMoney = (value: string | number) =>
    data.type >= 110
      ? currencyCode +
        " " +
        new Intl.NumberFormat("es-CL", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(value))
      : currency(value);
  const displayRut = (value: string) =>
    value.replace(
      /^(\d+)-([\dkK])$/,
      (full, digits: string, digit: string) =>
        digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "-" + digit,
    );
  const banner =
    data.environment === "CERTIFICATION"
      ? "CERTIFICACIÓN - SIN VALIDEZ TRIBUTARIA"
      : data.status === "REJECTED"
        ? "RECHAZADO POR EL SII - SIN VALIDEZ TRIBUTARIA"
        : ["ACCEPTED", "ACCEPTED_WITH_REPAIRS"].includes(data.status)
          ? "DOCUMENTO ACEPTADO POR EL SII"
          : "PENDIENTE DE VALIDACIÓN POR EL SII";
  const tone =
    tones[
      data.environment === "CERTIFICATION" || data.status === "REJECTED"
        ? "alert"
        : ["ACCEPTED", "ACCEPTED_WITH_REPAIRS"].includes(data.status)
          ? "ok"
          : "pending"
    ];
  const issuerName = textOf(data.issuer, "RznSoc") || textOf(data.issuer, "RznSocEmisor");
  const receiverName = textOf(data.receiver, "RznSocRecep");
  const genericReceiver =
    [39, 41].includes(data.type) && normalizeRut(data.receiverRut) === "66666666-6";
  const boleta = [39, 41].includes(data.type);
  const barcodePng = await printedDteBarcode(data.ted);
  const qrPng = verificationUrl
    ? await bwipjs.toBuffer({ bcid: "qrcode", text: verificationUrl, scale: 3, padding: 4 })
    : undefined;

  const compose = async (compact: boolean) => {
    const pdf = await PDFDocument.create();
    pdf.setTitle(`${labels[data.type]} ${data.folio}`);
    pdf.setAuthor(issuerName || "Zyteron SpA");
    pdf.setSubject(`${labels[data.type]} N° ${data.folio} · ${receiverName}`);
    pdf.setProducer("Zyteron - representación del XML archivado");
    pdf.setCreator("Zyteron Control · Representación impresa DTE");
    pdf.setKeywords(["DTE", labels[data.type]!, `Folio ${data.folio}`]);
    pdf.setLanguage("es-CL");
    const regular = await pdf.embedFont(StandardFonts.Helvetica),
      bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const { ink, blue, teal, slate, mist, line, hairline, soft, zebra, white, red } = palette;

    const text = (value: string, x: number, y: number, size = 9, font = regular, color: Color = ink) =>
      page.drawText(value, { x, y, size, font, color });
    const right = (value: string, edge: number, y: number, size = 9, font = regular, color: Color = ink) =>
      text(value, edge - font.widthOfTextAtSize(value, size), y, size, font, color);
    const center = (value: string, middle: number, y: number, size = 9, font = regular, color: Color = ink) =>
      text(value, middle - font.widthOfTextAtSize(value, size) / 2, y, size, font, color);
    const spacedWidth = (value: string, size: number, font: PDFFont, tracking: number) =>
      font.widthOfTextAtSize(value, size) + tracking * value.length;
    const spaced = (value: string, x: number, y: number, size: number, font: PDFFont, color: Color, tracking = 0.9) => {
      page.pushOperators(setCharacterSpacing(tracking));
      text(value, x, y, size, font, color);
      page.pushOperators(setCharacterSpacing(0));
    };
    const box = (
      x: number,
      y: number,
      width: number,
      height: number,
      style: { fill?: Color; border?: Color; borderWidth?: number; radius?: number },
    ) => {
      const r = Math.min(style.radius ?? 0, width / 2, height / 2);
      if (!r) {
        page.drawRectangle({
          x,
          y,
          width,
          height,
          color: style.fill,
          borderColor: style.border,
          borderWidth: style.border ? (style.borderWidth ?? 0.6) : 0,
        });
        return;
      }
      page.drawSvgPath(
        `M ${r} 0 H ${width - r} Q ${width} 0 ${width} ${r} V ${height - r} Q ${width} ${height} ${width - r} ${height} H ${r} Q 0 ${height} 0 ${height - r} V ${r} Q 0 0 ${r} 0 Z`,
        {
          x,
          y: y + height,
          color: style.fill,
          borderColor: style.border,
          borderWidth: style.border ? (style.borderWidth ?? 0.6) : undefined,
        },
      );
    };
    const rule = (x1: number, x2: number, y: number, color: Color = line, thickness = 0.5) =>
      page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color });
    const paragraphs = (
      value: string,
      x: number,
      y: number,
      width: number,
      size = 9,
      font = regular,
      color: Color = ink,
      leading = size + 3,
    ) => {
      for (const row of wrap(value, font, size, width)) {
        text(row, x, y, size, font, color);
        y -= leading;
      }
      return y;
    };
    /** Datos informativos opcionales: se omiten caracteres no imprimibles en vez de impedir la emisión. */
    const printable = (value: string) =>
      [...value.replace(/\s+/g, " ").trim()]
        .filter((character) => {
          try {
            regular.encodeText(character);
            bold.encodeText(character);
            return true;
          } catch {
            return false;
          }
        })
        .join("")
        .trim();
    const fitSize = (value: string, font: PDFFont, size: number, width: number) =>
      Math.min(size, (width / Math.max(1, font.widthOfTextAtSize(value, size))) * size);

    // ------------------------------------------------------------------ franja de marca
    const brandBar = (y: number, height: number) => {
      page.drawRectangle({ x: 0, y, width: PAGE_WIDTH * 0.42, height, color: teal });
      page.drawRectangle({ x: PAGE_WIDTH * 0.42, y, width: PAGE_WIDTH * 0.58, height, color: blue });
    };
    brandBar(PAGE_HEIGHT - 6, 6);

    // ------------------------------------------------------------------ emisor
    let column = LEFT,
      nameTop = 797,
      nameSize = 15;
    const logo = normalizeRut(data.issuerRut) === ZYTERON_RUT ? zyteronLogo() : null;
    if (logo) {
      // Logotipo horizontal (símbolo y nombre); la razón social legal va debajo.
      const image = await pdf.embedPng(logo);
      const height = 36,
        width = (image.width / image.height) * height;
      page.drawImage(image, { x: LEFT - 2, y: 812 - height, width, height });
      nameTop = 812 - height - 16;
      nameSize = 11.5;
    } else {
      box(LEFT, 770, 42, 42, { fill: ink, radius: 8 });
      page.drawRectangle({ x: LEFT + 8, y: 777, width: 26, height: 2, color: teal });
      const mark = initials(issuerName);
      center(mark, LEFT + 21, 786, fitSize(mark, bold, 16, 30), bold, white);
      column = LEFT + 54;
    }
    const columnWidth = 343 - column;
    let issuerY = paragraphs(issuerName, column, nameTop, columnWidth, nameSize, bold, ink, nameSize + 2.5);
    issuerY = paragraphs(
      textOf(data.issuer, "GiroEmis") || textOf(data.issuer, "GiroEmisor"),
      column,
      issuerY - 1,
      columnWidth,
      8.5,
      regular,
      slate,
      11,
    );
    issuerY = paragraphs(
      [textOf(data.issuer, "DirOrigen"), textOf(data.issuer, "CmnaOrigen")]
        .filter(Boolean)
        .join(" · "),
      column,
      issuerY,
      columnWidth,
      8,
      regular,
      slate,
      10.5,
    );
    const contact = printable(
      [
        textOf(data.issuer, "Telefono"),
        textOf(data.issuer, "CorreoEmisor"),
        normalizeRut(data.issuerRut) === ZYTERON_RUT ? "www.zyteron.cl" : "",
      ]
        .filter(Boolean)
        .join("  ·  "),
    );
    if (contact) issuerY = paragraphs(contact, column, issuerY, columnWidth, 7.5, regular, mist, 10);
    if (issuerY < 560) reject("Los datos del emisor exceden el espacio disponible de impresión.");

    // Advertencia de estado: solo para documentos sin validez tributaria o aún no aceptados.
    const showStatus = tone !== tones.ok;
    const pillWidth = spacedWidth(banner, 6.5, bold, 0.6) + 24;
    const pillX = column + pillWidth <= 343 ? column : LEFT;
    const pillY = showStatus ? issuerY - 15 : issuerY;
    if (showStatus) {
      box(pillX, pillY, pillWidth, 15, { fill: tone.bg, radius: 7.5 });
      page.drawCircle({ x: pillX + 9, y: pillY + 7.5, size: 2.4, color: tone.fg });
      spaced(banner, pillX + 16, pillY + 5, 6.5, bold, tone.fg, 0.6);
    }

    // ------------------------------------------------------------------ recuadro SII
    page.drawRectangle({ x: 355, y: 716, width: 204, height: 101, borderColor: red, borderWidth: 1.6 });
    const boxCenter = 355 + 102;
    const rutLabel = `R.U.T.: ${displayRut(data.issuerRut)}`;
    const typeRows = wrap(labels[data.type]!, bold, 10.5, 184);
    // Bloque centrado verticalmente: RUT, tipo de documento y folio.
    const blockHeight = 12 + 9 + typeRows.length * 12.5 + 8 + 17;
    const blockTop = 716 + (101 + blockHeight) / 2;
    center(rutLabel, boxCenter, blockTop - 10, fitSize(rutLabel, bold, 12, 184), bold, red);
    typeRows.forEach((row, index) =>
      center(row, boxCenter, blockTop - 31 - index * 12.5, 10.5, bold, red),
    );
    const folioLabel = `N° ${data.folio}`;
    const folioY = blockTop - blockHeight + 1;
    page.drawLine({
      start: { x: boxCenter - 22, y: folioY + 20 },
      end: { x: boxCenter + 22, y: folioY + 20 },
      thickness: 0.8,
      color: red,
    });
    center(folioLabel, boxCenter, folioY, fitSize(folioLabel, bold, 17, 184), bold, red);
    const officeRows = wrap(
      `S.I.I. - ${siiOffice?.trim() || "OFICINA PENDIENTE DE VALIDACIÓN"}`,
      bold,
      7,
      204,
    );
    officeRows.forEach((row, index) => center(row, boxCenter, 704 - index * 9, 7, bold, slate));

    const headerBottom = Math.min(pillY - 9, 704 - officeRows.length * 9 - 1);
    rule(LEFT, RIGHT, headerBottom, line, 0.6);

    // ------------------------------------------------------------------ receptor y documento
    const cardTop = headerBottom - 11;
    const receiverWidth = 340,
      documentX = LEFT + receiverWidth + 10,
      documentWidth = RIGHT - documentX;
    const keyWidth = 58;
    const valueWidth = receiverWidth - 24 - keyWidth;
    const receiverRows = (
      [
        ["RUT", genericReceiver ? "" : displayRut(data.receiverRut)],
        ["GIRO", textOf(data.receiver, "GiroRecep")],
        [
          "DIRECCIÓN",
          [textOf(data.receiver, "DirRecep"), textOf(data.receiver, "CmnaRecep")]
            .filter(Boolean)
            .join(" · ") +
            (printable(textOf(data.receiver, "CiudadRecep"))
              ? " · " + printable(textOf(data.receiver, "CiudadRecep"))
              : ""),
        ],
        ...(compact
          ? []
          : [
              [
                "CONTACTO",
                printable(
                  [textOf(data.receiver, "Contacto"), textOf(data.receiver, "CorreoRecep")]
                    .filter(Boolean)
                    .join(" · "),
                ),
              ],
            ]),
      ] as Array<[string, string]>
    )
      .filter(([, value]) => value.replace(/^ · /, "").trim())
      .map(([key, value]) => ({ key, rows: wrap(value.replace(/^ · /, ""), regular, 8.5, valueWidth) }));
    const nameRows = wrap(receiverName, bold, 10.5, receiverWidth - 24);
    const receiverHeight =
      22 + nameRows.length * 13 + 4 + receiverRows.reduce((sum, row) => sum + row.rows.length * 11 + 2.5, 0) + 6;

    const paymentLabel = (
      { "1": "Contado", "2": "Crédito", "3": "Sin costo" } as Record<string, string>
    )[textOf(data.identity, "FmaPago")];
    const dueDate = textOf(data.identity, "FchVenc");
    const paymentMethod = Number(textOf(data.identity, "MedioPago"));
    const documentRows = (
      [
        ["EMISIÓN", presentDate(data.date)],
        ["VENCIMIENTO", /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? presentDate(dueDate) : ""],
        ["FORMA DE PAGO", paymentLabel ?? ""],
        [
          "MEDIO DE PAGO",
          boleta && paymentMethod
            ? ({ 1: "Efectivo", 2: "Pago electrónico", 3: "Transferencia", 4: "Cheque", 5: "Otro" } as Record<number, string>)[paymentMethod] ?? "Revisar"
            : "",
        ],
        ["MONEDA", data.type >= 110 ? printable(textOf(data.totals, "TpoMoneda")) : ""],
      ] as Array<[string, string]>
    ).filter(([, value]) => value);
    const documentHeight = 22 + documentRows.length * 16 + 6;
    const cardHeight = Math.max(receiverHeight, documentHeight, 64);
    const cardBottom = cardTop - cardHeight;
    for (const [x, width, accent] of [
      [LEFT, receiverWidth, blue],
      [documentX, documentWidth, teal],
    ] as const) {
      box(x, cardBottom, width, cardHeight, { fill: soft, border: hairline, borderWidth: 0.6, radius: 5 });
      page.drawRectangle({ x, y: cardBottom + 6, width: 2.4, height: cardHeight - 12, color: accent });
    }
    spaced(boleta ? "CLIENTE" : "RECEPTOR", LEFT + 12, cardTop - 15, 6.5, bold, blue, 1.1);
    let ry = cardTop - 30;
    for (const row of nameRows) {
      text(row, LEFT + 12, ry, 10.5, bold, ink);
      ry -= 13;
    }
    ry -= 2;
    for (const row of receiverRows) {
      spaced(row.key, LEFT + 12, ry + 0.5, 6, bold, mist, 0.5);
      row.rows.forEach((value, index) => text(value, LEFT + 12 + keyWidth, ry - index * 11, 8.5, regular, ink));
      ry -= row.rows.length * 11 + 2.5;
    }
    spaced("DOCUMENTO", documentX + 12, cardTop - 15, 6.5, bold, teal, 1.1);
    documentRows.forEach(([key, value], index) => {
      const y = cardTop - 32 - index * 16;
      spaced(key, documentX + 12, y + 0.5, 6, bold, mist, 0.5);
      const keyEnd = documentX + 12 + spacedWidth(key, 6, bold, 0.5) + 6;
      right(value, RIGHT - 11, y, fitSize(value, bold, 8.5, RIGHT - 11 - keyEnd), bold, ink);
      if (index < documentRows.length - 1) rule(documentX + 12, RIGHT - 11, y - 5.5, hairline, 0.5);
    });

    // ------------------------------------------------------------------ datos de traslado y exportación
    let y = cardBottom - 6;
    const notes: string[] = [];
    if (data.type === 52)
      notes.push(
        `Tipo de traslado: ${{ "1": "Operación constituye venta", "2": "Ventas por efectuar", "3": "Consignaciones", "4": "Entrega gratuita", "5": "Traslados internos", "6": "Otros traslados no venta", "7": "Guía de devolución", "8": "Traslado para exportación (no venta)", "9": "Venta para exportación" }[textOf(data.identity, "IndTraslado")] || textOf(data.identity, "IndTraslado")} · Despacho: ${textOf(data.identity, "TipoDespacho")}`,
      );
    const customs = children(data.transport!, "Aduana")[0];
    if (customs) {
      const country = (code: string) => ({ "224": "Argentina", "336": "China" })[code] || code;
      const port = (code: string) =>
        ({ "901": "Arica", "904": "Coquimbo", "262": "Buenos Aires", "411": "Shangai" })[code] ||
        code;
      const packages = children(customs, "TipoBultos")[0];
      notes.push(
        `Moneda: ${textOf(data.totals, "TpoMoneda")} · País receptor: ${country(textOf(customs, "CodPaisRecep"))} · Destino: ${country(textOf(customs, "CodPaisDestin"))}`,
        `Embarque: ${port(textOf(customs, "CodPtoEmbarque")) || "No aplica"} · Desembarque: ${port(textOf(customs, "CodPtoDesemb")) || "No aplica"} · Bultos: ${textOf(customs, "TotBultos") || "No aplica"}`,
        ...(textOf(customs, "CodClauVenta") || textOf(data.identity, "FmaPagExp")
          ? [
              `Cláusula: ${{ "1": "CIF", "5": "FOB" }[textOf(customs, "CodClauVenta")] || textOf(customs, "CodClauVenta")} · Total cláusula: ${textOf(customs, "TotClauVenta")} · Pago: ${{ "2": "COBRANZA", "11": "ACRED" }[textOf(data.identity, "FmaPagExp")] || textOf(data.identity, "FmaPagExp")}`,
            ]
          : []),
        ...(textOf(customs, "PesoNeto")
          ? [
              `Tara: ${textOf(customs, "Tara")} · Peso bruto: ${textOf(customs, "PesoBruto")} · Peso neto: ${textOf(customs, "PesoNeto")}`,
            ]
          : []),
        ...(packages
          ? [
              `Marcas: ${textOf(packages, "Marcas")} · Contenedor: ${textOf(packages, "IdContainer") || "No aplica"}`,
              ...(textOf(packages, "Sello")
                ? [`Sello: ${textOf(packages, "Sello")} · Emisor: ${textOf(packages, "EmisorSello")}`]
                : []),
            ]
          : []),
      );
    }
    if (notes.length) {
      y -= 12;
      spaced(customs ? "DATOS DE EXPORTACIÓN" : "DATOS DEL TRASLADO", LEFT, y, 6, bold, blue, 1);
      y -= 11;
      for (const note of notes) y = paragraphs(note, LEFT, y, WIDTH, 7.5, regular, slate, 10);
      y += 4;
    }

    // ------------------------------------------------------------------ detalle
    const columns = { description: LEFT + 8, quantity: 392, price: 472, amount: RIGHT - 8 };
    const separators = [344, 398, 478];
    const headTop = y - 8;
    box(LEFT, headTop - 20, WIDTH, 20, { fill: ink, radius: 3 });
    page.drawRectangle({ x: LEFT, y: headTop - 20, width: WIDTH, height: 4, color: ink });
    spaced("DESCRIPCIÓN", columns.description, headTop - 13, 6.8, bold, white, 0.8);
    for (const [label, edge] of [
      ["CANT.", columns.quantity],
      [boleta && textOf(data.identity, "IndMntNeto") !== "2" ? "P. UNIT. CON IVA" : "P. UNITARIO", columns.price],
      ["MONTO", columns.amount],
    ] as const)
      spaced(label, edge - spacedWidth(label, 6.8, bold, 0.6) + 0.6, headTop - 13, 6.8, bold, white, 0.6);
    const bodyTop = headTop - 20;
    let rowTop = bodyTop;
    const rowShapes: Array<{ top: number; height: number }> = [];
    for (const item of data.lines) {
      const name = textOf(item, "NmbItem"),
        detail = textOf(item, "DscItem"),
        exempt = textOf(item, "IndExe") === "1";
      const lineAdjustments = [
        ...(Number(textOf(item, "DescuentoMonto"))
          ? [`Descuento: ${displayMoney(textOf(item, "DescuentoMonto"))}`]
          : []),
        ...(Number(textOf(item, "RecargoPct")) ? [`Recargo: ${textOf(item, "RecargoPct")}%`] : []),
      ];
      let titleRows: string[], detailRows: string[], height: number, baseline: number;
      let titleFont = regular;
      if (compact) {
        const description =
          (detail.startsWith(name) ? detail : [name, detail].filter(Boolean).join(" - ")) +
          (exempt ? " · Exento" : "");
        titleRows = wrap(description, regular, 8, 296);
        detailRows = [];
        height = Math.max(20, titleRows.length * 10 + 8) + lineAdjustments.length * 10;
        baseline = rowTop - 13;
      } else {
        // DscItem puede ser un detalle distinto o la descripción completa que continúa NmbItem.
        const suffix = exempt ? " · Exento" : "";
        const distinct = Boolean(name && detail && !detail.startsWith(name));
        const full = distinct ? name : detail.startsWith(name) && detail ? detail : name || detail;
        const split = distinct ? null : /^(.{3,80}?)\s+[-–—:]\s+(.+)$/s.exec(full);
        if (distinct) {
          titleRows = wrap(name + suffix, bold, 8.5, 296);
          detailRows = wrap(detail, regular, 7.5, 296);
          titleFont = bold;
        } else if (split) {
          titleRows = wrap(split[1]! + suffix, bold, 8.5, 296);
          detailRows = wrap(split[2]!, regular, 7.5, 296);
          titleFont = bold;
        } else {
          titleFont = wrap(full + suffix, bold, 8.5, 296).length === 1 ? bold : regular;
          titleRows = wrap(full + suffix, titleFont, 8.5, 296);
          detailRows = [];
        }
        height =
          Math.max(26, titleRows.length * 11 + detailRows.length * 9.5 + 11) +
          lineAdjustments.length * 9.5;
        baseline = rowTop - 14;
      }
      if (rowTop - height < DETAIL_FLOOR)
        overflow(
          "El detalle excede una hoja de impresión. Ajusta el documento antes de emitir; no se omiten líneas ni se genera un folio adicional.",
        );
      if (rowShapes.length % 2 === 1)
        page.drawRectangle({ x: LEFT, y: rowTop - height, width: WIDTH, height, color: zebra });
      rowShapes.push({ top: rowTop, height });
      let cursor = baseline;
      for (const row of titleRows) {
        text(row, columns.description, cursor, compact ? 8 : 8.5, titleFont, ink);
        cursor -= compact ? 10 : 11;
      }
      for (const row of detailRows) {
        text(row, columns.description, cursor + 1, 7.5, regular, slate);
        cursor -= 9.5;
      }
      for (const adjustment of lineAdjustments) {
        text(adjustment, columns.description, cursor + 1, 7, regular, mist);
        cursor -= compact ? 10 : 9.5;
      }
      for (const [value, edge, width, strong] of [
        [
          [textOf(item, "QtyItem") || "-", textOf(item, "UnmdItem")].filter(Boolean).join(" "),
          columns.quantity,
          44,
          false,
        ],
        [
          textOf(item, "PrcItem")
            ? (data.type >= 110 ? currencyCode + " " : "$") +
              new Intl.NumberFormat("es-CL", { maximumFractionDigits: 6 }).format(
                Number(textOf(item, "PrcItem")),
              )
            : "-",
          columns.price,
          70,
          false,
        ],
        [displayMoney(textOf(item, "MontoItem")), columns.amount, 70, true],
      ] as const) {
        const font = strong ? bold : regular;
        right(value, edge, baseline, fitSize(value, font, 8.3, width), font, strong ? ink : slate);
      }
      rowTop -= height;
      rule(LEFT, RIGHT, rowTop, hairline, 0.5);
    }

    // Cargos, descuentos, comisiones y referencias bajo el detalle
    const extras: Array<{ label: string; rows: string[] }> = [];
    const charges = [
      ...data.adjustments.map(
        (adjustment) =>
          `${textOf(adjustment, "TpoMov") === "D" ? "Descuento" : "Recargo"} global: ${textOf(adjustment, "GlosaDR")} · ${textOf(adjustment, "TpoValor") === "%" ? textOf(adjustment, "ValorDR") + "%" : displayMoney(textOf(adjustment, "ValorDR"))}`,
      ),
      ...data.commissions.map(
        (commission) =>
          `${textOf(commission, "Glosa")}: neto ${displayMoney(textOf(commission, "ValComNeto"))} · IVA ${displayMoney(textOf(commission, "ValComIVA") || "0")}`,
      ),
    ];
    if (charges.length)
      extras.push({
        label: "CARGOS Y DESCUENTOS",
        rows: charges.flatMap((charge) => wrap(charge, regular, 7.5, WIDTH - 108)),
      });
    if (data.references.length) {
      const refs = data.references
        .map((reference) =>
          boleta
            ? `${textOf(reference, "CodRef")} · ${textOf(reference, "RazonRef")}`
            : `${labels[Number(textOf(reference, "TpoDocRef"))] || `Tipo ${textOf(reference, "TpoDocRef")}`} · Folio ${textOf(reference, "FolioRef")} · ${presentDate(textOf(reference, "FchRef"))} · ${textOf(reference, "RazonRef")}`,
        )
        .join("; ");
      const rows = wrap(refs, regular, 7.5, WIDTH - 108);
      if (rows.length > 3) reject("Las referencias exceden el espacio disponible de impresión.");
      extras.push({ label: "REFERENCIAS", rows });
    }
    const extrasHeight = extras.reduce((sum, extra) => sum + extra.rows.length * 10 + 6, 0);
    const bodyBottom = Math.min(rowTop, EXTRAS_FLOOR + extrasHeight + 4);
    if (bodyBottom - extrasHeight - 4 < EXTRAS_FLOOR)
      overflow(
        data.references.length
          ? "Las referencias exceden el espacio disponible de impresión."
          : "Los cargos y descuentos exceden el espacio disponible de impresión.",
      );
    box(LEFT, bodyBottom, WIDTH, bodyTop - bodyBottom, { border: line, borderWidth: 0.6 });
    for (const x of separators)
      page.drawLine({ start: { x, y: bodyTop }, end: { x, y: bodyBottom }, thickness: 0.5, color: hairline });
    let extrasY = bodyBottom - 4;
    for (const extra of extras) {
      const baseline = extrasY - 10;
      spaced(extra.label, LEFT + 8, baseline + 0.5, 6, bold, blue, 0.8);
      extra.rows.forEach((row, index) => text(row, LEFT + 100, baseline - index * 10, 7.5, regular, slate));
      extrasY -= extra.rows.length * 10 + 6;
    }

    // ------------------------------------------------------------------ timbre electrónico
    const image = await pdf.embedPng(barcodePng);
    const barcodeWidth = image.width / 6,
      barcodeHeight = image.height / 6;
    if (barcodeWidth > 255.12 || barcodeHeight > 95)
      reject("El timbre excede el espacio seguro de impresión.");
    // 18 puntos (0,25 pulgadas) de quiet zone, X=0,5 pt (6,94 mils), filas de 3X.
    const stampTop = 99 + barcodeHeight + 36;
    box(LEFT, 50, barcodeWidth + 36, stampTop - 50, { fill: white, border: line, borderWidth: 0.6, radius: 5 });
    page.drawRectangle({
      x: 36,
      y: 99,
      width: barcodeWidth + 36,
      height: barcodeHeight + 36,
      color: white,
    });
    page.drawImage(image, { x: 58, y: 117, width: barcodeWidth, height: barcodeHeight });
    rule(58, 58 + barcodeWidth, 97, hairline, 0.5);
    text("Timbre Electrónico SII", 58, 86, 8, bold, ink);
    text(`Res. ${data.resolutionNumber} de ${presentDate(data.resolutionDate)}`, 58, 74, 8, regular, slate);
    text(
      verificationUrl
        ? "Verifique boleta: www.zyteron.cl/boletas/consulta"
        : "Verifique documento: www.sii.cl",
      58,
      62,
      verificationUrl ? 7 : 8,
      regular,
      slate,
    );

    // ------------------------------------------------------------------ totales
    const totalRows: Array<[string, string]> = [
      ["Neto", textOf(data.totals, "MntNeto")],
      ["Exento", textOf(data.totals, "MntExe")],
      [
        boleta ? "IVA (19%)" : `IVA (${textOf(data.totals, "TasaIVA") || "0"}%)`,
        textOf(data.totals, "IVA"),
      ],
      ...children(data.totals, "ImptoReten").map((r): [string, string] => [
        `IVA retenido (${textOf(r, "TasaImp")}%)`,
        "-" + textOf(r, "MontoImp"),
      ]),
      ...children(data.totals, "Comisiones").flatMap(
        (c) =>
          [
            ["Comisiones netas", textOf(c, "ValComNeto")],
            ["Comisiones exentas", textOf(c, "ValComExe")],
            ["IVA comisiones", textOf(c, "ValComIVA")],
          ] as Array<[string, string]>,
      ),
    ].filter(([, value]) => value) as Array<[string, string]>;
    const totalsX = 342,
      totalsWidth = RIGHT - totalsX;
    const totalsTop = 147 + 10 + totalRows.length * 16;
    box(totalsX, 111, totalsWidth, totalsTop - 111, { fill: soft, border: hairline, borderWidth: 0.6, radius: 5 });
    totalRows.forEach(([label, value], index) => {
      const rowY = totalsTop - 15 - index * 16;
      text(label, totalsX + 12, rowY, 8.5, regular, slate);
      const display = displayMoney(value);
      right(display, RIGHT - 11, rowY, fitSize(display, regular, 9.5, 130), regular, ink);
      if (index < totalRows.length - 1) rule(totalsX + 12, RIGHT - 11, rowY - 5.5, hairline, 0.5);
    });
    box(totalsX, 111, totalsWidth, 36, { fill: ink, radius: 5 });
    page.drawRectangle({ x: totalsX, y: 111, width: 4, height: 36, color: teal });
    spaced("TOTAL", totalsX + 14, 125.5, 9.5, bold, white, 1.4);
    const totalText = displayMoney(data.total);
    right(totalText, RIGHT - 11, 123, fitSize(totalText, bold, 16, 140), bold, white);

    // Monto en palabras (pesos chilenos)
    const words =
      data.type < 110 && data.total >= 0 && Number.isSafeInteger(data.total)
        ? amountInWords(data.total).toLocaleUpperCase("es-CL")
        : "";
    if (words) {
      const labelWidth = bold.widthOfTextAtSize("SON:", 7) + 5;
      const available = totalsTop + 4 < EXTRAS_FLOOR - 13 - 9 - 3 ? WIDTH : 296;
      const rows = wrap(words, regular, 7, available - labelWidth);
      const top = EXTRAS_FLOOR - 13;
      if (rows.length <= 2 && top - (rows.length - 1) * 9 - 3 > stampTop + 3) {
        text("SON:", LEFT, top, 7, bold, ink);
        rows.forEach((row, index) => text(row, LEFT + labelWidth, top - index * 9, 7, regular, slate));
      }
    }

    // ------------------------------------------------------------------ consulta de boleta
    if (verificationUrl && qrPng) {
      const qr = await pdf.embedPng(qrPng);
      box(totalsX, 34, totalsWidth, 68, { border: line, borderWidth: 0.6, radius: 5 });
      page.drawImage(qr, { x: 492, y: 38, width: 60, height: 60 });
      page.node.addAnnot(
        pdf.context.register(
          pdf.context.obj({
            Type: PDFName.of("Annot"),
            Subtype: PDFName.of("Link"),
            Rect: [342, 38, 556, 98],
            Border: [0, 0, 0],
            A: {
              Type: PDFName.of("Action"),
              S: PDFName.of("URI"),
              URI: PDFString.of(verificationUrl),
            },
          }),
        ),
      );
      text("Consulta tu boleta", 352, 84, 8.5, bold, ink);
      text("Escanea el código QR", 352, 71, 7, regular, slate);
      text("o abre el enlace del documento.", 352, 59, 6.5, regular, slate);
    }

    // ------------------------------------------------------------------ copia cedible
    if (copy === "TRANSFERABLE") {
      box(342, 30, 217, 71, { border: slate, borderWidth: 0.6, radius: 4 });
      spaced("ACUSE DE RECIBO", 350, 91, 7, bold, ink, 0.6);
      text("Nombre: ___________________ RUT: __________", 350, 79, 6, regular, ink);
      text("Fecha: __________ Recinto: __________________", 350, 68, 6, regular, ink);
      text("Firma: ___________________________________", 350, 57, 6, regular, ink);
      paragraphs(
        "El acuse de recibo que se declara en este acto, de acuerdo a lo dispuesto en la letra b) del Art. 4°, y la letra c) del Art. 5° de la Ley 19.983, acredita que la entrega de mercaderías o servicio (s) prestado (s) ha (n) sido recibido (s).",
        350,
        49,
        200,
        5.2,
        regular,
        slate,
      );
      const destination = data.type === 52 ? "CEDIBLE CON SU FACTURA" : "CEDIBLE";
      text(destination, 559 - bold.widthOfTextAtSize(destination, 8), 18, 8, bold, ink);
    }

    brandBar(0, 4);
    return Buffer.from(await pdf.save());
  };

  try {
    return await compose(false);
  } catch (error) {
    if (!(error instanceof PrintOverflow)) throw error;
  }
  try {
    return await compose(true);
  } catch (error) {
    if (error instanceof PrintOverflow) reject(error.message);
    throw error;
  }
}
