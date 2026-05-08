import { NextResponse } from "next/server";
import { z } from "zod";
import { createCheckoutOrder, markCheckoutEmailSent, setCheckoutFlowCreation, type CheckoutItem } from "@/lib/checkout/orders";
import { formatRut, isValidRut } from "@/lib/checkout/rut";
import { sendCheckoutStatusEmail } from "@/lib/notifications/purchase-status";
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
  const requestHost = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").toLowerCase();
  const requestIsLocal =
    requestHost.includes("localhost") || requestHost.includes("127.0.0.1") || requestHost.includes("::1");

  const explicit =
    process.env.FLOW_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.PUBLIC_SITE_URL ||
    process.env.RENDER_EXTERNAL_URL;

  if (explicit && /^https?:\/\//i.test(explicit.trim())) {
    try {
      const parsed = new URL(explicit.trim());
      const host = parsed.hostname.toLowerCase();
      const explicitIsLocal = host === "localhost" || host === "127.0.0.1" || host === "::1";
      if (!explicitIsLocal || requestIsLocal) {
        return explicit.trim().replace(/\/+$/, "");
      }
    } catch {
      // ignore malformed explicit URL and continue with request-derived values.
    }
  }

  const origin = req.headers.get("origin");
  if (origin && /^https?:\/\//i.test(origin)) {
    return origin.replace(/\/+$/, "");
  }

  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (forwardedHost) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${forwardedHost}`.replace(/\/+$/, "");
  }

  return new URL(req.url).origin.replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
        return NextResponse.json({ error: "Nombre de empresa requerido para factura." }, { status: 400 });
      }
      if (!companyRut || !isValidRut(companyRut)) {
        return NextResponse.json({ error: "RUT empresa inválido para factura." }, { status: 400 });
      }
    }

    const { products } = await getWebPricingSnapshot();
    const byId = new Map(products.map((product) => [product.id, product]));

    const checkoutItems: CheckoutItem[] = [];

    for (const row of items) {
      const product = byId.get(row.productId);
      if (!product) {
        return NextResponse.json({ error: `Producto no disponible: ${row.productId}` }, { status: 400 });
      }
      if (product.published === false) {
        return NextResponse.json({ error: `Producto no publicado: ${product.name}` }, { status: 400 });
      }
      if (row.quantity > product.stock) {
        return NextResponse.json({ error: `Stock insuficiente para ${product.name}.` }, { status: 400 });
      }

      const finalUnit = finalUnitPrice(product);
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

    const grossSubtotal = checkoutItems.reduce((acc, item) => acc + item.listPrice * item.quantity, 0);
    const netSubtotal = checkoutItems.reduce((acc, item) => acc + item.lineTotal, 0);
    const totals = computeCheckoutTotals({
      grossSubtotal,
      netSubtotal,
    });

    if (totals.totalWithTax <= 0) {
      return NextResponse.json({ error: "El total debe ser mayor a 0." }, { status: 400 });
    }

    const order = await createCheckoutOrder({
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
        companyRut: normalizeOptional(checkout.companyRut) ? formatRut(String(checkout.companyRut)) : null,
        companyBusinessLine: normalizeOptional(checkout.companyBusinessLine),
      },
      items: checkoutItems,
      subtotal: totals.grossSubtotal,
      discount: totals.discountAmount,
      netSubtotal: totals.netSubtotal,
      taxRate: totals.taxRate,
      taxAmount: totals.taxAmount,
      total: totals.totalWithTax,
    });

    const baseUrl = resolveBaseUrl(req);
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

    if (!order.meta.mail.pendingSentAt) {
      try {
        await sendCheckoutStatusEmail({
          orderId: order.id,
          recipientEmail: order.email || order.meta.customer.buyerEmail,
          recipientName: order.name || order.meta.customer.buyerName,
          flowStatus: 1,
          flowLabel: "PENDIENTE",
          meta: {
            ...order.meta,
            flow: {
              ...order.meta.flow,
              token: flow.token,
              flowOrder: flow.flowOrder ?? null,
              checkoutUrl,
              status: 1,
              statusLabel: "PENDIENTE",
              updatedAt: new Date().toISOString(),
            },
          },
          checkoutUrl,
        });
        await markCheckoutEmailSent(order.id, "pending");
      } catch (mailError) {
        console.error("[checkout/create] send pending email failed", {
          orderId: order.id,
          error: mailError instanceof Error ? mailError.message : String(mailError),
        });
      }
    }

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo iniciar checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
