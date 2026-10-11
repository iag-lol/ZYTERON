import { getPortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/prisma";
import { digest } from "@/lib/payments/pilot-protocol";
import { limitedJson } from "@/lib/payments/request-body";
import { getCheckoutOrder } from "@/lib/checkout/orders";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createCheckoutOrder,
  setCheckoutFlowCreation,
  type CheckoutItem,
} from "@/lib/checkout/orders";
import { formatRut, isValidRut } from "@/lib/checkout/rut";
import { computeCheckoutTotals } from "@/lib/checkout/tax";
import { createFlowPayment } from "@/lib/payments/flow";
import { getWebPricingSnapshot } from "@/lib/web-control";

const itemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.number().int().min(1).max(99),
});

const payloadSchema = z.object({
  items: z.array(itemSchema).min(1).max(80),
  checkout: z.object({
    buyerName: z.string().trim().min(3).max(120),
    buyerEmail: z.string().trim().email().max(160),
    buyerPhone: z.string().trim().max(40).optional().or(z.literal("")),
    buyerRut: z.string().trim().min(8).max(20),
    address: z.string().trim().min(8).max(260),
    commune: z.string().trim().max(120).optional().or(z.literal("")),
    city: z.string().trim().max(120).optional().or(z.literal("")),
    comments: z.string().trim().max(2000).optional().or(z.literal("")),
    documentType: z.enum(["BOLETA", "FACTURA"]),
    companyName: z.string().trim().max(160).optional().or(z.literal("")),
    companyRut: z.string().trim().max(20).optional().or(z.literal("")),
    companyBusinessLine: z.string().trim().max(240).optional().or(z.literal("")),
  }),
});

type PurchasableItem = {
  id: string;
  slug: string;
  name: string;
  price: number;
  discountPct?: number;
  finalPrice?: number;
  discountActive?: boolean;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
  published?: boolean | null;
  stock?: number;
};

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function safeDiscountPrice(price: number, discountPct: number) {
  const pct = Math.max(0, Math.min(100, Math.round(discountPct || 0)));
  const discountValue = Math.round(price * (pct / 100));
  return Math.max(0, price - discountValue);
}

function isDiscountDateActive(startsAt?: string | null, endsAt?: string | null) {
  const now = Date.now();
  const startsMs = startsAt ? new Date(startsAt).getTime() : null;
  const endsMs = endsAt ? new Date(endsAt).getTime() : null;
  if (startsMs && !Number.isNaN(startsMs) && startsMs > now) return false;
  if (endsMs && !Number.isNaN(endsMs) && endsMs < now) return false;
  return true;
}

function finalUnitPrice(product: {
  price: number;
  discountPct: number;
  finalPrice?: number;
  discountActive?: boolean;
  discountStartsAt?: string | null;
  discountEndsAt?: string | null;
}) {
  if (typeof product.finalPrice === "number" && Number.isFinite(product.finalPrice)) {
    return Math.max(0, Math.round(product.finalPrice));
  }

  const discountActive =
    typeof product.discountActive === "boolean"
      ? product.discountActive
      : isDiscountDateActive(product.discountStartsAt, product.discountEndsAt);

  return discountActive
    ? safeDiscountPrice(product.price, product.discountPct)
    : Math.max(0, Math.round(product.price));
}

function resolveBaseUrl(req: Request) {
  void req;
  return "https://www.zyteron.cl";
}

export async function POST(req: Request) {
  try {
    const body = await limitedJson(req, 32768);
    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue?.message || "Datos inválidos" }, { status: 400 });
    }

    const { items, checkout } = parsed.data;

    const buyerRut = formatRut(checkout.buyerRut);
    if (!isValidRut(buyerRut)) {
      return NextResponse.json({ error: "RUT comprador inválido." }, { status: 400 });
    }

    if (checkout.documentType === "FACTURA") {
      const companyRut = normalizeOptional(checkout.companyRut);
      if (!normalizeOptional(checkout.companyName)) {
        return NextResponse.json(
          { error: "Nombre de empresa requerido para factura." },
          { status: 400 },
        );
      }
      if (!companyRut || !isValidRut(companyRut)) {
        return NextResponse.json({ error: "RUT empresa inválido para factura." }, { status: 400 });
      }
    }

    const { products, plans, extras } = await getWebPricingSnapshot();
    const purchasableItems: PurchasableItem[] = [...products, ...plans, ...extras];
    const byId = new Map(purchasableItems.map((item) => [item.id, item]));

    const checkoutItems: CheckoutItem[] = [];

    for (const row of items) {
      const product = byId.get(row.productId);
      if (!product) {
        return NextResponse.json(
          { error: `Ítem no disponible: ${row.productId}` },
          { status: 400 },
        );
      }
      if (product.published === false) {
        return NextResponse.json({ error: `Ítem no publicado: ${product.name}` }, { status: 400 });
      }
      if (product.stock !== undefined && row.quantity > product.stock) {
        return NextResponse.json(
          { error: `Stock insuficiente para ${product.name}.` },
          { status: 400 },
        );
      }

      const finalUnit = finalUnitPrice({
        price: product.price,
        discountPct: product.discountPct || 0,
        finalPrice: product.finalPrice,
        discountActive: product.discountActive,
        discountStartsAt: product.discountStartsAt,
        discountEndsAt: product.discountEndsAt,
      });

      checkoutItems.push({
        productId: product.id,
        slug: product.slug,
        name: product.name,
        quantity: row.quantity,
        listPrice: Math.max(0, Math.round(product.price)),
        finalUnitPrice: finalUnit,
        lineTotal: finalUnit * row.quantity,
      });
    }

    const grossSubtotal = checkoutItems.reduce(
      (acc, item) => acc + item.listPrice * item.quantity,
      0,
    );
    const netSubtotal = checkoutItems.reduce((acc, item) => acc + item.lineTotal, 0);
    const totals = computeCheckoutTotals({
      grossSubtotal,
      netSubtotal,
    });

    if (totals.totalWithTax <= 0) {
      return NextResponse.json({ error: "El total debe ser mayor a 0." }, { status: 400 });
    }

    const requestKey = req.headers.get("Idempotency-Key") || "";
    if (!/^[a-f0-9-]{36}$/i.test(requestKey))
      return NextResponse.json(
        { error: "La solicitud requiere una referencia de intento." },
        { status: 400 },
      );
    const identity = digest(checkout.buyerEmail.toLowerCase() + "/" + requestKey),
      fingerprint = digest(JSON.stringify(parsed.data));
    const claimed =
      await prisma.$executeRaw`INSERT INTO zyteron_checkout_request(id,request_hash) VALUES(${identity},${fingerprint}) ON CONFLICT(id) DO NOTHING`;
    const requests = await prisma.$queryRaw<
      Array<{ request_hash: string; quote_id: string | null }>
    >`SELECT request_hash,quote_id FROM zyteron_checkout_request WHERE id=${identity}`;
    if (requests[0]?.request_hash !== fingerprint) throw new Error("CHECKOUT_REQUEST_CHANGED");
    if (!claimed && !requests[0]?.quote_id)
      return NextResponse.json(
        { error: "Este intento se está preparando. Vuelve a consultar antes de crear otro." },
        { status: 409 },
      );
    const existingOrder = requests[0]?.quote_id
      ? await getCheckoutOrder(requests[0].quote_id)
      : null;
    const session = await getPortalSession();
    const clientId =
      session?.user.accountStatus === "ACTIVE" &&
      session.user.emailVerifiedAt &&
      session.user.email?.toLowerCase() === checkout.buyerEmail.toLowerCase()
        ? session.user.id
        : undefined;
    const order =
      existingOrder ||
      (await createCheckoutOrder({
        clientId,

        customer: {
          buyerName: checkout.buyerName,
          buyerEmail: checkout.buyerEmail,
          buyerPhone: normalizeOptional(checkout.buyerPhone),
          buyerRut,
          address: checkout.address,
          commune: normalizeOptional(checkout.commune),
          city: normalizeOptional(checkout.city),
          comments: normalizeOptional(checkout.comments),
          documentType: checkout.documentType,
          companyName: normalizeOptional(checkout.companyName),
          companyRut: normalizeOptional(checkout.companyRut)
            ? formatRut(String(checkout.companyRut))
            : null,
          companyBusinessLine: normalizeOptional(checkout.companyBusinessLine),
        },
        items: checkoutItems,
        subtotal: totals.grossSubtotal,
        discount: totals.discountAmount,
        netSubtotal: totals.netSubtotal,
        taxRate: totals.taxRate,
        taxAmount: totals.taxAmount,
        total: totals.totalWithTax,
      }));

    if (!requests[0]?.quote_id)
      await prisma.$executeRaw`UPDATE zyteron_checkout_request SET quote_id=${order.id} WHERE id=${identity} AND quote_id IS NULL`;
    const baseUrl = resolveBaseUrl(req);
    if (order.storage !== "db")
      throw new Error("La conexión de pagos necesita persistencia verificada.");
    const reference = order.id.slice(0, 8).toUpperCase();

    const flow = await createFlowPayment({
      commerceOrder: order.id,
      subject: `Compra Zyteron #${reference}`,
      amount: totals.totalWithTax,
      email: checkout.buyerEmail,
      urlConfirmation: `${baseUrl}/api/checkout/flow/confirmation`,
      urlReturn: `${baseUrl}/api/checkout/flow/return`,
      paymentMethod: 9,
      timeout: 3600,
      optional: JSON.stringify({
        orderRef: reference,
        documentType: checkout.documentType,
      }),
    });

    const checkoutUrl = `${flow.url}?token=${encodeURIComponent(flow.token)}`;

    await setCheckoutFlowCreation({
      orderId: order.id,
      token: flow.token,
      flowOrder: flow.flowOrder,
      checkoutUrl,
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      reference,
      checkoutUrl,
      totals: {
        grossSubtotal: totals.grossSubtotal,
        discount: totals.discountAmount,
        netSubtotal: totals.netSubtotal,
        taxAmount: totals.taxAmount,
        total: totals.totalWithTax,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo preparar el pago. Revisa este intento antes de iniciar otro." },
      { status: 500 },
    );
  }
}
