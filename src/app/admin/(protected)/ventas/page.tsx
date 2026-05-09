import { getAdminSnapshot } from "@/lib/admin-data";
import { parseCheckoutMeta } from "@/lib/checkout/orders";
import { mapFlowStatusLabel } from "@/lib/payments/flow";
import { getWorkOrders } from "@/lib/admin/repository";
import { normalizeWorkOrderStatus, workOrderStatusLabel, workOrderStatusStyles } from "@/lib/admin/work-orders";
import {
  ArrowUpRight,
  BadgeCheck,
  Calendar,
  ClipboardCheck,
  ClipboardPlus,
  Clock3,
  DollarSign,
  Globe,
  Hash,
  Plus,
  Receipt,
  ShoppingCart,
  Target,
  TrendingUp,
  XCircle,
  Wrench,
} from "lucide-react";
import Link from "next/link";

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function toDateLabel(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toTimeLabel(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "—";
  return parsed.toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeFlowStatus(input: { quoteStatus?: string | null; flowStatus?: number | null }) {
  if (typeof input.flowStatus === "number") return input.flowStatus;
  const quoteStatus = String(input.quoteStatus || "").toUpperCase();
  if (quoteStatus === "WON") return 2;
  if (quoteStatus === "LOST") return 3;
  return 1;
}

function flowVisual(status: number) {
  if (status === 2) {
    return {
      label: "Pagada",
      chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: BadgeCheck,
      iconColor: "text-emerald-600",
    };
  }
  if (status === 3 || status === 4) {
    return {
      label: "Rechazada",
      chip: "border-rose-200 bg-rose-50 text-rose-700",
      icon: XCircle,
      iconColor: "text-rose-600",
    };
  }
  return {
    label: "Pendiente",
    chip: "border-blue-200 bg-blue-50 text-blue-700",
    icon: Clock3,
    iconColor: "text-blue-600",
  };
}

type PageProps = {
  searchParams?:
    | {
        ot_created?: string;
        ot_error?: string;
        ot_exists?: string;
        ot_invalid_quote?: string;
        ot_status_error?: string;
      }
    | Promise<{
        ot_created?: string;
        ot_error?: string;
        ot_exists?: string;
        ot_invalid_quote?: string;
        ot_status_error?: string;
      }>;
};

export default async function VentasPage({ searchParams }: PageProps) {
  const query = await Promise.resolve(searchParams);
  const [data, workOrders] = await Promise.all([getAdminSnapshot(), getWorkOrders()]);
  const sales = data.sales
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const webOrders = data.quotes
    .map((quote) => {
      const meta = parseCheckoutMeta(quote.message);
      if (!meta) return null;

      const flowStatus = normalizeFlowStatus({
        quoteStatus: quote.status,
        flowStatus: meta.flow.status,
      });
      const itemsCount = meta.items.reduce((acc, item) => acc + item.quantity, 0);
      const firstItems = meta.items.slice(0, 2).map((item) => `${item.name} x${item.quantity}`);

      return {
        quoteId: quote.id,
        quoteStatus: quote.status || "PENDING",
        createdAt: quote.createdAt || null,
        customerName: meta.customer.buyerName,
        customerEmail: meta.customer.buyerEmail,
        customerRut: meta.customer.buyerRut,
        customerPhone: meta.customer.buyerPhone || "—",
        documentType: meta.customer.documentType,
        companyName: meta.customer.companyName || "—",
        companyRut: meta.customer.companyRut || "—",
        address: meta.customer.address,
        commune: meta.customer.commune || "—",
        city: meta.customer.city || "—",
        comments: meta.customer.comments || "",
        itemsCount,
        firstItems,
        total: meta.total,
        subtotal: meta.subtotal,
        discount: meta.discount,
        netSubtotal:
          typeof meta.netSubtotal === "number" && Number.isFinite(meta.netSubtotal)
            ? meta.netSubtotal
            : Math.max(0, meta.subtotal - meta.discount),
        taxAmount:
          typeof meta.taxAmount === "number" && Number.isFinite(meta.taxAmount)
            ? meta.taxAmount
            : Math.max(0, meta.total - (typeof meta.netSubtotal === "number" ? meta.netSubtotal : Math.max(0, meta.subtotal - meta.discount))),
        taxRate:
          typeof meta.taxRate === "number" && Number.isFinite(meta.taxRate) ? meta.taxRate : 0.19,
        flowStatus,
        flowOrder: meta.flow.flowOrder || null,
        flowLabel: meta.flow.statusLabel || mapFlowStatusLabel(flowStatus),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const otCreated = query?.ot_created === "1";
  const otError = query?.ot_error === "1";
  const otExists = query?.ot_exists === "1";
  const otInvalidQuote = query?.ot_invalid_quote === "1";
  const otStatusError = query?.ot_status_error === "1";

  const webWorkOrders = workOrders.filter((order) => String(order.source || "").toUpperCase() === "WEB_ORDER");
  const webWorkOrderByQuoteId = new Map(
    webWorkOrders
      .filter((order) => Boolean(order.quoteId))
      .map((order) => [String(order.quoteId), order]),
  );

  const revenue = data.metrics.money.revenue;
  const avgTicket = data.metrics.money.avgTicket;

  const now = new Date();
  const thisMonth = sales.filter((s) => {
    if (!s.createdAt) return false;
    const d = new Date(s.createdAt);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const lastMonth = sales.filter((s) => {
    if (!s.createdAt) return false;
    const d = new Date(s.createdAt);
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
  });

  const thisMonthRevenue = thisMonth.reduce((acc, s) => acc + (s.total || 0), 0);
  const lastMonthRevenue = lastMonth.reduce((acc, s) => acc + (s.total || 0), 0);
  const growth = lastMonthRevenue > 0
    ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    : 0;

  const webApproved = webOrders.filter((order) => order.flowStatus === 2);
  const webPending = webOrders.filter((order) => order.flowStatus === 1);
  const webRejected = webOrders.filter((order) => order.flowStatus === 3 || order.flowStatus === 4);
  const webRevenueApproved = webApproved.reduce((acc, order) => acc + order.total, 0);
  const webTaxApproved = webApproved.reduce((acc, order) => acc + order.taxAmount, 0);
  const webUnits = webOrders.reduce((acc, order) => acc + order.itemsCount, 0);
  const webOtActive = webWorkOrders.filter((order) => {
    const status = normalizeWorkOrderStatus(order.status);
    return status === "ACTIVE" || status === "IN_PROGRESS";
  }).length;
  const webOtCompleted = webWorkOrders.filter((order) => normalizeWorkOrderStatus(order.status) === "COMPLETED").length;
  const webOtClosed = webWorkOrders.filter((order) => normalizeWorkOrderStatus(order.status) === "CLOSED").length;
  const webOtCancelled = webWorkOrders.filter((order) => normalizeWorkOrderStatus(order.status) === "CANCELLED").length;

  const stats = [
    {
      label: "Ingresos totales",
      value: currency(revenue),
      sub: `${sales.length} ventas registradas`,
      icon: DollarSign,
      iconBg: "bg-emerald-500",
      shadow: "shadow-emerald-500/30",
    },
    {
      label: "Este mes",
      value: currency(thisMonthRevenue),
      sub: `${thisMonth.length} ventas`,
      icon: Calendar,
      iconBg: "bg-blue-500",
      shadow: "shadow-blue-500/30",
    },
    {
      label: "Ticket promedio",
      value: currency(avgTicket),
      sub: "Basado en todas las ventas",
      icon: Target,
      iconBg: "bg-violet-500",
      shadow: "shadow-violet-500/30",
    },
    {
      label: "Crecimiento mensual",
      value: growth >= 0 ? `+${growth}%` : `${growth}%`,
      sub: `vs. mes anterior (${currency(lastMonthRevenue)})`,
      icon: TrendingUp,
      iconBg: growth >= 0 ? "bg-emerald-500" : "bg-rose-500",
      shadow: growth >= 0 ? "shadow-emerald-500/30" : "shadow-rose-500/30",
    },
  ];

  return (
    <div className="space-y-8">
      {otCreated ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Orden de trabajo web creada correctamente.
        </div>
      ) : null}
      {otExists ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          El pedido web ya tenía una orden de trabajo asociada.
        </div>
      ) : null}
      {otError || otInvalidQuote || otStatusError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          No se pudo completar la operación de orden de trabajo en ventas web.
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Facturación
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Ventas y revenue</h1>
          <p className="mt-1 text-sm text-slate-500">
            {sales.length} ventas manuales + {webOrders.length} ventas web
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/ordenes-trabajo"
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-100"
          >
            <Wrench className="h-4 w-4" />
            OT
          </Link>
          <Link
            href="/admin/ventas/nueva"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Registrar venta
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg} shadow-lg ${s.shadow}`}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs font-semibold text-slate-400">{s.label}</p>
              <p className="mt-1 text-[11px] text-slate-500">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Historial de ventas</h2>
            <p className="text-xs text-slate-400">Tabla Sale · Supabase · ordenado por fecha desc</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            {sales.length} registros
          </span>
        </div>

        {sales.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-slate-200" />
            <p className="mt-3 text-base font-semibold text-slate-500">Sin ventas registradas</p>
            <p className="mt-1 text-sm text-slate-400">
              Registra tu primera venta para comenzar a ver el historial.
            </p>
            <Link
              href="/admin/ventas/nueva"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Registrar primera venta
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[auto_2fr_1.5fr_1.5fr_auto] items-center gap-4 border-b border-slate-100 bg-slate-50 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span className="w-8 text-center">#</span>
              <span>ID Venta</span>
              <span>Total</span>
              <span>Fecha</span>
              <span>Detalle</span>
            </div>

            <div className="divide-y divide-slate-100">
              {sales.map((s, idx) => (
                <div
                  key={s.id}
                  className="grid grid-cols-[auto_2fr_1.5fr_1.5fr_auto] items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500">
                    {sales.length - idx}
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                      <Receipt className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[12px] font-semibold text-slate-700">
                        {s.id.slice(0, 16)}...
                      </p>
                      {s.clientId && (
                        <p className="text-[11px] text-slate-400">Cliente: {s.clientId.slice(0, 12)}...</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[15px] font-extrabold text-emerald-700">
                      {currency(s.total || 0)}
                    </p>
                  </div>

                  <div>
                    <p className="text-[13px] text-slate-600">{toDateLabel(s.createdAt)}</p>
                    <p className="text-[11px] text-slate-400">{toTimeLabel(s.createdAt)}</p>
                  </div>

                  <div>
                    <span
                      title="Detalle de venta manual"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-300"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-slate-400">
                  {sales.length} ventas registradas en Supabase
                </p>
                <div className="flex items-center gap-4 text-[12px]">
                  <span className="text-slate-500">
                    Total:{" "}
                    <span className="font-bold text-emerald-700">{currency(revenue)}</span>
                  </span>
                  <span className="text-slate-500">
                    Promedio:{" "}
                    <span className="font-bold text-slate-700">{currency(avgTicket)}</span>
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Subsección</p>
            <h2 className="mt-0.5 flex items-center gap-2 text-base font-bold text-slate-900">
              <Globe className="h-4.5 w-4.5 text-blue-600" />
              Ventas Web
            </h2>
            <p className="text-xs text-slate-500">
              Compras online desde Flow guardadas en Quote con metadata PRODUCT_CHECKOUT.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-semibold text-blue-700">
              {webOrders.length} pedidos
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              {webApproved.length} pagadas
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-semibold text-amber-700">
              {webPending.length} pendientes
            </span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-700">
              {webRejected.length} rechazadas
            </span>
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 font-semibold text-indigo-700">
              {webOtActive} OT activas
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
              {webOtCompleted} OT terminadas
            </span>
            <span className="rounded-full border border-slate-300 bg-slate-100 px-3 py-1 font-semibold text-slate-700">
              {webOtClosed} OT cerradas
            </span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 font-semibold text-rose-700">
              {webOtCancelled} OT canceladas
            </span>
          </div>
        </div>

        <div className="grid gap-4 border-b border-slate-100 bg-slate-50 px-6 py-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ventas Web Aprobadas</p>
            <p className="mt-1 text-lg font-extrabold text-emerald-700">{currency(webRevenueApproved)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ítems Vendidos Web</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{webUnits}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Ticket Web Promedio</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">
              {currency(webOrders.length ? webOrders.reduce((acc, order) => acc + order.total, 0) / webOrders.length : 0)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Facturas Emitibles</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">
              {webOrders.filter((order) => order.documentType === "FACTURA").length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">IVA Aprobado Web</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{currency(webTaxApproved)}</p>
          </div>
        </div>

        {webOrders.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Globe className="mx-auto h-12 w-12 text-slate-200" />
            <p className="mt-3 text-base font-semibold text-slate-500">Aún no hay ventas web</p>
            <p className="mt-1 text-sm text-slate-400">
              Esta tabla se llenará automáticamente cuando entren compras por Flow.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1.05fr_1.2fr_1fr_1.05fr_1fr_0.95fr_auto] gap-3 border-b border-slate-100 bg-white px-6 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <span>Pedido / Estado</span>
              <span>Cliente</span>
              <span>Documento</span>
              <span>Productos</span>
              <span>Total / Fecha</span>
              <span>OT</span>
              <span>Acción</span>
            </div>

            <div className="divide-y divide-slate-100">
              {webOrders.map((order) => {
                const status = flowVisual(order.flowStatus);
                const StatusIcon = status.icon;
                const workOrder = webWorkOrderByQuoteId.get(order.quoteId);
                const workOrderStatus = workOrder ? normalizeWorkOrderStatus(workOrder.status) : null;
                return (
                  <div key={order.quoteId} className="grid grid-cols-[1.05fr_1.2fr_1fr_1.05fr_1fr_0.95fr_auto] gap-3 px-6 py-4 hover:bg-slate-50">
                    <div>
                      <p className="font-mono text-[12px] font-semibold text-slate-800">WEB-{order.quoteId.slice(0, 8).toUpperCase()}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <StatusIcon className={`h-3.5 w-3.5 ${status.iconColor}`} />
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${status.chip}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Flow: {order.flowLabel}
                        {order.flowOrder ? ` · #${order.flowOrder}` : ""}
                      </p>
                    </div>

                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{order.customerName}</p>
                      <p className="text-[11px] text-slate-500">{order.customerEmail}</p>
                      <p className="text-[11px] text-slate-500">{order.customerRut}</p>
                      <p className="text-[11px] text-slate-500">{order.customerPhone}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {order.address}, {order.commune}, {order.city}
                      </p>
                    </div>

                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{order.documentType}</p>
                      {order.documentType === "FACTURA" ? (
                        <>
                          <p className="text-[11px] text-slate-500">{order.companyName}</p>
                          <p className="text-[11px] text-slate-500">{order.companyRut}</p>
                        </>
                      ) : (
                        <p className="text-[11px] text-slate-500">Boleta consumidor final</p>
                      )}
                    </div>

                    <div>
                      <p className="text-[12px] font-semibold text-slate-900">{order.itemsCount} productos</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{order.firstItems[0] || "—"}</p>
                      <p className="text-[11px] text-slate-500">{order.firstItems[1] || "—"}</p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        Bruto {currency(order.subtotal)} · Desc. {currency(order.discount)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Neto {currency(order.netSubtotal)} · IVA {currency(order.taxAmount)}
                      </p>
                    </div>

                    <div>
                      <p className="text-[15px] font-extrabold text-blue-700">{currency(order.total)}</p>
                      <p className="text-[11px] text-slate-500">{toDateLabel(order.createdAt)}</p>
                      <p className="text-[11px] text-slate-400">{toTimeLabel(order.createdAt)}</p>
                    </div>

                    <div className="space-y-1.5">
                      {workOrder ? (
                        <>
                          <p className="font-mono text-[11px] font-semibold text-slate-700">{workOrder.code}</p>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${workOrderStatusStyles(workOrderStatus)}`}>
                            {workOrderStatusLabel(workOrderStatus)}
                          </span>
                          <form action={`/admin/ordenes-trabajo/${workOrder.id}/estado`} method="post" className="pt-1">
                            <select
                              name="status"
                              defaultValue={workOrderStatus || "ACTIVE"}
                              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 focus:border-blue-400 focus:outline-none"
                            >
                              <option value="ACTIVE">Activa</option>
                              <option value="IN_PROGRESS">En progreso</option>
                              <option value="COMPLETED">Terminada</option>
                              <option value="CLOSED">Cerrada</option>
                              <option value="CANCELLED">Cancelada</option>
                            </select>
                            <input type="hidden" name="redirectTo" value="/admin/ventas" />
                            <button
                              type="submit"
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Guardar
                            </button>
                          </form>
                        </>
                      ) : (
                        <form action="/admin/ordenes-trabajo/generar" method="post">
                          <input type="hidden" name="quoteId" value={order.quoteId} />
                          <input type="hidden" name="source" value="WEB_ORDER" />
                          <input type="hidden" name="redirectTo" value="/admin/ventas" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700 transition-colors hover:bg-indigo-100"
                          >
                            <ClipboardPlus className="h-3 w-3" />
                            Crear OT
                          </button>
                        </form>
                      )}
                    </div>

                    <div className="flex items-start justify-end">
                      {workOrder ? (
                        <a
                          href={workOrder.pdfUrl || `/admin/ordenes-trabajo/${workOrder.id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="mr-1 flex h-7 w-7 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 transition-colors hover:bg-indigo-100"
                          title="PDF OT"
                        >
                          <ClipboardCheck className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                      <Link
                        href={`/admin/cotizaciones/${order.quoteId}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                        title="Abrir pedido web"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-[11px] text-slate-500">
              Ventas Web resumen: {webOrders.length} pedidos · {webApproved.length} pagados · {webPending.length} pendientes · {webRejected.length} rechazados · OT activas {webOtActive} · terminadas {webOtCompleted} · cerradas {webOtClosed} · canceladas {webOtCancelled}.
            </div>
          </>
        )}
      </section>

      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <Hash className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Modelo de datos de ventas</p>
            <p className="mt-1 text-[12px] text-slate-500">
              Ventas manuales se guardan en <code className="rounded bg-slate-200 px-1 font-mono text-[11px]">Sale</code>.
              Ventas web se guardan en <code className="rounded bg-slate-200 px-1 font-mono text-[11px]">Quote</code> con metadata{" "}
              <code className="rounded bg-slate-200 px-1 font-mono text-[11px]">PRODUCT_CHECKOUT</code>, incluyendo cliente, ítems, documento y estado Flow.
              Las órdenes de trabajo operativas se gestionan en{" "}
              <code className="rounded bg-slate-200 px-1 font-mono text-[11px]">WorkOrder</code> con estados activos, terminadas, cerradas y canceladas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
