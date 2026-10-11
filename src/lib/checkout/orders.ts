import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

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

function nowIso() {
  return new Date().toISOString();
}
function ensureCheckoutMeta(order: QuoteOrder): CheckoutOrderResolved | null {
  const meta = parseCheckoutMeta(order.message);
  return meta ? { ...order, meta, storage: "db" } : null;
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
    const rawTaxRate =
      typeof parsed.taxRate === "number" && Number.isFinite(parsed.taxRate) ? parsed.taxRate : 0;
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
  clientId?: string;
}) {
  const meta = buildCheckoutMeta(input);
  const row = await prisma.quote.create({
    data: {
      id: randomUUID(),
      userId: input.clientId || null,
      name: input.customer.buyerName,
      email: input.customer.buyerEmail,
      phone: input.customer.buyerPhone || null,
      company: input.customer.companyName || null,
      message: JSON.stringify(meta),
      subtotal: meta.subtotal,
      discount: meta.discount,
      total: meta.total,
      status: "PENDING",
    },
  });
  return { ...row, createdAt: row.createdAt.toISOString(), meta, storage: "db" as const };
}
export async function getCheckoutOrder(id: string) {
  const row = await prisma.quote.findUnique({ where: { id } });
  return row ? ensureCheckoutMeta({ ...row, createdAt: row.createdAt.toISOString() }) : null;
}
export async function setCheckoutFlowCreation(input: {
  orderId: string;
  token: string;
  flowOrder?: number;
  checkoutUrl: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Quote" WHERE id=${input.orderId} FOR UPDATE`;
    const q = await tx.quote.findUnique({ where: { id: input.orderId } }),
      m = parseCheckoutMeta(q?.message);
    if (!q || !m) throw new Error("PAYMENT_ORDER_UNKNOWN");
    if (m.flow.status === 2) {
      if (m.flow.token !== input.token) throw new Error("PAYMENT_ALREADY_RECEIVED");
      return;
    }
    m.flow = {
      ...m.flow,
      token: input.token,
      flowOrder: input.flowOrder,
      checkoutUrl: input.checkoutUrl,
      status: 1,
      statusLabel: "PENDIENTE",
      updatedAt: nowIso(),
      lastError: null,
    };
    await tx.quote.update({ where: { id: input.orderId }, data: { message: JSON.stringify(m) } });
  });
}
