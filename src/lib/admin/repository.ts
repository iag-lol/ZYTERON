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

export type PlanRecord = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  price?: number | null;
  tier?: "BASIC" | "INTERMEDIATE" | "PRO" | string | null;
  popular?: boolean | null;
  features?: string[] | null;
  freeGifts?: string[] | null;
};

export type ExtraRecord = {
  id: string;
  slug: string;
  name: string;
  category?: string | null;
  description?: string | null;
  options?: string[] | null;
  price?: number | null;
};

export type ProductRecord = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  price?: number | null;
  discountPct?: number | null;
  stock?: number | null;
  featured?: boolean | null;
  badges?: string[] | null;
  categoryId?: string | null;
  imageUrl?: string | null;
  publicDescription?: string | null;
  published?: boolean | null;
};

export type ProductCategoryRecord = {
  id: string;
  slug: string;
  name: string;
  order?: number | null;
};

export type WebDiscount = {
  id: string;
  name: string;
  description?: string | null;
  targetType?: "PLAN" | "EXTRA" | "PRODUCT" | "ORDER" | string | null;
  targetId?: string | null;
  mode?: "PERCENT" | "FIXED" | string | null;
  value?: number | null;
  minSubtotal?: number | null;
  active?: boolean | null;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ClientReview = {
  id: string;
  name: string;
  email?: string | null;
  company?: string | null;
  rating?: number | null;
  comment?: string | null;
  service?: string | null;
  status?: "PENDING" | "APPROVED" | "REJECTED" | string | null;
  source?: string | null;
  createdAt?: string | null;
  approvedAt?: string | null;
};

export type SettingRecord = {
  id: string;
  key: string;
  value: string;
  type?: "TEXT" | "JSON" | "BOOLEAN" | string | null;
};

export type ProductPublicMeta = {
  slug: string;
  imageUrl?: string | null;
  publicDescription?: string | null;
  published?: boolean | null;
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

export type Expense = {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  status?: "PLANNED" | "PURCHASED" | "CANCELLED" | string | null;
  amount?: number | null;
  store?: string | null;
  invoiceNumber?: string | null;
  purchaseDate?: string | null;
  arrivalDate?: string | null;
  invoiceFileUrl?: string | null;
  invoiceFilePath?: string | null;
  invoiceFileName?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type WebVisit = {
  id: string;
  path: string;
  pageTitle?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  ipHash?: string | null;
  sessionId?: string | null;
  createdAt?: string | null;
};

export type EnrichedQuote = ReturnType<typeof enrichQuoteRecord>;

type SelectOptions = {
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  filters?: Record<string, string | number | null | undefined>;
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [candidate.message, candidate.details, candidate.hint, candidate.code]
      .filter((value) => typeof value === "string" && value.trim().length > 0)
      .map((value) => String(value).trim());
    if (parts.length > 0) return parts.join(" | ");
  }
  return String(error ?? "unknown error");
}

function logReadError(table: string, error: unknown) {
  const message = toErrorMessage(error);
  console.error(`[admin/read] ${table}: ${message}`);
}

function isMissingRelationError(message?: string) {
  const normalized = message?.toLowerCase();
  return Boolean(
    normalized &&
      (normalized.includes("could not find the table") ||
        (normalized.includes("relation") && normalized.includes("does not exist")) ||
        (normalized.includes("column") && normalized.includes("does not exist")) ||
        normalized.includes("schema cache")),
  );
}

function isMissingClientReviewRelationError(error: unknown) {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes("clientreview") ||
    message.includes("client_review") ||
    message.includes("could not find the table") ||
    message.includes("schema cache") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}

function isClientReviewWriteFallbackError(error: unknown) {
  const message = toErrorMessage(error).toLowerCase();
  return (
    isMissingClientReviewRelationError(error) ||
    (message.includes("column") && message.includes("does not exist")) ||
    message.includes("cannot update view")
  );
}

export async function safeSelect<T>(table: string, select: string, options: SelectOptions = {}) {
  try {
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
      // Lecturas del panel no deben romper render de páginas administrativas.
      if (!isMissingRelationError(error.message)) {
        logReadError(table, error.message);
      }
      return [] as T[];
    }

    return (data ?? []) as T[];
  } catch (error) {
    // Fallo de entorno/red/permisos: fallback seguro para evitar 500 en navegación.
    logReadError(table, error);
    return [] as T[];
  }
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
    throw new Error(toErrorMessage(error));
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
    throw new Error(toErrorMessage(error));
  }
}

export async function deleteRows(table: string, filters: Record<string, string | number>) {
  const { supabase } = createSupabaseServerClient();
  let query = supabase.from(table).delete();

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  const { error } = await query;
  if (error) {
    throw new Error(toErrorMessage(error));
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

export async function getExpenses() {
  return safeSelect<Expense>(
    "Expense",
    'id, name, description, category, status, amount, store, "invoiceNumber", "purchaseDate", "arrivalDate", "invoiceFileUrl", "invoiceFilePath", "invoiceFileName", "createdAt", "updatedAt"',
    { orderBy: "createdAt" },
  );
}

export async function getExpenseById(id: string) {
  return safeSelectSingle<Expense>(
    "Expense",
    'id, name, description, category, status, amount, store, "invoiceNumber", "purchaseDate", "arrivalDate", "invoiceFileUrl", "invoiceFilePath", "invoiceFileName", "createdAt", "updatedAt"',
    { id },
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

export async function getWebVisits(limit = 5000) {
  return safeSelect<WebVisit>(
    "WebVisit",
    "id, path, pageTitle, referrer, userAgent, ip, ipHash, sessionId, createdAt",
    { orderBy: "createdAt", limit },
  );
}

export async function getContactLeads() {
  const rows = await safeSelect<Lead>(
    "Lead",
    "id, name, email, phone, source, message, type, createdAt",
    {
      orderBy: "createdAt",
    },
  );

  return rows.filter((lead) => {
    const source = String(lead.source || "").toUpperCase();
    const type = String(lead.type || "").toUpperCase();
    return (
      (source === "CONTACTO_WEB" && type === "CONTACT") ||
      (source === "COTIZADOR_WEB" && type === "PACKAGE_BUILDER")
    );
  });
}

type WonQuoteRow = {
  id: string;
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  subtotal?: number | null;
  total?: number | null;
  status?: string | null;
  createdAt?: string | null;
};

function isWonQuoteStatus(value?: string | null) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!normalized) return false;
  if (normalized === "WON") return true;
  if (normalized === "GANADA" || normalized === "GANADO") return true;
  return normalized.includes("WON") || normalized.includes("GANAD");
}

function toDateOnly(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

async function syncOneWonQuote(quote: WonQuoteRow) {
  let clientId = quote.userId || null;
  if (!clientId && quote.email) {
    clientId = await findOrCreateClientByEmail({
      name: quote.name || quote.company || quote.email,
      email: quote.email,
      company: quote.company || null,
      phone: quote.phone || null,
    });
  }

  if (clientId && quote.userId !== clientId) {
    await updateRows("Quote", { userId: clientId }, { id: quote.id });
  }

  const quoteTotal = Math.max(0, Math.round(typeof quote.total === "number" ? quote.total : 0));
  const invoiceRef = `COT:${quote.id}`;
  const existingSale = await safeSelectSingle<{
    id: string;
    clientId?: string | null;
    total?: number | null;
    description?: string | null;
  }>(
    "Sale",
    "id, clientId, total, description",
    { invoiceRef },
  );

  let saleId = existingSale?.id ?? null;
  if (!saleId) {
    const createdSale = await insertRow<{ id: string }>(
      "Sale",
      {
        clientId: clientId || null,
        total: quoteTotal,
        description: `Venta sincronizada desde cotización WON ${quote.id}`,
        paymentMethod: null,
        invoiceRef,
        createdAt: quote.createdAt || new Date().toISOString(),
      },
      "id",
    );
    saleId = createdSale.id;
  } else {
    const salePatch: Record<string, unknown> = {};
    if (clientId && !existingSale?.clientId) {
      salePatch.clientId = clientId;
    }
    if (typeof existingSale?.total !== "number" || Math.round(existingSale.total) !== quoteTotal) {
      salePatch.total = quoteTotal;
    }
    if (!existingSale?.description?.includes("cotización WON")) {
      salePatch.description = `Venta sincronizada desde cotización WON ${quote.id}`;
    }
    if (Object.keys(salePatch).length > 0) {
      await updateRows("Sale", salePatch, { id: saleId });
    }
  }

  const subtotalAmount = Math.max(
    0,
    Math.round(typeof quote.subtotal === "number" ? quote.subtotal : 0),
  );
  const taxAmount = Math.max(0, quoteTotal - subtotalAmount);
  const existingTaxDoc = await safeSelectSingle<{
    id: string;
    saleId?: string | null;
    netAmount?: number | null;
    taxAmount?: number | null;
    totalAmount?: number | null;
  }>("TaxDocument", "id, saleId, netAmount, taxAmount, totalAmount", {
    quoteId: quote.id,
  });

  if (!existingTaxDoc) {
    await insertRow(
      "TaxDocument",
      {
        clientId: clientId || null,
        quoteId: quote.id,
        saleId: saleId || null,
        type: "Factura",
        issueDate: toDateOnly(quote.createdAt),
        dueDate: null,
        netAmount: subtotalAmount,
        taxAmount,
        totalAmount: quoteTotal,
        status: "Pendiente",
        paymentStatus: "Pendiente",
        emissionMethod: "Sincronización automática desde cotización WON",
        notes: `Auto-sync quote ${quote.id}`,
        createdAt: quote.createdAt || new Date().toISOString(),
      },
      "id",
    );
  } else {
    const taxPatch: Record<string, unknown> = {};
    if (saleId && !existingTaxDoc.saleId) {
      taxPatch.saleId = saleId;
    }
    if (Math.round(existingTaxDoc.netAmount || 0) !== subtotalAmount) {
      taxPatch.netAmount = subtotalAmount;
    }
    if (Math.round(existingTaxDoc.taxAmount || 0) !== taxAmount) {
      taxPatch.taxAmount = taxAmount;
    }
    if (Math.round(existingTaxDoc.totalAmount || 0) !== quoteTotal) {
      taxPatch.totalAmount = quoteTotal;
    }
    if (Object.keys(taxPatch).length > 0) {
      await updateRows("TaxDocument", taxPatch, { id: existingTaxDoc.id });
    }
  }
}

export async function syncWonQuoteById(quoteId: string) {
  const quote = await safeSelectSingle<WonQuoteRow>(
    "Quote",
    "id, userId, name, email, phone, company, subtotal, total, status, createdAt",
    { id: quoteId },
  );

  if (!quote) {
    throw new Error(`No se encontró la cotización ${quoteId} para sincronizar.`);
  }

  const isWon = isWonQuoteStatus(quote.status);
  if (!isWon) {
    return { synced: false, reason: "NOT_WON" as const };
  }

  await syncOneWonQuote(quote);
  return { synced: true, reason: "OK" as const };
}

export async function syncWonQuotesCrossModules(limit = 1000) {
  const candidateQuotes = await safeSelect<WonQuoteRow>(
    "Quote",
    "id, userId, name, email, phone, company, subtotal, total, status, createdAt",
    { orderBy: "createdAt", limit },
  );
  const wonQuotes = candidateQuotes.filter((quote) => isWonQuoteStatus(quote.status));

  for (const quote of wonQuotes) {
    try {
      await syncOneWonQuote(quote);
    } catch (error) {
      console.error(`[won-sync] quote ${quote.id}:`, toErrorMessage(error));
    }
  }
}

export async function getPublicPlans() {
  return safeSelect<PlanRecord>(
    "Plan",
    "id, slug, name, description, price, tier, popular, features, freeGifts",
    { orderBy: "price", ascending: true },
  );
}

export async function getPublicExtras() {
  return safeSelect<ExtraRecord>(
    "Extra",
    "id, slug, name, category, description, options, price",
    { orderBy: "name", ascending: true },
  );
}

export async function getPublicProducts() {
  return safeSelect<ProductRecord>(
    "Product",
    "id, slug, name, description, price, discountPct, stock, featured, badges, categoryId",
    { orderBy: "createdAt", ascending: true },
  );
}

export async function getProductCategories() {
  return safeSelect<ProductCategoryRecord>("ProductCategory", "id, slug, name, order", {
    orderBy: "order",
    ascending: true,
  });
}

export async function getWebDiscounts(activeOnly = false) {
  const rows = await safeSelect<WebDiscount>(
    "WebDiscount",
    "id, name, description, targetType, targetId, mode, value, minSubtotal, active, startsAt, endsAt, createdAt, updatedAt",
    { orderBy: "createdAt" },
  );

  if (!activeOnly) return rows;
  const now = Date.now();
  return rows.filter((discount) => {
    if (!discount.active) return false;
    const startsAt = discount.startsAt ? new Date(discount.startsAt).getTime() : null;
    const endsAt = discount.endsAt ? new Date(discount.endsAt).getTime() : null;
    if (startsAt && !Number.isNaN(startsAt) && startsAt > now) return false;
    if (endsAt && !Number.isNaN(endsAt) && endsAt < now) return false;
    return true;
  });
}

export async function getClientReviews(status?: "PENDING" | "APPROVED" | "REJECTED") {
  const primaryRows = await safeSelect<ClientReview>(
    "ClientReview",
    "id, name, email, company, rating, comment, service, status, source, createdAt, approvedAt",
    { orderBy: "createdAt" },
  );
  const fallbackRows =
    primaryRows.length > 0
      ? []
      : await safeSelect<ClientReview>(
          "client_review",
          "id, name, email, company, rating, comment, service, status, source, createdAt, approvedAt",
          { orderBy: "createdAt" },
        );
  const rows = primaryRows.length > 0 ? primaryRows : fallbackRows;

  if (!status) return rows;
  return rows.filter((review) => String(review.status || "").toUpperCase() === status);
}

async function runClientReviewWrite(operation: (table: string) => Promise<void>) {
  try {
    await operation("ClientReview");
    return;
  } catch (error) {
    if (!isClientReviewWriteFallbackError(error)) throw error;
  }

  await operation("client_review");
}

async function getClientReviewStatusById(id: string) {
  const primary = await safeSelectSingle<{ id: string; status?: string | null }>(
    "ClientReview",
    "id, status",
    { id },
  );
  if (primary?.id) return primary;

  return safeSelectSingle<{ id: string; status?: string | null }>("client_review", "id, status", { id });
}

export async function setClientReviewStatus(
  id: string,
  status: "PENDING" | "APPROVED" | "REJECTED",
) {
  const now = new Date().toISOString();
  await runClientReviewWrite(async (table) => {
    await updateRows(table, { status }, { id });

    if (status === "APPROVED") {
      try {
        await updateRows(table, { approvedAt: now }, { id });
      } catch {
        try {
          await updateRows(table, { approved_at: now }, { id });
        } catch {
          // Campo opcional según esquema; no bloquea el cambio de estado.
        }
      }
      return;
    }

    try {
      await updateRows(table, { approvedAt: null }, { id });
    } catch {
      try {
        await updateRows(table, { approved_at: null }, { id });
      } catch {
        // Campo opcional según esquema; no bloquea el cambio de estado.
      }
    }
  });

  // Verificación no bloqueante: algunos esquemas mixtos (tabla/vista legacy)
  // pueden devolver lecturas inconsistentes inmediatas aun cuando el update se aplicó.
  // No rompemos la UX de moderación por falsos negativos.
  const saved = await getClientReviewStatusById(id);
  const savedStatus = String(saved?.status || "").toUpperCase();
  if (!saved?.id || savedStatus !== status) {
    console.warn(
      `[review/status] estado no confirmado en lectura inmediata: id=${id} esperado=${status} obtenido=${savedStatus || "N/A"}`,
    );
  }
}

export async function deleteClientReviewById(id: string) {
  await runClientReviewWrite(async (table) => {
    await deleteRows(table, { id });
  });
}

export async function getSettingsByPrefix(prefix: string) {
  const rows = await safeSelect<SettingRecord>("Setting", "id, key, value, type", {
    orderBy: "key",
    ascending: true,
  });

  return rows.filter((row) => row.key?.startsWith(prefix));
}

function toProductPublicSettingKey(slug: string) {
  return `product_public_${slug.trim().toLowerCase()}`;
}

export async function getProductPublicMetaMap() {
  const rows = await getSettingsByPrefix("product_public_");
  const map: Record<string, ProductPublicMeta> = {};

  for (const row of rows) {
    const slug = row.key.replace("product_public_", "").trim();
    if (!slug) continue;

    try {
      const parsed = JSON.parse(row.value) as ProductPublicMeta;
      map[slug] = {
        slug,
        imageUrl: typeof parsed?.imageUrl === "string" ? parsed.imageUrl.trim() || null : null,
        publicDescription:
          typeof parsed?.publicDescription === "string" ? parsed.publicDescription.trim() || null : null,
        published: typeof parsed?.published === "boolean" ? parsed.published : true,
      };
    } catch {
      map[slug] = { slug, published: true };
    }
  }

  return map;
}

export async function upsertProductPublicMetaBySlug(slug: string, meta: ProductPublicMeta) {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) {
    throw new Error("Slug de producto inválido para metadata pública.");
  }

  await upsertSetting({
    key: toProductPublicSettingKey(cleanSlug),
    type: "JSON",
    value: JSON.stringify({
      slug: cleanSlug,
      imageUrl: meta.imageUrl?.trim() || null,
      publicDescription: meta.publicDescription?.trim() || null,
      published: typeof meta.published === "boolean" ? meta.published : true,
    }),
  });
}

export async function deleteProductPublicMetaBySlug(slug: string) {
  const cleanSlug = slug.trim().toLowerCase();
  if (!cleanSlug) return;
  await deleteRows("Setting", { key: toProductPublicSettingKey(cleanSlug) });
}

export async function upsertSetting(input: { key: string; value: string; type?: "TEXT" | "JSON" | "BOOLEAN" }) {
  const key = input.key.trim();
  if (!key) {
    throw new Error("Setting key inválida.");
  }

  const existing = await safeSelectSingle<SettingRecord>("Setting", "id, key", { key });
  if (existing?.id) {
    await updateRows(
      "Setting",
      {
        value: input.value,
        type: input.type || "TEXT",
      },
      { id: existing.id },
    );
    return existing.id;
  }

  const created = await insertRow<SettingRecord>(
    "Setting",
    {
      key,
      value: input.value,
      type: input.type || "TEXT",
    },
    "id",
  );
  return created.id;
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
