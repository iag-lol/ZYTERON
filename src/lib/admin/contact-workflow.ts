import { randomUUID } from "node:crypto";
import { buildQuoteMeta, serializeQuoteMessage, type QuoteLineItem } from "@/lib/admin/quote";
import { parseContactLeadDetails } from "@/lib/admin/contact-lead";
import { findOrCreateClientByEmail, insertRow, safeSelectSingle, type Lead } from "@/lib/admin/repository";

type LeadRow = Lead & {
  details: ReturnType<typeof parseContactLeadDetails>;
};

type ProjectPrefill = {
  clientId: string;
  quoteId: string;
  saleId: string;
  title: string;
  serviceArea: string;
  status: string;
  priority: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  owner: string;
  estimatedHours: string;
  actualHours: string;
  hourlyRate: string;
  totalCharge: string;
  description: string;
  scope: string;
};

function normalizeText(value?: string | null) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTitle(value: string) {
  const cleaned = normalizeText(value);
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function todayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function nextMonthDateOnly() {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
}

function parseLineAmount(line: string) {
  const candidates = line.match(/(?:\$|clp)?\s*[\d.]{3,}/gi) || [];
  for (const token of candidates.reverse()) {
    const digits = token.replace(/[^\d]/g, "");
    if (!digits) continue;
    const parsed = Number(digits);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }
  return 0;
}

function toQuoteItems(lead: LeadRow) {
  const items: QuoteLineItem[] = [];
  const rawLines = lead.details.cartLines || [];

  rawLines.forEach((line, index) => {
    const cleaned = normalizeText(line);
    if (!cleaned) return;
    const amount = parseLineAmount(cleaned);
    items.push({
      id: `lead-${index + 1}-${randomUUID().slice(0, 6)}`,
      description: cleaned,
      detail: "Ítem importado desde solicitud web",
      qty: 1,
      unit: "unidad",
      unitPrice: amount,
      discountPct: 0,
    });
  });

  if (items.length === 0) {
    const service = normalizeText(lead.details.service) || "Servicio solicitado";
    const brief = normalizeText(lead.details.brief) || "Sin detalle adicional";
    items.push({
      id: `lead-1-${randomUUID().slice(0, 6)}`,
      description: service,
      detail: brief,
      qty: 1,
      unit: "servicio",
      unitPrice: 0,
      discountPct: 0,
    });
  }

  return items;
}

function buildProjectDescription(lead: LeadRow) {
  const chunks: string[] = [];
  const brief = normalizeText(lead.details.brief);
  if (brief) chunks.push(brief);

  const cartLines = lead.details.cartLines || [];
  if (cartLines.length > 0) {
    chunks.push(`Servicios solicitados:\n- ${cartLines.join("\n- ")}`);
  }

  return chunks.join("\n\n").trim();
}

function buildProjectScope(lead: LeadRow) {
  const scopeLines: string[] = [];
  const selectedPlan = normalizeText(lead.details.selectedPlan);
  if (selectedPlan) scopeLines.push(`Plan seleccionado: ${selectedPlan}`);

  const extras = (lead.details.selectedExtras || []).map((item) => normalizeText(item)).filter(Boolean);
  if (extras.length > 0) scopeLines.push(`Extras: ${extras.join(", ")}`);

  const total = typeof lead.details.cartTotal === "number" ? lead.details.cartTotal : 0;
  if (total > 0) scopeLines.push(`Monto referencial formulario: $${total.toLocaleString("es-CL")}`);

  return scopeLines.join("\n");
}

export async function getLeadForWorkflow(leadId: string) {
  const row = await safeSelectSingle<Lead>(
    "Lead",
    "id, name, email, phone, source, message, type, createdAt",
    { id: leadId },
  );

  if (!row) return null;

  return {
    ...row,
    details: parseContactLeadDetails(row.message),
  } satisfies LeadRow;
}

export async function resolveClientIdFromLead(lead: LeadRow) {
  const email = normalizeText(lead.email).toLowerCase();
  if (!email) return null;

  return findOrCreateClientByEmail({
    name: normalizeText(lead.name) || normalizeText(lead.details.company) || email,
    email,
    company: normalizeText(lead.details.company) || null,
    phone: normalizeText(lead.phone) || null,
    contactName: normalizeText(lead.name) || null,
  });
}

export function buildProjectPrefillFromLead(lead: LeadRow, clientId?: string | null): ProjectPrefill {
  const service = normalizeText(lead.details.service) || "Servicio web";
  const companyOrName = normalizeText(lead.details.company) || normalizeText(lead.name) || "Nuevo cliente";
  const title = `Proyecto ${normalizeTitle(service)} · ${companyOrName}`;

  const total = typeof lead.details.cartTotal === "number" ? Math.max(0, Math.round(lead.details.cartTotal)) : 0;
  const estimatedHours = 24;
  const hourlyRate = total > 0 ? Math.round(total / Math.max(1, estimatedHours)) : 35000;

  return {
    clientId: clientId || "",
    quoteId: "",
    saleId: "",
    title,
    serviceArea: normalizeTitle(service),
    status: "Planificado",
    priority: "Normal",
    startDate: todayDateOnly(),
    startTime: "09:00",
    endDate: "",
    endTime: "",
    owner: "",
    estimatedHours: String(estimatedHours),
    actualHours: "0",
    hourlyRate: String(hourlyRate),
    totalCharge: total > 0 ? String(total) : "0",
    description: buildProjectDescription(lead),
    scope: buildProjectScope(lead),
  };
}

export async function createQuoteDraftFromLead(lead: LeadRow, clientId?: string | null) {
  const createdAt = new Date().toISOString();
  const quoteDate = todayDateOnly();
  const validUntil = nextMonthDateOnly();
  const items = toQuoteItems(lead);

  let subtotal = items.reduce((acc, item) => acc + Math.max(0, Math.round(item.unitPrice)) * Math.max(0, item.qty), 0);
  const leadTotal = typeof lead.details.cartTotal === "number" ? Math.max(0, Math.round(lead.details.cartTotal)) : 0;

  if (leadTotal > 0) {
    subtotal = Math.round(leadTotal / 1.19);
  }

  const iva = Math.round(subtotal * 0.19);
  const grandTotal = leadTotal > 0 ? leadTotal : subtotal + iva;

  const quoteMeta = buildQuoteMeta({
    clientContact: normalizeText(lead.name) || undefined,
    quoteNumber: `COT-${new Date().getFullYear()}-${randomUUID().slice(0, 4).toUpperCase()}`,
    quoteDate,
    validUntil,
    validityDays: "30 días",
    paymentMethod: "Transferencia bancaria",
    paymentTerms: "30 días",
    includeIva: true,
    ivaRate: 0.19,
    items,
    subtotal,
    totalDescuento: 0,
    iva,
    grandTotal,
    notes: normalizeText(lead.details.brief) || "Borrador generado automáticamente desde contacto web.",
    terms:
      "Borrador inicial desde contacto web. Revisa ítems, condiciones comerciales y totales antes de enviar al cliente.",
  });

  const createdQuote = await insertRow<{ id: string }>(
    "Quote",
    {
      userId: clientId || null,
      name: normalizeText(lead.name) || "Contacto web",
      email: normalizeText(lead.email) || null,
      phone: normalizeText(lead.phone) || null,
      company: normalizeText(lead.details.company) || null,
      message: serializeQuoteMessage(quoteMeta),
      subtotal,
      discount: 0,
      total: grandTotal,
      status: "PENDING",
      createdAt,
    },
    "id",
  );

  return createdQuote.id;
}
