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

export type QuotePaymentChannel = "FLOW" | "TRANSFER";
export type QuotePaymentPlanMode = "FULL" | "DELIVERY" | "SPLIT";
export type QuotePaymentStageKey = "FULL" | "DELIVERY" | "INITIAL" | "FINAL";
export type QuotePaymentBillingType = "ONE_TIME" | "SUBSCRIPTION";
export type QuoteSubscriptionInterval = "MONTHLY";
export type QuoteSubscriptionStatus = "PENDING" | "ACTIVE" | "FAILED";
export type QuotePaymentStageStatus =
  | "PENDING"
  | "READY"
  | "PROCESSING"
  | "PAID"
  | "PENDING_TRANSFER_REVIEW"
  | "REJECTED";

export type QuotePaymentProof = {
  id: string;
  amount: number;
  uploadedAt: string;
  transferDate?: string;
  reference?: string;
  note?: string;
  fileUrl?: string;
  fileName?: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
};

export type QuotePaymentStage = {
  key: QuotePaymentStageKey;
  label: string;
  percentage: number;
  amount: number;
  paymentChannel: QuotePaymentChannel;
  status: QuotePaymentStageStatus;
  dueEnabled?: boolean;
  dueLabel?: string;
  lastRequestedAt?: string;
  paidAt?: string;
  approvedAt?: string;
  flow?: {
    commerceOrder?: string;
    token?: string;
    checkoutUrl?: string;
    flowOrder?: number;
    status?: number;
    statusLabel?: string;
    updatedAt?: string;
    lastError?: string;
  };
  transferProofs?: QuotePaymentProof[];
};

export type QuotePaymentConfig = {
  enabled?: boolean;
  billingType?: QuotePaymentBillingType;
  planMode?: QuotePaymentPlanMode;
  defaultChannel?: QuotePaymentChannel;
  channelConfigured?: boolean;
  splitPercentInitial?: number;
  splitPercentFinal?: number;
  alertStatus?: "PENDING" | "PAID" | "TRANSFER_REVIEW";
  totalQuoted?: number;
  totalPaid?: number;
  totalPending?: number;
  customerAssignedAt?: string;
  contractEmailSentAt?: string;
  internalEmailSentAt?: string;
  legalAcceptance?: {
    acceptedAt?: string;
    acceptedByUserId?: string;
    acceptedByEmail?: string;
    stageKey?: QuotePaymentStageKey;
    mode?: "FLOW" | "SUBSCRIPTION";
    source?: "PORTAL_QUOTE_MODAL";
    termsUrl?: string;
    privacyUrl?: string;
  };
  subscription?: {
    interval?: QuoteSubscriptionInterval;
    amount?: number;
    planId?: string;
    planName?: string;
    customerId?: string;
    subscriptionId?: string;
    registerToken?: string;
    registerUrl?: string;
    status?: QuoteSubscriptionStatus;
    activatedAt?: string;
    nextInvoiceDate?: string;
    updatedAt?: string;
    lastError?: string;
    lastPaymentAt?: string;
    lastPaymentStatus?: string;
  };
  stages?: QuotePaymentStage[];
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
  kind?: string;
  quoteCode?: string;
  source?: string;
  clientSubmissionId?: string;
  projectType?: string;
  projectTypeLabel?: string;
  businessName?: string;
  businessRubro?: string;
  businessCity?: string;
  hasWebsite?: string;
  hasLogo?: string;
  hasDomain?: string;
  hasContent?: string;
  projectSummary?: string;
  projectAnswers?: Array<{ key: string; label: string; value: string }>;
  projectComment?: string;
  budgetRange?: string;
  budgetRangeLabel?: string;
  deadline?: string;
  deadlineLabel?: string;
  urgency?: string;
  urgencyLabel?: string;
  priority?: string;
  contactName?: string;
  contactWhatsapp?: string;
  contactWhatsappE164?: string;
  contactEmail?: string;
  contactCompany?: string;
  currentWebsite?: string;
  additionalMessage?: string;
  requestStage?: string;
  shortSummary?: string;
  emailStatus?: string;
  whatsappStatus?: string;
  adminStatus?: string;
  resendMessageId?: string;
  twilioMessageId?: string;
  submittedFrom?: string;
  submittedAt?: string;
  errorLog?: string[];
  payment?: QuotePaymentConfig;
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
    ? "Los valores unitarios se expresan en montos netos; el total de esta cotización incluye IVA (19%) desglosado."
    : "Todos los montos indicados son netos y se les adicionará IVA (19%) al momento de facturar.";

  return [
    "Alcance: Se incluye únicamente lo descrito en este documento. Requerimientos adicionales se cotizarán por separado.",
    `Valores: ${ivaLine}`,
    "Plazos de ejecución: El tiempo de desarrollo comienza a correr solo cuando se ha validado el abono inicial y el cliente ha entregado el 100% del material necesario (textos, logos, accesos).",
    "Revisiones: El servicio incluye un máximo de dos (2) rondas de correcciones. Cambios estructurales posteriores tendrán costo extra.",
    "Condición de entrega: El saldo final del proyecto debe ser cancelado en su totalidad antes de la publicación oficial y la entrega de credenciales.",
    "Garantía: Incluye 30 días de garantía técnica para corrección de errores de código. No incluye cambios de contenido ni reparaciones por mal uso.",
    "Vigencia: Esta cotización es válida hasta la fecha indicada en este documento."
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
      projectAnswers: [],
      errorLog: [],
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
      kind: typeof raw.kind === "string" ? raw.kind : undefined,
      quoteCode: typeof raw.quoteCode === "string" ? raw.quoteCode : undefined,
      source: typeof raw.source === "string" ? raw.source : undefined,
      clientSubmissionId: typeof raw.clientSubmissionId === "string" ? raw.clientSubmissionId : undefined,
      projectType: typeof raw.projectType === "string" ? raw.projectType : undefined,
      projectTypeLabel: typeof raw.projectTypeLabel === "string" ? raw.projectTypeLabel : undefined,
      businessName: typeof raw.businessName === "string" ? raw.businessName : undefined,
      businessRubro: typeof raw.businessRubro === "string" ? raw.businessRubro : undefined,
      businessCity: typeof raw.businessCity === "string" ? raw.businessCity : undefined,
      hasWebsite: typeof raw.hasWebsite === "string" ? raw.hasWebsite : undefined,
      hasLogo: typeof raw.hasLogo === "string" ? raw.hasLogo : undefined,
      hasDomain: typeof raw.hasDomain === "string" ? raw.hasDomain : undefined,
      hasContent: typeof raw.hasContent === "string" ? raw.hasContent : undefined,
      projectSummary: typeof raw.projectSummary === "string" ? raw.projectSummary : undefined,
      projectAnswers: Array.isArray(raw.projectAnswers)
        ? raw.projectAnswers
            .filter((item) => item && typeof item === "object")
            .map((item) => ({
              key: typeof item.key === "string" ? item.key : "",
              label: typeof item.label === "string" ? item.label : "",
              value: typeof item.value === "string" ? item.value : "",
            }))
            .filter((item) => item.key && item.label && item.value)
        : [],
      projectComment: typeof raw.projectComment === "string" ? raw.projectComment : undefined,
      budgetRange: typeof raw.budgetRange === "string" ? raw.budgetRange : undefined,
      budgetRangeLabel: typeof raw.budgetRangeLabel === "string" ? raw.budgetRangeLabel : undefined,
      deadline: typeof raw.deadline === "string" ? raw.deadline : undefined,
      deadlineLabel: typeof raw.deadlineLabel === "string" ? raw.deadlineLabel : undefined,
      urgency: typeof raw.urgency === "string" ? raw.urgency : undefined,
      urgencyLabel: typeof raw.urgencyLabel === "string" ? raw.urgencyLabel : undefined,
      priority: typeof raw.priority === "string" ? raw.priority : undefined,
      contactName: typeof raw.contactName === "string" ? raw.contactName : undefined,
      contactWhatsapp: typeof raw.contactWhatsapp === "string" ? raw.contactWhatsapp : undefined,
      contactWhatsappE164: typeof raw.contactWhatsappE164 === "string" ? raw.contactWhatsappE164 : undefined,
      contactEmail: typeof raw.contactEmail === "string" ? raw.contactEmail : undefined,
      contactCompany: typeof raw.contactCompany === "string" ? raw.contactCompany : undefined,
      currentWebsite: typeof raw.currentWebsite === "string" ? raw.currentWebsite : undefined,
      additionalMessage: typeof raw.additionalMessage === "string" ? raw.additionalMessage : undefined,
      requestStage: typeof raw.requestStage === "string" ? raw.requestStage : undefined,
      shortSummary: typeof raw.shortSummary === "string" ? raw.shortSummary : undefined,
      emailStatus: typeof raw.emailStatus === "string" ? raw.emailStatus : undefined,
      whatsappStatus: typeof raw.whatsappStatus === "string" ? raw.whatsappStatus : undefined,
      adminStatus: typeof raw.adminStatus === "string" ? raw.adminStatus : undefined,
      resendMessageId: typeof raw.resendMessageId === "string" ? raw.resendMessageId : undefined,
      twilioMessageId: typeof raw.twilioMessageId === "string" ? raw.twilioMessageId : undefined,
      submittedFrom: typeof raw.submittedFrom === "string" ? raw.submittedFrom : undefined,
      submittedAt: typeof raw.submittedAt === "string" ? raw.submittedAt : undefined,
      errorLog: Array.isArray(raw.errorLog)
        ? raw.errorLog.filter((item) => typeof item === "string")
        : [],
      payment: raw.payment && typeof raw.payment === "object" ? (raw.payment as QuotePaymentConfig) : undefined,
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
    displayNumber: meta.quoteCode || meta.quoteNumber || `COT-${record.id.slice(0, 8).toUpperCase()}`,
    issuedAt: meta.quoteDate || record.createdAt || new Date().toISOString(),
    totalAmount: typeof record.total === "number" ? record.total : meta.grandTotal,
    subtotalAmount: typeof record.subtotal === "number" ? record.subtotal : meta.subtotal,
    discountAmount: typeof record.discount === "number" ? record.discount : meta.totalDescuento,
    // Siempre la ruta que genera el PDF al momento: el archivo del bucket es
    // una copia histórica congelada con el diseño de su época, y servirla
    // hacía que ningún rediseño se viera en cotizaciones ya creadas.
    pdfUrl: `/admin/cotizaciones/${record.id}/pdf`,
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
    payment: input.payment,
  };

  return meta;
}
