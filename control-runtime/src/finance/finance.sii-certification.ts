import { UnprocessableEntityException } from "@nestjs/common";
import { createHash, createPrivateKey, createSign } from "node:crypto";
import { child, children, local, parseXml, textOf } from "./finance.formats.js";
import { formatRut, normalizeRut, validRut } from "./finance.util.js";
import {
  el,
  SII_NS,
  XSI_NS,
  xmlSignature,
  type CafData,
  type DteCompany,
  type LoadedCertificate,
  DteSchemaValidator,
} from "./finance.dte-providers.js";

export const certificationTypes = [33, 34, 39, 41, 43, 46, 52, 56, 61, 110, 111, 112] as const;
export interface CertificationParty {
  rut: string;
  legalName: string;
  businessActivity: string;
  address: string;
  commune: string;
  city?: string;
  foreignId?: string;
  nationality?: number;
}
export interface CertificationLine {
  description: string;
  quantity?: number;
  unitPrice?: number;
  unit?: string;
  exempt?: boolean;
  discountPct?: number;
  surchargePct?: number;
  // Las liquidaciones informan el total de la línea y la cantidad de documentos, sin dividir precios.
  liquidationAmount?: number;
  liquidatedType?: number;
}
export interface CertificationReference {
  type: number;
  folio: string;
  date: string;
  code?: 1 | 2 | 3;
  reason: string;
}
export interface CertificationAdjustment {
  movement: "D" | "R";
  kind: "%" | "$";
  value: number;
  exempt?: boolean;
  description: string;
}
export interface CertificationCommission {
  description: string;
  net: number;
  exempt: number;
}
export interface CertificationExport {
  currency: string;
  exchangeRateCLP: number;
  service?: 3 | 4 | 5;
  paymentCode?: number;
  saleMode?: number;
  saleClause?: number;
  clauseTotal?: number;
  transportCode?: number;
  loadingPort?: number;
  unloadingPort?: number;
  tare?: number;
  tareUnit?: number;
  grossWeight?: number;
  grossWeightUnit?: number;
  netWeight?: number;
  netWeightUnit?: number;
  packageType?: number;
  packageCount?: number;
  packageMarks?: string;
  containerId?: string;
  containerSeal?: string;
  sealIssuer?: string;
  freight?: number;
  insurance?: number;
  receiverCountry: number;
  destinationCountry: number;
}
export interface CertificationDocument {
  environment: "CERTIFICATION";
  caseId: string;
  type: number;
  folio: number;
  date: string;
  company: DteCompany;
  receiver: CertificationParty;
  lines: CertificationLine[];
  references?: CertificationReference[];
  adjustments?: CertificationAdjustment[];
  commissions?: CertificationCommission[];
  retention?: { code: number; rate: number };
  dispatch?: {
    transfer: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    responsibility?: 1 | 2 | 3;
    destinationAddress: string;
    destinationCommune: string;
  };
  export?: CertificationExport;
  service?: 1 | 2 | 3 | 4;
  pricesIncludeVat?: boolean;
}
const fail = (message: string): never => {
  throw new UnprocessableEntityException(message);
};
const need = (condition: unknown, message: string) => {
  if (!condition) fail(message);
};
const str = (name: string, value: unknown) =>
  value === undefined || value === null || value === "" ? "" : el(name, String(value));
const stamp = () =>
  new Date().toLocaleString("sv-SE", { timeZone: "America/Santiago" }).replace(" ", "T");
const safeText = (value: string, max: number, label: string) => {
  need(
    typeof value === "string" &&
      value.trim().length > 0 &&
      value.length <= max &&
      !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u0100-\uffff]/u.test(value),
    `${label} vacío, demasiado largo o fuera de ISO-8859-1.`,
  );
  return value;
};
const date = (value: string) => {
  need(
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      new Date(value + "T12:00:00Z").toISOString().slice(0, 10) === value,
    "Fecha inválida.",
  );
  return value;
};
const finite = (n: number) => {
  need(Number.isFinite(n) && Math.abs(n) < 1e12, "Importe fuera de rango.");
  return n;
};
const scaled = (n: number) => {
  finite(n);
  const absolute = Math.abs(n).toFixed(6).replace(".", "");
  return BigInt(absolute) * (n < 0 ? -1n : 1n);
};
const divideRound = (n: bigint, d: bigint) => (n < 0n ? -((-n + d / 2n) / d) : (n + d / 2n) / d);
const round = (n: number, places = 0) =>
  Number(divideRound(scaled(n), 10n ** BigInt(6 - places))) / 10 ** places;
const percentage = (amount: number, pct: number, places: number) =>
  Number(divideRound(scaled(amount) * scaled(pct), 100n * 10n ** BigInt(12 - places))) /
  10 ** places;
const rootFor = (type: number) =>
  type === 43 ? "Liquidacion" : type >= 110 ? "Exportaciones" : "Documento";
const boolBoleta = (type: number) => type === 39 || type === 41;
export function assertCertification(environment: string) {
  need(
    environment === "CERTIFICATION",
    "Esta operación sólo admite certificación; no autoriza emisión productiva.",
  );
}

export function certificationTotals(input: CertificationDocument) {
  assertCertification(input.environment);
  need(
    !input.pricesIncludeVat || boolBoleta(input.type),
    "Precios con IVA permitidos sólo en boletas.",
  );
  const places = input.type >= 110 ? 2 : 0;
  need(
    input.lines.length > 0 && input.lines.length <= (boolBoleta(input.type) ? 1000 : 60),
    "Cantidad de líneas inválida.",
  );
  const lines = input.lines.map((line) => {
    safeText(line.description, 80, "Nombre del ítem");
    if (line.unit) safeText(line.unit, 4, "Unidad");
    if (line.liquidationAmount !== undefined)
      need(
        input.type === 43 &&
          Number.isInteger(line.liquidationAmount) &&
          Number.isInteger(line.liquidatedType),
        "Total explícito permitido sólo en liquidaciones con tipo de documento.",
      );
    const quantity = line.quantity ?? 1,
      price = line.unitPrice ?? 0;
    need(
      quantity > 0 && Number.isFinite(quantity) && price >= 0 && Number.isFinite(price),
      "Cantidad o precio inválido.",
    );
    for (const p of [line.discountPct ?? 0, line.surchargePct ?? 0])
      need(Number.isFinite(p) && p >= 0 && p <= 100, "Porcentaje de línea inválido.");
    const gross =
      Number(divideRound(scaled(quantity) * scaled(price), 10n ** BigInt(12 - places))) /
      10 ** places;
    // DescuentoMonto exige enteros en el XSD, incluso en exportaciones.
    const discount = percentage(gross, line.discountPct ?? 0, 0),
      surcharge = percentage(gross, line.surchargePct ?? 0, places);
    const amount = line.liquidationAmount ?? round(gross - discount + surcharge, places);
    return { ...line, quantity, price, discount, surcharge, amount };
  });
  let net = round(
    lines.filter((l) => !l.exempt).reduce((a, l) => a + l.amount, 0),
    places,
  );
  let exempt = round(
    lines.filter((l) => l.exempt).reduce((a, l) => a + l.amount, 0),
    places,
  );
  const base = { net, exempt };
  for (const a of input.adjustments ?? []) {
    need(
      ["D", "R"].includes(a.movement) && ["%", "$"].includes(a.kind) && finite(a.value) > 0,
      "Descuento o recargo global inválido.",
    );
    if (a.kind === "%") need(a.value <= 100, "Porcentaje global inválido.");
    safeText(a.description, 45, "Glosa global");
    const amount =
      a.kind === "%"
        ? percentage(a.exempt ? base.exempt : base.net, a.value, places)
        : round(a.value, places);
    if (a.exempt) exempt = round(exempt + (a.movement === "D" ? -amount : amount), places);
    else net = round(net + (a.movement === "D" ? -amount : amount), places);
  }
  need(input.type === 43 || (net >= 0 && exempt >= 0), "Los descuentos exceden la base imponible.");
  if ([34, 41, 110, 111, 112].includes(input.type))
    need(net === 0, "Este tipo de documento requiere líneas exentas.");
  const taxableGross = net;
  if (input.pricesIncludeVat) net = Number(divideRound(BigInt(net) * 100n, 119n));
  const tax = input.pricesIncludeVat ? taxableGross - net : percentage(net, 19, places);
  if (input.retention)
    need(
      [46, 56, 61].includes(input.type) &&
        input.retention.rate >= 0 &&
        input.retention.rate <= 19 &&
        [
          14, 15, 16, 17, 18, 19, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33, 34, 36, 37, 38, 39, 41,
          44, 45, 46, 47, 48, 49, 50, 51,
        ].includes(input.retention.code),
      "Retención incompatible con el documento.",
    );
  const retained = input.retention ? percentage(net, input.retention.rate, places) : 0;
  if (input.type === 46)
    need(
      input.retention,
      "La factura de compra debe informar su régimen de retención explícitamente.",
    );
  const commissions = (input.commissions ?? []).map((c) => {
    need(input.type === 43, "Comisiones disponibles en liquidaciones.");
    safeText(c.description, 60, "Comisión");
    const cnet = round(c.net),
      cexempt = round(c.exempt);
    return { ...c, net: cnet, exempt: cexempt, tax: percentage(cnet, 19, 0) };
  });
  const commissionNet = commissions.reduce((s, c) => s + c.net, 0),
    commissionExempt = commissions.reduce((s, c) => s + c.exempt, 0),
    commissionTax = commissions.reduce((s, c) => s + c.tax, 0);
  const total = round(
    net + exempt + tax - retained - commissionNet - commissionExempt - commissionTax,
    places,
  );
  return {
    lines,
    net,
    exempt,
    tax,
    retained,
    commissions,
    commissionNet,
    commissionExempt,
    commissionTax,
    total,
    places,
  };
}

/** Construcción pura: no reserva folios, no escribe facturas y no transmite documentos. */
export function certificationDocumentXml(
  input: CertificationDocument,
  caf: CafData,
  certificate: LoadedCertificate,
) {
  assertCertification(input.environment);
  need(
    certificationTypes.includes(input.type as (typeof certificationTypes)[number]),
    "Tipo de certificación no permitido.",
  );
  need(
    /^\d{1,12}-[1-9]\d{0,5}$/.test(input.caseId) ||
      (boolBoleta(input.type) && /^CASO-[1-9]\d{0,5}$/.test(input.caseId)),
    "Identificador de caso inválido.",
  );
  date(input.date);
  need(
    Number.isSafeInteger(input.folio) && input.folio >= caf.rangeFrom && input.folio <= caf.rangeTo,
    "Folio fuera del CAF.",
  );
  need(
    caf.documentTypeCode === input.type &&
      normalizeRut(caf.companyRut) === normalizeRut(input.company.rut),
    "CAF de otro tipo o emisor.",
  );
  need(validRut(input.company.rut) && validRut(input.receiver.rut), "RUT inválido.");
  const genericReceiver =
    boolBoleta(input.type) && normalizeRut(input.receiver.rut) === "66666666-6";
  if (genericReceiver)
    need(
      (input.service ?? 3) === 3,
      "El receptor genérico requiere una boleta de venta o servicio no periódico.",
    );
  for (const p of [input.company, input.receiver]) {
    safeText(p.legalName, 100, "Razón social");
    const optional = genericReceiver && p === input.receiver;
    if (!optional || p.businessActivity) safeText(p.businessActivity, 80, "Giro");
    if (!optional || p.address) safeText(p.address, 70, "Dirección");
    if (!optional || p.commune) safeText(p.commune, 20, "Comuna");
  }
  const b = boolBoleta(input.type),
    exp = input.type >= 110,
    t = certificationTotals(input),
    refs = input.references ?? [];
  const textOnlyNote =
    [56, 61].includes(input.type) &&
    refs.some((r) => r.code === 1 || r.code === 2) &&
    t.lines.length === 1 &&
    t.lines.every((l) => l.price === 0 && l.amount === 0) &&
    !input.adjustments?.length &&
    !input.retention &&
    !input.commissions?.length;
  need(refs.length <= 39, "Demasiadas referencias.");
  if ([56, 61, 111, 112].includes(input.type))
    need(
      refs.some((r) => r.code && [33, 34, 43, 46, 56, 61, 110, 111, 112].includes(r.type)),
      "La nota requiere referencia tributaria explícita.",
    );
  if (input.type === 52) {
    need(input.dispatch, "Falta motivo y responsable de traslado.");
    need(
      input.dispatch!.responsibility === undefined || [1, 2, 3].includes(input.dispatch!.responsibility),
      "Responsable de despacho inválido.",
    );
    if (input.dispatch!.transfer === 5)
      need(
        normalizeRut(input.receiver.rut) === normalizeRut(input.company.rut),
        "Un traslado interno debe tener al emisor como receptor.",
      );
  }
  if (exp) need(input.export, "Faltan moneda y antecedentes de exportación.");
  const x = input.export,
    dispatch = input.dispatch;
  if (x)
    need(
      Number.isFinite(x.exchangeRateCLP) && x.exchangeRateCLP > 0 && x.exchangeRateCLP < 1000000,
      "Falta tipo de cambio a pesos chilenos para exportación.",
    );
  const idDoc = [
    el("TipoDTE", input.type),
    el("Folio", input.folio),
    el("FchEmis", input.date),
    ...(dispatch
      ? [
          ...(dispatch.responsibility === undefined ? [] : [el("TipoDespacho", dispatch.responsibility)]),
          el("IndTraslado", dispatch.transfer),
        ]
      : []),
    ...(b
      ? [
          el("IndServicio", input.service ?? 3),
          ...(!input.pricesIncludeVat && input.type === 39 ? [el("IndMntNeto", 2)] : []),
        ]
      : x?.service
        ? [el("IndServicio", x.service)]
        : []),
    ...(!b ? [el("FmaPago", 2)] : []),
    str("FmaPagExp", x?.paymentCode),
  ];
  const emitter = el("Emisor", [
    el("RUTEmisor", formatRut(input.company.rut)),
    el(b ? "RznSocEmisor" : "RznSoc", input.company.legalName),
    el(b ? "GiroEmisor" : "GiroEmis", input.company.businessActivity),
    ...(!b ? [el("Acteco", input.company.activityCode)] : []),
    el("DirOrigen", input.company.address),
    el("CmnaOrigen", input.company.commune),
    str("CiudadOrigen", input.company.city),
  ]);
  const receiver = el("Receptor", [
    el("RUTRecep", formatRut(input.receiver.rut)),
    el("RznSocRecep", input.receiver.legalName),
    ...(x && input.receiver.foreignId
      ? [
          el("Extranjero", [
            el("NumId", input.receiver.foreignId),
            str("Nacionalidad", input.receiver.nationality),
          ]),
        ]
      : []),
    ...(!b ? [el("GiroRecep", input.receiver.businessActivity.slice(0, 40))] : []),
    str("DirRecep", input.receiver.address),
    str("CmnaRecep", input.receiver.commune),
    str("CiudadRecep", input.receiver.city),
  ]);
  const customs = x
    ? el("Aduana", [
        str("CodModVenta", x.saleMode),
        str("CodClauVenta", x.saleClause),
        str("TotClauVenta", x.clauseTotal),
        str("CodViaTransp", x.transportCode),
        str("CodPtoEmbarque", x.loadingPort),
        str("CodPtoDesemb", x.unloadingPort),
        str("Tara", x.tare),
        str("CodUnidMedTara", x.tareUnit),
        str("PesoBruto", x.grossWeight),
        str("CodUnidPesoBruto", x.grossWeightUnit),
        str("PesoNeto", x.netWeight),
        str("CodUnidPesoNeto", x.netWeightUnit),
        str("TotBultos", x.packageCount),
        ...(x.packageType
          ? [
              el("TipoBultos", [
                el("CodTpoBultos", x.packageType),
                str("CantBultos", x.packageCount),
                str("Marcas", x.packageMarks),
                str("IdContainer", x.containerId),
                str("Sello", x.containerSeal),
                str("EmisorSello", x.sealIssuer),
              ]),
            ]
          : []),
        str("MntFlete", x.freight),
        str("MntSeguro", x.insurance),
        el("CodPaisRecep", x.receiverCountry),
        el("CodPaisDestin", x.destinationCountry),
      ])
    : "";
  const transport =
    x || dispatch
      ? el("Transporte", [
          str("DirDest", dispatch?.destinationAddress),
          str("CmnaDest", dispatch?.destinationCommune),
          customs,
        ])
      : "";
  const commissionTotals = t.commissions.length
    ? el("Comisiones", [
        el("ValComNeto", t.commissionNet),
        el("ValComExe", t.commissionExempt),
        el("ValComIVA", t.commissionTax),
      ])
    : "";
  const totals = el(
    "Totales",
    exp
      ? [
          el("TpoMoneda", safeText(x!.currency, 15, "Moneda")),
          el("MntExe", t.exempt),
          el("MntTotal", t.total),
        ]
      : [
          ...(t.net !== 0 ? [el("MntNeto", t.net)] : []),
          ...(t.exempt !== 0 ? [el("MntExe", t.exempt)] : []),
          ...(t.net !== 0 ? [...(!b ? [el("TasaIVA", 19)] : []), el("IVA", t.tax)] : []),
          ...(input.type === 43 && t.commissionTax >= 0
            ? [el("IVAProp", t.commissionTax), el("IVATerc", t.tax - t.commissionTax)]
            : []),
          ...(input.retention
            ? [
                el("ImptoReten", [
                  el("TipoImp", input.retention.code),
                  el("TasaImp", input.retention.rate),
                  el("MontoImp", t.retained),
                ]),
              ]
            : []),
          commissionTotals,
          el("MntTotal", t.total),
        ],
  );
  const detail = t.lines.map((l, i) =>
    el("Detalle", [
      el("NroLinDet", i + 1),
      ...(input.type === 43 ? [el("TpoDocLiq", l.liquidatedType!)] : []),
      ...(l.exempt ? [el("IndExe", 1)] : []),
      el("NmbItem", l.description),
      // Una fe de erratas no representa una unidad de mercadería; QtyItem no admite cero.
      ...(!textOnlyNote && l.quantity !== undefined ? [el("QtyItem", l.quantity)] : []),
      str("UnmdItem", l.unit),
      ...(l.liquidationAmount === undefined && l.price > 0 ? [el("PrcItem", l.price)] : []),
      str("DescuentoPct", l.discountPct),
      ...(l.discount ? [el("DescuentoMonto", l.discount)] : []),
      str("RecargoPct", l.surchargePct),
      // RecargoMonto no admite fracciones; el porcentaje conserva el ajuste en MontoItem.
      ...(l.surcharge && Number.isInteger(l.surcharge) ? [el("RecargoMonto", l.surcharge)] : []),
      ...(input.retention && !l.exempt ? [el("CodImpAdic", input.retention.code)] : []),
      el("MontoItem", l.amount),
    ]),
  );
  const globals = (input.adjustments ?? []).map((a, i) =>
    el("DscRcgGlobal", [
      el("NroLinDR", i + 1),
      el("TpoMov", a.movement),
      el("GlosaDR", a.description),
      el("TpoValor", a.kind),
      el("ValorDR", a.value),
      ...(a.exempt ? [el("IndExeDR", 1)] : []),
    ]),
  );
  const references = [
    el("Referencia", [
      el("NroLinRef", 1),
      el(b ? "CodRef" : "TpoDocRef", "SET"),
      ...(!b ? [el("FolioRef", 1), el("FchRef", input.date)] : []),
      el("RazonRef", input.caseId.startsWith("CASO-") ? input.caseId : `CASO ${input.caseId}`),
    ]),
    ...refs.map((r, i) =>
      el("Referencia", [
        el("NroLinRef", i + 2),
        el("TpoDocRef", r.type),
        el("FolioRef", r.folio),
        ...(!b ? [el("FchRef", date(r.date))] : []),
        str("CodRef", r.code),
        el("RazonRef", safeText(r.reason, 90, "Razón referencia")),
      ]),
    ),
  ];
  const commissions = t.commissions.map((c, i) =>
    el("Comisiones", [
      el("NroLinCom", i + 1),
      el("TipoMovim", "C"),
      el("Glosa", c.description),
      el("ValComNeto", c.net),
      el("ValComExe", c.exempt),
      el("ValComIVA", c.tax),
    ]),
  );
  const now = stamp();
  need(t.total >= 0, "El timbre del set requiere total no negativo.");
  const dd = el("DD", [
    el("RE", formatRut(input.company.rut)),
    el("TD", input.type),
    el("F", input.folio),
    el("FE", input.date),
    el("RR", formatRut(input.receiver.rut)),
    el("RSR", input.receiver.legalName.slice(0, 40)),
    el("MNT", exp ? t.total : round(t.total)),
    el("IT1", input.lines[0]!.description.slice(0, 40)),
    caf.cafXml,
    el("TSTED", now),
  ]);
  const frmt = createSign("RSA-SHA1")
    .update(dd, "latin1")
    .sign(createPrivateKey(caf.privateKeyPem), "base64");
  const root = rootFor(input.type),
    id = `F${input.folio}T${input.type}`;
  const content = el(
    root,
    [
      el("Encabezado", [
        el("IdDoc", idDoc),
        emitter,
        receiver,
        ...(b ? [el("RUTProvSW", formatRut(input.company.rut))] : []),
        transport,
        totals,
        ...(x
          ? [
              el("OtraMoneda", [
                el("TpoMoneda", "PESO CL"),
                el("TpoCambio", x.exchangeRateCLP),
                el("MntExeOtrMnda", round(t.exempt * x.exchangeRateCLP)),
                el("MntTotOtrMnda", round(t.total * x.exchangeRateCLP)),
              ]),
            ]
          : []),
      ]),
      ...detail,
      ...globals,
      ...references,
      ...commissions,
      el("TED", [dd, el("FRMT", frmt, { algoritmo: "SHA1withRSA" })], { version: "1.0" }),
      el("TmstFirma", now),
    ].flatMap((part) => [part, "\n"]),
    { ID: id },
  );
  const canonical = b
    ? content.replace(`<${root} `, `<${root} xmlns="${SII_NS}" xmlns:xsi="${XSI_NS}" `)
    : content;
  const signature = xmlSignature(
    canonical,
    `#${id}`,
    certificate,
    b ? ` xmlns:xsi="${XSI_NS}"` : "",
    false,
    !b,
  );
  return { xml: el("DTE", [content, "\n", signature], { version: "1.0" }), totals: t };
}

export function certificationEnvelope(
  documents: string[],
  company: DteCompany,
  senderRut: string,
  certificate: LoadedCertificate,
  environment: string,
  recipientRut = "60803000-K",
) {
  assertCertification(environment);
  need(validRut(senderRut) && validRut(recipientRut), "Firmante o destinatario inválido.");
  need(
    documents.length > 0 && documents.length <= 500,
    "Cantidad de documentos por envío inválida.",
  );
  const types = new Map<number, number>(),
    ids = new Set<string>(),
    cases = new Set<string>();
  let boleta: boolean | undefined;
  for (const xml of documents) {
    const dte = parseXml(xml),
      docs = (dte.children ?? []).filter((n) =>
        ["Documento", "Liquidacion", "Exportaciones"].includes(local(n.name)),
      );
    need(
      local(dte.name) === "DTE" && docs.length === 1 && child(dte, "Signature"),
      "DTE firmado inválido.",
    );
    const doc = docs[0]!,
      h = child(doc, "Encabezado"),
      type = Number(textOf(h, "IdDoc", "TipoDTE")),
      folio = Number(textOf(h, "IdDoc", "Folio"));
    need(
      certificationTypes.includes(type as (typeof certificationTypes)[number]) &&
        rootFor(type) === local(doc.name),
      "Tipo y estructura incompatibles.",
    );
    const id = doc.attrs.ID;
    need(
      id === `F${folio}T${type}` && Number.isSafeInteger(folio) && folio > 0 && !ids.has(id!),
      "Identidad duplicada o inválida.",
    );
    ids.add(id!);
    need(
      normalizeRut(textOf(h, "Emisor", "RUTEmisor")) === normalizeRut(company.rut),
      "Documento de otro emisor.",
    );
    const refs = children(doc, "Referencia"),
      r = refs[0],
      caseId = textOf(r, "RazonRef");
    const b = boolBoleta(type);
    need(
      textOf(r, b ? "CodRef" : "TpoDocRef") === "SET" &&
        (/^CASO \d{1,12}-[1-9]\d{0,5}$/.test(caseId) ||
          (b && /^CASO-[1-9]\d{0,5}$/.test(caseId))) &&
        !cases.has(caseId),
      "Caso SET ausente, fuera de orden o duplicado.",
    );
    cases.add(caseId);
    need(boleta === undefined || boleta === b, "Boletas y DTE deben enviarse por separado.");
    boleta = b;
    types.set(type, (types.get(type) ?? 0) + 1);
  }
  const root = boleta ? "EnvioBOLETA" : "EnvioDTE",
    schema = boleta ? "EnvioBOLETA_v11.xsd" : "EnvioDTE_v10.xsd";
  const cover = el(
    "Caratula",
    [
      el("RutEmisor", formatRut(company.rut)),
      el("RutEnvia", formatRut(senderRut)),
      el("RutReceptor", formatRut(recipientRut)),
      el("FchResol", date(company.resolutionDate)),
      el("NroResol", company.resolutionNumber),
      el("TmstFirmaEnv", stamp()),
      ...[...types].map(([t, n]) => el("SubTotDTE", [el("TpoDTE", t), el("NroDTE", n)])),
    ],
    { version: "1.0" },
  );
  // El receptor clásico limita cada línea a 4090 bytes; los separadores preceden a la firma.
  const content = el(
    "SetDTE",
    [cover, "\n", ...documents.flatMap((document) => [document, "\n"])],
    { ID: "SetDoc" },
  );
  const canonical = content.replace("<SetDTE ", `<SetDTE xmlns="${SII_NS}" xmlns:xsi="${XSI_NS}" `);
  return (
    '<?xml version="1.0" encoding="ISO-8859-1"?>\n' +
    el(
      root,
      [content, "\n", xmlSignature(canonical, "#SetDoc", certificate, ` xmlns:xsi="${XSI_NS}"`)],
      {
        xmlns: SII_NS,
        "xmlns:xsi": XSI_NS,
        version: boleta ? "1.0" : "1.0",
        "xsi:schemaLocation": `${SII_NS} ${schema}`,
      },
    )
  );
}

export async function validateCertificationXml(xml: string, schemaName: string) {
  parseXml(xml);
  need(!/[\u0100-\uffff]/u.test(xml), "El XML contiene caracteres fuera de ISO-8859-1.");
  const errors = await new DteSchemaValidator().validate(xml, schemaName);
  if (errors.length) fail(`XML de certificación inválido: ${errors.join(" | ")}`);
  return {
    sha256: createHash("sha256").update(xml, "latin1").digest("hex"),
    bytes: Buffer.byteLength(xml, "latin1"),
  };
}

/** El UPLOAD clásico de certificación aún rechaza RUTProvSW, opcional en el XSD publicado. */
export async function certificationBoletaUploadEnvelope(
  xml: string,
  company: DteCompany,
  senderRut: string,
  certificate: LoadedCertificate,
  environment: string,
) {
  assertCertification(environment);
  need(local(parseXml(xml).name) === "EnvioBOLETA", "Se requiere un sobre de boletas.");
  await validateCertificationXml(xml, "EnvioBOLETA_v11.xsd");
  const { verifySiiXmlSignatures } = await import("./finance.sii-signatures.js");
  verifySiiXmlSignatures(xml, certificate.certificate.fingerprint256);
  const cover = child(child(parseXml(xml), "SetDTE"), "Caratula");
  need(
    normalizeRut(textOf(cover, "RutEmisor")) === normalizeRut(company.rut) &&
      normalizeRut(textOf(cover, "RutEnvia")) === normalizeRut(senderRut) &&
      normalizeRut(textOf(cover, "RutReceptor")) === "60803000-K" &&
      textOf(cover, "FchResol") === company.resolutionDate &&
      Number(textOf(cover, "NroResol")) === company.resolutionNumber,
    "La carátula no coincide con el proceso de certificación.",
  );
  const source = [
    ...xml.matchAll(
      /<DTE version="1\.0">(<Documento ID="F\d+T(?:39|41)">[\s\S]*?<\/Documento>)\s*<Signature\b[\s\S]*?<\/Signature><\/DTE>/g,
    ),
  ];
  need(
    source.length === children(child(parseXml(xml), "SetDTE"), "DTE").length && source.length > 0,
    "El sobre debe conservar la estructura generada para certificación.",
  );
  const documents = source.map((match) => {
    const original = match[1]!;
    const header = child(parseXml(original), "Encabezado");
    const provider = textOf(header, "RUTProvSW");
    need(
      provider !== "" && normalizeRut(provider) === normalizeRut(company.rut),
      "Proveedor de software ajeno al emisor.",
    );
    const content = original.replace(/<RUTProvSW>[^<]+<\/RUTProvSW>/, "");
    need(
      content !== original && !content.includes("<RUTProvSW>"),
      "Proveedor de software duplicado.",
    );
    const id = parseXml(content).attrs.ID!;
    const canonical = content.replace(
      "<Documento ",
      `<Documento xmlns="${SII_NS}" xmlns:xsi="${XSI_NS}" `,
    );
    return el(
      "DTE",
      [content, "\n", xmlSignature(canonical, `#${id}`, certificate, ` xmlns:xsi="${XSI_NS}"`)],
      { version: "1.0" },
    );
  });
  const result = certificationEnvelope(documents, company, senderRut, certificate, environment);
  await validateCertificationXml(result, "EnvioBOLETA_v11.xsd");
  verifySiiXmlSignatures(result, certificate.certificate.fingerprint256);
  return result;
}
