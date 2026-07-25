import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Building2,
  BriefcaseBusiness,
  Clock3,
  ExternalLink,
  Phone,
  Calendar,
  CircleDollarSign,
  Hash,
  Layers,
  Tag,
} from "lucide-react";
import { getContactLeads } from "@/lib/admin/repository";
import { parseContactLeadDetails } from "@/lib/admin/contact-lead";
import { ContactLeadActions } from "@/components/admin/contact-lead-actions";

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

function isQuoteLead(lead: { source?: string | null; type?: string | null }) {
  const source = String(lead.source || "").toUpperCase();
  const type = String(lead.type || "").toUpperCase();
  return (
    (source === "COTIZADOR_WEB" && type === "PACKAGE_BUILDER") ||
    (source === "QUOTE_REQUEST" && type === "QUOTE")
  );
}

// Convierte el bloque de texto de la solicitud en datos estructurados.
function parseBrief(brief?: string): { pairs: Array<[string, string]>; bullets: string[]; notes: string[] } {
  const pairs: Array<[string, string]> = [];
  const bullets: string[] = [];
  const notes: string[] = [];
  if (!brief) return { pairs, bullets, notes };

  for (const raw of brief.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^[-•·]\s*(.+)$/);
    if (bullet) {
      bullets.push(bullet[1]!.trim());
      continue;
    }
    const idx = line.indexOf(":");
    if (idx > 1 && idx < 42) {
      const label = line.slice(0, idx).trim();
      const value = line.slice(idx + 1).trim();
      if (value) pairs.push([label, value]);
      // Si no hay valor, es un encabezado tipo "Respuestas del formulario:" → se ignora.
      continue;
    }
    notes.push(line);
  }
  return { pairs, bullets, notes };
}

// Etiquetas que ya se muestran en el encabezado/facts: se omiten en el detalle.
const SKIP_DETAIL_LABELS = [
  "empresa",
  "empresa o negocio",
  "servicio",
  "tipo de proyecto",
  "presupuesto",
  "código solicitud",
  "codigo solicitud",
];

function FactItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 ring-1 ring-slate-200">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
        <span className="block truncate text-[13px] font-semibold text-slate-800">{value}</span>
      </span>
    </div>
  );
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
  const packageLeads = contacts.filter((lead) => isQuoteLead(lead)).length;
  const contactLeads = contacts.filter((lead) => !isQuoteLead(lead)).length;
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

      {contacts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <MessageSquare className="h-6 w-6" />
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-600">Aún no hay solicitudes</p>
          <p className="mt-1 text-[13px] text-slate-400">
            Las consultas del formulario de contacto y del cotizador aparecerán aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {contacts.map((lead, index) => {
            const palette = [
              "from-blue-500 to-blue-700",
              "from-violet-500 to-violet-700",
              "from-emerald-500 to-emerald-700",
              "from-amber-500 to-amber-600",
              "from-rose-500 to-rose-700",
            ];
            const quote = isQuoteLead(lead);
            const d = lead.details;
            const { pairs, bullets } = parseBrief(d.brief);
            const detailPairs = pairs.filter(([label]) => !SKIP_DETAIL_LABELS.includes(label.toLowerCase()));
            const budget = d.budget || d.budgetRange;

            return (
              <article
                key={lead.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Encabezado */}
                <header className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${palette[index % palette.length]} text-sm font-bold text-white shadow-sm`}
                    >
                      {initials(lead.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-slate-900">{lead.name || "Sin nombre"}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-slate-500">
                        {lead.email && (
                          <span className="inline-flex items-center gap-1 truncate">
                            <Mail className="h-3 w-3 shrink-0" /> {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" /> {lead.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ring-1 ${
                        quote ? "bg-blue-50 text-blue-700 ring-blue-200" : "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}
                    >
                      {quote ? "Cotizador" : "Contacto"}
                    </span>
                    {d.cartTotal ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                        {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(d.cartTotal)}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <Calendar className="h-3 w-3" /> {formatDate(lead.createdAt)}
                    </span>
                  </div>
                </header>

                {/* Datos clave */}
                <div className="grid gap-2.5 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3 sm:px-5">
                  <FactItem icon={Building2} label="Empresa" value={d.company || "No informada"} />
                  <FactItem icon={BriefcaseBusiness} label="Servicio" value={d.service || d.projectType || "No especificado"} />
                  {d.selectedPlan && <FactItem icon={Layers} label="Plan" value={d.selectedPlan} />}
                  {budget && <FactItem icon={CircleDollarSign} label="Presupuesto" value={budget} />}
                </div>

                {/* Detalle estructurado */}
                {(detailPairs.length > 0 || bullets.length > 0 || (d.selectedExtras && d.selectedExtras.length > 0) || (d.cartLines && d.cartLines.length > 0)) && (
                  <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
                    <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      <Hash className="h-3.5 w-3.5" /> Detalle de la solicitud
                    </p>

                    {detailPairs.length > 0 && (
                      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                        {detailPairs.map(([label, value], i) => (
                          <div key={`${lead.id}-p-${i}`} className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-100 pb-1.5">
                            <dt className="text-[12px] text-slate-500">{label}</dt>
                            <dd className="text-right text-[12.5px] font-semibold text-slate-800">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}

                    {bullets.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {bullets.map((b, i) => (
                          <span key={`${lead.id}-b-${i}`} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
                            <Tag className="h-3 w-3 text-slate-400" /> {b}
                          </span>
                        ))}
                      </div>
                    )}

                    {((d.selectedExtras && d.selectedExtras.length > 0) || (d.cartLines && d.cartLines.length > 0)) && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {[...(d.cartLines ?? []), ...(d.selectedExtras ?? [])].map((line, i) => (
                          <span key={`${lead.id}-x-${i}`} className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700 ring-1 ring-blue-100">
                            {line}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Acciones */}
                <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
                  <ContactLeadActions leadId={lead.id} email={lead.email} phone={lead.phone} />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
