import { getAdminSnapshot } from "@/lib/admin-data";
import {
  ArrowUpRight,
  DollarSign,
  Plus,
  Receipt,
  TrendingUp,
  Target,
  Calendar,
  Hash,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default async function VentasPage() {
  const data = await getAdminSnapshot();
  const sales = data.sales
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  const revenue = data.metrics.money.revenue;
  const avgTicket = data.metrics.money.avgTicket;

  // Monthly breakdown
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
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Facturación
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Ventas y revenue</h1>
          <p className="mt-1 text-sm text-slate-500">
            {sales.length} ventas · {currency(revenue)} en ingresos totales
          </p>
        </div>
        <Link
          href="/admin/ventas/nueva"
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Registrar venta
        </Link>
      </div>

      {/* Stats */}
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

      {/* Sales table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Historial de ventas</h2>
            <p className="text-xs text-slate-400">Tabla Sale · Supabase · ordenado por fecha desc</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              {sales.length} registros
            </span>
          </div>
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
            {/* Table header */}
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
                  {/* Row number */}
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-bold text-slate-500">
                    {sales.length - idx}
                  </div>

                  {/* Sale ID */}
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

                  {/* Total */}
                  <div>
                    <p className="text-[15px] font-extrabold text-emerald-700">
                      {currency(s.total || 0)}
                    </p>
                  </div>

                  {/* Date */}
                  <div>
                    <p className="text-[13px] text-slate-600">
                      {s.createdAt
                        ? new Date(s.createdAt).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                    {s.createdAt && (
                      <p className="text-[11px] text-slate-400">
                        {new Date(s.createdAt).toLocaleTimeString("es-CL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div>
                    <Link
                      href={`/admin/ventas/${s.id}`}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Table footer */}
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

      {/* Quick tip */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-slate-50 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <Hash className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Sobre las ventas en Supabase</p>
            <p className="mt-1 text-[12px] text-slate-500">
              Las ventas se almacenan en la tabla <code className="rounded bg-slate-200 px-1 font-mono text-[11px]">Sale</code> con los campos{" "}
              <code className="rounded bg-slate-200 px-1 font-mono text-[11px]">id, clientId, total, createdAt</code>.
              Asegúrate de que las políticas RLS permitan acceso al service role.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
