import Link from "next/link";
import { Mail, MessageSquare, Phone, Building2, BriefcaseBusiness, Clock3, ExternalLink } from "lucide-react";
import { getContactLeads } from "@/lib/admin/repository";
import { parseContactLeadDetails } from "@/lib/admin/contact-lead";

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((token) => token[0])
    .join("")
    .toUpperCase();
}

export default async function AdminContactosPage() {
  const rows = await getContactLeads();
  const contacts = rows
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .map((lead) => ({
      ...lead,
      details: parseContactLeadDetails(lead.message),
    }));

  const now = new Date().getTime();
  const packageLeads = contacts.filter((lead) => String(lead.type || "").toUpperCase() === "PACKAGE_BUILDER").length;
  const contactLeads = contacts.filter((lead) => String(lead.type || "").toUpperCase() === "CONTACT").length;
  const last24h = contacts.filter((lead) => {
    if (!lead.createdAt) return false;
    const created = new Date(lead.createdAt).getTime();
    return !Number.isNaN(created) && now - created <= 24 * 60 * 60 * 1000;
  }).length;

  const last7d = contacts.filter((lead) => {
    if (!lead.createdAt) return false;
    const created = new Date(lead.createdAt).getTime();
    return !Number.isNaN(created) && now - created <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">CRM</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Contactos web</h1>
          <p className="mt-1 text-sm text-slate-500">
            Solicitudes enviadas desde contacto público y cotizador web
          </p>
        </div>
        <Link
          href="/contacto"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-slate-300"
        >
          <ExternalLink className="h-4 w-4" />
          Ver formulario público
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Solicitudes totales",
            value: contacts.length,
            helper: `${contactLeads} contacto web · ${packageLeads} cotizador`,
            icon: MessageSquare,
          },
          {
            label: "Últimas 24 horas",
            value: last24h,
            helper: "Nuevas consultas recientes",
            icon: Clock3,
          },
          {
            label: "Últimos 7 días",
            value: last7d,
            helper: "Demanda semanal",
            icon: Mail,
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700">
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">{card.value}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className="mt-1 text-[11px] text-slate-500">{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[2fr_1.3fr_1.3fr_1fr_1.5fr] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          <span>Contacto</span>
          <span>Empresa</span>
          <span>Servicio</span>
          <span>Fecha</span>
          <span>Acciones</span>
        </div>

        <div className="divide-y divide-slate-100">
          {contacts.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-slate-500">
              Aún no hay solicitudes registradas desde el formulario de contacto.
            </div>
          ) : (
            contacts.map((lead, index) => {
              const palette = [
                "bg-blue-500",
                "bg-violet-500",
                "bg-emerald-500",
                "bg-amber-500",
                "bg-rose-500",
              ];

              return (
                <div key={lead.id} className="grid grid-cols-[2fr_1.3fr_1.3fr_1fr_1.5fr] gap-4 px-6 py-4 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${palette[index % palette.length]}`}>
                        {initials(lead.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{lead.name || "Sin nombre"}</p>
                        <p className="truncate text-[11px] text-slate-500">{lead.email || "Sin email"}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              String(lead.type || "").toUpperCase() === "PACKAGE_BUILDER"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {String(lead.type || "").toUpperCase() === "PACKAGE_BUILDER" ? "Cotizador" : "Contacto"}
                          </span>
                          {lead.details.cartTotal ? (
                            <span className="text-[11px] font-semibold text-blue-700">
                              Total: {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(lead.details.cartTotal)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {lead.details.brief ? (
                      <p className="mt-2 whitespace-pre-line text-[12px] leading-5 text-slate-500">{lead.details.brief}</p>
                    ) : null}
                    {lead.details.cartLines && lead.details.cartLines.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {lead.details.cartLines.map((line) => (
                          <span
                            key={`${lead.id}-${line}`}
                            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] text-slate-600"
                          >
                            {line}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-slate-600">
                    <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
                      <Building2 className="h-3.5 w-3.5" />
                      {lead.details.company || "No informada"}
                    </p>
                  </div>

                  <div className="text-slate-600">
                    <p className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-slate-700">
                      <BriefcaseBusiness className="h-3.5 w-3.5" />
                      {lead.details.service || "No especificado"}
                    </p>
                    {lead.details.selectedPlan ? (
                      <p className="mt-1 text-[11px] text-slate-500">Plan: {lead.details.selectedPlan}</p>
                    ) : null}
                    {lead.details.selectedExtras && lead.details.selectedExtras.length > 0 ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Extras: {lead.details.selectedExtras.join(", ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="text-[12px] text-slate-600">{formatDate(lead.createdAt)}</div>

                  <div className="flex items-center gap-2">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Llamar
                      </a>
                    ) : null}
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Escribir
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
