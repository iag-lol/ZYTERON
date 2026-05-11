import { ZYTERON_COMPANY } from "@/lib/company";

export type QuoteLineItem = {
  id?: string;
  description: string;
  detail?: string;
  qty: number;
  unit?: string;
  unitPrice: number;
  discountPct?: number;
};

export type QuoteMeta = {
  clientRut?: string;
  clientAddress?: string;
  clientCity?: string;
  clientContact?: string;
  quoteNumber?: string;
  quoteDate?: string;
  validUntil?: string;
  validityDays?: string;
  paymentMethod?: string;
  paymentTerms?: string;
  includeIva?: boolean;
  ivaRate?: number;
  items: QuoteLineItem[];
  subtotal: number;
  totalDescuento: number;
  iva: number;
  grandTotal: number;
  notes?: string;
  terms?: string;
  companyName?: string;
  companyRut?: string;
  companyGiro?: string;
  pdfStoragePath?: string;
  pdfPublicUrl?: string;
  pdfGeneratedAt?: string;
};

type RawQuoteMessage = Partial<QuoteMeta> & {
  items?: QuoteLineItem[];
};

export type QuoteRecord = {
  id: string;
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  message?: string | null;
  subtotal?: number | null;
  discount?: number | null;
  total?: number | null;
  status?: string | null;
  createdAt?: string | null;
};

export function currencyCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function buildDefaultQuoteTerms(includeIva = true) {
  const ivaLine = includeIva
    ? "Todos los valores indicados en esta cotización incluyen IVA (19%)."
    : "Todos los valores indicados en esta cotización son netos y se les adicionará IVA (19%) al momento de facturar.";

  return [
    "1) Alcance: esta propuesta considera únicamente los servicios y entregables descritos en el detalle de ítems.",
    "2) Cambios: cualquier solicitud fuera de alcance se evaluará y cotizará por separado antes de su ejecución.",
    `3) Impuestos: ${ivaLine}`,
    "4) Inicio de servicios: la ejecución comienza una vez confirmada la aceptación comercial y recibido el pago acordado.",
    "5) Vigencia: la cotización mantiene validez por el plazo indicado en el documento.",
    "6) Forma y plazo de pago: se aplican según lo indicado en el resumen comercial de esta cotización.",
  ].join("\n");
}

export function parseQuoteMessage(message?: string | null): QuoteMeta {
  const safeBase: QuoteMeta = {
    items: [],
    subtotal: 0,
    totalDescuento: 0,
    iva: 0,
    grandTotal: 0,
    includeIva: true,
    ivaRate: 0.19,
    companyName: ZYTERON_COMPANY.legalName,
    companyRut: ZYTERON_COMPANY.rut,
    companyGiro: ZYTERON_COMPANY.businessLine,
    terms: buildDefaultQuoteTerms(true),
  };

  if (!message) {
    return safeBase;
  }

  try {
    const raw = JSON.parse(message) as RawQuoteMessage;

    return {
      ...safeBase,
      ...raw,
      items: Array.isArray(raw.items)
        ? raw.items.map((item) => ({
            id: item.id,
            description: item.description || "",
            detail: item.detail || "",
            qty: Number(item.qty || 0),
            unit: item.unit || "unidad",
            unitPrice: Number(item.unitPrice || 0),
            discountPct: Number(item.discountPct || 0),
          }))
        : [],
      subtotal: Number(raw.subtotal || 0),
      totalDescuento: Number(raw.totalDescuento || 0),
      iva: Number(raw.iva || 0),
      grandTotal: Number(raw.grandTotal || 0),
      includeIva: raw.includeIva ?? true,
      ivaRate: typeof raw.ivaRate === "number" ? raw.ivaRate : 0.19,
      terms:
        typeof raw.terms === "string" && raw.terms.trim().length > 0
          ? raw.terms
          : buildDefaultQuoteTerms(raw.includeIva ?? true),
    };
  } catch {
    return safeBase;
  }
}

export function serializeQuoteMessage(meta: QuoteMeta) {
  return JSON.stringify(meta);
}

export function enrichQuoteRecord(record: QuoteRecord) {
  const meta = parseQuoteMessage(record.message);

  return {
    ...record,
    meta,
    displayNumber: meta.quoteNumber || `COT-${record.id.slice(0, 8).toUpperCase()}`,
    issuedAt: meta.quoteDate || record.createdAt || new Date().toISOString(),
    totalAmount: typeof record.total === "number" ? record.total : meta.grandTotal,
    subtotalAmount: typeof record.subtotal === "number" ? record.subtotal : meta.subtotal,
    discountAmount: typeof record.discount === "number" ? record.discount : meta.totalDescuento,
    pdfUrl: meta.pdfPublicUrl || `/admin/cotizaciones/${record.id}/pdf`,
  };
}

export function buildQuoteMeta(input: Partial<QuoteMeta>): QuoteMeta {
  const includeIva = input.includeIva ?? true;
  const meta: QuoteMeta = {
    items: input.items ?? [],
    subtotal: input.subtotal ?? 0,
    totalDescuento: input.totalDescuento ?? 0,
    iva: input.iva ?? 0,
    grandTotal: input.grandTotal ?? 0,
    clientRut: input.clientRut,
    clientAddress: input.clientAddress,
    clientCity: input.clientCity,
    clientContact: input.clientContact,
    quoteNumber: input.quoteNumber,
    quoteDate: input.quoteDate,
    validUntil: input.validUntil,
    validityDays: input.validityDays,
    paymentMethod: input.paymentMethod,
    paymentTerms: input.paymentTerms,
    includeIva,
    ivaRate: input.ivaRate ?? 0.19,
    notes: input.notes,
    terms: input.terms && input.terms.trim().length > 0 ? input.terms : buildDefaultQuoteTerms(includeIva),
    companyName: input.companyName || ZYTERON_COMPANY.legalName,
    companyRut: input.companyRut || ZYTERON_COMPANY.rut,
    companyGiro: input.companyGiro || ZYTERON_COMPANY.businessLine,
    pdfPublicUrl: input.pdfPublicUrl,
    pdfStoragePath: input.pdfStoragePath,
    pdfGeneratedAt: input.pdfGeneratedAt,
  };

  return meta;
}
