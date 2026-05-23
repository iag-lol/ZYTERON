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

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">Asistencia y ayuda</h2>
        <p className="mt-1 text-sm text-slate-600">
          Registra solicitudes, conversa con soporte y realiza seguimiento de cada caso.
        </p>
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
