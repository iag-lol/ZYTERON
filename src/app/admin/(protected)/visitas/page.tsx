import { getAdminSnapshot } from "@/lib/admin-data";
import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  AlertCircle,
  Calendar,
  History,
} from "lucide-react";
import Link from "next/link";

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  Programada: { label: "Programada", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
  Hecha: { label: "Completada", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
  Reagendada: { label: "Reagendada", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  Cancelada: { label: "Cancelada", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-400" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? {
    label: status,
    bg: "bg-slate-50",
    text: "text-slate-600",
    dot: "bg-slate-400",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default async function VisitasPage() {
  const data = await getAdminSnapshot();
  const visits = data.visits
    .slice()
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const now = new Date();
  const upcoming = visits.filter((v) => v.date && new Date(v.date) >= now);
  const past = visits.filter((v) => v.date && new Date(v.date) < now);
  const noDate = visits.filter((v) => !v.date);

  const nextVisit = upcoming[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Agenda técnica
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Visitas a clientes</h1>
          <p className="mt-1 text-sm text-slate-500">
            {visits.length} visitas totales · {upcoming.length} próximas · {past.length} históricas
          </p>
        </div>
        <Link
          href="/admin/visitas/nueva"
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Agendar visita
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Próximas visitas",
            value: upcoming.length,
            icon: Calendar,
            iconBg: "bg-blue-500",
            shadow: "shadow-blue-500/30",
          },
          {
            label: "Visitas completadas",
            value: past.filter((v) => v.status === "Hecha").length,
            icon: CheckCircle2,
            iconBg: "bg-emerald-500",
            shadow: "shadow-emerald-500/30",
          },
          {
            label: "Total en agenda",
            value: visits.length,
            icon: CalendarClock,
            iconBg: "bg-violet-500",
            shadow: "shadow-violet-500/30",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.iconBg} shadow-lg ${s.shadow}`}>
              <s.icon className="h-5 w-5 text-white" />
            </div>
            <div className="mt-3">
              <p className="text-3xl font-extrabold text-slate-900">{s.value}</p>
              <p className="text-xs font-semibold text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Next visit banner */}
      {nextVisit && (
        <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/30">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-600">
                    Próxima visita
                  </p>
                  <p className="mt-0.5 text-lg font-extrabold text-slate-900">
                    {nextVisit.notes || "Visita técnica"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {nextVisit.date
                      ? new Date(nextVisit.date).toLocaleString("es-CL", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Sin fecha"}
                  </p>
                  {nextVisit.clientId && (
                    <p className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-500">
                      <MapPin className="h-3 w-3" />
                      Cliente ID: {nextVisit.clientId}
                    </p>
                  )}
                </div>
              </div>
              <StatusBadge status={nextVisit.status || "Programada"} />
            </div>
          </div>
        </div>
      )}

      {/* Two columns: upcoming + past */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">Próximas visitas</h2>
                <p className="text-[11px] text-slate-400">{upcoming.length} agendadas</p>
              </div>
            </div>
            <Link
              href="/admin/visitas/nueva"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Agendar
            </Link>
          </div>

          {upcoming.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <CalendarClock className="mx-auto h-10 w-10 text-slate-200" />
              <p className="mt-2 text-sm font-semibold text-slate-500">Sin visitas próximas</p>
              <Link
                href="/admin/visitas/nueva"
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-blue-600"
              >
                Agendar la primera
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcoming.map((v) => (
                <div key={v.id} className="px-6 py-4 transition-colors hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg bg-blue-100 text-center">
                        <p className="text-[11px] font-bold leading-none text-blue-700">
                          {v.date
                            ? new Date(v.date).toLocaleDateString("es-CL", { day: "2-digit" })
                            : "—"}
                        </p>
                        <p className="text-[9px] font-bold uppercase leading-none text-blue-500">
                          {v.date
                            ? new Date(v.date).toLocaleDateString("es-CL", { month: "short" })
                            : ""}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-900">
                          {v.notes || "Visita técnica"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {v.date
                            ? new Date(v.date).toLocaleTimeString("es-CL", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Sin hora"}
                          {v.clientId && ` · Cliente ${v.clientId.slice(0, 8)}...`}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={v.status || "Programada"} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historical */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-slate-400" />
              <div>
                <h2 className="text-sm font-bold text-slate-900">Historial de visitas</h2>
                <p className="text-[11px] text-slate-400">{past.length} completadas</p>
              </div>
            </div>
          </div>

          {past.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <History className="mx-auto h-10 w-10 text-slate-200" />
              <p className="mt-2 text-sm font-semibold text-slate-500">Sin historial aún</p>
              <p className="text-xs text-slate-400">Las visitas completadas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {past.slice(0, 8).map((v) => (
                <div key={v.id} className="px-6 py-4 transition-colors hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 text-center">
                        <p className="text-[11px] font-bold leading-none text-slate-600">
                          {v.date
                            ? new Date(v.date).toLocaleDateString("es-CL", { day: "2-digit" })
                            : "—"}
                        </p>
                        <p className="text-[9px] font-bold uppercase leading-none text-slate-400">
                          {v.date
                            ? new Date(v.date).toLocaleDateString("es-CL", { month: "short" })
                            : ""}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-700">
                          {v.notes || "Visita técnica"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {v.date
                            ? new Date(v.date).toLocaleDateString("es-CL", {
                                weekday: "long",
                                day: "2-digit",
                                month: "short",
                              })
                            : "Sin fecha"}
                          {v.clientId && ` · ${v.clientId.slice(0, 8)}...`}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={v.status || "Hecha"} />
                  </div>
                </div>
              ))}
              {past.length > 8 && (
                <div className="px-6 py-3 text-center">
                  <p className="text-[11px] text-slate-400">
                    +{past.length - 8} visitas más en el historial
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* No date visits */}
      {noDate.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-bold text-amber-800">
                {noDate.length} visita(s) sin fecha asignada
              </p>
              <p className="mt-0.5 text-[12px] text-amber-700">
                Estas visitas no tienen fecha registrada en la base de datos. Edítalas para asignar fecha y hora.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
