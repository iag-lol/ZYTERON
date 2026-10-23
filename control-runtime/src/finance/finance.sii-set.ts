import { createHash } from "node:crypto";
import { UnprocessableEntityException } from "@nestjs/common";
import type { CertificationDocument } from "./finance.sii-certification.js";

export interface OfficialCertificationCase {
  id: string;
  type: number;
  section: string;
  raw: string;
  referenceCaseId: string | null;
  requiredLines?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    exempt: boolean;
    unit?: string;
  }>;
}
export interface OfficialCertificationSet {
  format: "DTE" | "BOLETA";
  sha256: string;
  encoding: "UTF-8" | "ISO-8859-1";
  cases: OfficialCertificationCase[];
  sections: Array<{ name: string; attention: string; raw: string; caseIds: string[] }>;
  requiredFolios: Record<string, number>;
}
const reject = (message: string): never => {
  throw new UnprocessableEntityException(message);
};
const normalized = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
const documentType = (name: string) => {
  const value = normalized(name);
  const types: Record<string, number> = {
    "FACTURA ELECTRONICA": 33,
    "FACTURA NO AFECTA O EXENTA ELECTRONICA": 34,
    "GUIA DE DESPACHO": 52,
    "GUIA DE DESPACHO ELECTRONICA": 52,
    "NOTA DE CREDITO ELECTRONICA": 61,
    "NOTA DE DEBITO ELECTRONICA": 56,
    "FACTURA DE EXPORTACION ELECTRONICA": 110,
    "NOTA DE DEBITO DE EXPORTACION ELECTRONICA": 111,
    "NOTA DE CREDITO DE EXPORTACION ELECTRONICA": 112,
    "LIQUIDACION FACTURA ELECTRONICA": 43,
    "FACTURA DE COMPRA ELECTRONICA": 46,
    "BOLETA ELECTRONICA": 39,
    "BOLETA EXENTA ELECTRONICA": 41,
  };
  return types[value] ?? reject(`Documento del set no reconocido: ${value.slice(0, 100)}.`);
};

/** Valida condiciones del ejercicio antes de adquirir folios o persistir documentos. */
export function validateOfficialCaseSemantics(
  official: OfficialCertificationCase,
  input: CertificationDocument,
  target?: CertificationDocument,
) {
  if (input.type === 52) {
    const raw = normalized(official.raw);
    if (/BODEGAS DE LA EMPRESA/.test(raw)) {
      if (input.dispatch?.transfer !== 5)
        reject(`El caso ${official.id} requiere traslado interno.`);
      if (!/TRASLADO POR:/.test(raw) && input.dispatch?.responsibility !== undefined)
        reject(`El caso ${official.id} no indica responsable de despacho; omite ese campo.`);
    }
    const responsibility = /TRASLADO POR:\s*EMISOR DEL DOCUMENTO AL LOCAL DEL CLIENTE/.test(raw)
      ? 2
      : /TRASLADO POR:\s*CLIENTE/.test(raw)
        ? 1
        : undefined;
    if (responsibility !== undefined && input.dispatch?.responsibility !== responsibility)
      reject(`El responsable de despacho de ${official.id} no coincide con el set oficial.`);
  }
  if (input.type === 110 && input.export?.service === 4) {
    if (!input.references?.some((r) => r.type === 813))
      reject(`El caso ${official.id} requiere referencia al pasaporte del huésped.`);
  }
  if (target && [111, 112].includes(input.type)) {
    for (const line of input.lines) {
      const original = target.lines.find((l) => l.description === line.description);
      if (original?.unit && line.unit !== original.unit)
        reject(
          `La unidad del ítem de ${official.id} debe coincidir con su documento de referencia.`,
        );
    }
  }
}

/** Conserva las instrucciones íntegras; no transforma texto ambiguo en montos o referencias comerciales. */
export function parseOfficialCertificationSet(bytes: Buffer): OfficialCertificationSet {
  if (!bytes.length || bytes.length > 1024 * 1024)
    reject("El set debe ser un archivo de texto de hasta 1 MB.");
  let raw: string, encoding: OfficialCertificationSet["encoding"];
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    encoding = "UTF-8";
  } catch {
    raw = bytes.toString("latin1");
    encoding = "ISO-8859-1";
  }
  if (raw.includes("\0")) reject("El set contiene datos binarios.");
  raw = raw.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  const boletaHeading = "SII SET DE PRUEBA DE BOLETA ELECTRONICA DE VENTAS Y SERVICIOS";
  if (raw.trimStart().startsWith(boletaHeading)) {
    const markers = [...raw.matchAll(/^CASO-([1-9]\d{0,5})[\t ]*$/gm)];
    if (markers.length !== 5 || markers.some((m, i) => Number(m[1]) !== i + 1))
      reject("El set de boletas debe contener los cinco casos oficiales, completos y ordenados.");
    const cases = markers.map((m, i) => {
      const body = raw.slice(m.index, markers[i + 1]?.index ?? raw.length);
      const header = /^Item[\t ]+Cantidad[\t ]+Precio Unitario con IVA[\t ]*$/m.exec(body);
      if (!header) reject(`El caso CASO-${m[1]} no contiene el encabezado de precios con IVA.`);
      const table = body
        .slice(header!.index + header![0].length)
        .trimStart()
        .split(/\n[\t ]*\n|\nOBSERVACION|\n=+/)[0]!;
      const requiredLines = table.split("\n").map((row) => {
        const cells = row
          .trim()
          .split(/\t+| {2,}/)
          .map((s) => s.trim());
        if (
          cells.length !== 3 ||
          !/^\d+(?:\.\d+)?$/.test(cells[1]!) ||
          !/^\d+(?:\.\d+)?$/.test(cells[2]!)
        )
          reject(`Partida incompleta en CASO-${m[1]}.`);
        const quantity = Number(cells[1]),
          unitPrice = Number(cells[2]);
        if (
          !cells[0] ||
          cells[0].length > 80 ||
          !Number.isFinite(quantity) ||
          !Number.isFinite(unitPrice) ||
          quantity <= 0 ||
          unitPrice < 0 ||
          quantity * unitPrice > 1e11
        )
          reject(`Partida inválida en CASO-${m[1]}.`);
        return {
          description: cells[0]!,
          quantity,
          unitPrice,
          exempt: /\bEXENTO\b/.test(normalized(cells[0]!)),
          ...(/UNIDAD DE MEDIDA EN KG\b/.test(normalized(body)) ? { unit: "Kg" } : {}),
        };
      });
      if (!requiredLines.length) reject(`Faltan las partidas del caso CASO-${m[1]}.`);
      return {
        id: `CASO-${m[1]}`,
        type: 39,
        section: boletaHeading,
        raw: body,
        referenceCaseId: null,
        requiredLines,
      };
    });
    return {
      format: "BOLETA",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      encoding,
      cases,
      sections: [{ name: boletaHeading, attention: "", raw, caseIds: cases.map((c) => c.id) }],
      requiredFolios: { "39": 5 },
    };
  }
  const starts = [...raw.matchAll(/^SET[^\n]*NUMERO DE ATENCI[OÓ]N:\s*(\d+)\s*$/gim)];
  if (!starts.length) reject("El archivo no contiene secciones oficiales con número de atención.");
  const cases: OfficialCertificationCase[] = [],
    sections: OfficialCertificationSet["sections"] = [],
    seen = new Set<string>();
  for (let s = 0; s < starts.length; s++) {
    const heading = starts[s]!,
      sectionText = raw.slice(heading.index, starts[s + 1]?.index ?? raw.length),
      markers = [...sectionText.matchAll(/^CASO\s+(\d{1,12}-[1-9]\d{0,5})\s*$/gim)];
    const section = {
      name: heading[0].trim(),
      attention: heading[1]!,
      raw: sectionText,
      caseIds: [] as string[],
    };
    for (let i = 0; i < markers.length; i++) {
      const marker = markers[i]!,
        id = marker[1]!,
        body = sectionText.slice(marker.index, markers[i + 1]?.index ?? sectionText.length);
      if (seen.has(id) || id.split("-")[0] !== section.attention)
        reject("Caso duplicado o ajeno al número de atención de su sección.");
      const documents = [...body.matchAll(/^DOCUMENTO[\t ]+([^\n]+)$/gim)];
      if (documents.length !== 1) reject(`El caso ${id} no identifica un documento único.`);
      const reference =
        /^REFERENCIA[\t ]+[^\n]*\bCASO\s+(\d{1,12}-[1-9]\d{0,5})/im.exec(body)?.[1] ?? null;
      if (reference && !seen.has(reference))
        reject(`El caso ${id} referencia un caso ausente o posterior.`);
      const type = documentType(documents[0]![1]!);
      if ([56, 61, 111, 112].includes(type) && !reference)
        reject(`La nota ${id} no tiene vínculo explícito con un caso anterior.`);
      cases.push({ id, type, section: section.name, raw: body, referenceCaseId: reference });
      seen.add(id);
      section.caseIds.push(id);
    }
    sections.push(section);
  }
  if (!cases.length || cases.length > 500) reject("Cantidad de casos inválida.");
  const requiredFolios: Record<string, number> = {};
  for (const c of cases) requiredFolios[c.type] = (requiredFolios[c.type] ?? 0) + 1;
  return {
    format: "DTE",
    sha256: createHash("sha256").update(bytes).digest("hex"),
    encoding,
    cases,
    sections,
    requiredFolios,
  };
}

export interface CertificationCasePlan {
  caseId: string;
  type: number;
  referenceCaseId: string | null;
  folio: number;
}
/** Los folios de esta vista son candidatos; sólo una transacción posterior puede reservarlos. */
export function previewCertificationFolios(
  set: OfficialCertificationSet,
  available: Array<{ type: number; folio: number }>,
): CertificationCasePlan[] {
  const pools = new Map<number, number[]>(),
    identities = new Set<string>();
  for (const row of available) {
    const key = `${row.type}:${row.folio}`;
    if (!Number.isSafeInteger(row.folio) || row.folio <= 0 || identities.has(key))
      reject("Lista de folios candidatos inválida.");
    identities.add(key);
    pools.set(row.type, [...(pools.get(row.type) ?? []), row.folio]);
  }
  for (const values of pools.values()) values.sort((a, b) => a - b);
  return set.cases.map((c) => {
    const folio = pools.get(c.type)?.shift();
    if (!folio) reject(`Faltan folios de certificación para el tipo ${c.type}.`);
    return { caseId: c.id, type: c.type, referenceCaseId: c.referenceCaseId, folio: folio! };
  });
}
