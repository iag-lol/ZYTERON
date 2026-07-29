"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  Briefcase,
  Building2,
  Copy,
  History,
  IdCard,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  COMMISSION_STATUS_INFO,
  PROGRESS_INFO,
  ROLE_INFO,
  STATEMENT_STATUS_INFO,
  USER_STATUS_INFO,
  VALIDATION_INFO,
  formatCLP,
  formatPeriod,
} from "@/config/commercial";
import { formatDate, formatDay, initials, maskAccount, readJson, relativeTime } from "@/lib/commercial/format";
import {
  BarRow,
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
  StatCard,
  TextareaField,
  Toast,
} from "@/components/commercial/ui";
import { cn } from "@/lib/utils";

/**
 * Gestión del equipo comercial: alta de accesos, ficha 360 de cada ejecutivo
 * (datos personales, bancarios, metas, desempeño, cartera, finanzas y
 * bitácora) y acciones administrativas con trazabilidad.
 */

type CommercialUser = {
  id: string;
  rut: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  commission_pct: number;
  must_change_password: boolean;
  notes: string | null;
  internal_notes: string | null;
  last_login_at: string | null;
  created_at: string;
  position: string | null;
  contract_type: string | null;
  started_at: string | null;
  birth_date: string | null;
  address: string | null;
  comuna: string | null;
  region: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  bank_name: string | null;
  bank_account_type: string | null;
  bank_account_number: string | null;
  bank_account_holder: string | null;
  bank_account_rut: string | null;
  payment_email: string | null;
  goal_monthly_leads: number;
  goal_monthly_won: number;
  goal_monthly_amount: number;
};

type Snapshot = {
  totalLeads: number;
  monthLeads: number;
  activeLeads: number;
  potentialLeads: number;
  acceptedLeads: number;
  wonLeads: number;
  lostLeads: number;
  pendingEvaluation: number;
  overdueFollowUps: number;
  staleLeads: number;
  activities30d: number;
  lastActivityAt: string | null;
  conversionRate: number;
  acceptanceRate: number;
  funnel: Array<{ status: string; count: number }>;
};

type Lead = {
  id: string;
  name: string;
  service: string | null;
  commercial_status: string;
  validation_status: string;
  next_follow_up_at: string | null;
  last_contact_at: string | null;
  created_at: string;
};

type ActivityRow = {
  id: string;
  activity_type: string;
  actor_type: string;
  outcome: string | null;
  notes: string;
  occurred_at: string;
};

type CommissionRow = {
  id: string;
  client_name: string | null;
  concept: string | null;
  period: string | null;
  base_amount: number;
  percentage: number;
  gross_amount: number;
  status: string;
};

type StatementRow = {
  id: string;
  period: string;
  gross_total: number;
  retention: number;
  net_total: number;
  status: string;
  paid_at: string | null;
};

type AuditRow = {
  id: string;
  actor_type: string;
  summary: string;
  created_at: string;
};

type MemberDetail = {
  user: CommercialUser;
  snapshot: Snapshot;
  leads: Lead[];
  activities: ActivityRow[];
  commissions: CommissionRow[];
  statements: StatementRow[];
  audit: AuditRow[];
};

const EMPTY_FORM = {
  name: "",
  rut: "",
  email: "",
  phone: "",
  role: "partner",
  position: "",
  contractType: "honorarios",
  startedAt: "",
  commissionPct: "",
  goalMonthlyLeads: "",
  goalMonthlyWon: "",
  password: "",
};

export function CommercialUsersManager({
  embedded = false,
  openMemberId,
  onMemberOpened,
}: {
  embedded?: boolean;
  openMemberId?: string | null;
  onMemberOpened?: () => void;
}) {
  const [users, setUsers] = useState<CommercialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await readJson(await fetch("/api/admin/comercial/users", { cache: "no-store" }));
      setUsers((data.users as CommercialUser[]) ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (openMemberId) {
      setSelectedId(openMemberId);
      onMemberOpened?.();
    }
  }, [onMemberOpened, openMemberId]);

  const flash = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3500);
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    return users.filter((user) => {
      const matchesRole = roleFilter === "all" || user.role === roleFilter || user.status === roleFilter;
      const matchesQuery =
        !needle ||
        [user.name, user.rut, user.email, user.position]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("es").includes(needle));
      return matchesRole && matchesQuery;
    });
  }, [query, roleFilter, users]);

  const activeCount = users.filter((user) => user.status === "active").length;
  const missingBank = users.filter((user) => !user.bank_name || !user.bank_account_number).length;

  return (
    <div className="space-y-5">
      {notice && <Toast message={notice} />}

      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className={cn("font-extrabold text-slate-900", embedded ? "text-lg" : "text-xl")}>
            Equipo comercial
          </h2>
          <p className="text-[12.5px] text-slate-500">
            Accesos por RUT y contraseña, ficha completa de cada ejecutivo y trazabilidad de toda acción
            administrativa.
          </p>
        </div>
        <PrimaryButton onClick={() => setShowForm(true)}>
          <UserPlus className="h-4 w-4" /> Nuevo usuario
        </PrimaryButton>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Usuarios totales" value={users.length} icon={<Users className="h-4 w-4" />} tone="blue" />
        <StatCard label="Activos" value={activeCount} icon={<ShieldCheck className="h-4 w-4" />} tone="emerald" />
        <StatCard
          label="Partners"
          value={users.filter((user) => user.role === "partner").length}
          icon={<Briefcase className="h-4 w-4" />}
          tone="violet"
        />
        <StatCard
          label="Sin datos bancarios"
          value={missingBank}
          icon={<Banknote className="h-4 w-4" />}
          tone={missingBank > 0 ? "amber" : "slate"}
          hint="No se les puede liquidar"
        />
      </div>

      <Panel padded>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, RUT, correo o cargo…"
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-[13px] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[13px] outline-none sm:w-56"
          >
            <option value="all">Todos los roles y estados</option>
            <optgroup label="Rol">
              {Object.entries(ROLE_INFO).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Estado">
              {Object.entries(USER_STATUS_INFO).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </Panel>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Panel padded={false}>
        {loading ? (
          <EmptyState icon={<Loader2 className="h-4 w-4" />} title="Cargando equipo…" spin />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-4 w-4" />}
            title={users.length ? "Sin resultados" : "Aún no hay usuarios comerciales"}
            text={
              users.length
                ? "Prueba con otro término o filtro."
                : "Crea el primer ejecutivo o partner para que comience a registrar contactos."
            }
            action={
              !users.length ? (
                <PrimaryButton onClick={() => setShowForm(true)}>
                  <UserPlus className="h-4 w-4" /> Crear usuario
                </PrimaryButton>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((user) => {
              const role = ROLE_INFO[user.role];
              const status = USER_STATUS_INFO[user.status] ?? USER_STATUS_INFO.invited;
              return (
                <div
                  key={user.id}
                  className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:px-5"
                >
                  <button
                    onClick={() => setSelectedId(user.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[13px] font-extrabold text-white">
                      {initials(user.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-bold text-slate-900">{user.name}</span>
                      <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                        <span className="font-mono">{user.rut}</span>
                        {user.position && <span className="truncate">{user.position}</span>}
                        {user.email && <span className="truncate">{user.email}</span>}
                        <span>Últ. acceso {user.last_login_at ? relativeTime(user.last_login_at) : "nunca"}</span>
                      </span>
                    </span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <Pill label={role?.short ?? user.role} cls={role?.cls} />
                    {user.commission_pct > 0 && (
                      <Pill label={`${user.commission_pct}%`} cls="bg-blue-50 text-blue-700 ring-blue-200" />
                    )}
                    <Pill label={status.label} cls={status.cls} />
                    <button
                      onClick={() => navigator.clipboard?.writeText(user.rut).catch(() => {})}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Copiar RUT"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <GhostButton onClick={() => setSelectedId(user.id)} className="px-3 py-1.5 text-[11.5px]">
                      Ver ficha
                    </GhostButton>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {showForm && (
        <CreateUserModal
          onClose={() => setShowForm(false)}
          onCreated={async (message) => {
            setShowForm(false);
            await load();
            flash(message);
          }}
        />
      )}

      {selectedId && (
        <MemberDrawer
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={async (message) => {
            await load();
            flash(message);
          }}
          onDeleted={async (message) => {
            setSelectedId(null);
            await load();
            flash(message);
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (message: string) => Promise<void>;
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await readJson(
        await fetch("/api/admin/comercial/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rut: form.rut,
            name: form.name,
            email: form.email || undefined,
            phone: form.phone || undefined,
            role: form.role,
            password: form.password,
            position: form.position || undefined,
            contractType: form.contractType || undefined,
            startedAt: form.startedAt || undefined,
            commissionPct: form.commissionPct ? Number(form.commissionPct) : undefined,
            goalMonthlyLeads: form.goalMonthlyLeads ? Number(form.goalMonthlyLeads) : undefined,
            goalMonthlyWon: form.goalMonthlyWon ? Number(form.goalMonthlyWon) : undefined,
          }),
        }),
      );
      await onCreated("Usuario comercial creado. Entrégale su contraseña inicial de forma segura.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo crear el usuario.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-sm sm:items-center sm:p-5">
      <form
        onSubmit={submit}
        className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-[16px] font-extrabold text-slate-900">Crear usuario comercial</h2>
            <p className="text-[11.5px] text-slate-500">
              El acceso es por RUT y contraseña. Deberá cambiarla al primer ingreso.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </header>

        <fieldset disabled={saving} className="space-y-5 p-5">
          <section>
            <SectionTitle>Identificación</SectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <InputField
                label="Nombre completo"
                required
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
              />
              <InputField
                label="RUT"
                required
                placeholder="12.345.678-9"
                value={form.rut}
                onChange={(event) => set("rut", event.target.value)}
              />
              <InputField
                label="Correo"
                type="email"
                value={form.email}
                onChange={(event) => set("email", event.target.value)}
              />
              <InputField
                label="Teléfono"
                value={form.phone}
                onChange={(event) => set("phone", event.target.value)}
              />
            </div>
          </section>

          <section>
            <SectionTitle>Rol y condiciones</SectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <SelectField label="Rol" value={form.role} onChange={(event) => set("role", event.target.value)}>
                {Object.entries(ROLE_INFO).map(([value, info]) => (
                  <option key={value} value={value}>
                    {info.label}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Tipo de vínculo"
                value={form.contractType}
                onChange={(event) => set("contractType", event.target.value)}
              >
                <option value="honorarios">Honorarios</option>
                <option value="colaborador">Colaborador</option>
                <option value="partner">Partner externo</option>
              </SelectField>
              <InputField
                label="Cargo"
                placeholder="Ejecutivo comercial senior…"
                value={form.position}
                onChange={(event) => set("position", event.target.value)}
              />
              <InputField
                label="Fecha de inicio"
                type="date"
                value={form.startedAt}
                onChange={(event) => set("startedAt", event.target.value)}
              />
              <InputField
                label="% de comisión"
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={form.commissionPct}
                onChange={(event) => set("commissionPct", event.target.value)}
              />
              <InputField
                label="Contraseña inicial"
                required
                placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={(event) => set("password", event.target.value)}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              {ROLE_INFO[form.role]?.description}
            </p>
          </section>

          <section>
            <SectionTitle>Metas mensuales (opcional)</SectionTitle>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <InputField
                label="Registros por mes"
                type="number"
                min={0}
                value={form.goalMonthlyLeads}
                onChange={(event) => set("goalMonthlyLeads", event.target.value)}
              />
              <InputField
                label="Cierres por mes"
                type="number"
                min={0}
                value={form.goalMonthlyWon}
                onChange={(event) => set("goalMonthlyWon", event.target.value)}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Las metas se muestran como avance en el panel del ejecutivo y en el desempeño del equipo.
            </p>
          </section>

          {error && <ErrorNote>{error}</ErrorNote>}
        </fieldset>

        <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton loading={saving}>
            {!saving && <UserPlus className="h-4 w-4" />} Crear usuario
          </PrimaryButton>
        </footer>
      </form>
    </div>
  );
}

const DRAWER_TABS = [
  { id: "ficha", label: "Ficha", icon: IdCard },
  { id: "desempeno", label: "Desempeño", icon: TrendingUp },
  { id: "cartera", label: "Cartera", icon: Building2 },
  { id: "finanzas", label: "Finanzas", icon: Wallet },
  { id: "bitacora", label: "Bitácora", icon: History },
] as const;

function MemberDrawer({
  id,
  onClose,
  onChanged,
  onDeleted,
}: {
  id: string;
  onClose: () => void;
  onChanged: (message: string) => Promise<void>;
  onDeleted: (message: string) => Promise<void>;
}) {
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<(typeof DRAWER_TABS)[number]["id"]>("ficha");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await readJson(await fetch(`/api/admin/comercial/users/${id}`, { cache: "no-store" }));
      setDetail(data as unknown as MemberDetail);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar la ficha.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = useCallback(
    async (body: Record<string, unknown>, message: string) => {
      setSaving(true);
      setError("");
      try {
        await readJson(
          await fetch(`/api/admin/comercial/users/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
        );
        await load();
        await onChanged(message);
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [id, load, onChanged],
  );

  async function resetPassword() {
    const password = window.prompt("Nueva contraseña provisoria (mínimo 6 caracteres):");
    if (!password) return;
    if (password.length < 6) {
      window.alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (await patch({ newPassword: password }, "Contraseña restablecida y notificada al ejecutivo.")) {
      window.alert("Contraseña actualizada. Entrégala por un canal seguro.");
    }
  }

  async function removeUser() {
    if (!detail) return;
    if (!window.confirm(`¿Eliminar de forma permanente el acceso de ${detail.user.name}?`)) return;
    setSaving(true);
    try {
      await readJson(await fetch(`/api/admin/comercial/users/${id}`, { method: "DELETE" }));
      await onDeleted("Usuario comercial eliminado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo eliminar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]">
      <button onClick={onClose} className="h-full flex-1 cursor-default" aria-label="Cerrar" />
      <aside className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
        <header className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[15px] font-extrabold text-white">
                {detail ? initials(detail.user.name) : "…"}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-[17px] font-extrabold text-slate-900">
                  {detail?.user.name ?? "Cargando…"}
                </h2>
                <p className="truncate text-[11.5px] text-slate-500">
                  {detail
                    ? `${detail.user.rut} · ${ROLE_INFO[detail.user.role]?.label ?? detail.user.role} · ${detail.user.commission_pct}% comisión`
                    : ""}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex gap-1 overflow-x-auto">
            {DRAWER_TABS.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-colors",
                  tab === item.id ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100",
                )}
              >
                <item.icon className="h-3.5 w-3.5" /> {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && !detail ? (
            <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" /> Cargando ficha…
            </div>
          ) : !detail ? (
            <ErrorNote>{error || "No se pudo cargar la ficha."}</ErrorNote>
          ) : (
            <div className="space-y-5">
              {error && <ErrorNote>{error}</ErrorNote>}
              {tab === "ficha" && (
                <MemberSheet
                  detail={detail}
                  saving={saving}
                  onPatch={patch}
                  onResetPassword={resetPassword}
                  onDelete={removeUser}
                />
              )}
              {tab === "desempeno" && <MemberPerformance detail={detail} />}
              {tab === "cartera" && <MemberPortfolio detail={detail} />}
              {tab === "finanzas" && <MemberFinance detail={detail} />}
              {tab === "bitacora" && <MemberAudit detail={detail} />}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function MemberSheet({
  detail,
  saving,
  onPatch,
  onResetPassword,
  onDelete,
}: {
  detail: MemberDetail;
  saving: boolean;
  onPatch: (body: Record<string, unknown>, message: string) => Promise<boolean>;
  onResetPassword: () => void;
  onDelete: () => void;
}) {
  const { user } = detail;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const raw = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, string>;
    await onPatch(
      {
        ...raw,
        commission_pct: Number(raw.commission_pct) || 0,
        goal_monthly_leads: Number(raw.goal_monthly_leads) || 0,
        goal_monthly_won: Number(raw.goal_monthly_won) || 0,
        goal_monthly_amount: Number(raw.goal_monthly_amount) || 0,
      },
      "Ficha del ejecutivo actualizada.",
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Pill label={USER_STATUS_INFO[user.status]?.label ?? user.status} cls={USER_STATUS_INFO[user.status]?.cls} />
        <Pill label={ROLE_INFO[user.role]?.label ?? user.role} cls={ROLE_INFO[user.role]?.cls} />
        {user.must_change_password && (
          <Pill label="Contraseña inicial pendiente" cls="bg-amber-50 text-amber-700 ring-amber-200" />
        )}
        <span className="text-[11px] text-slate-400">
          Creado {formatDate(user.created_at)} · Últ. acceso{" "}
          {user.last_login_at ? formatDate(user.last_login_at, true) : "nunca"}
        </span>
      </div>

      <fieldset disabled={saving} className="space-y-5">
        <section>
          <SectionTitle>Identificación y vínculo</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InputField label="Nombre" name="name" defaultValue={user.name} required />
            <InputField label="Cargo" name="position" defaultValue={user.position ?? ""} />
            <SelectField label="Rol" name="role" defaultValue={user.role}>
              {Object.entries(ROLE_INFO).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </SelectField>
            <SelectField label="Estado" name="status" defaultValue={user.status}>
              {Object.entries(USER_STATUS_INFO).map(([value, info]) => (
                <option key={value} value={value}>
                  {info.label}
                </option>
              ))}
            </SelectField>
            <SelectField label="Tipo de vínculo" name="contract_type" defaultValue={user.contract_type ?? ""}>
              <option value="">Sin definir</option>
              <option value="honorarios">Honorarios</option>
              <option value="colaborador">Colaborador</option>
              <option value="partner">Partner externo</option>
            </SelectField>
            <InputField
              label="Fecha de inicio"
              name="started_at"
              type="date"
              defaultValue={user.started_at?.slice(0, 10) ?? ""}
            />
            <InputField
              label="% de comisión"
              name="commission_pct"
              type="number"
              min={0}
              max={100}
              step="0.5"
              defaultValue={String(user.commission_pct ?? 0)}
            />
          </div>
        </section>

        <section>
          <SectionTitle>Contacto y datos personales</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InputField label="Correo" name="email" type="email" defaultValue={user.email ?? ""} />
            <InputField label="Teléfono" name="phone" defaultValue={user.phone ?? ""} />
            <InputField
              label="Fecha de nacimiento"
              name="birth_date"
              type="date"
              defaultValue={user.birth_date?.slice(0, 10) ?? ""}
            />
            <InputField label="Región" name="region" defaultValue={user.region ?? ""} />
            <InputField label="Comuna" name="comuna" defaultValue={user.comuna ?? ""} />
            <InputField label="Dirección" name="address" defaultValue={user.address ?? ""} />
            <InputField
              label="Contacto de emergencia"
              name="emergency_contact_name"
              defaultValue={user.emergency_contact_name ?? ""}
            />
            <InputField
              label="Teléfono de emergencia"
              name="emergency_contact_phone"
              defaultValue={user.emergency_contact_phone ?? ""}
            />
          </div>
        </section>

        <section>
          <SectionTitle>Datos bancarios para liquidaciones</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <InputField label="Banco" name="bank_name" defaultValue={user.bank_name ?? ""} />
            <SelectField label="Tipo de cuenta" name="bank_account_type" defaultValue={user.bank_account_type ?? ""}>
              <option value="">Sin definir</option>
              <option value="corriente">Cuenta corriente</option>
              <option value="vista">Cuenta vista</option>
              <option value="ahorro">Cuenta de ahorro</option>
              <option value="rut">Cuenta RUT</option>
            </SelectField>
            <InputField
              label="Número de cuenta"
              name="bank_account_number"
              defaultValue={user.bank_account_number ?? ""}
            />
            <InputField
              label="Titular"
              name="bank_account_holder"
              defaultValue={user.bank_account_holder ?? ""}
            />
            <InputField label="RUT del titular" name="bank_account_rut" defaultValue={user.bank_account_rut ?? ""} />
            <InputField
              label="Correo para liquidaciones"
              name="payment_email"
              type="email"
              defaultValue={user.payment_email ?? ""}
            />
          </div>
          {(!user.bank_name || !user.bank_account_number) && (
            <p className="mt-2 text-[11px] font-bold text-rose-600">
              Faltan datos bancarios: no es posible emitir su liquidación.
            </p>
          )}
        </section>

        <section>
          <SectionTitle>Metas mensuales</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <InputField
              label="Registros"
              name="goal_monthly_leads"
              type="number"
              min={0}
              defaultValue={String(user.goal_monthly_leads ?? 0)}
            />
            <InputField
              label="Cierres"
              name="goal_monthly_won"
              type="number"
              min={0}
              defaultValue={String(user.goal_monthly_won ?? 0)}
            />
            <InputField
              label="Venta (CLP neto)"
              name="goal_monthly_amount"
              type="number"
              min={0}
              defaultValue={String(user.goal_monthly_amount ?? 0)}
            />
          </div>
        </section>

        <section>
          <SectionTitle>Observaciones</SectionTitle>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <TextareaField
              label="Nota visible en la ficha"
              name="notes"
              rows={3}
              defaultValue={user.notes ?? ""}
              maxLength={2000}
            />
            <TextareaField
              label="Nota interna (solo administración)"
              name="internal_notes"
              rows={3}
              defaultValue={user.internal_notes ?? ""}
              maxLength={4000}
            />
          </div>
        </section>
      </fieldset>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap gap-2">
          <GhostButton type="button" onClick={onResetPassword} disabled={saving}>
            <KeyRound className="h-4 w-4" /> Restablecer contraseña
          </GhostButton>
          <GhostButton
            type="button"
            onClick={onDelete}
            disabled={saving}
            className="border-rose-200 text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" /> Eliminar acceso
          </GhostButton>
        </div>
        <PrimaryButton loading={saving}>Guardar ficha</PrimaryButton>
      </div>
    </form>
  );
}

function MemberPerformance({ detail }: { detail: MemberDetail }) {
  const { snapshot, user } = detail;
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cartera total"
          value={snapshot.totalLeads}
          icon={<Building2 className="h-4 w-4" />}
          tone="blue"
          hint={`${snapshot.monthLeads} este mes`}
          progress={user.goal_monthly_leads > 0 ? { current: snapshot.monthLeads, goal: user.goal_monthly_leads } : undefined}
        />
        <StatCard label="En gestión" value={snapshot.activeLeads} icon={<Target className="h-4 w-4" />} tone="cyan" />
        <StatCard
          label="Ganados"
          value={snapshot.wonLeads}
          icon={<TrendingUp className="h-4 w-4" />}
          tone="emerald"
          hint={`${snapshot.conversionRate}% conversión`}
        />
        <StatCard
          label="Gestiones 30 días"
          value={snapshot.activities30d}
          icon={<History className="h-4 w-4" />}
          tone={snapshot.activities30d === 0 && snapshot.totalLeads > 0 ? "rose" : "violet"}
          hint={snapshot.lastActivityAt ? `Última ${relativeTime(snapshot.lastActivityAt)}` : "Sin gestiones"}
        />
      </div>

      <Panel title="Embudo del ejecutivo" icon={<TrendingUp className="h-4 w-4" />}>
        {snapshot.totalLeads === 0 ? (
          <EmptyState icon={<Building2 className="h-4 w-4" />} title="Sin registros en su cartera" />
        ) : (
          <div className="space-y-2.5">
            {Object.entries(PROGRESS_INFO)
              .filter(([, info]) => info.step > 0)
              .map(([status, info]) => (
                <BarRow
                  key={status}
                  label={info.label}
                  value={snapshot.funnel.find((item) => item.status === status)?.count ?? 0}
                  total={snapshot.totalLeads}
                  cls={status === "won" ? "bg-emerald-500" : "bg-blue-500"}
                />
              ))}
          </div>
        )}
      </Panel>

      <Panel title="Señales de alerta" icon={<Target className="h-4 w-4" />}>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DataItem label="Seguimientos vencidos" value={snapshot.overdueFollowUps} />
          <DataItem label="Sin gestión hace 14 días" value={snapshot.staleLeads} />
          <DataItem label="Pendientes de evaluar" value={snapshot.pendingEvaluation} />
          <DataItem label="Tasa de calificación" value={`${snapshot.acceptanceRate}%`} />
        </dl>
      </Panel>

      <Panel title="Últimas gestiones informadas" icon={<History className="h-4 w-4" />} padded={false}>
        {detail.activities.length === 0 ? (
          <EmptyState icon={<History className="h-4 w-4" />} title="No ha informado gestiones" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {detail.activities.slice(0, 12).map((activity) => (
              <li key={activity.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                <Pill
                  label={activity.actor_type === "admin" ? "Admin" : activity.activity_type}
                  cls="bg-slate-100 text-slate-600 ring-slate-200"
                />
                <div className="min-w-0 flex-1">
                  {activity.outcome && <p className="text-[12px] font-bold text-slate-700">{activity.outcome}</p>}
                  <p className="line-clamp-2 text-[12px] leading-5 text-slate-500">{activity.notes}</p>
                </div>
                <span className="shrink-0 text-[10.5px] text-slate-400">{formatDate(activity.occurred_at, true)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function MemberPortfolio({ detail }: { detail: MemberDetail }) {
  if (detail.leads.length === 0) {
    return <EmptyState icon={<Building2 className="h-4 w-4" />} title="Este ejecutivo aún no registra contactos" />;
  }
  return (
    <Panel title={`Cartera (${detail.leads.length})`} icon={<Building2 className="h-4 w-4" />} padded={false}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-5 py-2.5">Contacto</th>
              <th className="px-3 py-2.5">Etapa</th>
              <th className="px-3 py-2.5">Evaluación</th>
              <th className="px-5 py-2.5">Seguimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detail.leads.map((lead) => (
              <tr key={lead.id} className="text-[12.5px] text-slate-600">
                <td className="px-5 py-3">
                  <p className="font-bold text-slate-800">{lead.name}</p>
                  <p className="text-[10.5px] text-slate-400">
                    {lead.service || "Servicio no informado"} · Registrado {formatDate(lead.created_at)}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <Pill
                    label={PROGRESS_INFO[lead.commercial_status]?.label ?? lead.commercial_status}
                    cls={PROGRESS_INFO[lead.commercial_status]?.cls}
                  />
                </td>
                <td className="px-3 py-3">
                  <Pill
                    label={VALIDATION_INFO[lead.validation_status]?.label ?? lead.validation_status}
                    cls={VALIDATION_INFO[lead.validation_status]?.cls}
                  />
                </td>
                <td className="px-5 py-3 text-[11.5px]">
                  {lead.next_follow_up_at ? formatDate(lead.next_follow_up_at, true) : "Sin fecha"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function MemberFinance({ detail }: { detail: MemberDetail }) {
  const gross = detail.commissions.reduce((sum, item) => sum + item.gross_amount, 0);
  const paid = detail.commissions
    .filter((item) => item.status === "paid")
    .reduce((sum, item) => sum + item.gross_amount, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Comisión total" value={formatCLP(gross)} icon={<Wallet className="h-4 w-4" />} tone="blue" />
        <StatCard label="Pagado" value={formatCLP(paid)} icon={<Banknote className="h-4 w-4" />} tone="emerald" />
        <StatCard label="Por pagar" value={formatCLP(gross - paid)} icon={<Wallet className="h-4 w-4" />} tone="amber" />
      </div>

      <Panel title="Datos de pago registrados" icon={<Banknote className="h-4 w-4" />}>
        <dl className="grid gap-4 sm:grid-cols-3">
          <DataItem label="Banco" value={detail.user.bank_name} />
          <DataItem label="Tipo de cuenta" value={detail.user.bank_account_type} />
          <DataItem label="Cuenta" value={maskAccount(detail.user.bank_account_number)} mono />
          <DataItem label="Titular" value={detail.user.bank_account_holder} />
          <DataItem label="RUT titular" value={detail.user.bank_account_rut} mono />
          <DataItem label="Correo de pagos" value={detail.user.payment_email || detail.user.email} />
        </dl>
      </Panel>

      <Panel title="Liquidaciones" icon={<Wallet className="h-4 w-4" />} padded={false}>
        {detail.statements.length === 0 ? (
          <EmptyState icon={<Wallet className="h-4 w-4" />} title="Sin liquidaciones emitidas" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {detail.statements.map((statement) => (
              <li key={statement.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div>
                  <p className="text-[12.5px] font-bold text-slate-800">{formatPeriod(statement.period)}</p>
                  <p className="text-[10.5px] text-slate-400">
                    Bruto {formatCLP(statement.gross_total)} · Retención {formatCLP(statement.retention)}
                    {statement.paid_at ? ` · Pagada ${formatDate(statement.paid_at)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill
                    label={STATEMENT_STATUS_INFO[statement.status]?.label ?? statement.status}
                    cls={STATEMENT_STATUS_INFO[statement.status]?.cls}
                  />
                  <p className="text-[13px] font-extrabold text-slate-900">{formatCLP(statement.net_total)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Comisiones" icon={<Banknote className="h-4 w-4" />} padded={false}>
        {detail.commissions.length === 0 ? (
          <EmptyState icon={<Banknote className="h-4 w-4" />} title="Sin comisiones registradas" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {detail.commissions.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-bold text-slate-800">
                    {item.client_name || item.concept || "Comisión"}
                  </p>
                  <p className="text-[10.5px] text-slate-400">
                    {formatPeriod(item.period)} · {item.percentage}% sobre {formatCLP(item.base_amount)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill
                    label={COMMISSION_STATUS_INFO[item.status]?.label ?? item.status}
                    cls={COMMISSION_STATUS_INFO[item.status]?.cls}
                  />
                  <p className="text-[13px] font-extrabold text-slate-900">{formatCLP(item.gross_amount)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function MemberAudit({ detail }: { detail: MemberDetail }) {
  return (
    <Panel
      title="Trazabilidad de la cuenta"
      description="Toda acción sobre este ejecutivo, con responsable y fecha."
      icon={<History className="h-4 w-4" />}
      padded={false}
    >
      {detail.audit.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="h-4 w-4" />} title="Sin movimientos registrados" />
      ) : (
        <ul className="divide-y divide-slate-100">
          {detail.audit.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
              <Pill
                label={entry.actor_type === "admin" ? "Administración" : "Ejecutivo"}
                cls={
                  entry.actor_type === "admin"
                    ? "bg-violet-50 text-violet-700 ring-violet-200"
                    : "bg-blue-50 text-blue-700 ring-blue-200"
                }
              />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] leading-5 text-slate-700">{entry.summary}</p>
                <p className="mt-0.5 text-[10.5px] text-slate-400">
                  {formatDate(entry.created_at, true)} · {relativeTime(entry.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-slate-100 px-5 py-3 text-[10.5px] text-slate-400">
        Ingreso al equipo: {detail.user.started_at ? formatDay(detail.user.started_at) : "sin registrar"}.
      </p>
    </Panel>
  );
}
