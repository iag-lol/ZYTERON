import { ClipboardPlus } from "lucide-react";
import { PortalRequestForm } from "@/components/portal/panel/portal-request-form";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return value.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PortalSolicitudesPage() {
  const session = await requirePortalSession();
  const requests = await prisma.portalRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 120,
  });

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">Crear web / nuevas solicitudes</h2>
        <p className="mt-1 text-sm text-slate-600">
          Inicia nuevos procesos: web, rediseño, soporte, integraciones, cambios o cotización.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Nuevo requerimiento</h3>
          <div className="mt-4">
            <PortalRequestForm />
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Historial de solicitudes</h3>
          <div className="mt-4 space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{request.title}</p>
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                    {request.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {request.type} · {formatDate(request.createdAt)}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{request.details}</p>
              </div>
            ))}
            {requests.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-3 py-10 text-center text-sm text-slate-500">
                <ClipboardPlus className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                No has generado solicitudes todavía.
              </div>
            ) : null}
          </div>
        </article>
      </div>
    </section>
  );
}

