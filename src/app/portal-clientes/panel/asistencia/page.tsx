import { CheckCircle, Clock, LifeBuoy, AlertCircle } from "lucide-react";
import { SupportTicketCenter } from "@/components/portal/panel/support-ticket-center";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { prisma } from "@/lib/prisma";

export default async function PortalAsistenciaPage() {
  const session = await requirePortalSession();
  const [tickets, projects] = await Promise.all([
    prisma.supportTicket.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 120,
      include: {
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: "asc" },
          take: 40,
          select: {
            id: true,
            authorRole: true,
            message: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.project.findMany({
      where: { clientId: session.user.id },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const openCount = tickets.filter((t) => {
    const s = String(t.status).toUpperCase();
    return s !== "RESOLVED" && s !== "CLOSED";
  }).length;
  const resolvedCount = tickets.filter((t) => {
    const s = String(t.status).toUpperCase();
    return s === "RESOLVED" || s === "CLOSED";
  }).length;

  return (
    <section className="space-y-4">
      <div className="portal-card-premium p-5">
        <h2 className="text-lg font-extrabold text-slate-900">Asistencia y ayuda</h2>
        <p className="mt-1 text-sm text-slate-600">
          Registra solicitudes, conversa con soporte y realiza seguimiento de cada caso.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">{openCount}</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Abiertos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">{resolvedCount}</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Resueltos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100">
              <LifeBuoy className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-slate-900">{tickets.length}</p>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">Totales</p>
            </div>
          </div>
        </div>
      </div>

      <SupportTicketCenter
        projects={projects}
        initialTickets={tickets.map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          messages: ticket.messages.map((message) => ({
            id: message.id,
            authorRole: message.authorRole,
            message: message.message,
            createdAt: message.createdAt.toISOString(),
          })),
        }))}
      />
    </section>
  );
}
