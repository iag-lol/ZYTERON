import Link from "next/link";
import {
  AlarmClock,
  CalendarCheck2,
  CalendarClock,
  CircleDashed,
  History,
  Mail,
  Phone,
} from "lucide-react";
import { ACTIVITY_INFO, PROGRESS_INFO, VALIDATION_INFO } from "@/config/commercial";
import { requireCommercialUser } from "@/lib/commercial/session";
import { buildAgenda, getOwnerDashboardData } from "@/lib/commercial/analytics";
import { formatDate, relativeTime } from "@/lib/commercial/format";
import type { CommercialLead } from "@/lib/commercial/store";
import { EmptyState, Panel, Pill, StatCard } from "@/components/commercial/ui";

export const dynamic = "force-dynamic";

/**
 * Agenda del ejecutivo: qué debe contactar hoy, qué viene y qué quedó sin
 * fecha comprometida. Es la vista operativa del seguimiento.
 */
export default async function AgendaPage() {
  const user = await requireCommercialUser();
  const { leads, activities, snapshot } = await getOwnerDashboardData(user.id);
  const { overdue, upcoming, unscheduled, staleUnscheduled } = buildAgenda(leads);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Agenda y seguimiento</h1>
        <p className="text-[12.5px] text-slate-500">
          Cada compromiso de contacto que dejaste al informar un avance aparece aquí. Cumplirlos es lo
          que sostiene la conversión.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Vencidos" value={overdue.length} icon={<AlarmClock className="h-4 w-4" />} tone="rose" hint="Requieren contacto hoy" />
        <StatCard
          label="Próximos 7 días"
          value={snapshot.upcomingFollowUps}
          icon={<CalendarCheck2 className="h-4 w-4" />}
          tone="blue"
          hint={`${upcoming.length} agendados en total`}
        />
        <StatCard
          label="Sin fecha comprometida"
          value={unscheduled.length}
          icon={<CircleDashed className="h-4 w-4" />}
          tone="amber"
          hint={`${staleUnscheduled.length} sin gestión hace 14 días`}
        />
        <StatCard
          label="Gestiones en 30 días"
          value={snapshot.activities30d}
          icon={<History className="h-4 w-4" />}
          tone="emerald"
          hint={snapshot.lastActivityAt ? `Última ${relativeTime(snapshot.lastActivityAt)}` : "Sin gestiones aún"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel
          title="Seguimientos vencidos"
          description="Compromisos cuya fecha ya pasó."
          icon={<AlarmClock className="h-4 w-4" />}
          padded={false}
        >
          {overdue.length === 0 ? (
            <EmptyState icon={<CalendarCheck2 className="h-4 w-4" />} title="Sin seguimientos vencidos" text="Tu agenda está al día." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {overdue.map((lead) => (
                <AgendaRow key={lead.id} lead={lead} tone="overdue" />
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Próximos contactos"
          description="Ordenados por la fecha que comprometiste."
          icon={<CalendarClock className="h-4 w-4" />}
          padded={false}
        >
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="h-4 w-4" />}
              title="No tienes contactos agendados"
              text="Al informar un avance puedes dejar la fecha del próximo seguimiento."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.slice(0, 12).map((lead) => (
                <AgendaRow key={lead.id} lead={lead} tone="upcoming" />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Contactos sin fecha de seguimiento"
        description="Están abiertos pero no tienen un próximo paso comprometido."
        icon={<CircleDashed className="h-4 w-4" />}
        padded={false}
      >
        {unscheduled.length === 0 ? (
          <EmptyState icon={<CalendarCheck2 className="h-4 w-4" />} title="Todos tus contactos abiertos tienen próxima fecha" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {unscheduled.slice(0, 15).map((lead) => (
              <li key={lead.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <Link
                    href="/portal-comercial/cartera"
                    className="truncate text-[13px] font-bold text-slate-800 hover:text-blue-700"
                  >
                    {lead.name}
                  </Link>
                  <p className="text-[11px] text-slate-500">
                    Último contacto {lead.last_contact_at ? relativeTime(lead.last_contact_at) : "sin registrar"} ·{" "}
                    {lead.service || "Servicio no informado"}
                  </p>
                </div>
                <Pill
                  label={PROGRESS_INFO[lead.commercial_status]?.label ?? lead.commercial_status}
                  cls={PROGRESS_INFO[lead.commercial_status]?.cls}
                />
                <Pill
                  label={VALIDATION_INFO[lead.validation_status]?.label ?? lead.validation_status}
                  cls={VALIDATION_INFO[lead.validation_status]?.cls}
                />
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        title="Historial reciente de gestiones"
        description="Las últimas 15 acciones que informaste, con canal y resultado."
        icon={<History className="h-4 w-4" />}
        padded={false}
      >
        {activities.length === 0 ? (
          <EmptyState icon={<History className="h-4 w-4" />} title="Sin gestiones informadas" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {activities.slice(0, 15).map((activity) => (
              <li key={activity.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
                <Pill
                  label={ACTIVITY_INFO[activity.activity_type]?.label ?? activity.activity_type}
                  cls={ACTIVITY_INFO[activity.activity_type]?.cls}
                />
                <div className="min-w-0 flex-1">
                  {activity.outcome && (
                    <p className="text-[12px] font-bold text-slate-700">{activity.outcome}</p>
                  )}
                  <p className="line-clamp-2 text-[12px] leading-5 text-slate-500">{activity.notes}</p>
                </div>
                <span className="shrink-0 text-[10.5px] text-slate-400">
                  {formatDate(activity.occurred_at, true)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function AgendaRow({ lead, tone }: { lead: CommercialLead; tone: "overdue" | "upcoming" }) {
  const progress = PROGRESS_INFO[lead.commercial_status] ?? PROGRESS_INFO.registered;
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${tone === "overdue" ? "bg-rose-500" : "bg-blue-500"}`}
      />
      <div className="min-w-0 flex-1">
        <Link
          href="/portal-comercial/cartera"
          className="block truncate text-[13px] font-bold text-slate-800 hover:text-blue-700"
        >
          {lead.name}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
          <span
            className={tone === "overdue" ? "font-bold text-rose-600" : undefined}
          >
            {tone === "overdue" ? "Vencido " : "Programado "}
            {relativeTime(lead.next_follow_up_at)}
          </span>
          <span>{formatDate(lead.next_follow_up_at, true)}</span>
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 hover:text-blue-700">
              <Phone className="h-3 w-3" /> {lead.phone}
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 truncate hover:text-blue-700">
              <Mail className="h-3 w-3" /> {lead.email}
            </a>
          )}
        </p>
      </div>
      <Pill label={progress.label} cls={progress.cls} />
    </li>
  );
}
