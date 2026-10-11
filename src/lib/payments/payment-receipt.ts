import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { getFlowPaymentByOrder, getFlowPaymentStatus } from "./flow";
import { parseObservation } from "./pilot-protocol";
import { verifyPaymentObservation } from "./verified-payment";
import { getCheckoutOrder } from "@/lib/checkout/orders";
import { generateCheckoutInvoicePdf } from "@/lib/checkout/invoice-pdf";
function pdfText(s: string) {
  return s.replace(/[^\x20-\x7e\xa0-\xff]/g, " ").slice(0, 100);
}
export async function clientPaymentReceipt(paymentId: string, clientId?: string) {
  const payment = await prisma.payment.findFirst({
    where: {
      id: paymentId,
      ...(clientId ? { clientId } : {}),
      status: "CONFIRMED",
      provider: "FLOW",
    },
  });
  if (!payment || !payment.providerPaymentId || !payment.commerceOrder)
    throw new Error("PAYMENT_RECEIPT_UNAVAILABLE");
  const status = await getFlowPaymentByOrder(Number(payment.providerPaymentId));
  const proof = parseObservation({ ...status });
  if (
    proof.state !== "CONFIRMED" ||
    proof.commerce !== payment.commerceOrder ||
    proof.amount !== payment.amount ||
    payment.currency !== "CLP" ||
    !proof.paidAt
  )
    throw new Error("PAYMENT_RECEIPT_NOT_VERIFIED");
  const client = await prisma.user.findUnique({
    where: { id: payment.clientId },
    select: { name: true, email: true },
  });
  if (!client) throw new Error("PAYMENT_CLIENT_NOT_FOUND");
  const doc = await PDFDocument.create(),
    regular = await doc.embedFont(StandardFonts.Helvetica),
    bold = await doc.embedFont(StandardFonts.HelveticaBold),
    p = doc.addPage([595.28, 841.89]);
  p.drawRectangle({ x: 0, y: 675, width: 595.28, height: 166.89, color: rgb(0.09, 0.2, 0.16) });
  const text = (v: string, y: number, size = 12, strong = false, color = rgb(0.14, 0.23, 0.2)) =>
    p.drawText(pdfText(v), { x: 48, y, size, font: strong ? bold : regular, color });
  text("ZYTERON", 785, 16, true, rgb(0.74, 0.92, 0.43));
  text("Comprobante de pago", 732, 28, true, rgb(1, 1, 1));
  text("PAGO CONFIRMADO", 632, 11, true);
  text(
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(payment.amount),
    588,
    30,
    true,
  );
  text("Cliente: " + client.name, 532);
  text("Referencia: " + payment.id, 496, 10);
  text("Transacción: " + proof.order, 464);
  text(
    "Fecha: " + new Date(proof.paidAt).toLocaleString("es-CL", { timeZone: "America/Santiago" }),
    432,
  );
  text("El pago fue verificado y registrado por Zyteron.", 348, 11);
  text("Este comprobante no es una boleta ni factura tributaria.", 322, 11);
  text("contacto@zyteron.cl · www.zyteron.cl", 90, 10);
  return { bytes: Buffer.from(await doc.save()), recipient: client.email, amount: payment.amount };
}
export async function checkoutReceipt(orderId: string) {
  const order = await getCheckoutOrder(orderId);
  if (!order || order.storage !== "db" || !order.meta.flow.token)
    throw new Error("PAYMENT_RECEIPT_UNAVAILABLE");
  const status = verifyPaymentObservation(
    await getFlowPaymentStatus(order.meta.flow.token),
    {
      id: orderId,
      amount: order.meta.total,
      flowOrder: order.meta.flow.flowOrder,
      token: order.meta.flow.token,
    },
    order.meta.flow.token,
  );
  if (status.status !== 2) throw new Error("PAYMENT_NOT_CONFIRMED");
  const bytes = await generateCheckoutInvoicePdf({
    orderId,
    createdAt: order.createdAt,
    flowOrder: status.flowOrder,
    meta: order.meta,
  });
  return {
    bytes: Buffer.from(bytes),
    recipient: order.email || order.meta.customer.buyerEmail,
    amount: order.meta.total,
  };
}
