"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Columns3,
  Edit3,
  FileText,
  Filter,
  History,
  LayoutList,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  ACTIVITY_INFO,
  PROGRESS_INFO,
  VALIDATION_INFO,
} from "@/config/commercial";
import { formatDate, localDateTimeValue, readJson, relativeTime } from "@/lib/commercial/format";
import {
  DataItem,
  EmptyState,
  ErrorNote,
  GhostButton,
  InputField,
  Panel,
  Pill,
  PrimaryButton,
  SectionTitle,
  SelectField,
  TextareaField,
  Toast,
} from "@/components/commercial/ui";
import { cn } from "@/lib/utils";

/**
 * Cartera del ejecutivo: registro de contactos, seguimiento por etapas y
 * bitácora de cada gestión. Todo lo que se informa aquí queda visible para
 * administración con fecha, canal y responsable.
 */

export type Lead = {
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

const BOARD_COLUMNS = [
  "registered",
  "contacted",
  "follow_up",
  "meeting_scheduled",
  "proposal_sent",
  "negotiation",
  "won",
] as const;

export function CommercialPortfolio({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"list" | "board">("list");
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
        [lead.name, lead.contact_name, lead.email, lead.phone, lead.rut, lead.service, lead.comuna]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("es").includes(needle));
      return matchesStatus && matchesQuery;
    });
  }, [leads, query, statusFilter]);

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
      {notice && <Toast message={notice} />}

      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Mi cartera</h1>
          <p className="text-[12.5px] text-slate-500">
            Registra a toda persona o empresa que contactes e informa cada avance. Zyteron evalúa cuáles
            califican como oportunidad.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1">
            <button
              onClick={() => setView("list")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-colors",
                view === "list" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50",
              )}
            >
              <LayoutList className="h-3.5 w-3.5" /> Lista
            </button>
            <button
              onClick={() => setView("board")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-colors",
                view === "board" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-50",
              )}
            >
              <Columns3 className="h-3.5 w-3.5" /> Embudo
            </button>
          </div>
          <PrimaryButton onClick={() => setLeadForm("new")}>
            <Plus className="h-4 w-4" /> Registrar contacto
          </PrimaryButton>
        </div>
      </div>

      <Panel padded>
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por cliente, contacto, correo, teléfono, RUT o servicio…"
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="relative lg:w-72">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-[13px] outline-none focus:border-blue-400"
            >
              <option value="all">Todos los estados</option>
              <optgroup label="Avance que informaste">
                {Object.entries(PROGRESS_INFO).map(([value, item]) => (
                  <option key={value} value={value}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Evaluación de Zyteron">
                {Object.entries(VALIDATION_INFO)
                  .filter(([value]) => value !== "validated")
                  .map(([value, item]) => (
                    <option key={value} value={value}>
                      {item.label}
                    </option>
                  ))}
              </optgroup>
            </select>
          </label>
          <GhostButton onClick={() => void loadLeads()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Actualizar
          </GhostButton>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          {filtered.length} de {leads.length} contacto{leads.length === 1 ? "" : "s"} en tu cartera.
        </p>
      </Panel>

      {error && <ErrorNote>{error}</ErrorNote>}

      {view === "list" ? (
        <Panel padded={false}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={leads.length ? "No hay resultados para este filtro" : "Aún no registras contactos"}
              text={
                leads.length
                  ? "Prueba con otro término o cambia el estado seleccionado."
                  : "Registra a la primera persona o empresa contactada; el registro es lo que respalda tu comisión."
              }
              action={
                !leads.length ? (
                  <PrimaryButton onClick={() => setLeadForm("new")}>
                    <Plus className="h-4 w-4" /> Registrar contacto
                  </PrimaryButton>
                ) : undefined
              }
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((lead) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  renderedAt={renderedAt}
                  onOpen={() => setSelectedId(lead.id)}
                />
              ))}
            </div>
          )}
        </Panel>
      ) : (
        <BoardView leads={filtered} onOpen={setSelectedId} />
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

function LeadRow({ lead, renderedAt, onOpen }: { lead: Lead; renderedAt: number; onOpen: () => void }) {
  const progress = PROGRESS_INFO[lead.commercial_status] ?? PROGRESS_INFO.registered;
  const validation = VALIDATION_INFO[lead.validation_status] ?? VALIDATION_INFO.pending;
  const overdue =
    lead.next_follow_up_at &&
    new Date(lead.next_follow_up_at).getTime() <= renderedAt &&
    !["won", "lost"].includes(lead.commercial_status);

  return (
    <button
      onClick={onOpen}
      className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:px-5"
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
          {lead.kind === "company" ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-bold text-slate-900">{lead.name}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
            {lead.contact_name && <span className="truncate">{lead.contact_name}</span>}
            {lead.service && <span className="truncate">{lead.service}</span>}
            {lead.comuna && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {lead.comuna}
              </span>
            )}
            <span>Registrado {formatDate(lead.created_at)}</span>
          </span>
        </span>
      </span>
      <span className="flex flex-wrap items-center gap-2 sm:justify-end">
        {lead.next_follow_up_at && (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10.5px] font-bold",
              overdue ? "text-rose-600" : "text-slate-500",
            )}
          >
            <Clock3 className="h-3.5 w-3.5" />
            {overdue ? "Vencido " : "Próximo "}
            {relativeTime(lead.next_follow_up_at)}
          </span>
        )}
        <Pill label={progress.label} cls={progress.cls} />
        <Pill label={validation.label} cls={validation.cls} />
        <ChevronRight className="h-4 w-4 text-slate-300" />
      </span>
    </button>
  );
}

function BoardView({ leads, onOpen }: { leads: Lead[]; onOpen: (id: string) => void }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3">
        {BOARD_COLUMNS.map((status) => {
          const info = PROGRESS_INFO[status];
          const items = leads.filter((lead) => lead.commercial_status === status);
          return (
            <div key={status} className="w-64 shrink-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between">
                <p className="text-[11.5px] font-extrabold text-slate-700">{info.label}</p>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
                  {items.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[10.5px] text-slate-400">
                    Sin contactos
                  </p>
                ) : (
                  items.map((lead) => {
                    const validation = VALIDATION_INFO[lead.validation_status] ?? VALIDATION_INFO.pending;
                    return (
                      <button
                        key={lead.id}
                        onClick={() => onOpen(lead.id)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md"
                      >
                        <p className="truncate text-[12.5px] font-bold text-slate-900">{lead.name}</p>
                        {lead.service && (
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">{lead.service}</p>
                        )}
                        <Pill label={validation.label} cls={validation.cls} className="mt-2" />
                        {lead.next_follow_up_at && (
                          <p className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                            <CalendarClock className="h-3 w-3" /> {relativeTime(lead.next_follow_up_at)}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-5">
      <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-[16px] font-extrabold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11.5px] text-slate-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
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
  const initial = lead
    ? Object.fromEntries(Object.keys(EMPTY_LEAD).map((key) => [key, String(lead[key as keyof Lead] ?? "")]))
    : EMPTY_LEAD;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
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
      subtitle="Mientras más completa sea la ficha, más rápido puede evaluarla Zyteron."
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
              <InputField label="RUT" name="rut" defaultValue={initial.rut} placeholder="12.345.678-9" />
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
              <InputField
                label="Origen del contacto"
                name="source"
                defaultValue={initial.source}
                placeholder="Referido, evento, llamada en frío…"
              />
            </div>
          </section>

          <section>
            <SectionTitle>Necesidad comercial</SectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InputField
                label="Servicio de interés"
                name="service"
                defaultValue={initial.service}
                placeholder="Sitio web, sistema, soporte TI…"
              />
              <InputField label="Presupuesto estimado" name="budget" defaultValue={initial.budget} placeholder="$ o rango" />
              <InputField label="Plazo esperado" name="deadline" defaultValue={initial.deadline} placeholder="Este mes, 60 días…" />
              <SelectField label="Interés observado" name="interest" defaultValue={initial.interest}>
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
              </SelectField>
              <TextareaField
                label="Descripción de la necesidad"
                name="description"
                defaultValue={initial.description}
                maxLength={4000}
                rows={4}
                className="sm:col-span-2 lg:col-span-3"
                placeholder="Qué necesita, quién decide, contexto del contacto y cualquier antecedente útil…"
              />
            </div>
          </section>
        </fieldset>
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton loading={saving}>
            {!saving && <CheckCircle2 className="h-4 w-4" />}
            {lead ? "Guardar cambios" : "Registrar contacto"}
          </PrimaryButton>
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
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/40 backdrop-blur-[1px]">
      <button className="h-full flex-1 cursor-default" onClick={onClose} aria-label="Cerrar detalle" />
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-blue-600">Ficha del contacto</p>
            <h2 className="truncate text-[16px] font-extrabold text-slate-900">{detail?.lead.name ?? "Cargando…"}</h2>
          </div>
          <div className="flex gap-1">
            {detail && (
              <button
                onClick={onEdit}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                title="Editar datos"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

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
              <PrimaryButton onClick={() => setShowProgress(true)} className="w-full py-3">
                <Plus className="h-4 w-4" /> Informar nuevo avance
              </PrimaryButton>
            )}
            <ActivityTimeline activities={detail.activities} />
          </div>
        )}
      </aside>
    </div>
  );
}

function LeadSummary({ lead }: { lead: Lead }) {
  const progress = PROGRESS_INFO[lead.commercial_status] ?? PROGRESS_INFO.registered;
  const validation = VALIDATION_INFO[lead.validation_status] ?? VALIDATION_INFO.pending;
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Pill label={progress.label} cls={progress.cls} />
        <Pill label={validation.label} cls={validation.cls} />
      </div>
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11.5px] leading-5 text-slate-500">
        {validation.description}
      </p>

      {lead.admin_notes && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Observación de Zyteron</p>
          <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-5 text-blue-900">{lead.admin_notes}</p>
          {lead.validated_at && (
            <p className="mt-2 text-[10.5px] text-blue-500">Evaluado {formatDate(lead.validated_at, true)}</p>
          )}
        </div>
      )}

      <dl className="grid gap-x-4 gap-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
        <DataItem label="Contacto" value={lead.contact_name} />
        <DataItem label="RUT" value={lead.rut} mono />
        <DataItem label="Correo" value={lead.email} />
        <DataItem label="Teléfono" value={lead.phone} />
        <DataItem label="Ubicación" value={[lead.comuna, lead.region].filter(Boolean).join(", ")} />
        <DataItem label="Rubro" value={lead.industry} />
        <DataItem label="Servicio" value={lead.service} />
        <DataItem label="Presupuesto" value={lead.budget} />
        <DataItem label="Plazo" value={lead.deadline} />
        <DataItem label="Origen" value={lead.source} />
        <DataItem label="Último contacto" value={formatDate(lead.last_contact_at, true)} />
        <DataItem label="Próximo seguimiento" value={formatDate(lead.next_follow_up_at, true)} />
      </dl>

      {lead.description && (
        <div>
          <SectionTitle>Necesidad informada</SectionTitle>
          <p className="mt-2 whitespace-pre-wrap text-[12.5px] leading-6 text-slate-600">{lead.description}</p>
        </div>
      )}
    </>
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
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
      <div>
        <h3 className="text-[13px] font-extrabold text-slate-900">Nuevo avance de contacto</h3>
        <p className="text-[11px] text-slate-500">
          Queda con fecha y responsable en la bitácora, visible para ti y para administración.
        </p>
      </div>
      <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
        <SelectField label="Canal utilizado" name="activityType" defaultValue="call" required>
          <option value="call">Llamada</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="email">Correo</option>
          <option value="meeting">Reunión</option>
          <option value="note">Nota / gestión interna</option>
        </SelectField>
        <SelectField
          label="Etapa después de esta gestión"
          name="progressStatus"
          defaultValue={lead.commercial_status}
          required
        >
          {Object.entries(PROGRESS_INFO).map(([value, item]) => (
            <option key={value} value={value}>
              {item.label}
            </option>
          ))}
        </SelectField>
        <InputField label="Resultado breve" name="outcome" placeholder="Respondió, solicita reunión…" />
        <InputField
          label="Fecha de la gestión"
          name="occurredAt"
          type="datetime-local"
          defaultValue={localDateTimeValue()}
          required
        />
        <InputField
          label="Próximo seguimiento"
          name="nextFollowUpAt"
          type="datetime-local"
          hint="Comprometer una fecha evita que el contacto se enfríe."
        />
        <TextareaField
          label="Detalle del avance"
          name="notes"
          minLength={3}
          maxLength={4000}
          required
          rows={4}
          className="sm:col-span-2"
          placeholder="Qué conversaron, qué pidió el cliente y cuál es el próximo paso…"
        />
      </fieldset>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex justify-end gap-2">
        <GhostButton type="button" onClick={onCancel}>
          Cancelar
        </GhostButton>
        <PrimaryButton loading={saving}>
          {!saving && <ArrowRight className="h-4 w-4" />} Guardar avance
        </PrimaryButton>
      </div>
    </form>
  );
}

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  return (
    <section>
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-slate-400" />
        <SectionTitle>Bitácora de gestiones</SectionTitle>
      </div>
      {activities.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-[12px] text-slate-400">
          Todavía no se han informado avances para este contacto.
        </p>
      ) : (
        <div className="mt-4">
          {activities.map((activity, index) => {
            const state =
              activity.actor_type === "admin"
                ? VALIDATION_INFO[activity.to_status ?? ""]
                : PROGRESS_INFO[activity.to_status ?? ""];
            return (
              <div key={activity.id} className="relative flex gap-3 pb-5">
                {index < activities.length - 1 && (
                  <span className="absolute left-[15px] top-8 h-full w-px bg-slate-200" />
                )}
                <span
                  className={cn(
                    "z-[1] flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    activity.actor_type === "admin" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700",
                  )}
                >
                  {activity.actor_type === "admin" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <ActivityIcon type={activity.activity_type} />
                  )}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-[12px] font-bold text-slate-800">
                      {ACTIVITY_INFO[activity.activity_type]?.label ?? activity.activity_type}
                    </p>
                    <time className="text-[10px] text-slate-400" title={formatDate(activity.occurred_at, true)}>
                      {formatDate(activity.occurred_at, true)}
                    </time>
                  </div>
                  {activity.outcome && (
                    <p className="mt-0.5 text-[11.5px] font-bold text-slate-600">{activity.outcome}</p>
                  )}
                  <p className="mt-1 whitespace-pre-wrap text-[12px] leading-5 text-slate-500">{activity.notes}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {state && <Pill label={state.label} cls={state.cls} />}
                    {activity.next_follow_up_at && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                        <CalendarClock className="h-3 w-3" /> Próximo:{" "}
                        {formatDate(activity.next_follow_up_at, true)}
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
