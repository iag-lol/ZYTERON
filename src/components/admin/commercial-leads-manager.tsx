"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Filter,
  History,
  Loader2,
  Search,
  ShieldCheck,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PROGRESS, VALIDATION } from "@/components/commercial/commercial-portal-dashboard";

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

type AdminLead = {
  id: string;
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
  owner_name: string;
  owner_role: string;
  owner_email: string | null;
  activities_count: number;
  latest_activity: Activity | null;
};

type Detail = { lead: AdminLead; activities: Activity[] };

const ROLE_LABEL: Record<string, string> = {
  executive: "Ejecutivo",
  portfolio: "Gestor de cartera",
  partner: "Partner",
};

const ACTIVITY_LABEL: Record<string, string> = {
  call: "Llamada",
  whatsapp: "WhatsApp",
  email: "Correo",
  meeting: "Reunión",
  note: "Nota",
  evaluation: "Evaluación administrativa",
};

function formatDate(value: string | null, time = false) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

async function readJson(res: Response) {
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(String(data.error || "No se pudo completar la acción."));
  return data;
}

export function CommercialLeadsManager() {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await readJson(await fetch("/api/admin/comercial/leads", { cache: "no-store" }));
      setLeads((data.leads as AdminLead[]) ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los registros.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await readJson(await fetch(`/api/admin/comercial/leads/${id}`, { cache: "no-store" }));
      setDetail(data as unknown as Detail);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el registro.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [loadDetail, selectedId]);

  const owners = useMemo(
    () => Array.from(new Set(leads.map((lead) => lead.owner_name))).sort((a, b) => a.localeCompare(b, "es")),
    [leads],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return leads.filter((lead) => {
      const matchesState =
        filter === "all" || lead.validation_status === filter || lead.commercial_status === filter;
      const matchesOwner = ownerFilter === "all" || lead.owner_name === ownerFilter;
      const matchesSearch =
        !needle ||
        [lead.name, lead.contact_name, lead.email, lead.phone, lead.rut, lead.service, lead.owner_name]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("es").includes(needle));
      return matchesState && matchesOwner && matchesSearch;
    });
  }, [filter, leads, ownerFilter, query]);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }, []);

  const refresh = useCallback(
    async (message: string, id: string) => {
      await Promise.all([load(), loadDetail(id)]);
      flash(message);
    },
    [flash, load, loadDetail],
  );

  return (
    <div className="space-y-5">
      {notice && (
        <div className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-[13px] font-bold text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4" /> {notice}
        </div>
      )}
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">Registros y clientes potenciales</h2>
        <p className="text-[13px] text-slate-500">
          Revisa cada contacto informado y clasifícalo sin alterar la bitácora del ejecutivo.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <AdminMetric label="Total registros" value={leads.length} icon={Users} cls="bg-blue-50 text-blue-600" />
        <AdminMetric label="Por revisar" value={leads.filter((lead) => lead.validation_status === "pending").length} icon={CircleAlert} cls="bg-amber-50 text-amber-600" />
        <AdminMetric label="En revisión" value={leads.filter((lead) => lead.validation_status === "in_review").length} icon={Clock3} cls="bg-cyan-50 text-cyan-600" />
        <AdminMetric label="Potenciales" value={leads.filter((lead) => lead.validation_status === "potential").length} icon={Target} cls="bg-violet-50 text-violet-600" />
        <AdminMetric label="Aceptados" value={leads.filter((lead) => lead.validation_status === "accepted").length} icon={ShieldCheck} cls="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
          <label className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cliente, contacto, RUT, servicio o responsable…"
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="relative">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] outline-none"
            >
              <option value="all">Cualquier estado</option>
              <optgroup label="Evaluación">
                {Object.entries(VALIDATION)
                  .filter(([value]) => value !== "validated")
                  .map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
              </optgroup>
              <optgroup label="Avance comercial">
                {Object.entries(PROGRESS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
              </optgroup>
            </select>
          </label>
          <select
            value={ownerFilter}
            onChange={(event) => setOwnerFilter(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none"
          >
            <option value="all">Todos los responsables</option>
            {owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando registros…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Users className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-[13px] font-bold text-slate-600">No hay registros para mostrar</p>
            <p className="text-[12px] text-slate-400">Los contactos informados por partners y ejecutivos aparecerán aquí.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((lead) => (
              <AdminLeadRow key={lead.id} lead={lead} onOpen={() => setSelectedId(lead.id)} />
            ))}
          </div>
        )}
      </div>

      {selectedId && (
        <AdminLeadDetail
          detail={detail}
          loading={detailLoading}
          onClose={() => setSelectedId(null)}
          onSaved={(message) => refresh(message, selectedId)}
        />
      )}
    </div>
  );
}

function AdminMetric({ label, value, icon: Icon, cls }: { label: string; value: number; icon: typeof Users; cls: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", cls)}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-2 text-xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function AdminLeadRow({ lead, onOpen }: { lead: AdminLead; onOpen: () => void }) {
  const progress = PROGRESS[lead.commercial_status] ?? PROGRESS.registered;
  const validation = VALIDATION[lead.validation_status] ?? VALIDATION.pending;
  return (
    <button onClick={onOpen} className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:px-5">
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {lead.kind === "company" ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-bold text-slate-900">{lead.name}</span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-500">
            {lead.contact_name || "Sin persona de contacto"} · {lead.service || "Servicio no informado"}
          </span>
          <span className="mt-1 block text-[10px] font-semibold text-blue-600">
            {lead.owner_name} · {ROLE_LABEL[lead.owner_role] ?? lead.owner_role}
          </span>
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2 sm:justify-end">
        <span className="text-[10px] text-slate-400">{lead.activities_count} gestiones</span>
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold", progress.cls)}>{progress.label}</span>
        <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-bold ring-1", validation.cls)}>{validation.label}</span>
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </span>
    </button>
  );
}

function AdminLeadDetail({
  detail,
  loading,
  onClose,
  onSaved,
}: {
  detail: Detail | null;
  loading: boolean;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]">
      <button onClick={onClose} className="h-full flex-1 cursor-default" aria-label="Cerrar" />
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">Evaluación administrativa</p>
            <h2 className="text-[17px] font-extrabold text-slate-900">{detail?.lead.name ?? "Cargando…"}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </header>
        {loading || !detail ? (
          <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando ficha…
          </div>
        ) : (
          <div className="space-y-5 p-5">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Registrado por</p>
              <p className="mt-1 text-[13px] font-bold text-blue-950">{detail.lead.owner_name}</p>
              <p className="text-[11px] text-blue-700">{ROLE_LABEL[detail.lead.owner_role] ?? detail.lead.owner_role} · {detail.lead.owner_email || "Sin correo"}</p>
            </div>
            <LeadData lead={detail.lead} />
            <EvaluationForm lead={detail.lead} onSaved={onSaved} />
            <AdminTimeline activities={detail.activities} />
          </div>
        )}
      </aside>
    </div>
  );
}

function LeadData({ lead }: { lead: AdminLead }) {
  const rows = [
    ["Contacto", lead.contact_name],
    ["RUT", lead.rut],
    ["Correo", lead.email],
    ["Teléfono", lead.phone],
    ["Ubicación", [lead.comuna, lead.region].filter(Boolean).join(", ")],
    ["Rubro", lead.industry],
    ["Servicio", lead.service],
    ["Presupuesto", lead.budget],
    ["Plazo", lead.deadline],
    ["Interés observado", lead.interest],
    ["Origen", lead.source],
    ["Registrado", formatDate(lead.created_at, true)],
  ];
  return (
    <section>
      <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Antecedentes</h3>
      <dl className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
            <dd className="mt-0.5 break-words text-[12px] font-semibold text-slate-700">{value || "—"}</dd>
          </div>
        ))}
      </dl>
      {lead.description && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-100 p-3 text-[12px] leading-5 text-slate-600">{lead.description}</p>}
    </section>
  );
}

function EvaluationForm({ lead, onSaved }: { lead: AdminLead; onSaved: (message: string) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      await readJson(
        await fetch(`/api/admin/comercial/leads/${lead.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      await onSaved("Evaluación guardada y notificada en el portal.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar la evaluación.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
      <div>
        <h3 className="text-[13px] font-extrabold text-slate-900">Decisión de Zyteron</h3>
        <p className="text-[11px] text-slate-500">“Potencial” y “Aceptado” solo se asignan desde administración.</p>
      </div>
      <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="text-[11px] font-bold text-slate-600">Clasificación *</span>
          <select name="validationStatus" defaultValue={lead.validation_status === "validated" ? "accepted" : lead.validation_status} required className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-violet-400">
            <option value="pending">Pendiente de evaluación</option>
            <option value="in_review">En revisión</option>
            <option value="potential">Cliente potencial</option>
            <option value="accepted">Aceptado por Zyteron</option>
            <option value="rejected">No califica</option>
            <option value="duplicate">Duplicado</option>
          </select>
        </label>
        <label>
          <span className="text-[11px] font-bold text-slate-600">Etapa comercial</span>
          <select name="commercialStatus" defaultValue={lead.commercial_status} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-violet-400">
            {Object.entries(PROGRESS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2">
          <span className="text-[11px] font-bold text-slate-600">Observación para el partner / ejecutivo</span>
          <textarea
            name="adminNotes"
            defaultValue={lead.admin_notes ?? ""}
            maxLength={4000}
            rows={4}
            placeholder="Motivo de la clasificación, información faltante o instrucciones para continuar…"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
          />
        </label>
      </fieldset>
      {error && <p className="text-[12px] font-semibold text-rose-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-slate-400">Última evaluación: {formatDate(lead.validated_at, true)}</p>
        <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-[12px] font-bold text-white hover:bg-violet-700 disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Guardar evaluación
        </button>
      </div>
    </form>
  );
}

function AdminTimeline({ activities }: { activities: Activity[] }) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-slate-400" />
        <h3 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500">Bitácora completa</h3>
      </div>
      {activities.length === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-50 p-4 text-center text-[12px] text-slate-400">Sin gestiones informadas.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {activities.map((activity) => {
            const state =
              activity.actor_type === "admin"
                ? VALIDATION[activity.to_status ?? ""]
                : PROGRESS[activity.to_status ?? ""];
            return (
              <article key={activity.id} className="rounded-xl border border-slate-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold uppercase", activity.actor_type === "admin" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700")}>
                      {activity.actor_type === "admin" ? "Admin" : "Comercial"}
                    </span>
                    <p className="text-[12px] font-bold text-slate-800">{ACTIVITY_LABEL[activity.activity_type] ?? activity.activity_type}</p>
                  </div>
                  <time className="text-[10px] text-slate-400">{formatDate(activity.occurred_at, true)}</time>
                </div>
                {activity.outcome && <p className="mt-2 text-[11px] font-bold text-slate-600">{activity.outcome}</p>}
                <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-slate-500">{activity.notes}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {state && <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-bold", state.cls)}>{state.label}</span>}
                  {activity.next_follow_up_at && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                      <CalendarClock className="h-3 w-3" /> Seguimiento {formatDate(activity.next_follow_up_at, true)}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
