import { getAdminSnapshot } from "@/lib/admin-data";
import {
  ArrowUpRight,
  Building2,
  Mail,
  Phone,
  Users,
  TrendingUp,
  Search,
  UserPlus,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const tierConfig: Record<string, { bg: string; text: string; ring: string }> = {
  Enterprise: { bg: "bg-violet-50", text: "text-violet-700", ring: "ring-violet-200" },
  Pro: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
  Basic: { bg: "bg-slate-50", text: "text-slate-600", ring: "ring-slate-200" },
};

const avatarColors = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-teal-500",
];

export default async function ClientesPage() {
  const data = await getAdminSnapshot();
  const { clients, metrics, leads } = data;

  const sortedClients = clients.slice().sort((a, b) => a.name.localeCompare(b.name));
  const enterpriseCount = clients.filter((c) => c.tier === "Enterprise").length;
  const proCount = clients.filter((c) => c.tier === "Pro").length;

  const stats = [
    {
      label: "Clientes activos",
      value: clients.length,
      sub: "En base Supabase",
      icon: Users,
      iconBg: "bg-blue-500",
      shadow: "shadow-blue-500/30",
    },
    {
      label: "Leads pendientes",
      value: Math.max(0, leads.length - metrics.totals.sales),
      sub: "En seguimiento comercial",
      icon: TrendingUp,
      iconBg: "bg-amber-500",
      shadow: "shadow-amber-500/30",
    },
    {
      label: "Ticket promedio",
      value: currency(metrics.money.avgTicket),
      sub: "Basado en ventas reales",
      icon: DollarSign,
      iconBg: "bg-emerald-500",
      shadow: "shadow-emerald-500/30",
      isText: true,
    },
    {
      label: "Clientes Enterprise",
      value: enterpriseCount,
      sub: `+ ${proCount} clientes Pro`,
      icon: Building2,
      iconBg: "bg-violet-500",
      shadow: "shadow-violet-500/30",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            CRM
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Gestión de clientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Directorio completo · {clients.length} clientes · {leads.length} leads
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/clientes/nuevo"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <UserPlus className="h-4 w-4" />
            Nuevo cliente
          </Link>
          <Link
            href="/admin/cotizaciones/nueva"
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            Nueva cotización
          </Link>
        </div>
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

      {/* Client table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Directorio de clientes</h2>
            <p className="text-xs text-slate-400">Tabla User · Supabase · {clients.length} registros</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-400">
              <Search className="h-3.5 w-3.5" />
              <span>Buscar cliente...</span>
            </div>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="mx-auto h-12 w-12 text-slate-200" />
            <p className="mt-3 text-base font-semibold text-slate-500">Sin clientes registrados</p>
            <p className="mt-1 text-sm text-slate-400">
              Los clientes aparecen aquí desde la tabla User de Supabase.
            </p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <span>Cliente</span>
              <span>Empresa</span>
              <span>Tier</span>
              <span>Contacto</span>
              <span>Acciones</span>
            </div>

            <div className="divide-y divide-slate-100">
              {sortedClients.map((c, idx) => {
                const tierCfg = tierConfig[c.tier || ""] ?? {
                  bg: "bg-slate-50",
                  text: "text-slate-600",
                  ring: "ring-slate-200",
                };
                const avatarBg = avatarColors[idx % avatarColors.length];
                return (
                  <div
                    key={c.id}
                    className="grid grid-cols-[2fr_1.5fr_1fr_1fr_auto] items-center gap-4 px-6 py-3.5 transition-colors hover:bg-slate-50"
                  >
                    {/* Name + email */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${avatarBg} text-[12px] font-bold text-white shadow`}
                      >
                        {initials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-slate-900">{c.name}</p>
                        <p className="truncate text-[11px] text-slate-400">{c.email || "—"}</p>
                      </div>
                    </div>

                    {/* Company */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                      <p className="truncate text-[13px] text-slate-600">{c.company || "—"}</p>
                    </div>

                    {/* Tier */}
                    <div>
                      {c.tier ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${tierCfg.bg} ${tierCfg.text} ${tierCfg.ring}`}
                        >
                          {c.tier}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </div>

                    {/* Contact */}
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`mailto:${c.email ?? ""}`}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                        title="Enviar email"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/admin/clientes/${c.id}`}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Ver ficha
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
              <p className="text-[11px] text-slate-400">
                Mostrando {sortedClients.length} de {clients.length} clientes · Ordenados alfabéticamente
              </p>
            </div>
          </>
        )}
      </div>

      {/* Leads section */}
      {leads.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-bold text-slate-900">Leads en seguimiento</h2>
            <p className="text-xs text-slate-400">
              {leads.length} leads · tabla Lead de Supabase
            </p>
          </div>
          <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {leads.slice(0, 12).map((lead, idx) => (
              <div
                key={lead.id}
                className="bg-white px-5 py-4 transition-colors hover:bg-slate-50"
              >
                <div className="mb-2.5 flex items-center justify-between gap-1.5">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    {lead.source || "web"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {lead.createdAt
                      ? new Date(lead.createdAt).toLocaleDateString("es-CL", {
                          day: "2-digit",
                          month: "short",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      avatarColors[idx % avatarColors.length]
                    } text-[10px] font-bold text-white`}
                  >
                    {initials(lead.name || "?")}
                  </div>
                  <p className="truncate text-[13px] font-bold text-slate-900">
                    {lead.name || "Lead"}
                  </p>
                </div>
                <p className="truncate text-[11px] text-slate-500">{lead.email}</p>
                {lead.phone && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                    <Phone className="h-3 w-3" />
                    {lead.phone}
                  </p>
                )}
                {lead.status && (
                  <span className="mt-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                    {lead.status}
                  </span>
                )}
              </div>
            ))}
          </div>
          {leads.length > 12 && (
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 text-center">
              <p className="text-[11px] text-slate-400">
                Mostrando 12 de {leads.length} leads
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
