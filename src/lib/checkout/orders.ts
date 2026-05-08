import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { insertRow, safeSelectSingle, updateRows } from "@/lib/admin/repository";
import { mapFlowStatusLabel } from "@/lib/payments/flow";

export type CheckoutDocumentType = "BOLETA" | "FACTURA";

export type CheckoutCustomerData = {
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string | null;
  buyerRut: string;
  address: string;
  commune?: string | null;
  city?: string | null;
  comments?: string | null;
  documentType: CheckoutDocumentType;
  companyName?: string | null;
  companyRut?: string | null;
  companyBusinessLine?: string | null;
};

export type CheckoutItem = {
  productId: string;
  slug: string;
  name: string;
  quantity: number;
  listPrice: number;
  finalUnitPrice: number;
  lineTotal: number;
};

export type CheckoutMeta = {
  type: "PRODUCT_CHECKOUT";
  version: 1;
  customer: CheckoutCustomerData;
  items: CheckoutItem[];
  subtotal: number; // bruto sin descuento
  discount: number; // descuento total
  netSubtotal: number; // subtotal neto sin IVA
  taxRate: number; // 0.19
  taxAmount: number; // IVA total
  total: number; // total final con IVA
  flow: {
    token?: string | null;
    flowOrder?: number | null;
    status?: number | null;
    statusLabel?: string | null;
    checkoutUrl?: string | null;
    lastError?: Record<string, unknown> | null;
    updatedAt?: string | null;
  };
  fulfillment: {
    stockDiscountedAt?: string | null;
    stockDiscountedUnits?: number | null;
    stockDiscountError?: string | null;
  };
  mail: {
    pendingSentAt?: string | null;
    approvedSentAt?: string | null;
    rejectedSentAt?: string | null;
    internalSentAt?: string | null;
    whatsappSentAt?: string | null;
  };
};

type QuoteOrder = {
  id: string;
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

type CheckoutOrderResolved = QuoteOrder & {
  meta: CheckoutMeta;
  storage: "db" | "fallback";
};

type FallbackStore = Record<string, QuoteOrder>;

const FALLBACK_STORE_PATH = join(tmpdir(), "zyteron", "checkout-orders-fallback.json");

function nowIso() {
  return new Date().toISOString();
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error || "unknown error");
}

function isSupabaseInfraError(error: unknown) {
  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes("supabase_service_role_key inválida") ||
    message.includes("supabase_url o keys válidas de supabase no configuradas") ||
    message.includes("supabase_url o supabase_service_role_key no configurados") ||
    message.includes("fetch failed") ||
    message.includes("econrefused") ||
    message.includes("local no responde")
  );
}

async function readFallbackStore(): Promise<FallbackStore> {
  try {
    const raw = await readFile(FALLBACK_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as FallbackStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeFallbackStore(store: FallbackStore) {
  await mkdir(dirname(FALLBACK_STORE_PATH), { recursive: true });
  await writeFile(FALLBACK_STORE_PATH, JSON.stringify(store), "utf8");
}

function ensureCheckoutMeta(order: QuoteOrder): CheckoutOrderResolved | null {
  const meta = parseCheckoutMeta(order.message);
  if (!meta) return null;
  return {
    ...order,
    meta,
    storage: "db",
  };
}

async function getFallbackOrder(id: string): Promise<CheckoutOrderResolved | null> {
  const store = await readFallbackStore();
  const row = store[id];
  if (!row) return null;
  const meta = parseCheckoutMeta(row.message);
  if (!meta) return null;
  return {
    ...row,
    meta,
    storage: "fallback",
  };
}

async function saveFallbackOrder(order: QuoteOrder) {
  const store = await readFallbackStore();
  store[order.id] = order;
  await writeFallbackStore(store);
}

async function patchFallbackOrder(id: string, updater: (meta: CheckoutMeta) => CheckoutMeta) {
  const store = await readFallbackStore();
  const current = store[id];
  if (!current) {
    throw new Error(`Orden no encontrada: ${id}`);
  }
  const meta = parseCheckoutMeta(current.message);
  if (!meta) {
    throw new Error(`Orden inválida en fallback: ${id}`);
  }
  const nextMeta = updater(meta);
  store[id] = {
    ...current,
    message: JSON.stringify(nextMeta),
  };
  await writeFallbackStore(store);
  return {
    ...store[id],
    meta: nextMeta,
    storage: "fallback" as const,
  };
}

export function parseCheckoutMeta(raw?: string | null): CheckoutMeta | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<CheckoutMeta>;
    if (parsed?.type !== "PRODUCT_CHECKOUT") return null;
    if (!parsed.customer || !Array.isArray(parsed.items)) return null;

    const rawSubtotal = Number(parsed.subtotal || 0);
    const rawDiscount = Number(parsed.discount || 0);
    const rawNetSubtotal =
      typeof parsed.netSubtotal === "number"
        ? Number(parsed.netSubtotal || 0)
        : Math.max(0, rawSubtotal - rawDiscount);
    const rawTaxRate = typeof parsed.taxRate === "number" && Number.isFinite(parsed.taxRate) ? parsed.taxRate : 0;
    const rawTaxAmount =
      typeof parsed.taxAmount === "number"
        ? Number(parsed.taxAmount || 0)
        : Math.max(0, Number(parsed.total || 0) - rawNetSubtotal);

    return {
      type: "PRODUCT_CHECKOUT",
      version: 1,
      customer: parsed.customer as CheckoutCustomerData,
      items: parsed.items as CheckoutItem[],
      subtotal: Math.max(0, Math.round(rawSubtotal)),
      discount: Math.max(0, Math.round(rawDiscount)),
      netSubtotal: Math.max(0, Math.round(rawNetSubtotal)),
      taxRate: Math.max(0, rawTaxRate),
      taxAmount: Math.max(0, Math.round(rawTaxAmount)),
      total: Math.max(0, Math.round(Number(parsed.total || 0))),
      flow: {
        token: parsed.flow?.token || null,
        flowOrder: typeof parsed.flow?.flowOrder === "number" ? parsed.flow.flowOrder : null,
        status: typeof parsed.flow?.status === "number" ? parsed.flow.status : null,
        statusLabel: parsed.flow?.statusLabel || null,
        checkoutUrl: parsed.flow?.checkoutUrl || null,
        lastError: parsed.flow?.lastError || null,
        updatedAt: parsed.flow?.updatedAt || null,
      },
      fulfillment: {
        stockDiscountedAt: parsed.fulfillment?.stockDiscountedAt || null,
        stockDiscountedUnits:
          typeof parsed.fulfillment?.stockDiscountedUnits === "number"
            ? parsed.fulfillment.stockDiscountedUnits
            : null,
        stockDiscountError:
          typeof parsed.fulfillment?.stockDiscountError === "string"
            ? parsed.fulfillment.stockDiscountError
            : null,
      },
      mail: {
        pendingSentAt: parsed.mail?.pendingSentAt || null,
        approvedSentAt: parsed.mail?.approvedSentAt || null,
        rejectedSentAt: parsed.mail?.rejectedSentAt || null,
        internalSentAt: parsed.mail?.internalSentAt || null,
        whatsappSentAt: parsed.mail?.whatsappSentAt || null,
      },
    };
  } catch {
    return null;
  }
}

export function buildCheckoutMeta(input: {
  customer: CheckoutCustomerData;
  items: CheckoutItem[];
  subtotal: number;
  discount: number;
  netSubtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}): CheckoutMeta {
  return {
    type: "PRODUCT_CHECKOUT",
    version: 1,
    customer: input.customer,
    items: input.items,
    subtotal: Math.max(0, Math.round(input.subtotal)),
    discount: Math.max(0, Math.round(input.discount)),
    netSubtotal: Math.max(0, Math.round(input.netSubtotal)),
    taxRate: Math.max(0, Number(input.taxRate || 0)),
    taxAmount: Math.max(0, Math.round(input.taxAmount)),
    total: Math.max(0, Math.round(input.total)),
    flow: {
      token: null,
      flowOrder: null,
      status: 1,
      statusLabel: "PENDIENTE",
      checkoutUrl: null,
      lastError: null,
      updatedAt: nowIso(),
    },
    fulfillment: {
      stockDiscountedAt: null,
      stockDiscountedUnits: null,
      stockDiscountError: null,
    },
    mail: {
      pendingSentAt: null,
      approvedSentAt: null,
      rejectedSentAt: null,
      internalSentAt: null,
      whatsappSentAt: null,
    },
  };
}

export async function createCheckoutOrder(input: {
  customer: CheckoutCustomerData;
  items: CheckoutItem[];
  subtotal: number;
  discount: number;
  netSubtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}) {
  const meta = buildCheckoutMeta(input);
  const createdAt = nowIso();
  const baseRow: QuoteOrder = {
    id: randomUUID(),
    name: input.customer.buyerName,
    email: input.customer.buyerEmail,
    phone: input.customer.buyerPhone || null,
    company: input.customer.documentType === "FACTURA" ? input.customer.companyName || null : null,
    message: JSON.stringify(meta),
    subtotal: meta.subtotal,
    discount: meta.discount,
    total: meta.total,
    status: "PENDING",
    createdAt,
  };

  try {
    const row = await insertRow<QuoteOrder>(
      "Quote",
      {
        id: baseRow.id,
        userId: null,
        planId: null,
        name: baseRow.name,
        email: baseRow.email,
        phone: baseRow.phone,
        company: baseRow.company,
        message: baseRow.message,
        subtotal: baseRow.subtotal,
        discount: baseRow.discount,
        total: baseRow.total,
        status: "PENDING",
        createdAt,
      },
      "id, name, email, phone, company, message, subtotal, discount, total, status, createdAt",
    );

    return {
      ...row,
      meta,
      storage: "db" as const,
    };
  } catch (error) {
    if (!isSupabaseInfraError(error)) throw error;
    await saveFallbackOrder(baseRow);
    return {
      ...baseRow,
      meta,
      storage: "fallback" as const,
    };
  }
}

export async function getCheckoutOrder(id: string) {
  try {
    const row = await safeSelectSingle<QuoteOrder>(
      "Quote",
      "id, name, email, phone, company, message, subtotal, discount, total, status, createdAt",
      { id },
    );

    if (row) {
      const normalized = ensureCheckoutMeta(row);
      if (normalized) return normalized;
    }
  } catch (error) {
    if (!isSupabaseInfraError(error)) throw error;
  }

  return getFallbackOrder(id);
}

async function patchOrderMeta(id: string, updater: (meta: CheckoutMeta) => CheckoutMeta) {
  const current = await getCheckoutOrder(id);
  if (!current) {
    throw new Error(`Orden no encontrada: ${id}`);
  }

  const nextMeta = updater(current.meta);

  if (current.storage === "fallback") {
    return patchFallbackOrder(id, () => nextMeta);
  }

  try {
    await updateRows("Quote", { message: JSON.stringify(nextMeta) }, { id });
    return {
      ...current,
      meta: nextMeta,
      storage: "db" as const,
    };
  } catch (error) {
    if (!isSupabaseInfraError(error)) throw error;
    return patchFallbackOrder(id, () => nextMeta);
  }
}

export async function setCheckoutFlowCreation(input: {
  orderId: string;
  token: string;
  flowOrder?: number;
  checkoutUrl: string;
}) {
  return patchOrderMeta(input.orderId, (meta) => ({
    ...meta,
    flow: {
      ...meta.flow,
      token: input.token,
      flowOrder: typeof input.flowOrder === "number" ? input.flowOrder : meta.flow.flowOrder,
      status: 1,
      statusLabel: "PENDIENTE",
      checkoutUrl: input.checkoutUrl,
      updatedAt: nowIso(),
      lastError: null,
    },
  }));
}

export function mapQuoteStatusFromFlowStatus(flowStatus: number) {
  if (flowStatus === 2) return "WON";
  if (flowStatus === 3 || flowStatus === 4) return "LOST";
  return "PENDING";
}

export async function setCheckoutFlowStatus(input: {
  orderId: string;
  flowStatus: number;
  flowOrder?: number;
  lastError?: Record<string, unknown> | null;
}) {
  const quoteStatus = mapQuoteStatusFromFlowStatus(input.flowStatus);
  const label = mapFlowStatusLabel(input.flowStatus);

  const order = await patchOrderMeta(input.orderId, (meta) => ({
    ...meta,
    flow: {
      ...meta.flow,
      flowOrder: typeof input.flowOrder === "number" ? input.flowOrder : meta.flow.flowOrder,
      status: input.flowStatus,
      statusLabel: label,
      updatedAt: nowIso(),
      lastError: input.lastError || null,
    },
  }));

  if (order.storage === "db") {
    try {
      await updateRows("Quote", { status: quoteStatus }, { id: input.orderId });
    } catch (error) {
      if (!isSupabaseInfraError(error)) throw error;
    }
  } else {
    const store = await readFallbackStore();
    const current = store[input.orderId];
    if (current) {
      current.status = quoteStatus;
      store[input.orderId] = current;
      await writeFallbackStore(store);
    }
  }

  return {
    ...order,
    quoteStatus,
    flowStatusLabel: label,
  };
}

export async function markCheckoutEmailSent(
  orderId: string,
  type: "pending" | "approved" | "rejected" | "internal" | "whatsapp",
) {
  return patchOrderMeta(orderId, (meta) => ({
    ...meta,
    mail: {
      pendingSentAt: type === "pending" ? nowIso() : meta.mail.pendingSentAt || null,
      approvedSentAt: type === "approved" ? nowIso() : meta.mail.approvedSentAt || null,
      rejectedSentAt: type === "rejected" ? nowIso() : meta.mail.rejectedSentAt || null,
      internalSentAt: type === "internal" ? nowIso() : meta.mail.internalSentAt || null,
      whatsappSentAt: type === "whatsapp" ? nowIso() : meta.mail.whatsappSentAt || null,
    },
  }));
}

export async function markCheckoutStockHandled(input: {
  orderId: string;
  stockDiscountedAt?: string | null;
  stockDiscountedUnits?: number | null;
  stockDiscountError?: string | null;
}) {
  return patchOrderMeta(input.orderId, (meta) => ({
    ...meta,
    fulfillment: {
      ...meta.fulfillment,
      stockDiscountedAt:
        typeof input.stockDiscountedAt === "string"
          ? input.stockDiscountedAt
          : meta.fulfillment?.stockDiscountedAt || null,
      stockDiscountedUnits:
        typeof input.stockDiscountedUnits === "number"
          ? Math.max(0, Math.round(input.stockDiscountedUnits))
          : meta.fulfillment?.stockDiscountedUnits || null,
      stockDiscountError:
        typeof input.stockDiscountError === "string"
          ? input.stockDiscountError
          : meta.fulfillment?.stockDiscountError || null,
    },
  }));
}
