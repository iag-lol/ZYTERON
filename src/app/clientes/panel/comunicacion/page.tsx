import { MessageCircle, Shield } from "lucide-react";
import { CommunicationsCenter } from "@/components/portal/panel/communications-center";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { getClientPortalSnapshot } from "@/lib/portal/data";

export default async function PortalComunicacionPage() {
  const session = await requirePortalSession();
  const snapshot = await getClientPortalSnapshot(session.user.id);

  const serialized = snapshot.communications.map((item) => ({
    id: item.id,
    subject: item.subject,
    message: item.message,
    direction: item.direction,
    channel: item.channel,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <section className="space-y-4">
      <div className="portal-card-premium p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Centro de comunicación</h2>
            <p className="mt-1 text-sm text-slate-600">
              Mensajería bidireccional con el equipo Zyteron. Envía consultas, revisa respuestas y mantén todo tu historial organizado.
            </p>
          </div>
          <div className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <Shield className="h-3.5 w-3.5" />
            Cifrado
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
            <MessageCircle className="h-3 w-3" />
            {serialized.length} mensajes totales
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            Auto-refresh cada 15s
          </span>
        </div>
      </div>

      <CommunicationsCenter initialCommunications={serialized} />
    </section>
  );
}
