import { UnprocessableEntityException } from "@nestjs/common";
import { createPublicKey, verify } from "node:crypto";
import bwipjs from "bwip-js";
import { PDFDocument, PDFName, PDFString, StandardFonts, rgb, type PDFFont } from "pdf-lib";
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
    amount(textOf(ddNode, "MNT")) !== Math.round(total) ||
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
          ...(type === 43 ? ["Comisiones"] : []),
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
  if (expected.environment === "PRODUCTION" && !siiOffice?.trim())
    reject(
      "Configura la oficina regional real del SII (DTE_SII_OFFICE) antes de generar la representación de producción.",
    );
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${labels[data.type]} ${data.folio}`);
  pdf.setAuthor("Zyteron SpA");
  pdf.setProducer("Zyteron - representación del XML archivado");
  const regular = await pdf.embedFont(StandardFonts.Helvetica),
    bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595.28, 841.89]);
  const ink = rgb(0.08, 0.15, 0.12),
    muted = rgb(0.34, 0.4, 0.37),
    green = rgb(0.02, 0.32, 0.23),
    red = rgb(0.76, 0.08, 0.08);
  const text = (value: string, x: number, y: number, size = 9, strong = false, color = ink) =>
    page.drawText(value, { x, y, size, font: strong ? bold : regular, color });
  const paragraphs = (
    value: string,
    x: number,
    y: number,
    width: number,
    size = 9,
    strong = false,
  ) => {
    const lines = wrap(value, strong ? bold : regular, size, width);
    for (const line of lines) {
      text(line, x, y, size, strong);
      y -= size + 3;
    }
    return y;
  };
  let issuerY = paragraphs(
    textOf(data.issuer, "RznSoc") || textOf(data.issuer, "RznSocEmisor"),
    36,
    796,
    305,
    15,
    true,
  );
  issuerY = paragraphs(
    textOf(data.issuer, "GiroEmis") || textOf(data.issuer, "GiroEmisor"),
    36,
    issuerY - 4,
    305,
    9,
  );
  issuerY = paragraphs(
    [textOf(data.issuer, "DirOrigen"), textOf(data.issuer, "CmnaOrigen")]
      .filter(Boolean)
      .join(" · "),
    36,
    issuerY - 2,
    305,
    9,
  );
  page.drawRectangle({
    x: 355,
    y: 716,
    width: 204,
    height: 101,
    borderColor: red,
    borderWidth: 1.6,
  });
  text(`R.U.T.: ${displayRut(data.issuerRut)}`, 366, 794, 12, true, red);
  paragraphs(labels[data.type]!, 366, 773, 182, 11, true);
  text(`N° ${data.folio}`, 366, 733, 16, true, red);
  const officeLines = wrap(
    `S.I.I. - ${siiOffice?.trim() || "OFICINA PENDIENTE DE VALIDACIÓN"}`,
    regular,
    7,
    204,
  );
  officeLines.forEach((line, index) => text(line, 355, 704 - index * 9, 7, false, muted));
  const banner =
    data.environment === "CERTIFICATION"
      ? "CERTIFICACIÓN - SIN VALIDEZ TRIBUTARIA"
      : data.status === "REJECTED"
        ? "RECHAZADO POR EL SII - SIN VALIDEZ TRIBUTARIA"
        : ["ACCEPTED", "ACCEPTED_WITH_REPAIRS"].includes(data.status)
          ? "DOCUMENTO ACEPTADO POR EL SII"
          : "PENDIENTE DE VALIDACIÓN POR EL SII";
  const bannerY = Math.min(670, issuerY - 24);
  if (issuerY < 560) reject("Los datos del emisor exceden el espacio disponible de impresión.");
  page.drawRectangle({ x: 36, y: bannerY, width: 523, height: 22, color: rgb(0.94, 0.96, 0.94) });
  text(
    banner,
    46,
    bannerY + 7,
    9,
    true,
    data.environment === "CERTIFICATION" || data.status === "REJECTED" ? red : green,
  );
  let y = bannerY - 20;
  y = paragraphs(`RECEPTOR: ${textOf(data.receiver, "RznSocRecep")}`, 36, y, 523, 10, true);
  const genericReceiver =
    [39, 41].includes(data.type) && normalizeRut(data.receiverRut) === "66666666-6";
  text(
    `${genericReceiver ? "" : `RUT: ${displayRut(data.receiverRut)}    ·    `}Emisión: ${presentDate(data.date)}`,
    36,
    y,
    9,
  );
  y -= 16;
  for (const value of [
    textOf(data.receiver, "GiroRecep"),
    [textOf(data.receiver, "DirRecep"), textOf(data.receiver, "CmnaRecep")]
      .filter(Boolean)
      .join(" · "),
  ])
    if (value) y = paragraphs(value, 36, y, 523);
  if (data.type === 52)
    y = paragraphs(
      `Tipo de traslado: ${textOf(data.identity, "IndTraslado")} · Despacho: ${textOf(data.identity, "TipoDespacho")}`,
      36,
      y,
      523,
      8,
    );
  const customs = children(data.transport!, "Aduana")[0];
  if (customs) {
    for (const value of [
      `Moneda: ${textOf(data.totals, "TpoMoneda")} · País receptor: ${textOf(customs, "CodPaisRecep")} · Destino: ${textOf(customs, "CodPaisDestin")}`,
      `Embarque: ${textOf(customs, "CodPtoEmbarque") || "No aplica"} · Desembarque: ${textOf(customs, "CodPtoDesemb") || "No aplica"} · Bultos: ${textOf(customs, "TotBultos") || "No aplica"}`,
    ])
      y = paragraphs(value, 36, y, 523, 8);
  }
  y -= 8;
  page.drawRectangle({ x: 36, y: y - 6, width: 523, height: 22, color: green });
  for (const [label, x] of [
    ["DETALLE", 44],
    ["CANT.", 354],
    [
      [39, 41].includes(data.type) && textOf(data.identity, "IndMntNeto") !== "2"
        ? "P. UNIT. CON IVA"
        : "P. UNITARIO",
      407,
    ],
    ["MONTO", 508],
  ] as const)
    text(label, x, y + 1, 8, true, rgb(1, 1, 1));
  y -= 23;
  for (const item of data.lines) {
    const name = textOf(item, "NmbItem"),
      detail = textOf(item, "DscItem");
    const description =
      (detail.startsWith(name) ? detail : [name, detail].filter(Boolean).join(" - ")) +
      (textOf(item, "IndExe") === "1" ? " · Exento" : "");
    const rows = wrap(description, regular, 8.5, 296),
      height =
        Math.max(24, rows.length * 11 + 8) + (Number(textOf(item, "DescuentoMonto")) ? 11 : 0);
    if (y - height < 283)
      reject(
        "El detalle excede una hoja A4. Ajusta el documento antes de emitir; no se omiten líneas ni se genera un folio adicional.",
      );
    rows.forEach((line, index) => text(line, 44, y - index * 11, 8.5));
    for (const [value, x, right] of [
      [
        [textOf(item, "QtyItem") || "-", textOf(item, "UnmdItem")].filter(Boolean).join(" "),
        395,
        true,
      ],
      [
        textOf(item, "PrcItem")
          ? (data.type >= 110 ? currencyCode + " " : "$") +
            new Intl.NumberFormat("es-CL", { maximumFractionDigits: 6 }).format(
              Number(textOf(item, "PrcItem")),
            )
          : "-",
        491,
        true,
      ],
      [displayMoney(textOf(item, "MontoItem")), 551, true],
    ] as const) {
      const size = Math.min(8, (82 / Math.max(1, regular.widthOfTextAtSize(value, 8))) * 8);
      text(value, right ? x - regular.widthOfTextAtSize(value, size) : x, y, size);
    }
    if (Number(textOf(item, "DescuentoMonto")))
      text(
        `Descuento: ${currency(textOf(item, "DescuentoMonto"))}`,
        44,
        y - rows.length * 11,
        7,
        false,
        muted,
      );
    y -= height;
    page.drawLine({
      start: { x: 36, y: y + 5 },
      end: { x: 559, y: y + 5 },
      thickness: 0.4,
      color: rgb(0.83, 0.87, 0.84),
    });
  }
  for (const adjustment of data.adjustments) {
    y = paragraphs(
      `${textOf(adjustment, "TpoMov") === "D" ? "Descuento" : "Recargo"} global: ${textOf(adjustment, "GlosaDR")} · ${textOf(adjustment, "TpoValor") === "%" ? textOf(adjustment, "ValorDR") + "%" : displayMoney(textOf(adjustment, "ValorDR"))}`,
      36,
      y,
      523,
      7.5,
    );
  }
  for (const commission of data.commissions) {
    y = paragraphs(
      `${textOf(commission, "Glosa")}: neto ${displayMoney(textOf(commission, "ValComNeto"))} · IVA ${displayMoney(textOf(commission, "ValComIVA") || "0")}`,
      36,
      y,
      523,
      7.5,
    );
  }
  if (y < 270) reject("Los cargos y descuentos exceden el espacio disponible de impresión.");
  if (data.references.length) {
    const refs = data.references
      .map((reference) =>
        [39, 41].includes(data.type)
          ? `${textOf(reference, "CodRef")} · ${textOf(reference, "RazonRef")}`
          : `Tipo ${textOf(reference, "TpoDocRef")} · Folio ${textOf(reference, "FolioRef")} · ${presentDate(textOf(reference, "FchRef"))} · ${textOf(reference, "RazonRef")}`,
      )
      .join("; ");
    const rows = wrap(`REFERENCIAS: ${refs}`, regular, 7.5, 523);
    if (rows.length > 3 || y - rows.length * 10 < 254)
      reject("Las referencias exceden el espacio disponible de impresión.");
    rows.forEach((line, index) => text(line, 36, y - index * 10, 7.5));
  }
  const image = await pdf.embedPng(await printedDteBarcode(data.ted));
  const barcodeWidth = image.width / 6,
    barcodeHeight = image.height / 6;
  if (barcodeWidth > 255.12 || barcodeHeight > 95)
    reject("El timbre excede el espacio seguro de impresión.");
  // 18 puntos (0,25 pulgadas) de quiet zone, X=0,5 pt (6,94 mils), filas de 3X.
  page.drawRectangle({
    x: 36,
    y: 99,
    width: barcodeWidth + 36,
    height: barcodeHeight + 36,
    color: rgb(1, 1, 1),
  });
  page.drawImage(image, { x: 58, y: 117, width: barcodeWidth, height: barcodeHeight });
  text("Timbre Electrónico SII", 58, 86, 8, true);
  text(`Res. ${data.resolutionNumber} de ${presentDate(data.resolutionDate)}`, 58, 74, 8);
  text(
    verificationUrl
      ? "Verifique boleta: www.zyteron.cl/boletas/consulta"
      : "Verifique documento: www.sii.cl",
    58,
    62,
    verificationUrl ? 7 : 8,
  );
  if (verificationUrl) {
    const qr = await bwipjs.toBuffer({
      bcid: "qrcode",
      text: verificationUrl,
      scale: 3,
      padding: 4,
    });
    const image = await pdf.embedPng(qr);
    page.drawImage(image, { x: 492, y: 38, width: 60, height: 60 });
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
    text("Consulta tu boleta", 350, 84, 8, true);
    text("Escanea el código QR", 350, 71, 7);
    text("o abre el enlace del documento.", 350, 59, 6);
  }
  const totalRows: Array<[string, string]> = [
    ["Neto", textOf(data.totals, "MntNeto")],
    ["Exento", textOf(data.totals, "MntExe")],
    [
      [39, 41].includes(data.type)
        ? "IVA (19%)"
        : `IVA (${textOf(data.totals, "TasaIVA") || "0"}%)`,
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
  ];
  let totalY = Math.max(
    210,
    147 + 20 * totalRows.filter(([, value]) => value && Number(value) !== 0).length,
  );
  for (const [label, value] of totalRows)
    if (value) {
      text(label, 352, totalY, 9);
      const display = displayMoney(value);
      text(display, 551 - regular.widthOfTextAtSize(display, 10), totalY, 10);
      totalY -= 20;
    }
  page.drawRectangle({ x: 342, y: 111, width: 217, height: 36, color: green });
  text("TOTAL", 352, 124, 11, true, rgb(1, 1, 1));
  const totalText = displayMoney(data.total);
  const totalSize = Math.min(15, (145 / Math.max(1, bold.widthOfTextAtSize(totalText, 15))) * 15);
  text(
    totalText,
    549 - bold.widthOfTextAtSize(totalText, totalSize),
    122,
    totalSize,
    true,
    rgb(1, 1, 1),
  );
  if (copy === "TRANSFERABLE") {
    page.drawRectangle({
      x: 342,
      y: 22,
      width: 217,
      height: 79,
      borderWidth: 0.5,
      borderColor: muted,
    });
    text("ACUSE DE RECIBO", 350, 91, 7, true);
    text("Nombre: ___________________ RUT: __________", 350, 79, 6);
    text("Fecha: __________ Recinto: __________________", 350, 68, 6);
    text("Firma: ___________________________________", 350, 57, 6);
    paragraphs(
      "El acuse de recibo que se declara en este acto, de acuerdo a lo dispuesto en la letra b) del Art. 4°, y la letra c) del Art. 5° de la Ley 19.983, acredita que la entrega de mercaderías o servicio (s) prestado (s) ha (n) sido recibido (s).",
      350,
      49,
      200,
      5.2,
    );
    const destination = data.type === 52 ? "CEDIBLE CON SU FACTURA" : "CEDIBLE";
    text(destination, 559 - bold.widthOfTextAtSize(destination, 8), 8, 8, true);
  }
  text(banner, 36, 32, 7, true, muted);
  return Buffer.from(await pdf.save());
}
