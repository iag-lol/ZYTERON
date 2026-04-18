import { hash } from "bcrypt";
import { randomUUID } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildQuoteMeta, enrichQuoteRecord, parseQuoteMessage, serializeQuoteMessage, type QuoteMeta, type QuoteRecord } from "@/lib/admin/quote";

export type Lead = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  message?: string;
  type?: string;
  status?: string;
  createdAt?: string;
};

export type Visit = {
  id: string;
  clientId?: string | null;
  date?: string | null;
  notes?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

export type Sale = {
  id: string;
  clientId?: string | null;
  total?: number | null;
  createdAt?: string | null;
  description?: string | null;
  paymentMethod?: string | null;
  invoiceRef?: string | null;
};

export type Client = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  industry?: string | null;
  rut?: string | null;
  contactName?: string | null;
  notes?: string | null;
  tier?: "Basic" | "Pro" | "Enterprise" | string | null;
  role?: string | null;
  createdAt?: string | null;
};

export type Project = {
  id: string;
  clientId?: string | null;
  quoteId?: string | null;
  saleId?: string | null;
  title: string;
  serviceArea?: string | null;
  status?: string | null;
  priority?: string | null;
  startDate?: string | null;
  startTime?: string | null;
  endDate?: string | null;
  endTime?: string | null;
  description?: string | null;
  scope?: string | null;
  hourlyRate?: number | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  totalCharge?: number | null;
  owner?: string | null;
  createdAt?: string | null;
};

export type ClientRequest = {
  id: string;
  clientId?: string | null;
  projectId?: string | null;
  subject: string;
  channel?: string | null;
  priority?: string | null;
  status?: string | null;
  description?: string | null;
  dueDate?: string | null;
  createdAt?: string | null;
};

export type TaxDocument = {
  id: string;
  clientId?: string | null;
  projectId?: string | null;
  quoteId?: string | null;
  saleId?: string | null;
  type?: string | null;
  documentNumber?: string | null;
  siiFolio?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  netAmount?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
  status?: string | null;
  paymentStatus?: string | null;
  emissionMethod?: string | null;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  notes?: string | null;
  createdAt?: string | null;
};

export type EnrichedQuote = ReturnType<typeof enrichQuoteRecord>;

type SelectOptions = {
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  filters?: Record<string, string | number | null | undefined>;
};

function isMissingRelationError(message?: string) {
  return Boolean(
    message &&
      (message.includes("Could not find the table") ||
        message.includes("relation") ||
        message.includes("does not exist")),
  );
}

export async function safeSelect<T>(table: string, select: string, options: SelectOptions = {}) {
  const { supabase } = createSupabaseServerClient();
  let query = supabase.from(table).select(select);

  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value === undefined) continue;
      if (value === null) {
        query = query.is(key, null);
      } else {
        query = query.eq(key, value);
      }
    }
  }

  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? false });
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingRelationError(error.message)) {
      return [] as T[];
    }
    throw error;
  }

  return (data ?? []) as T[];
}

export async function safeSelectSingle<T>(table: string, select: string, filters: Record<string, string | number>) {
  const rows = await safeSelect<T>(table, select, { filters, limit: 1 });
  return rows[0] ?? null;
}

export async function insertRow<T>(table: string, payload: Record<string, unknown>, select = "*") {
  const { supabase } = createSupabaseServerClient();
  const rowPayload = Object.prototype.hasOwnProperty.call(payload, "id")
    ? payload
    : { id: randomUUID(), ...payload };
  const { data, error } = await supabase.from(table).insert(rowPayload).select(select).single();
  if (error) {
    throw error;
  }
  return data as T;
}

export async function updateRows(table: string, payload: Record<string, unknown>, filters: Record<string, string | number>) {
  const { supabase } = createSupabaseServerClient();
  let query = supabase.from(table).update(payload);

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  const { error } = await query;
  if (error) {
    throw error;
  }
}

export async function getQuotes() {
  const rows = await safeSelect<QuoteRecord>(
    "Quote",
    "id, userId, name, email, phone, company, message, subtotal, discount, total, status, createdAt",
    { orderBy: "createdAt" },
  );

  return rows.map((row) => enrichQuoteRecord(row));
}

export async function getQuoteById(id: string) {
  const row = await safeSelectSingle<QuoteRecord>(
    "Quote",
    "id, userId, name, email, phone, company, message, subtotal, discount, total, status, createdAt",
    { id },
  );

  return row ? enrichQuoteRecord(row) : null;
}

export async function getClients() {
  return safeSelect<Client>(
    "User",
    "id, name, email, company, phone, address, city, country, role, createdAt, rut, contactName, industry, tier, notes",
    { orderBy: "name", ascending: true },
  );
}

export async function getClientById(id: string) {
  return safeSelectSingle<Client>(
    "User",
    "id, name, email, company, phone, address, city, country, role, createdAt, rut, contactName, industry, tier, notes",
    { id },
  );
}

export async function findOrCreateClientByEmail(input: {
  name: string;
  email: string;
  company?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  rut?: string | null;
  contactName?: string | null;
}) {
  const existing = await safeSelectSingle<Client>("User", "id, email, name", { email: input.email });
  if (existing) {
    await updateRows(
      "User",
      {
        name: input.name || existing.name,
        company: input.company || null,
        phone: input.phone || null,
        address: input.address || null,
        city: input.city || null,
        rut: input.rut || null,
        contactName: input.contactName || null,
        updatedAt: new Date().toISOString(),
      },
      { id: existing.id },
    );
    return existing.id;
  }

  const passwordHash = await hash(randomUUID(), 10);
  const client = await insertRow<Client>(
    "User",
    {
      email: input.email,
      passwordHash,
      name: input.name,
      role: "CLIENT",
      company: input.company || null,
      phone: input.phone || null,
      address: input.address || null,
      city: input.city || null,
      country: "Chile",
      rut: input.rut || null,
      contactName: input.contactName || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    "id",
  );

  return client.id;
}

export async function getVisits() {
  return safeSelect<Visit>("Visit", "id, clientId, date, notes, status, createdAt", { orderBy: "date" });
}

export async function getSales() {
  return safeSelect<Sale>(
    "Sale",
    "id, clientId, total, createdAt, description, paymentMethod, invoiceRef",
    { orderBy: "createdAt" },
  );
}

export async function getProjects() {
  return safeSelect<Project>(
    "Project",
    "id, clientId, quoteId, saleId, title, serviceArea, status, priority, startDate, startTime, endDate, endTime, description, scope, hourlyRate, estimatedHours, actualHours, totalCharge, owner, createdAt",
    { orderBy: "createdAt" },
  );
}

export async function getRequests() {
  return safeSelect<ClientRequest>(
    "ClientRequest",
    "id, clientId, projectId, subject, channel, priority, status, description, dueDate, createdAt",
    { orderBy: "createdAt" },
  );
}

export async function getTaxDocuments() {
  return safeSelect<TaxDocument>(
    "TaxDocument",
    "id, clientId, projectId, quoteId, saleId, type, documentNumber, siiFolio, issueDate, dueDate, netAmount, taxAmount, totalAmount, status, paymentStatus, emissionMethod, pdfUrl, xmlUrl, notes, createdAt",
    { orderBy: "issueDate" },
  );
}

export async function getClientWorkspace(clientId: string) {
  const [client, quotes, visits, sales, projects, requests, documents] = await Promise.all([
    getClientById(clientId),
    safeSelect<QuoteRecord>(
      "Quote",
      "id, userId, name, email, phone, company, message, subtotal, discount, total, status, createdAt",
      { filters: { userId: clientId }, orderBy: "createdAt" },
    ),
    safeSelect<Visit>("Visit", "id, clientId, date, notes, status, createdAt", {
      filters: { clientId },
      orderBy: "date",
    }),
    safeSelect<Sale>("Sale", "id, clientId, total, createdAt, description, paymentMethod, invoiceRef", {
      filters: { clientId },
      orderBy: "createdAt",
    }),
    safeSelect<Project>(
      "Project",
      "id, clientId, quoteId, saleId, title, serviceArea, status, priority, startDate, startTime, endDate, endTime, description, scope, hourlyRate, estimatedHours, actualHours, totalCharge, owner, createdAt",
      { filters: { clientId }, orderBy: "createdAt" },
    ),
    safeSelect<ClientRequest>(
      "ClientRequest",
      "id, clientId, projectId, subject, channel, priority, status, description, dueDate, createdAt",
      { filters: { clientId }, orderBy: "createdAt" },
    ),
    safeSelect<TaxDocument>(
      "TaxDocument",
      "id, clientId, projectId, quoteId, saleId, type, documentNumber, siiFolio, issueDate, dueDate, netAmount, taxAmount, totalAmount, status, paymentStatus, emissionMethod, pdfUrl, xmlUrl, notes, createdAt",
      { filters: { clientId }, orderBy: "issueDate" },
    ),
  ]);

  return {
    client,
    quotes: quotes.map((row) => enrichQuoteRecord(row)),
    visits,
    sales,
    projects,
    requests,
    documents,
  };
}

export function withQuotePdfMeta(record: QuoteRecord, patch: Partial<QuoteMeta>) {
  const current = parseQuoteMessage(record.message);
  const next = buildQuoteMeta({
    ...current,
    ...patch,
    items: current.items,
    subtotal: current.subtotal,
    totalDescuento: current.totalDescuento,
    iva: current.iva,
    grandTotal: current.grandTotal,
  });

  return serializeQuoteMessage(next);
}
