"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlarmClock,
  BadgeCheck,
  Building2,
  CircleAlert,
  History,
  Loader2,
  ShieldCheck,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import {
  PROGRESS_INFO,
  ROLE_INFO,
  USER_STATUS_INFO,
  formatCLP,
  formatPeriod,
} from "@/config/commercial";
import { formatDate, initials, readJson, relativeTime } from "@/lib/commercial/format";
import { BarRow, EmptyState, ErrorNote, Panel, Pill, StatCard } from "@/components/commercial/ui";
import { cn } from "@/lib/utils";

/**
 * Panel general del área comercial para administración: estado del equipo,
 * embudo consolidado, alertas accionables y bitácora de auditoría.
 */

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
  upcomingFollowUps: number;
  staleLeads: number;
  activities30d: number;
  lastActivityAt: string | null;
  conversionRate: number;
  acceptanceRate: number;
  funnel: Array<{ status: string; count: number }>;
};

type Member = {
  id: string;
  name: string;
  rut: string;
  role: string;
  status: string;
  email: string | null;
  position: string | null;
  commission_pct: number;
  last_login_at: string | null;
  goal_monthly_leads: number;
  goal_monthly_won: number;
  goal_monthly_amount: number;
  snapshot: Snapshot;
  commissionGross: number;
  commissionPaid: number;
  commissionPendingPayment: number;
  statementsPending: number;
  hasBankData: boolean;
};

type AuditEntry = {
  id: string;
  actor_type: string;
  actor_name: string | null;
  entity: string;
  entity_label: string | null;
  action: string;
  summary: string;
  created_at: string;
};

type Overview = {
  members: Member[];
  totals: {
    executives: number;
    activeExecutives: number;
    leads: number;
    monthLeads: number;
    activeLeads: number;
    wonLeads: number;
    pendingEvaluation: number;
    overdueFollowUps: number;
    commissionGross: number;
    commissionPaid: number;
    commissionPendingPayment: number;
    statementsPending: number;
  };
  funnel: Array<{ status: string; count: number }>;
  series: Array<{ period: string; created: number; won: number }>;
  alerts: Array<{ kind: "warning" | "danger" | "info"; title: string; detail: string; ownerId?: string }>;
  audit: AuditEntry[];
};

const ENTITY_LABEL: Record<string, string> = {
  user: "Ejecutivo",
  lead: "Registro",
  commission: "Comisión",
  statement: "Liquidación",
  contract: "Contrato",
};

export function CommercialOverview({ onOpenMember }: { onOpenMember: (id: string) => void }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await readJson(await fetch("/api/admin/comercial/overview", { cache: "no-store" }));
      setData(result as unknown as Overview);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo cargar el panel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-[13px] text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" /> Cargando panel comercial…
      </div>
    );
  }
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return null;

  const { totals, members, funnel, series, alerts, audit } = data;
  const maxSeries = Math.max(1, ...series.map((item) => item.created));

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard
          label="Equipo comercial"
          value={totals.activeExecutives}
          icon={<Users className="h-4 w-4" />}
          tone="blue"
          hint={`${totals.executives} cuentas creadas`}
        />
        <StatCard
          label="Registros totales"
          value={totals.leads}
          icon={<Building2 className="h-4 w-4" />}
          tone="cyan"
          hint={`${totals.monthLeads} este mes`}
        />
        <StatCard label="En gestión activa" value={totals.activeLeads} icon={<Target className="h-4 w-4" />} tone="violet" />
        <StatCard
          label="Por evaluar"
          value={totals.pendingEvaluation}
          icon={<CircleAlert className="h-4 w-4" />}
          tone={totals.pendingEvaluation > 0 ? "amber" : "slate"}
          hint="Esperan tu clasificación"
        />
        <StatCard
          label="Cierres ganados"
          value={totals.wonLeads}
          icon={<Trophy className="h-4 w-4" />}
          tone="emerald"
          hint={`${totals.leads ? Math.round((totals.wonLeads / totals.leads) * 100) : 0}% de conversión`}
        />
        <StatCard
          label="Comisión por pagar"
          value={formatCLP(totals.commissionPendingPayment)}
          icon={<Wallet className="h-4 w-4" />}
          tone="rose"
          hint={`${formatCLP(totals.commissionPaid)} ya pagado`}
        />
      </div>

      {alerts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {alerts.slice(0, 6).map((alert, index) => (
            <button
              key={`${alert.title}-${index}`}
              onClick={() => alert.ownerId && onOpenMember(alert.ownerId)}
              className={cn(
                "flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-shadow",
                alert.ownerId && "hover:shadow-md",
                alert.kind === "danger"
                  ? "border-rose-200 bg-rose-50 text-rose-900"
                  : alert.kind === "warning"
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-blue-200 bg-blue-50 text-blue-900",
              )}
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
              <span className="min-w-0">
                <span className="block text-[12.5px] font-extrabold">{alert.title}</span>
                <span className="mt-0.5 block text-[11.5px] leading-5 opacity-80">{alert.detail}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Desempeño por ejecutivo"
          description="Cartera, avance y estado financiero de cada persona del equipo."
          icon={<Users className="h-4 w-4" />}
          padded={false}
        >
          {members.length === 0 ? (
            <EmptyState
              icon={<Users className="h-4 w-4" />}
              title="Aún no hay usuarios comerciales"
              text="Crea el primer ejecutivo o partner desde la pestaña Equipo."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-2.5">Ejecutivo</th>
                    <th className="px-3 py-2.5 text-center">Cartera</th>
                    <th className="px-3 py-2.5 text-center">Mes</th>
                    <th className="px-3 py-2.5 text-center">Activos</th>
                    <th className="px-3 py-2.5 text-center">Ganados</th>
                    <th className="px-3 py-2.5 text-center">Gestiones 30d</th>
                    <th className="px-3 py-2.5 text-right">Comisión</th>
                    <th className="px-5 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((member) => {
                    const role = ROLE_INFO[member.role];
                    const status = USER_STATUS_INFO[member.status] ?? USER_STATUS_INFO.invited;
                    const goalPct =
                      member.goal_monthly_leads > 0
                        ? Math.round((member.snapshot.monthLeads / member.goal_monthly_leads) * 100)
                        : null;
                    return (
                      <tr
                        key={member.id}
                        onClick={() => onOpenMember(member.id)}
                        className="cursor-pointer text-[12.5px] text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[11px] font-extrabold text-white">
                              {initials(member.name)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-800">{member.name}</p>
                              <p className="truncate text-[10.5px] text-slate-400">
                                {member.position || role?.short || member.role} · {member.commission_pct}%
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center font-bold text-slate-800">
                          {member.snapshot.totalLeads}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {member.snapshot.monthLeads}
                          {goalPct !== null && (
                            <span
                              className={cn(
                                "ml-1 text-[10px] font-bold",
                                goalPct >= 100 ? "text-emerald-600" : goalPct >= 60 ? "text-blue-600" : "text-amber-600",
                              )}
                            >
                              {goalPct}%
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center">{member.snapshot.activeLeads}</td>
                        <td className="px-3 py-3 text-center font-bold text-emerald-700">
                          {member.snapshot.wonLeads}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span
                            className={cn(
                              "font-bold",
                              member.snapshot.activities30d === 0 && member.snapshot.totalLeads > 0
                                ? "text-rose-600"
                                : "text-slate-700",
                            )}
                          >
                            {member.snapshot.activities30d}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <p className="font-extrabold text-slate-900">{formatCLP(member.commissionGross)}</p>
                          {member.commissionPendingPayment > 0 && (
                            <p className="text-[10px] text-amber-600">
                              {formatCLP(member.commissionPendingPayment)} por pagar
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <Pill label={status.label} cls={status.cls} />
                          {!member.hasBankData && (
                            <p className="mt-1 text-[10px] font-bold text-rose-500">Sin datos bancarios</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="Embudo consolidado" description="Todos los registros del equipo." icon={<TrendingUp className="h-4 w-4" />}>
            {totals.leads === 0 ? (
              <EmptyState icon={<TrendingUp className="h-4 w-4" />} title="Sin registros todavía" />
            ) : (
              <div className="space-y-2.5">
                {Object.entries(PROGRESS_INFO)
                  .filter(([, info]) => info.step > 0)
                  .map(([status, info]) => (
                    <BarRow
                      key={status}
                      label={info.label}
                      value={funnel.find((item) => item.status === status)?.count ?? 0}
                      total={totals.leads}
                      cls={status === "won" ? "bg-emerald-500" : "bg-blue-500"}
                    />
                  ))}
              </div>
            )}
          </Panel>

          <Panel title="Últimos 6 meses" description="Registros creados y cierres ganados." icon={<Activity className="h-4 w-4" />}>
            <div className="flex items-end justify-between gap-2">
              {series.map((item) => (
                <div key={item.period} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-24 w-full max-w-12 items-end justify-center">
                    <div
                      className="w-full rounded-t-lg bg-blue-100"
                      style={{ height: `${Math.max(Math.round((item.created / maxSeries) * 100), 3)}%` }}
                    />
                    <div
                      className="absolute bottom-0 w-full rounded-t-lg bg-emerald-500"
                      style={{ height: `${Math.round((item.won / maxSeries) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500">
                    {formatPeriod(item.period).split(" ")[0].slice(0, 3)}
                  </p>
                  <p className="text-[11px] font-extrabold text-slate-800">{item.created}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Estado financiero"
            description="Comisiones y liquidaciones del área."
            icon={<BadgeCheck className="h-4 w-4" />}
          >
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Comisión total</dt>
                <dd className="mt-0.5 text-[15px] font-extrabold text-slate-900">
                  {formatCLP(totals.commissionGross)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pagado</dt>
                <dd className="mt-0.5 text-[15px] font-extrabold text-emerald-600">
                  {formatCLP(totals.commissionPaid)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Por pagar</dt>
                <dd className="mt-0.5 text-[15px] font-extrabold text-amber-600">
                  {formatCLP(totals.commissionPendingPayment)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Liquidaciones emitidas
                </dt>
                <dd className="mt-0.5 text-[15px] font-extrabold text-slate-900">{totals.statementsPending}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Seguimiento del equipo" description="Compromisos y actividad." icon={<AlarmClock className="h-4 w-4" />}>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Seguimientos vencidos
                </dt>
                <dd className="mt-0.5 text-[15px] font-extrabold text-rose-600">{totals.overdueFollowUps}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Registros del mes</dt>
                <dd className="mt-0.5 text-[15px] font-extrabold text-slate-900">{totals.monthLeads}</dd>
              </div>
            </dl>
          </Panel>
        </div>
      </div>

      <Panel
        title="Bitácora de auditoría"
        description="Cada acción del área comercial con responsable y fecha."
        icon={<History className="h-4 w-4" />}
        padded={false}
        action={
          <button
            onClick={() => void load()}
            className="text-[11.5px] font-bold text-blue-700 hover:underline"
          >
            Actualizar
          </button>
        }
      >
        {audit.length === 0 ? (
          <EmptyState icon={<ShieldCheck className="h-4 w-4" />} title="Sin movimientos registrados" />
        ) : (
          <ul className="max-h-[460px] divide-y divide-slate-100 overflow-y-auto">
            {audit.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                <Pill
                  label={entry.actor_type === "admin" ? "Admin" : entry.actor_type === "system" ? "Sistema" : "Comercial"}
                  cls={
                    entry.actor_type === "admin"
                      ? "bg-violet-50 text-violet-700 ring-violet-200"
                      : "bg-blue-50 text-blue-700 ring-blue-200"
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-5 text-slate-700">{entry.summary}</p>
                  <p className="mt-0.5 text-[10.5px] text-slate-400">
                    {ENTITY_LABEL[entry.entity] ?? entry.entity}
                    {entry.entity_label ? ` · ${entry.entity_label}` : ""} · {formatDate(entry.created_at, true)} (
                    {relativeTime(entry.created_at)})
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
