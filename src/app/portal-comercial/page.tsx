import Link from "next/link";
import {
  ArrowUpRight,
  BookOpenCheck,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  History,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";
import {
  ACTIVITY_INFO,
  PROGRESS_INFO,
  VALIDATION_INFO,
  currentPeriod,
  formatCLP,
  formatPeriod,
} from "@/config/commercial";
import { requireCommercialUser } from "@/lib/commercial/session";
import { buildAgenda, getOwnerDashboardData } from "@/lib/commercial/analytics";
import { summarizeEarnings } from "@/lib/commercial/finance";
import { formatDate, relativeTime } from "@/lib/commercial/format";
import { BarRow, DataItem, EmptyState, Panel, Pill, StatCard } from "@/components/commercial/ui";

export const dynamic = "force-dynamic";

export default async function PortalComercialHome() {
  const user = await requireCommercialUser();
  const { snapshot, series, leads, activities, commissions, statements } = await getOwnerDashboardData(user.id);
  const period = currentPeriod();
  const earnings = summarizeEarnings(commissions, statements, period);
  const agenda = buildAgenda(leads);
  const maxSeries = Math.max(1, ...series.map((item) => item.created));

  const goalLeads = Number(user.goal_monthly_leads) || 0;
  const goalWon = Number(user.goal_monthly_won) || 0;
  const monthWon = leads.filter(
    (lead) => lead.commercial_status === "won" && lead.updated_at.slice(0, 7) === period,
  ).length;

  const profileComplete = Boolean(user.bank_name && user.bank_account_number && user.email);

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-300">
              {formatPeriod(period)} · Panel de gestión
            </p>
            <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Hola, {user.name.split(" ")[0]}
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-6 text-slate-300">
              Este es el estado real de tu gestión: lo que registraste, lo que Zyteron evaluó, lo que
              tienes comprometido y lo que has generado en comisiones.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/portal-comercial/cartera"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-[12.5px] font-bold text-white transition-colors hover:bg-blue-500"
            >
              <Building2 className="h-4 w-4" /> Ir a mi cartera
            </Link>
            <Link
              href="/portal-comercial/centro"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-[12.5px] font-bold text-slate-100 transition-colors hover:bg-white/10"
            >
              <BookOpenCheck className="h-4 w-4" /> Centro de conocimiento
            </Link>
          </div>
        </div>
      </section>

      {/* Avisos accionables */}
      {(user.must_change_password || !profileComplete || snapshot.overdueFollowUps > 0) && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {user.must_change_password && (
            <AlertCard
              tone="amber"
              title="Cambia tu contraseña inicial"
              detail="Reemplaza la clave entregada por administración antes de seguir trabajando."
              href="/portal-comercial/perfil"
              cta="Cambiar ahora"
            />
          )}
          {!profileComplete && (
            <AlertCard
              tone="blue"
              title="Completa tus datos de pago"
              detail="Sin banco, número de cuenta y correo no podemos emitir tu liquidación mensual."
              href="/portal-comercial/perfil"
              cta="Completar ficha"
            />
          )}
          {snapshot.overdueFollowUps > 0 && (
            <AlertCard
              tone="rose"
              title={`${snapshot.overdueFollowUps} seguimiento(s) vencido(s)`}
              detail="Tienes compromisos de contacto que ya pasaron su fecha comprometida."
              href="/portal-comercial/agenda"
              cta="Ver agenda"
            />
          )}
        </div>
      )}

      {/* Métricas */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Registros del mes"
          value={snapshot.monthLeads}
          icon={Building2}
          tone="blue"
          hint={`${snapshot.totalLeads} en total`}
          progress={goalLeads > 0 ? { current: snapshot.monthLeads, goal: goalLeads } : undefined}
        />
        <StatCard
          label="Gestiones activas"
          value={snapshot.activeLeads}
          icon={Target}
          tone="cyan"
          hint={`${snapshot.activities30d} gestiones informadas en 30 días`}
        />
        <StatCard
          label="Potenciales y aceptados"
          value={snapshot.potentialLeads + snapshot.acceptedLeads}
          icon={CheckCircle2}
          tone="violet"
          hint={`${snapshot.acceptanceRate}% de tus registros califican`}
        />
        <StatCard
          label="Cierres ganados"
          value={snapshot.wonLeads}
          icon={Trophy}
          tone="emerald"
          hint={`${snapshot.conversionRate}% de conversión`}
          progress={goalWon > 0 ? { current: monthWon, goal: goalWon } : undefined}
        />
        <StatCard
          label="Comisión acumulada"
          value={formatCLP(earnings.grossTotal)}
          icon={Wallet}
          tone="amber"
          hint={`${formatCLP(earnings.currentPeriodGross)} este periodo`}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          {/* Embudo */}
          <Panel
            title="Embudo de mi cartera"
            description="Distribución de tus contactos según la etapa que informaste."
            icon={TrendingUp}
            action={
              <Link
                href="/portal-comercial/cartera"
                className="inline-flex items-center gap-1 text-[11.5px] font-bold text-blue-700 hover:underline"
              >
                Ver detalle <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {snapshot.totalLeads === 0 ? (
              <EmptyState
                icon={Building2}
                title="Todavía no registras contactos"
                text="Registra a la primera persona o empresa que contactaste para comenzar a construir tu cartera."
                action={
                  <Link
                    href="/portal-comercial/cartera"
                    className="rounded-xl bg-blue-600 px-4 py-2 text-[12.5px] font-bold text-white hover:bg-blue-700"
                  >
                    Registrar contacto
                  </Link>
                }
              />
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
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
                  <DataItem label="Perdidos" value={snapshot.lostLeads} />
                  <DataItem label="Sin evaluar" value={snapshot.pendingEvaluation} />
                  <DataItem label="Sin gestión hace 14 días" value={snapshot.staleLeads} />
                  <DataItem
                    label="Última gestión"
                    value={snapshot.lastActivityAt ? relativeTime(snapshot.lastActivityAt) : "—"}
                  />
                </div>
              </div>
            )}
          </Panel>

          {/* Evolución mensual */}
          <Panel
            title="Evolución de los últimos 6 meses"
            description="Contactos registrados y cierres ganados por periodo."
            icon={TrendingUp}
          >
            <div className="flex items-end justify-between gap-2 sm:gap-4">
              {series.map((item) => {
                const height = Math.round((item.created / maxSeries) * 100);
                const wonHeight = Math.round((item.won / maxSeries) * 100);
                return (
                  <div key={item.period} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <div className="relative flex h-28 w-full max-w-14 items-end justify-center">
                      <div
                        className="w-full rounded-t-lg bg-blue-100 transition-all"
                        style={{ height: `${Math.max(height, 3)}%` }}
                        title={`${item.created} registro(s)`}
                      />
                      <div
                        className="absolute bottom-0 w-full rounded-t-lg bg-emerald-500 transition-all"
                        style={{ height: `${wonHeight}%` }}
                        title={`${item.won} cierre(s)`}
                      />
                    </div>
                    <p className="truncate text-[10px] font-bold text-slate-500">
                      {formatPeriod(item.period).split(" ")[0].slice(0, 3)}
                    </p>
                    <p className="text-[11px] font-extrabold text-slate-800">{item.created}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3 text-[10.5px] font-semibold text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-blue-100" /> Registrados
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Ganados
              </span>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          {/* Próximos compromisos */}
          <Panel
            title="Próximos compromisos"
            description="Tus seguimientos comprometidos más cercanos."
            icon={CalendarClock}
            action={
              <Link
                href="/portal-comercial/agenda"
                className="text-[11.5px] font-bold text-blue-700 hover:underline"
              >
                Ver agenda
              </Link>
            }
            padded={false}
          >
            {agenda.overdue.length === 0 && agenda.upcoming.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="Sin seguimientos agendados"
                text="Al informar un avance puedes dejar comprometida la fecha del próximo contacto."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {[...agenda.overdue.slice(0, 3), ...agenda.upcoming.slice(0, 4)].map((lead) => {
                  const overdue = agenda.overdueIds.has(lead.id);
                  return (
                    <li key={lead.id} className="flex items-center gap-3 px-5 py-3">
                      <span
                        className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${overdue ? "bg-rose-500" : "bg-blue-500"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12.5px] font-bold text-slate-800">{lead.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {overdue ? "Vencido " : "Programado "}
                          {relativeTime(lead.next_follow_up_at)} ·{" "}
                          {PROGRESS_INFO[lead.commercial_status]?.label ?? lead.commercial_status}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10.5px] font-semibold text-slate-400">
                        {formatDate(lead.next_follow_up_at, true)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          {/* Estado financiero */}
          <Panel
            title="Mis ganancias"
            description="Resumen del estado de tus comisiones."
            icon={Wallet}
            action={
              <Link
                href="/portal-comercial/ganancias"
                className="text-[11.5px] font-bold text-blue-700 hover:underline"
              >
                Ver detalle
              </Link>
            }
          >
            <dl className="grid grid-cols-2 gap-4">
              <DataItem label="Pagado" value={formatCLP(earnings.paidTotal)} />
              <DataItem label="Aprobado por liquidar" value={formatCLP(earnings.approvedPending)} />
              <DataItem label="Pendiente de aprobación" value={formatCLP(earnings.pendingTotal)} />
              <DataItem
                label="Último pago"
                value={earnings.lastPaymentAt ? formatDate(earnings.lastPaymentAt) : "Sin pagos aún"}
              />
            </dl>
            <p className="mt-4 rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">
              Tu porcentaje vigente es <strong className="text-slate-700">{user.commission_pct || 0}%</strong>.
              Las comisiones aprobadas se consolidan en la liquidación mensual del periodo.
            </p>
          </Panel>

          {/* Últimas gestiones */}
          <Panel title="Mis últimas gestiones" description="Lo último que informaste." icon={History} padded={false}>
            {activities.length === 0 ? (
              <EmptyState icon={History} title="Aún no informas gestiones" text="Cada llamada, correo o reunión debe quedar registrada." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {activities.slice(0, 5).map((activity) => {
                  const info =
                    activity.actor_type === "admin"
                      ? VALIDATION_INFO[activity.to_status ?? ""]
                      : PROGRESS_INFO[activity.to_status ?? ""];
                  return (
                    <li key={activity.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <Pill
                          label={ACTIVITY_INFO[activity.activity_type]?.label ?? activity.activity_type}
                          cls={ACTIVITY_INFO[activity.activity_type]?.cls}
                        />
                        <span className="text-[10.5px] text-slate-400">{relativeTime(activity.occurred_at)}</span>
                      </div>
                      <p className="mt-1.5 line-clamp-2 text-[12px] leading-5 text-slate-600">{activity.notes}</p>
                      {info && <Pill label={info.label} cls={info.cls} className="mt-1.5" />}
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function AlertCard({
  tone,
  title,
  detail,
  href,
  cta,
}: {
  tone: "amber" | "blue" | "rose";
  title: string;
  detail: string;
  href: string;
  cta: string;
}) {
  const styles = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
  } as const;
  return (
    <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 ${styles[tone]}`}>
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
      <div className="min-w-0">
        <p className="text-[12.5px] font-extrabold">{title}</p>
        <p className="mt-0.5 text-[11.5px] leading-5 opacity-80">{detail}</p>
        <Link href={href} className="mt-1.5 inline-block text-[11.5px] font-bold underline underline-offset-2">
          {cta}
        </Link>
      </div>
    </div>
  );
}
