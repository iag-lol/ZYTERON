import { getPortalSession } from "@/lib/auth/portal-session";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { limitedJson } from "@/lib/payments/request-body";
import { digest } from "@/lib/payments/pilot-protocol";
import { getServicePaymentItem } from "@/lib/payments/service-catalog";
import {
  createCheckoutOrder,
  getCheckoutOrder,
  setCheckoutFlowCreation,
} from "@/lib/checkout/orders";
import { computeCheckoutTotals } from "@/lib/checkout/tax";
import { createFlowPayment } from "@/lib/payments/flow";
const schema = z
  .object({
    serviceKey: z.string().max(80),
    buyerName: z.string().trim().min(2).max(120),
    buyerEmail: z.string().trim().email().max(160),
    buyerPhone: z.string().trim().max(32).optional(),
  })
  .strict();
export async function POST(req: Request) {
  try {
    if (req.headers.get("origin") !== new URL(req.url).origin)
      return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
    const p = schema.safeParse(await limitedJson(req));
    if (!p.success)
      return NextResponse.json({ error: "Revisa los datos del comprador." }, { status: 400 });
    const data = p.data,
      s = getServicePaymentItem(data.serviceKey);
    if (!s || s.mode !== "checkout")
      return NextResponse.json(
        { error: "Servicio no disponible para pago directo." },
        { status: 400 },
      );
    const key = req.headers.get("Idempotency-Key") || "";
    if (!/^[a-f0-9-]{36}$/i.test(key))
      return NextResponse.json({ error: "Referencia de intento requerida." }, { status: 400 });
    const id = digest("service/" + data.buyerEmail.toLowerCase() + "/" + key),
      fingerprint = digest(JSON.stringify(data));
    const claimed =
      await prisma.$executeRaw`INSERT INTO zyteron_checkout_request(id,request_hash) VALUES(${id},${fingerprint}) ON CONFLICT(id) DO NOTHING`;
    const rows = await prisma.$queryRaw<
      Array<{ request_hash: string; quote_id: string | null }>
    >`SELECT request_hash,quote_id FROM zyteron_checkout_request WHERE id=${id}`;
    if (rows[0]?.request_hash !== fingerprint) throw new Error("REQUEST_CHANGED");
    if (!claimed && !rows[0]?.quote_id)
      return NextResponse.json(
        { error: "Este intento se está preparando. Vuelve a consultar antes de crear otro." },
        { status: 409 },
      );
    const totals = computeCheckoutTotals({ grossSubtotal: s.amount, netSubtotal: s.amount });
    const session = await getPortalSession();
    const clientId =
      session?.user.accountStatus === "ACTIVE" &&
      session.user.emailVerifiedAt &&
      session.user.email?.toLowerCase() === data.buyerEmail.toLowerCase()
        ? session.user.id
        : undefined;
    const order =
      (rows[0]?.quote_id ? await getCheckoutOrder(rows[0].quote_id) : null) ||
      (await createCheckoutOrder({
        clientId,
        customer: {
          buyerName: data.buyerName,
          buyerEmail: data.buyerEmail,
          buyerPhone: data.buyerPhone,
          buyerRut: "",
          address: "Servicio digital",
          documentType: "BOLETA",
        },
        items: [
          {
            productId: "service:" + s.key,
            slug: s.key,
            name: s.title,
            quantity: 1,
            listPrice: s.amount,
            finalUnitPrice: s.amount,
            lineTotal: s.amount,
          },
        ],
        subtotal: totals.grossSubtotal,
        discount: 0,
        netSubtotal: totals.netSubtotal,
        taxRate: totals.taxRate,
        taxAmount: totals.taxAmount,
        total: totals.totalWithTax,
      }));
    if (order.storage !== "db") throw new Error("PERSISTENCE_REQUIRED");
    await prisma.$executeRaw`UPDATE zyteron_checkout_request SET quote_id=${order.id} WHERE id=${id} AND quote_id IS NULL`;
    const flow = await createFlowPayment({
      commerceOrder: order.id,
      subject: s.title,
      amount: order.meta.total,
      email: data.buyerEmail,
      urlConfirmation: "https://www.zyteron.cl/api/checkout/flow/confirmation",
      urlReturn: "https://www.zyteron.cl/api/checkout/flow/return",
      paymentMethod: 9,
      timeout: 3600,
    });
    const checkoutUrl = flow.url + "?token=" + encodeURIComponent(flow.token);
    await setCheckoutFlowCreation({
      orderId: order.id,
      token: flow.token,
      flowOrder: flow.flowOrder,
      checkoutUrl,
    });
    return NextResponse.json({
      ok: true,
      checkoutUrl,
      orderId: order.id,
      reference: order.id.slice(0, 8).toUpperCase(),
      amount: order.meta.total,
      service: s.title,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo preparar el pago. Revisa el intento antes de volver a intentarlo." },
      { status: 503 },
    );
  }
}
