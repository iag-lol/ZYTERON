import { UnprocessableEntityException } from "@nestjs/common";
import {
  el,
  SII_NS,
  XSI_NS,
  xmlSignature,
  type DteCompany,
  type LoadedCertificate,
} from "./finance.dte-providers.js";
import { assertCertification, validateCertificationXml } from "./finance.sii-certification.js";
import { verifySiiXmlSignatures } from "./finance.sii-signatures.js";
import { formatRut, normalizeRut, validRut } from "./finance.util.js";
import { child, children, local, parseXml, textOf } from "./finance.formats.js";

const need = (ok: unknown, message: string) => {
  if (!ok) throw new UnprocessableEntityException(message);
};
const opt = (tag: string, value: unknown) =>
  value === undefined || value === null ? "" : el(tag, String(value));
const now = () =>
  new Date().toLocaleString("sv-SE", { timeZone: "America/Santiago" }).replace(" ", "T");
const integer = (value: number) => {
  need(Number.isSafeInteger(value) && value >= 0, "Monto o folio inválido en el libro.");
  return value;
};
const tax = (net: number) => Math.round((integer(net) * 19) / 100);
export interface CertificationBookContext {
  environment: "CERTIFICATION";
  company: DteCompany;
  senderRut: string;
  period: string;
  notificationFolio: number;
}
export interface CertificationBookEntry {
  type: number;
  folio: number;
  date: string;
  counterpartyRut: string;
  counterpartyName: string;
  net: number;
  exempt: number;
  vat: number;
  retained?: number;
  commonVat?: number;
  nonRecoverableVat?: { code: 1 | 2 | 3 | 4 | 9; amount: number };
  reference?: { type: number; folio: number };
}
export interface CertificationGuideEntry {
  folio: number;
  date: string;
  receiverRut: string;
  receiverName: string;
  transfer: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  net: number;
  vat: number;
  total: number;
  annulled?: 1 | 2;
  billedReference?: { type: number; folio: number; date: string };
}
function checkContext(ctx: CertificationBookContext) {
  assertCertification(ctx.environment);
  need(validRut(ctx.company.rut) && validRut(ctx.senderRut), "Emisor o firmante inválido.");
  need(/^\d{4}-(0[1-9]|1[0-2])$/.test(ctx.period), "Período tributario inválido.");
  need(integer(ctx.notificationFolio) > 0, "Falta folio de notificación del set.");
}
function periodDate(value: string, period: string) {
  need(
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      value.startsWith(period + "-") &&
      new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value,
    "El documento no pertenece al período del libro.",
  );
  return value;
}
function signedContainer(
  root: string,
  tag: string,
  id: string,
  body: string[],
  certificate: LoadedCertificate,
  schema: string,
) {
  const content = el(tag, body, { ID: id }),
    canonical = content.replace(`<${tag} `, `<${tag} xmlns="${SII_NS}" xmlns:xsi="${XSI_NS}" `);
  return (
    '<?xml version="1.0" encoding="ISO-8859-1"?>\n' +
    el(root, [content, xmlSignature(canonical, `#${id}`, certificate, ` xmlns:xsi="${XSI_NS}"`)], {
      xmlns: SII_NS,
      "xmlns:xsi": XSI_NS,
      version: "1.0",
      "xsi:schemaLocation": `${SII_NS} ${schema}`,
    })
  );
}
const summaryKey = (row: CertificationBookEntry) => `${row.type}`;

/** Libro de certificación independiente del RCV productivo. Los tipos no se compensan entre sí en el resumen. */
export function certificationPurchaseSalesBook(
  ctx: CertificationBookContext,
  operation: "COMPRA" | "VENTA",
  entries: CertificationBookEntry[],
  certificate: LoadedCertificate,
  commonFactor?: number,
) {
  checkContext(ctx);
  need(
    ["COMPRA", "VENTA"].includes(operation) && entries.length > 0,
    "Libro sin documentos o tipo de operación inválido.",
  );
  if (commonFactor !== undefined)
    need(
      operation === "COMPRA" &&
        Number.isFinite(commonFactor) &&
        commonFactor >= 0 &&
        commonFactor <= 1,
      "Factor proporcional inválido.",
    );
  const identities = new Set<string>();
  for (const r of entries) {
    need(
      validRut(r.counterpartyRut) && r.counterpartyName.trim(),
      "Contraparte inválida en el libro.",
    );
    periodDate(r.date, ctx.period);
    integer(r.folio);
    integer(r.net);
    integer(r.exempt);
    integer(r.vat);
    integer(r.retained ?? 0);
    need(r.folio > 0 && r.vat === tax(r.net), "IVA o folio inconsistente en el libro.");
    const key = `${normalizeRut(r.counterpartyRut)}:${r.type}:${r.folio}`;
    need(!identities.has(key), "Documento repetido en el libro.");
    identities.add(key);
    if (r.commonVat !== undefined)
      need(
        operation === "COMPRA" &&
          commonFactor !== undefined &&
          integer(r.commonVat) === r.vat &&
          !r.nonRecoverableVat,
        "IVA de uso común incompatible.",
      );
    if (r.nonRecoverableVat)
      need(
        operation === "COMPRA" && integer(r.nonRecoverableVat.amount) === r.vat && !r.commonVat,
        "IVA no recuperable incompatible.",
      );
    need((r.retained ?? 0) <= r.vat, "Retención superior al IVA.");
  }
  const groups = new Map<string, CertificationBookEntry[]>();
  for (const r of entries) {
    const k = summaryKey(r);
    groups.set(k, [...(groups.get(k) ?? []), r]);
  }
  const total = (rows: CertificationBookEntry[], fn: (r: CertificationBookEntry) => number) =>
    rows.reduce((s, r) => s + fn(r), 0);
  const summaries = [...groups.values()].map((rows) => {
    const non = new Map<number, number>();
    for (const r of rows)
      if (r.nonRecoverableVat)
        non.set(
          r.nonRecoverableVat.code,
          (non.get(r.nonRecoverableVat.code) ?? 0) + r.nonRecoverableVat.amount,
        );
    const common = total(rows, (r) => r.commonVat ?? 0),
      retained = total(rows, (r) => r.retained ?? 0);
    return el("TotalesPeriodo", [
      el("TpoDoc", rows[0]!.type),
      el("TotDoc", rows.length),
      el(
        "TotMntExe",
        total(rows, (r) => r.exempt),
      ),
      el(
        "TotMntNeto",
        total(rows, (r) => r.net),
      ),
      el(
        "TotMntIVA",
        total(rows, (r) => (r.commonVat || r.nonRecoverableVat ? 0 : r.vat)),
      ),
      ...[...non].map(([code, amount]) =>
        el("TotIVANoRec", [el("CodIVANoRec", code), el("TotMntIVANoRec", amount)]),
      ),
      ...(common
        ? [
            el("TotOpIVAUsoComun", rows.filter((r) => r.commonVat).length),
            el("TotIVAUsoComun", common),
            el("FctProp", commonFactor!),
            el("TotCredIVAUsoComun", Math.round(common * commonFactor!)),
          ]
        : []),
      ...(retained
        ? [
            el("TotOpIVARetTotal", rows.filter((r) => r.retained).length),
            el("TotIVARetTotal", retained),
          ]
        : []),
      el(
        "TotMntTotal",
        total(rows, (r) => r.net + r.exempt + r.vat - (r.retained ?? 0)),
      ),
    ]);
  });
  const details = entries.map((r) =>
    el("Detalle", [
      el("TpoDoc", r.type),
      el("NroDoc", r.folio),
      ...(r.net ? [el("TpoImp", 1), el("TasaImp", 19)] : []),
      el("FchDoc", r.date),
      el("RUTDoc", formatRut(r.counterpartyRut)),
      el("RznSoc", r.counterpartyName.slice(0, 50)),
      opt("TpoDocRef", r.reference?.type),
      opt("FolioDocRef", r.reference?.folio),
      el("MntExe", r.exempt),
      el("MntNeto", r.net),
      el("MntIVA", r.commonVat || r.nonRecoverableVat ? 0 : r.vat),
      ...(r.nonRecoverableVat
        ? [
            el("IVANoRec", [
              el("CodIVANoRec", r.nonRecoverableVat.code),
              el("MntIVANoRec", r.nonRecoverableVat.amount),
            ]),
          ]
        : []),
      opt("IVAUsoComun", r.commonVat),
      ...(r.retained ? [el("IVARetTotal", r.retained)] : []),
      el("MntTotal", r.net + r.exempt + r.vat - (r.retained ?? 0)),
    ]),
  );
  const cover = el("Caratula", [
    el("RutEmisorLibro", formatRut(ctx.company.rut)),
    el("RutEnvia", formatRut(ctx.senderRut)),
    el("PeriodoTributario", ctx.period),
    el("FchResol", ctx.company.resolutionDate),
    el("NroResol", ctx.company.resolutionNumber),
    el("TipoOperacion", operation),
    el("TipoLibro", "ESPECIAL"),
    el("TipoEnvio", "TOTAL"),
    el("FolioNotificacion", ctx.notificationFolio),
  ]);
  return signedContainer(
    "LibroCompraVenta",
    "EnvioLibro",
    `Libro${operation}${ctx.period.replace("-", "")}`,
    [cover, el("ResumenPeriodo", summaries), ...details, el("TmstFirma", now())],
    certificate,
    "LibroCV_v10.xsd",
  );
}

/** La anulación del set se informa sólo en el libro; no modifica guías ni folios almacenados. */
export function certificationGuideBook(
  ctx: CertificationBookContext,
  entries: CertificationGuideEntry[],
  certificate: LoadedCertificate,
) {
  checkContext(ctx);
  need(entries.length > 0, "El libro de guías no contiene documentos.");
  const ids = new Set<number>();
  for (const r of entries) {
    integer(r.folio);
    need(r.folio > 0 && !ids.has(r.folio), "Folio duplicado o inválido en guías.");
    ids.add(r.folio);
    periodDate(r.date, ctx.period);
    need(validRut(r.receiverRut) && r.receiverName.trim(), "Receptor inválido en guías.");
    integer(r.net);
    integer(r.vat);
    integer(r.total);
    need(r.vat === tax(r.net) && r.total === r.net + r.vat, "Totales inconsistentes en guía.");
    need([1, 2, 3, 4, 5, 6, 7].includes(r.transfer), "Tipo de traslado inválido en libro.");
    if (r.annulled) need([1, 2].includes(r.annulled), "Estado de anulación inválido.");
    if (r.billedReference)
      need(
        r.transfer === 1 &&
          !r.annulled &&
          r.billedReference.folio > 0 &&
          r.billedReference.date.startsWith(ctx.period),
        "Referencia de facturación incompatible.",
      );
  }
  const active = entries.filter((r) => !r.annulled),
    sales = active.filter((r) => r.transfer === 1);
  const other = [...new Set(active.filter((r) => r.transfer !== 1).map((r) => r.transfer))]
    .sort()
    .map((type) => {
      const rows = active.filter((r) => r.transfer === type);
      return el("TotTraslado", [
        el("TpoTraslado", type),
        el("CantGuia", rows.length),
        el(
          "MntGuia",
          rows.reduce((s, r) => s + r.total, 0),
        ),
      ]);
    });
  const summary = el("ResumenPeriodo", [
    el("TotFolAnulado", entries.filter((r) => r.annulled === 1).length),
    el("TotGuiaAnulada", entries.filter((r) => r.annulled === 2).length),
    el("TotGuiaVenta", sales.length),
    el(
      "TotMntGuiaVta",
      sales.reduce((s, r) => s + r.total, 0),
    ),
    ...other,
  ]);
  const details = entries.map((r) =>
    el("Detalle", [
      el("Folio", r.folio),
      opt("Anulado", r.annulled),
      el("TpoOper", r.transfer),
      el("FchDoc", r.date),
      el("RUTDoc", formatRut(r.receiverRut)),
      el("RznSoc", r.receiverName.slice(0, 50)),
      el("MntNeto", r.net),
      ...(r.net ? [el("TasaImp", 19), el("IVA", r.vat)] : []),
      el("MntTotal", r.total),
      opt("TpoDocRef", r.billedReference?.type),
      opt("FolioDocRef", r.billedReference?.folio),
      opt("FchDocRef", r.billedReference?.date),
    ]),
  );
  const cover = el("Caratula", [
    el("RutEmisorLibro", formatRut(ctx.company.rut)),
    el("RutEnvia", formatRut(ctx.senderRut)),
    el("PeriodoTributario", ctx.period),
    el("FchResol", ctx.company.resolutionDate),
    el("NroResol", ctx.company.resolutionNumber),
    el("TipoLibro", "ESPECIAL"),
    el("TipoEnvio", "TOTAL"),
    el("FolioNotificacion", ctx.notificationFolio),
  ]);
  return signedContainer(
    "LibroGuia",
    "EnvioLibro",
    `Guias${ctx.period.replace("-", "")}`,
    [cover, summary, ...details, el("TmstFirma", now())],
    certificate,
    "LibroGuia_v10.xsd",
  );
}

/** Acuse técnico de recepción, sin aceptar comercialmente documentos ni reclamar facturas. */
export async function certificationExchangeReceipt(
  environment: string,
  envelope: string,
  filename: string,
  receiverRut: string,
  responseId: number,
  certificate: LoadedCertificate,
) {
  assertCertification(environment);
  need(
    validRut(receiverRut) && Number.isSafeInteger(responseId) && responseId > 0,
    "Identidad de respuesta inválida.",
  );
  need(/^[A-Za-z0-9_.-]{1,80}\.xml$/.test(filename), "Nombre de archivo de intercambio inválido.");
  await validateCertificationXml(envelope, "EnvioDTE_v10.xsd");
  const verified = verifySiiXmlSignatures(envelope),
    root = parseXml(envelope),
    outer = child(root, "SetDTE");
  need(local(root.name) === "EnvioDTE" && outer, "Falta envío DTE firmado.");
  const signedSet = verified.find((r) => r.id === outer!.attrs.ID);
  need(signedSet, "El conjunto de intercambio no está firmado.");
  const set = parseXml(signedSet!.signedXml),
    cover = child(set, "Caratula"),
    dtes = children(set, "DTE");
  need(
    dtes.length > 0 && verified.length === dtes.length + 1,
    "Cantidad de firmas incompatible con el envío.",
  );
  need(
    normalizeRut(textOf(cover, "RutReceptor")) === normalizeRut(receiverRut),
    "El envío corresponde a otro receptor.",
  );
  const issuer = textOf(cover, "RutEmisor");
  need(validRut(issuer), "Emisor de intercambio inválido.");
  const details = dtes.map((dte) => {
    const doc = (dte.children ?? []).find((n) =>
        ["Documento", "Liquidacion", "Exportaciones"].includes(local(n.name)),
      ),
      h = child(doc, "Encabezado");
    need(
      doc &&
        child(dte, "Signature") &&
        normalizeRut(textOf(h, "Receptor", "RUTRecep")) === normalizeRut(receiverRut) &&
        normalizeRut(textOf(h, "Emisor", "RUTEmisor")) === normalizeRut(issuer),
      "Documento sin firma o con participantes incompatibles.",
    );
    return el("RecepcionDTE", [
      el("TipoDTE", textOf(h, "IdDoc", "TipoDTE")),
      el("Folio", textOf(h, "IdDoc", "Folio")),
      el("FchEmis", textOf(h, "IdDoc", "FchEmis")),
      el("RUTEmisor", formatRut(issuer)),
      el("RUTRecep", formatRut(receiverRut)),
      el(
        "MntTotal",
        Number(textOf(h, "IdDoc", "TipoDTE")) >= 110
          ? textOf(h, "OtraMoneda", "MntTotOtrMnda")
          : textOf(h, "Totales", "MntTotal"),
      ),
      el("EstadoRecepDTE", 0),
      el("RecepDTEGlosa", "DTE Recibido OK"),
    ]);
  });
  const body = [
    el(
      "Caratula",
      [
        el("RutResponde", formatRut(receiverRut)),
        el("RutRecibe", formatRut(issuer)),
        el("IdRespuesta", responseId),
        el("NroDetalles", 1),
        el("TmstFirmaResp", now()),
      ],
      { version: "1.0" },
    ),
    el("RecepcionEnvio", [
      el("NmbEnvio", filename),
      el("FchRecep", now()),
      el("CodEnvio", responseId),
      el("EnvioDTEID", set!.attrs.ID!),
      el("Digest", signedSet!.digestValue),
      el("RutEmisor", formatRut(issuer)),
      el("RutReceptor", formatRut(receiverRut)),
      el("EstadoRecepEnv", 0),
      el("RecepEnvGlosa", "Envio Recibido Conforme"),
      el("NroDTE", dtes.length),
      ...details,
    ]),
  ];
  const xml = signedContainer(
    "RespuestaDTE",
    "Resultado",
    `Respuesta${responseId}`,
    body,
    certificate,
    "RespuestaEnvioDTE_v10.xsd",
  );
  await validateCertificationXml(xml, "RespuestaEnvioDTE_v10.xsd");
  verifySiiXmlSignatures(xml, certificate.certificate.fingerprint256);
  return xml;
}

export interface CertificationConsumptionEntry {
  type: 39 | 41 | 61;
  folio: number;
  date: string;
  status: "USED" | "VOIDED";
  net: number;
  exempt: number;
  vat: number;
  total: number;
}
export function certificationConsumption(
  ctx: CertificationBookContext,
  day: string,
  sequence: number,
  entries: CertificationConsumptionEntry[],
  certificate: LoadedCertificate,
) {
  checkContext(ctx);
  periodDate(day, ctx.period);
  need(
    integer(sequence) > 0 && entries.length > 0,
    "Reporte de folios sin secuencia o movimientos.",
  );
  const seen = new Set<string>();
  for (const r of entries) {
    need(
      [39, 41, 61].includes(r.type) && ["USED", "VOIDED"].includes(r.status) && r.date === day,
      "Movimiento incompatible con consumo diario.",
    );
    integer(r.folio);
    need(r.folio > 0 && !seen.has(`${r.type}:${r.folio}`), "Folio duplicado o inválido.");
    seen.add(`${r.type}:${r.folio}`);
    if (r.status === "USED") {
      integer(r.net);
      integer(r.exempt);
      integer(r.vat);
      integer(r.total);
      need(
        r.total === r.net + r.exempt + r.vat && r.vat === tax(r.net),
        "Totales incompatibles con consumo.",
      );
    }
  }
  const ranges = (tag: string, rows: CertificationConsumptionEntry[]) => {
    const values = rows.map((r) => r.folio).sort((a, b) => a - b),
      out: string[] = [];
    let start = 0,
      end = 0;
    const flush = () => {
      if (start) out.push(el(tag, [el("Inicial", start), el("Final", end)]));
    };
    for (const n of values) {
      if (!start) {
        start = n;
        end = n;
      } else if (n === end + 1) end = n;
      else {
        flush();
        start = n;
        end = n;
      }
    }
    flush();
    return out;
  };
  const summaries = [...new Set(entries.map((r) => r.type))].sort().map((type) => {
    const rows = entries.filter((r) => r.type === type),
      used = rows.filter((r) => r.status === "USED"),
      voided = rows.filter((r) => r.status === "VOIDED");
    const sum = (field: "net" | "exempt" | "vat" | "total") =>
      used.reduce((s, r) => s + r[field], 0);
    return el("Resumen", [
      el("TipoDocumento", type),
      el("MntNeto", sum("net")),
      el("MntIva", sum("vat")),
      ...(sum("net") ? [el("TasaIVA", 19)] : []),
      el("MntExento", sum("exempt")),
      el("MntTotal", sum("total")),
      el("FoliosEmitidos", used.length),
      el("FoliosAnulados", voided.length),
      el("FoliosUtilizados", rows.length),
      ...ranges("RangoUtilizados", used),
      ...ranges("RangoAnulados", voided),
    ]);
  });
  const cover = el(
    "Caratula",
    [
      el("RutEmisor", formatRut(ctx.company.rut)),
      el("RutEnvia", formatRut(ctx.senderRut)),
      el("FchResol", ctx.company.resolutionDate),
      el("NroResol", ctx.company.resolutionNumber),
      el("FchInicio", day),
      el("FchFinal", day),
      el("SecEnvio", sequence),
      el("TmstFirmaEnv", now()),
    ],
    { version: "1.0" },
  );
  return signedContainer(
    "ConsumoFolios",
    "DocumentoConsumoFolios",
    `Consumo${day.replaceAll("-", "")}_${sequence}`,
    [cover, ...summaries],
    certificate,
    "ConsumoFolio_v10.xsd",
  );
}
