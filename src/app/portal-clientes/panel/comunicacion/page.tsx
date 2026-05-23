import { MessageCircle } from "lucide-react";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { getClientPortalSnapshot } from "@/lib/portal/data";

function formatDate(value: Date) {
  return value.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PortalComunicacionPage() {
  const session = await requirePortalSession();
  const snapshot = await getClientPortalSnapshot(session.user.id);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">Comunicación y seguimiento</h2>
        <p className="mt-1 text-sm text-slate-600">
          Historial de mensajes, avisos y actualizaciones entre tu equipo y Zyteron.
        </p>
      </div>

      {snapshot.communications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">
          <MessageCircle className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          Sin comunicaciones registradas.
        </div>
      ) : (
        <div className="space-y-3">
          {snapshot.communications.map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-900">{item.subject}</p>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                  {item.direction}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{item.message}</p>
              <p className="mt-2 text-xs text-slate-500">
                Canal: {item.channel} · {formatDate(item.createdAt)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

