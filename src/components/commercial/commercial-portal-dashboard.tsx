"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Edit3,
  FileText,
  Filter,
  History,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Settings,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CommercialUser = {
  id: string;
  name: string;
  rut: string;
  email: string | null;
  phone: string | null;
  role: string;
  commission_pct: number;
  must_change_password: boolean;
};

type Lead = {
  id: string;
  owner_id: string;
  kind: string;
  name: string;
  rut: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  region: string | null;
  comuna: string | null;
  website: string | null;
  industry: string | null;
  service: string | null;
  budget: string | null;
  deadline: string | null;
  interest: string | null;
  description: string | null;
  source: string | null;
  validation_status: string;
  commercial_status: string;
  admin_notes: string | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  validated_at: string | null;
  updated_at: string;
  created_at: string;
};

type Activity = {
  id: string;
  actor_type: string;
  activity_type: string;
  outcome: string | null;
  notes: string;
  from_status: string | null;
  to_status: string | null;
  occurred_at: string;
  next_follow_up_at: string | null;
};

type Detail = { lead: Lead; activities: Activity[] };

const ROLE_LABEL: Record<string, string> = {
  executive: "Ejecutivo comercial",
  portfolio: "Gestor de cartera",
  partner: "Partner / Referidor",
};

export const PROGRESS: Record<string, { label: string; cls: string }> = {
  registered: { label: "Registrado", cls: "bg-slate-100 text-slate-700" },
  contacted: { label: "Contactado", cls: "bg-blue-50 text-blue-700" },
  follow_up: { label: "En seguimiento", cls: "bg-cyan-50 text-cyan-700" },
  meeting_scheduled: { label: "Reunión agendada", cls: "bg-violet-50 text-violet-700" },
  proposal_sent: { label: "Propuesta enviada", cls: "bg-indigo-50 text-indigo-700" },
  negotiation: { label: "Negociación", cls: "bg-amber-50 text-amber-700" },
  won: { label: "Ganado", cls: "bg-emerald-50 text-emerald-700" },
  lost: { label: "Perdido", cls: "bg-rose-50 text-rose-700" },
  no_response: { label: "Sin respuesta", cls: "bg-orange-50 text-orange-700" },
};

export const VALIDATION: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente de evaluación", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  in_review: { label: "En revisión", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  potential: { label: "Cliente potencial", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
  accepted: { label: "Aceptado por Zyteron", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  rejected: { label: "No califica", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
  duplicate: { label: "Duplicado", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  validated: { label: "Validado", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

const ACTIVITY_LABEL: Record<string, string> = {
  call: "Llamada",
  whatsapp: "WhatsApp",
  email: "Correo",
  meeting: "Reunión",
  note: "Nota",
  evaluation: "Evaluación administrativa",
};

const EMPTY_LEAD = {
  kind: "company",
  name: "",
  rut: "",
  contact_name: "",
  email: "",
  phone: "",
  region: "",
  comuna: "",
  website: "",
  industry: "",
  service: "",
  budget: "",
  deadline: "",
  interest: "medio",
  description: "",
  source: "",
};

function formatDate(value: string | null, withTime = false) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function localDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

async function readJson(res: Response) {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(data.error || "No se pudo completar la acción."));
  return data;
}

export function CommercialPortalDashboard({
  user,
  commissionTotal,
  statementCount,
}: {
  user: CommercialUser;
  commissionTotal: number;
  statementCount: number;
}) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tab, setTab] = useState<"contacts" | "account">(
    user.must_change_password ? "account" : "contacts",
  );
  const [leadForm, setLeadForm] = useState<Lead | "new" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [renderedAt] = useState(() => Date.now());

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await readJson(await fetch("/api/comercial/leads", { cache: "no-store" }));
      setLeads((data.leads as Lead[]) ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los contactos.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await readJson(await fetch(`/api/comercial/leads/${id}`, { cache: "no-store" }));
      setDetail(data as unknown as Detail);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el detalle.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [loadDetail, selectedId]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "all" ||
        lead.commercial_status === statusFilter ||
        lead.validation_status === statusFilter;
      const matchesQuery =
        !needle ||
        [lead.name, lead.contact_name, lead.email, lead.phone, lead.rut, lead.service]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("es").includes(needle));
      return matchesStatus && matchesQuery;
    });
  }, [leads, query, statusFilter]);

  const potentialCount = leads.filter((lead) =>
    ["potential", "accepted"].includes(lead.validation_status),
  ).length;
  const activeCount = leads.filter((lead) =>
    ["contacted", "follow_up", "meeting_scheduled", "proposal_sent", "negotiation"].includes(
      lead.commercial_status,
    ),
  ).length;
  const pendingFollowUps = leads.filter(
    (lead) =>
      lead.next_follow_up_at &&
      new Date(lead.next_follow_up_at).getTime() <= renderedAt &&
      !["won", "lost"].includes(lead.commercial_status),
  ).length;

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }, []);

  const refreshAfterAction = useCallback(
    async (message: string, id?: string) => {
      await loadLeads();
      if (id) await loadDetail(id);
      flash(message);
    },
    [flash, loadDetail, loadLeads],
  );

  return (
    <div className="space-y-5">
      {notice && (
        <div className="fixed right-4 top-20 z-50 flex max-w-sm items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-[13px] font-semibold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      )}
      {user.must_change_password && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-[12px] font-bold text-amber-900">Cambia tu contraseña inicial</p>
            <p className="text-[11px] text-amber-700">
              Antes de comenzar, reemplaza la contraseña entregada por administración desde “Mi cuenta”.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">
            {ROLE_LABEL[user.role] ?? user.role}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
            Hola, {user.name.split(" ")[0]}
          </h1>
          <p className="text-[13px] text-slate-500">
            Registra tus contactos e informa cada avance; Zyteron evaluará cuáles califican.
          </p>
        </div>
        {tab === "contacts" && (
          <button
            onClick={() => setLeadForm("new")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" /> Registrar contacto
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Contactos registrados" value={leads.length} icon={Users} color="blue" />
        <Metric label="Gestiones activas" value={activeCount} icon={Target} color="cyan" />
        <Metric label="Potenciales / aceptados" value={potentialCount} icon={CheckCircle2} color="violet" />
        <Metric label="Seguimientos vencidos" value={pendingFollowUps} icon={CalendarClock} color="amber" />
        <Metric
          label="Comisión acumulada"
          value={`$${commissionTotal.toLocaleString("es-CL")}`}
          icon={CircleDollarSign}
          color="emerald"
          hint={`${statementCount} estado${statementCount === 1 ? "" : "s"}`}
        />
      </div>

      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <TabButton active={tab === "contacts"} onClick={() => setTab("contacts")} icon={Users}>
          Contactos y avances
        </TabButton>
        <TabButton active={tab === "account"} onClick={() => setTab("account")} icon={Settings}>
          Mi cuenta
        </TabButton>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          {error}
        </div>
      )}

      {tab === "contacts" ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar por cliente, contacto, correo, teléfono o servicio…"
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="relative min-w-56">
                <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-[13px] outline-none focus:border-blue-400"
                >
                  <option value="all">Todos los estados</option>
                  <optgroup label="Avance informado">
                    {Object.entries(PROGRESS).map(([value, item]) => (
                      <option key={value} value={value}>{item.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Evaluación Zyteron">
                    {Object.entries(VALIDATION)
                      .filter(([value]) => value !== "validated")
                      .map(([value, item]) => (
                        <option key={value} value={value}>{item.label}</option>
                      ))}
                  </optgroup>
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <EmptyState icon={Loader2} title="Cargando contactos…" spin />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Users}
                title={leads.length ? "No hay resultados para este filtro" : "Aún no registras contactos"}
                text={leads.length ? "Prueba otro término o estado." : "Registra a la primera persona o empresa contactada."}
                action={!leads.length ? () => setLeadForm("new") : undefined}
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    renderedAt={renderedAt}
                    onOpen={() => setSelectedId(lead.id)}
                    onProgress={() => setSelectedId(lead.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <AccountPanel user={user} onSaved={(message) => flash(message)} />
      )}

      {leadForm && (
        <LeadFormModal
          lead={leadForm === "new" ? null : leadForm}
          onClose={() => setLeadForm(null)}
          onSaved={async (message) => {
            setLeadForm(null);
            await refreshAfterAction(message, selectedId ?? undefined);
          }}
        />
      )}

      {selectedId && (
        <LeadDetailPanel
          detail={detail}
          loading={detailLoading}
          onClose={() => setSelectedId(null)}
          onEdit={() => detail?.lead && setLeadForm(detail.lead)}
          onSaved={(message) => refreshAfterAction(message, selectedId)}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  color,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  color: "blue" | "cyan" | "violet" | "amber" | "emerald";
  hint?: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    cyan: "bg-cyan-50 text-cyan-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", colors[color])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 text-xl font-extrabold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold transition-colors sm:flex-none",
        active ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
      )}
    >
      <Icon className="h-4 w-4" /> {children}
    </button>
  );
}

function LeadRow({
  lead,
  renderedAt,
  onOpen,
  onProgress,
}: {
  lead: Lead;
  renderedAt: number;
  onOpen: () => void;
  onProgress: () => void;
}) {
  const progress = PROGRESS[lead.commercial_status] ?? PROGRESS.registered;
  const validation = VALIDATION[lead.validation_status] ?? VALIDATION.pending;
  const followUpOverdue =
    lead.next_follow_up_at &&
    new Date(lead.next_follow_up_at).getTime() <= renderedAt &&
    !["won", "lost"].includes(lead.commercial_status);
  return (
    <div className="group flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:px-5">
      <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {lead.kind === "company" ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-bold text-slate-900">{lead.name}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
            {lead.contact_name && <span>{lead.contact_name}</span>}
            {lead.service && <span className="truncate">{lead.service}</span>}
            <span>Registrado {formatDate(lead.created_at)}</span>
          </span>
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {lead.next_follow_up_at && (
          <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold", followUpOverdue ? "text-rose-600" : "text-slate-500")}>
            <Clock3 className="h-3.5 w-3.5" />
            {followUpOverdue ? "Vencido " : "Próximo "}
            {formatDate(lead.next_follow_up_at, true)}
          </span>
        )}
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", progress.cls)}>{progress.label}</span>
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold ring-1", validation.cls)}>{validation.label}</span>
        <button
          onClick={onProgress}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          Informar avance <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  spin,
  action,
}: {
  icon: typeof Users;
  title: string;
  text?: string;
  spin?: boolean;
  action?: () => void;
}) {
  return (
    <div className="px-6 py-16 text-center">
      <Icon className={cn("mx-auto h-7 w-7 text-slate-300", spin && "animate-spin")} />
      <p className="mt-2 text-[13px] font-bold text-slate-600">{title}</p>
      {text && <p className="mt-1 text-[12px] text-slate-400">{text}</p>}
      {action && (
        <button onClick={action} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-[12px] font-bold text-white hover:bg-blue-700">
          Registrar contacto
        </button>
      )}
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-[16px] font-extrabold text-slate-900">{title}</h2>
            {subtitle && <p className="text-[12px] text-slate-500">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function LeadFormModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead | null;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const initial = lead ? Object.fromEntries(Object.keys(EMPTY_LEAD).map((key) => [key, String(lead[key as keyof Lead] ?? "")])) : EMPTY_LEAD;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData.entries());
    try {
      await readJson(
        await fetch(lead ? `/api/comercial/leads/${lead.id}` : "/api/comercial/leads", {
          method: lead ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      await onSaved(lead ? "Datos del contacto actualizados." : "Contacto registrado para evaluación.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell
      title={lead ? "Editar datos del contacto" : "Registrar nuevo contacto"}
      subtitle="Registra a toda persona o empresa contactada; Zyteron decidirá si califica como potencial."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-5 p-5">
        <fieldset disabled={saving} className="space-y-5">
          <section>
            <SectionTitle>Identificación</SectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <SelectField label="Tipo de registro" name="kind" defaultValue={initial.kind} required>
                <option value="company">Empresa</option>
                <option value="person">Persona</option>
              </SelectField>
              <InputField label="Nombre o razón social" name="name" defaultValue={initial.name} required maxLength={200} />
              <InputField label="RUT (opcional)" name="rut" defaultValue={initial.rut} placeholder="12.345.678-9" />
              <InputField label="Persona de contacto" name="contact_name" defaultValue={initial.contact_name} />
              <InputField label="Correo" name="email" type="email" defaultValue={initial.email} />
              <InputField label="Teléfono / WhatsApp" name="phone" defaultValue={initial.phone} />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">Debes informar al menos un correo o teléfono.</p>
          </section>

          <section>
            <SectionTitle>Empresa y ubicación</SectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InputField label="Región" name="region" defaultValue={initial.region} />
              <InputField label="Comuna / Ciudad" name="comuna" defaultValue={initial.comuna} />
              <InputField label="Rubro" name="industry" defaultValue={initial.industry} />
              <InputField label="Sitio web" name="website" defaultValue={initial.website} placeholder="https://…" />
              <InputField label="Origen del contacto" name="source" defaultValue={initial.source} placeholder="Referido, evento, llamada…" />
            </div>
          </section>

          <section>
            <SectionTitle>Necesidad comercial</SectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InputField label="Servicio de interés" name="service" defaultValue={initial.service} placeholder="Sitio web, soporte TI…" />
              <InputField label="Presupuesto estimado" name="budget" defaultValue={initial.budget} placeholder="$ o rango" />
              <InputField label="Plazo esperado" name="deadline" defaultValue={initial.deadline} placeholder="Este mes, 60 días…" />
              <SelectField label="Interés observado" name="interest" defaultValue={initial.interest}>
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
              </SelectField>
              <label className="block sm:col-span-2 lg:col-span-3">
                <FieldLabel>Descripción de la necesidad</FieldLabel>
                <textarea
                  name="description"
                  defaultValue={initial.description}
                  maxLength={4000}
                  rows={4}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  placeholder="Qué necesita, contexto del contacto y cualquier antecedente útil…"
                />
              </label>
            </div>
          </section>
        </fieldset>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-[13px] font-bold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[13px] font-bold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {lead ? "Guardar cambios" : "Registrar contacto"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function LeadDetailPanel({
  detail,
  loading,
  onClose,
  onEdit,
  onSaved,
}: {
  detail: Detail | null;
  loading: boolean;
  onClose: () => void;
  onEdit: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [showProgress, setShowProgress] = useState(false);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/35 backdrop-blur-[1px]">
      <button className="h-full flex-1 cursor-default" onClick={onClose} aria-label="Cerrar detalle" />
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Ficha del contacto</p>
            <h2 className="text-[16px] font-extrabold text-slate-900">{detail?.lead.name ?? "Cargando…"}</h2>
          </div>
          <div className="flex gap-1">
            {detail && (
              <button onClick={onEdit} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Editar datos">
                <Edit3 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {loading || !detail ? (
          <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando detalle…
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <LeadSummary lead={detail.lead} />
            {showProgress ? (
              <ProgressForm
                lead={detail.lead}
                onCancel={() => setShowProgress(false)}
                onSaved={async () => {
                  setShowProgress(false);
                  await onSaved("Avance registrado en la bitácora.");
                }}
              />
            ) : (
              <button
                onClick={() => setShowProgress(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-[13px] font-bold text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Informar nuevo avance
              </button>
            )}
            <ActivityTimeline activities={detail.activities} />
          </div>
        )}
      </aside>
    </div>
  );
}

function LeadSummary({ lead }: { lead: Lead }) {
  const progress = PROGRESS[lead.commercial_status] ?? PROGRESS.registered;
  const validation = VALIDATION[lead.validation_status] ?? VALIDATION.pending;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", progress.cls)}>{progress.label}</span>
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold ring-1", validation.cls)}>{validation.label}</span>
      </div>
      {lead.admin_notes && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Observación de Zyteron</p>
          <p className="mt-1 whitespace-pre-wrap text-[12px] text-blue-900">{lead.admin_notes}</p>
        </div>
      )}
      <dl className="grid gap-x-4 gap-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
        <DetailItem label="Contacto" value={lead.contact_name} />
        <DetailItem label="RUT" value={lead.rut} />
        <DetailItem label="Correo" value={lead.email} />
        <DetailItem label="Teléfono" value={lead.phone} />
        <DetailItem label="Ubicación" value={[lead.comuna, lead.region].filter(Boolean).join(", ")} />
        <DetailItem label="Rubro" value={lead.industry} />
        <DetailItem label="Servicio" value={lead.service} />
        <DetailItem label="Presupuesto" value={lead.budget} />
        <DetailItem label="Plazo" value={lead.deadline} />
        <DetailItem label="Origen" value={lead.source} />
      </dl>
      {lead.description && (
        <div>
          <SectionTitle>Necesidad informada</SectionTitle>
          <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-slate-600">{lead.description}</p>
        </div>
      )}
    </>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-[12px] font-semibold text-slate-700">{value || "—"}</dd>
    </div>
  );
}

function ProgressForm({
  lead,
  onCancel,
  onSaved,
}: {
  lead: Lead;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    const body = {
      ...raw,
      occurredAt: raw.occurredAt ? new Date(raw.occurredAt).toISOString() : "",
      nextFollowUpAt: raw.nextFollowUpAt ? new Date(raw.nextFollowUpAt).toISOString() : "",
    };
    try {
      await readJson(
        await fetch(`/api/comercial/leads/${lead.id}/activities`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo registrar el avance.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
      <div>
        <h3 className="text-[13px] font-extrabold text-slate-900">Nuevo avance de contacto</h3>
        <p className="text-[11px] text-slate-500">Esta gestión quedará visible en la bitácora y para administración.</p>
      </div>
      <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Canal utilizado" name="activityType" defaultValue="call" required>
          <option value="call">Llamada</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Correo</option>
          <option value="meeting">Reunión</option>
          <option value="note">Nota / gestión interna</option>
        </SelectField>
        <SelectField label="Etapa después de esta gestión" name="progressStatus" defaultValue={lead.commercial_status} required>
          {Object.entries(PROGRESS).map(([value, item]) => (
            <option key={value} value={value}>{item.label}</option>
          ))}
        </SelectField>
        <InputField label="Resultado breve" name="outcome" placeholder="Respondió, solicita reunión…" />
        <InputField label="Fecha de la gestión" name="occurredAt" type="datetime-local" defaultValue={localDateTimeValue()} required />
        <InputField label="Próximo seguimiento" name="nextFollowUpAt" type="datetime-local" />
        <label className="block sm:col-span-2">
          <FieldLabel>Detalle del avance</FieldLabel>
          <textarea
            name="notes"
            minLength={3}
            maxLength={4000}
            required
            rows={4}
            placeholder="Qué conversaron, qué pidió el cliente y cuál es el próximo paso…"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </label>
      </fieldset>
      {error && <p className="text-[12px] font-medium text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-[12px] font-bold text-slate-500 hover:bg-white">
          Cancelar
        </button>
        <button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-[12px] font-bold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          Guardar avance
        </button>
      </div>
    </form>
  );
}

function ActivityTimeline({ activities }: { activities: Activity[] }) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-slate-400" />
        <SectionTitle>Bitácora de gestiones</SectionTitle>
      </div>
      {activities.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-[12px] text-slate-400">
          Todavía no se han informado avances.
        </p>
      ) : (
        <div className="mt-4 space-y-0">
          {activities.map((activity, index) => {
            const toStatus =
              activity.actor_type === "admin"
                ? VALIDATION[activity.to_status ?? ""]
                : PROGRESS[activity.to_status ?? ""];
            return (
              <div key={activity.id} className="relative flex gap-3 pb-5">
                {index < activities.length - 1 && <span className="absolute left-[15px] top-8 h-full w-px bg-slate-200" />}
                <span className={cn("z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full", activity.actor_type === "admin" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700")}>
                  {activity.actor_type === "admin" ? <CheckCircle2 className="h-4 w-4" /> : <ActivityIcon type={activity.activity_type} />}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-[12px] font-bold text-slate-800">{ACTIVITY_LABEL[activity.activity_type] ?? activity.activity_type}</p>
                    <time className="text-[10px] text-slate-400">{formatDate(activity.occurred_at, true)}</time>
                  </div>
                  {activity.outcome && <p className="mt-0.5 text-[11px] font-semibold text-slate-600">{activity.outcome}</p>}
                  <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-slate-500">{activity.notes}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {toStatus && <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", toStatus.cls)}>{toStatus.label}</span>}
                    {activity.next_follow_up_at && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                        <CalendarClock className="h-3 w-3" /> Próximo: {formatDate(activity.next_follow_up_at, true)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ActivityIcon({ type }: { type: string }) {
  if (type === "whatsapp") return <MessageCircle className="h-4 w-4" />;
  if (type === "email") return <Mail className="h-4 w-4" />;
  if (type === "meeting") return <Users className="h-4 w-4" />;
  if (type === "call") return <Phone className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function AccountPanel({ user, onSaved }: { user: CommercialUser; onSaved: (message: string) => void }) {
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileSaving(true);
    setError("");
    try {
      await readJson(
        await fetch("/api/comercial/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
        }),
      );
      onSaved("Datos de contacto actualizados.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar el perfil.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSaving(true);
    setError("");
    const form = event.currentTarget;
    try {
      await readJson(
        await fetch("/api/comercial/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
        }),
      );
      form.reset();
      onSaved("Contraseña actualizada correctamente.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cambiar la contraseña.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={saveProfile} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-[15px] font-extrabold text-slate-900">Datos de contacto</h2>
        <p className="mt-1 text-[12px] text-slate-500">Tu nombre, RUT, rol y comisión los gestiona administración.</p>
        <dl className="my-4 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-2">
          <DetailItem label="Nombre" value={user.name} />
          <DetailItem label="RUT" value={user.rut} />
          <DetailItem label="Rol" value={ROLE_LABEL[user.role] ?? user.role} />
          <DetailItem label="Comisión" value={`${user.commission_pct || 0}%`} />
        </dl>
        <div className="space-y-3">
          <InputField label="Correo" name="email" type="email" defaultValue={user.email ?? ""} />
          <InputField label="Teléfono" name="phone" defaultValue={user.phone ?? ""} />
        </div>
        <button disabled={profileSaving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-blue-700 disabled:opacity-60">
          {profileSaving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar datos
        </button>
      </form>

      <form onSubmit={savePassword} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-[15px] font-extrabold text-slate-900">Cambiar contraseña</h2>
        <p className="mt-1 text-[12px] text-slate-500">Usa al menos 8 caracteres para proteger tu cuenta.</p>
        <div className="mt-4 space-y-3">
          <InputField label="Contraseña actual" name="currentPassword" type="password" required />
          <InputField label="Nueva contraseña" name="newPassword" type="password" minLength={8} required />
          <InputField label="Repetir nueva contraseña" name="confirmPassword" type="password" minLength={8} required />
        </div>
        <button disabled={passwordSaving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-slate-800 disabled:opacity-60">
          {passwordSaving && <Loader2 className="h-4 w-4 animate-spin" />} Actualizar contraseña
        </button>
      </form>
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-[12px] text-rose-700 lg:col-span-2">{error}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{children}</h3>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] font-bold text-slate-600">{children}</span>;
}

function InputField({
  label,
  name,
  defaultValue,
  type = "text",
  placeholder,
  required,
  minLength,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}{required ? " *" : ""}</FieldLabel>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  required,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}{required ? " *" : ""}</FieldLabel>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        {children}
      </select>
    </label>
  );
}
