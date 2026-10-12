import { MessageCircle, Shield } from "lucide-react";
import { CommunicationsCenter } from "@/components/portal/panel/communications-center";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { getClientPortalSnapshot } from "@/lib/portal/data";
import { clientDatabase } from "@/lib/portal/scoped-db";

export default async function PortalComunicacionPage() {
  const session = await requirePortalSession();
  const snapshot = await getClientPortalSnapshot(session.user.id);
  const chatMessages = await clientDatabase(
    session.user.id,
    (db) =>
      db.$queryRaw<
        Array<{
          id: string;
          body_text: string;
          direction: string;
          actor_kind: string;
          created_at: Date;
        }>
      >`SELECT m.id,m.body_text,m.direction,m.actor_kind,m.created_at FROM sales_messages m JOIN sales_threads t ON t.id=m.thread_id WHERE t.channel='WEB_CHAT' ORDER BY m.created_at DESC LIMIT 100`,
  );

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
              Mensajería bidireccional con el equipo Zyteron. Envía consultas, revisa respuestas y
              mantén todo tu historial organizado.
            </p>
          </div>
          <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <Shield className="h-3.5 w-3.5" />
            Acceso privado
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
            <MessageCircle className="h-3 w-3" />
            {serialized.length} mensajes totales
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
            Seguimiento de tu conversación
          </span>
        </div>
      </div>

      <CommunicationsCenter initialCommunications={serialized} />
      <section className="resource-list">
        <header className="resource-row">
          <h2>Tu historial con Zara y nuestro equipo</h2>
          <p>Conversaciones vinculadas a tu cuenta verificada.</p>
        </header>
        {chatMessages.map((m) => (
          <article className="resource-row" key={m.id}>
            <small>
              {m.direction === "INBOUND"
                ? "Tú"
                : m.actor_kind === "AI"
                  ? "Zara · Asistente IA"
                  : "Equipo Zyteron"}{" "}
              · {m.created_at.toLocaleString("es-CL", { timeZone: "America/Santiago" })}
            </small>
            <p className="whitespace-pre-wrap">{m.body_text}</p>
          </article>
        ))}
        {!chatMessages.length && (
          <p className="resource-row">Todavía no tienes conversaciones vinculadas a esta cuenta.</p>
        )}
      </section>
    </section>
  );
}
