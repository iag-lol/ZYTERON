import { BriefcaseBusiness, Calendar, Clock, Flag, Target } from "lucide-react";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/prisma";

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return value.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusConfig(status?: string | null) {
  const s = String(status || "").toUpperCase();
  if (s === "ACTIVE" || s === "IN_PROGRESS" || s === "EN_CURSO")
    return { label: "Activo", color: "border-emerald-200 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" };
  if (s === "COMPLETED" || s === "FINALIZADO" || s === "DONE")
    return { label: "Finalizado", color: "border-slate-200 bg-slate-100 text-slate-600", dot: "bg-slate-400" };
  if (s === "PAUSED" || s === "PAUSADO" || s === "ON_HOLD")
    return { label: "Pausado", color: "border-amber-200 bg-amber-50 text-amber-700", dot: "bg-amber-500" };
  if (s === "CANCELLED" || s === "CANCELADO")
    return { label: "Cancelado", color: "border-rose-200 bg-rose-50 text-rose-700", dot: "bg-rose-500" };
  return { label: status || "Sin estado", color: "border-blue-200 bg-blue-50 text-blue-700", dot: "bg-blue-500" };
}

function getPriorityConfig(priority?: string | null) {
  const p = String(priority || "").toUpperCase();
  if (p === "HIGH" || p === "ALTA") return { label: "Alta", color: "text-rose-600" };
  if (p === "URGENT" || p === "URGENTE") return { label: "Urgente", color: "text-red-700" };
  if (p === "LOW" || p === "BAJA") return { label: "Baja", color: "text-slate-500" };
  return { label: priority || "Normal", color: "text-slate-600" };
}

function calculateProgress(startDate?: Date | null, endDate?: Date | null) {
  if (!startDate || !endDate) return null;
  const now = new Date();
  const total = endDate.getTime() - startDate.getTime();
  if (total <= 0) return 100;
  const elapsed = now.getTime() - startDate.getTime();
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

export default async function PortalProyectosPage() {
  const session = await requirePortalSession();
  const projects = await prisma.project.findMany({
    where: { clientId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const active = projects.filter((p) => {
    const s = String(p.status || "").toUpperCase();
    return s === "ACTIVE" || s === "IN_PROGRESS" || s === "EN_CURSO";
  }).length;
  const completed = projects.filter((p) => {
    const s = String(p.status || "").toUpperCase();
    return s === "COMPLETED" || s === "FINALIZADO" || s === "DONE";
  }).length;

  return (
    <section className="space-y-4">
      <div className="portal-card-premium p-5">
        <h2 className="text-lg font-extrabold text-slate-900">Proyectos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Estado, avances y observaciones de tus proyectos en curso y finalizados.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {active} activos
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            {completed} finalizados
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
            {projects.length} totales
          </span>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="portal-card-premium p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
            <BriefcaseBusiness className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Sin proyectos todavía</p>
          <p className="mt-1 text-xs text-slate-500">No hay proyectos asociados a tu cuenta.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {projects.map((project) => {
            const statusConfig = getStatusConfig(project.status);
            const priorityConfig = getPriorityConfig(project.priority);
            const progress = calculateProgress(project.startDate, project.endDate);

            return (
              <article key={project.id} className="portal-card-premium overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900">{project.title}</h3>
                    <span className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusConfig.color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                      {statusConfig.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Target className="h-3.5 w-3.5" />
                      {project.serviceArea || "General"}
                    </div>
                    <div className={`flex items-center gap-1.5 ${priorityConfig.color}`}>
                      <Flag className="h-3.5 w-3.5" />
                      {priorityConfig.label}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(project.startDate)}
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDate(project.endDate)}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {progress !== null ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-600">Progreso temporal</span>
                        <span className="font-bold text-blue-700">{progress}%</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {project.description ? (
                    <p className="mt-3 text-sm leading-6 text-slate-600 line-clamp-3">{project.description}</p>
                  ) : null}

                  {project.scope ? (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 mb-1">Alcance</p>
                      <p className="text-xs text-slate-600 line-clamp-2">{project.scope}</p>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
