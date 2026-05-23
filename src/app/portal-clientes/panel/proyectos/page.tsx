import { BriefcaseBusiness } from "lucide-react";
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

export default async function PortalProyectosPage() {
  const session = await requirePortalSession();
  const projects = await prisma.project.findMany({
    where: { clientId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">Proyectos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Estado, avances y observaciones de tus proyectos en curso y finalizados.
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">
          <BriefcaseBusiness className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          No hay proyectos asociados a tu cuenta todavía.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {projects.map((project) => (
            <article key={project.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900">{project.title}</h3>
                <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                  {project.status || "Sin estado"}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Área: {project.serviceArea || "General"} · Prioridad: {project.priority || "Normal"}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Inicio: {formatDate(project.startDate)} · Cierre: {formatDate(project.endDate)}
              </p>
              {project.description ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">{project.description}</p>
              ) : null}
              {project.scope ? (
                <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {project.scope}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

