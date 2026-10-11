import { cookies } from "next/headers";
import { readCheckoutGrant, CHECKOUT_GRANT_COOKIE } from "@/lib/payments/checkout-grant";
import { digest } from "@/lib/payments/pilot-protocol";
import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock3, CreditCard, ReceiptText } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { getCheckoutOrder } from "@/lib/checkout/orders";
import { createPageMetadata } from "@/lib/seo";
import { getFlowPaymentStatus, mapFlowStatusLabel } from "@/lib/payments/flow";
import { samePaymentToken, verifyPaymentObservation } from "@/lib/payments/verified-payment";

export const dynamic = "force-dynamic";
export const metadata: Metadata = createPageMetadata({
  title: "Estado de pago",
  description: "Estado final de pago de productos y servicios.",
  path: "/checkout/finalizado",
  noIndex: true,
});

function resolveStatus(flowStatus: number) {
  if (flowStatus === 0)
    return {
      title: "No pudimos verificar este pago",
      description:
        "Ingresa a tu cuenta para revisar tus pagos o contacta a nuestro equipo. No se ha acreditado una compra con este acceso.",
      tone: "border-slate-200 bg-slate-50 text-slate-900",
      icon: AlertTriangle,
    };
  if (flowStatus === 2) {
    return {
      title: "Pago aprobado",
      description: "Tu compra fue confirmada correctamente.",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      icon: CheckCircle2,
    };
  }

  if (flowStatus === 3 || flowStatus === 4) {
    return {
      title: "Pago rechazado o anulado",
      description: "Puedes intentar nuevamente desde el catálogo o contactar soporte.",
      tone: "border-rose-200 bg-rose-50 text-rose-900",
      icon: AlertTriangle,
    };
  }

  return {
    title: "Pago en validación",
    description: "Tu transacción está en proceso de confirmación.",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    icon: Clock3,
  };
}

export default async function CheckoutFinalizadoPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  void searchParams;
  const grant = readCheckoutGrant((await cookies()).get(CHECKOUT_GRANT_COOKIE)?.value);
  const order = grant?.orderId || "";
  const stored = order ? await getCheckoutOrder(order).catch(() => null) : null;
  const token =
    stored?.meta.flow.token && grant?.tokenHash === digest(stored.meta.flow.token)
      ? stored.meta.flow.token
      : "";
  let flowStatus = 0;
  let flowLabel = "En verificación";
  const message = "";
  let orderData = null;
  if (order && token) {
    try {
      const candidate = await getCheckoutOrder(order);
      if (candidate?.storage === "db" && samePaymentToken(token, candidate.meta.flow.token)) {
        const observation = verifyPaymentObservation(
          await getFlowPaymentStatus(token),
          {
            id: candidate.id,
            amount: candidate.meta.total,
            flowOrder: candidate.meta.flow.flowOrder,
            token: candidate.meta.flow.token,
          },
          token,
        );
        flowStatus = observation.status;
        flowLabel = mapFlowStatusLabel(flowStatus);
        orderData = candidate;
      }
    } catch {
      orderData = null;
    }
  }
  const status = resolveStatus(flowStatus);
  const Icon = status.icon;
  const canDownloadInvoice =
    flowStatus === 2 && orderData && token && orderData.meta.flow.token === token;
  const invoiceUrl = canDownloadInvoice ? `/api/checkout/invoice/${encodeURIComponent(order)}` : "";
  const invoiceLabel = "Descargar comprobante PDF";

  const netSubtotal = orderData
    ? typeof orderData.meta.netSubtotal === "number"
      ? orderData.meta.netSubtotal
      : Math.max(0, orderData.meta.subtotal - orderData.meta.discount)
    : 0;
  const taxAmount = orderData
    ? typeof orderData.meta.taxAmount === "number"
      ? orderData.meta.taxAmount
      : Math.max(0, orderData.meta.total - netSubtotal)
    : 0;

  const money = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Math.max(0, Math.round(value || 0)));

  return (
    <main className="bg-slate-50 py-16">
      <Container className="max-w-3xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className={`rounded-2xl border p-5 ${status.tone}`}>
            <div className="flex items-start gap-3">
              <Icon className="mt-0.5 h-6 w-6" />
              <div>
                <h1 className="text-2xl font-extrabold">{status.title}</h1>
                <p className="mt-2 text-sm">{status.description}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                Orden
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                <ReceiptText className="h-4 w-4 text-blue-700" />
                {order || "No disponible"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                Estado del pago
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                <CreditCard className="h-4 w-4 text-blue-700" />
                {flowLabel || "Sin estado"} ({Number.isFinite(flowStatus) ? flowStatus : 0})
              </p>
            </div>
          </div>

          {orderData ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold tracking-widest text-slate-500 uppercase">
                Resumen de compra
              </p>
              <div className="mt-3 grid gap-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Subtotal bruto</span>
                  <span className="font-semibold text-slate-900">
                    {money(orderData.meta.subtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Descuento</span>
                  <span className="font-semibold text-emerald-700">
                    -{money(orderData.meta.discount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Subtotal neto</span>
                  <span className="font-semibold text-slate-900">{money(netSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">IVA</span>
                  <span className="font-semibold text-slate-900">{money(taxAmount)}</span>
                </div>
                <div className="mt-1 border-t border-slate-200 pt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold text-slate-900">Total pagado</span>
                    <span className="text-lg font-extrabold text-blue-700">
                      {money(orderData.meta.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {message ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {message}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {canDownloadInvoice ? (
              <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                <a href={invoiceUrl}>{invoiceLabel}</a>
              </Button>
            ) : null}
            <Button asChild className="btn-primary-glow bg-blue-700 text-white hover:bg-blue-800">
              <Link href="/">Volver al inicio</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-slate-300 text-slate-800 hover:bg-slate-50"
            >
              <Link href="/contacto">Contactar soporte</Link>
            </Button>
          </div>
        </div>
      </Container>
    </main>
  );
}
