import Link from "next/link";
import { BriefcaseBusiness, Clock3, Plus, Receipt, Workflow } from "lucide-react";
import { currencyCLP } from "@/lib/admin/quote";
import { getProjects } from "@/lib/admin/repository";

export default async function ProyectosPage() {
  const projects = (await getProjects()).slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const totalCharge = projects.reduce((acc, project) => acc + (project.totalCharge || 0), 0);
  const activeCount = projects.filter((project) => ["En curso", "Planificado"].includes(project.status || "")).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Operaciones</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Proyectos</h1>
          <p className="mt-1 text-sm text-slate-500">{projects.length} proyectos registrados · {currencyCLP(totalCharge)} comprometidos</p>
        </div>
        <Link
          href="/admin/proyectos/nuevo"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Nuevo proyecto
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Activos", value: activeCount, helper: "En ejecución o planificados", icon: Workflow },
          { label: "Horas estimadas", value: projects.reduce((acc, project) => acc + (project.estimatedHours || 0), 0), helper: "Carga proyectada", icon: Clock3 },
          { label: "Cobros asociados", value: currencyCLP(totalCharge), helper: "Monto comprometido", icon: Receipt },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700">
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-extrabold text-slate-900">{card.value}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          <span>Proyecto</span>
          <span>Fechas</span>
          <span>Estado</span>
          <span>Horas</span>
          <span>Cobro</span>
        </div>
        <div className="divide-y divide-slate-100">
          {projects.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-slate-500">Aún no hay proyectos registrados.</div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <BriefcaseBusiness className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{project.title}</p>
                      <p className="text-xs text-slate-500">{project.serviceArea || "Sin área"} · {project.priority || "Normal"}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-500">{project.description || "Sin descripción."}</p>
                </div>
                <div className="text-slate-600">
                  <p>{project.startDate || "Sin inicio"}</p>
                  <p className="text-xs text-slate-400">{project.startTime || "--:--"} → {project.endTime || "--:--"}</p>
                  <p className="mt-1 text-xs text-slate-400">Término {project.endDate || "Pendiente"}</p>
                </div>
                <div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{project.status || "Planificado"}</span></div>
                <div className="text-slate-600">
                  <p>Est. {project.estimatedHours || 0}h</p>
                  <p className="text-xs text-slate-400">Real {project.actualHours || 0}h</p>
                </div>
                <div className="font-semibold text-slate-900">{currencyCLP(project.totalCharge || 0)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
