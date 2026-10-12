import { assertAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { ClientResources } from "@/components/admin/client-resources";
export const dynamic = "force-dynamic";
export default async function ClientResourcesPage() {
  await assertAdmin();
  const [users, services, events, quotes, projects] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CLIENT" },
      select: { id: true, name: true, company: true },
      orderBy: { name: "asc" },
    }),
    prisma.$queryRaw<
      Array<{
        id: string;
        user_id: string;
        service_name: string;
        sla: string | null;
        start_date: Date;
        renewal_date: Date | null;
        agreed_price: string | null;
        billing_frequency: string | null;
        status: string;
        portal_visible: boolean;
        legacy_quote_id: string | null;
        legacy_project_id: string | null;
      }>
    >`SELECT s.id,l.user_id,s.service_name,s.sla,s.start_date,s.renewal_date,s.agreed_price,s.billing_frequency,s.status,s.portal_visible,s.legacy_quote_id,s.legacy_project_id FROM client_services s JOIN zyteron_legacy_client_link l ON l.client_id=s.client_id ORDER BY s.created_at DESC LIMIT 200`,
    prisma.$queryRaw<
      Array<{
        id: string;
        user_id: string;
        title: string;
        description: string | null;
        occurred_at: Date;
        visibility: string;
      }>
    >`SELECT e.id,l.user_id,e.title,e.description,e.occurred_at,e.visibility FROM client_events e JOIN zyteron_legacy_client_link l ON l.client_id=e.client_id WHERE event_type='MEETING' ORDER BY e.occurred_at DESC LIMIT 200`,
    prisma.quote.findMany({
      where: { userId: { not: null } },
      select: { id: true, userId: true, name: true, total: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.project.findMany({
      where: { clientId: { not: null } },
      select: { id: true, clientId: true, title: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);
  const resources = [
    ...services.map((s) => ({
      id: s.id,
      userId: s.user_id,
      kind: "SERVICE" as const,
      quoteId: s.legacy_quote_id || "",
      projectId: s.legacy_project_id || "",
      title: s.service_name,
      description: s.sla || "",
      date: s.start_date.toISOString().slice(0, 10),
      renewal: s.renewal_date?.toISOString().slice(0, 10) || "",
      price: Number(s.agreed_price || 0),
      frequency: s.billing_frequency || "ONE_TIME",
      status: s.status,
      published: s.portal_visible,
    })),
    ...events.map((e) => ({
      id: e.id,
      userId: e.user_id,
      kind: "EVENT" as const,
      quoteId: "",
      projectId: "",
      title: e.title,
      description: e.description || "",
      date: e.occurred_at.toISOString().slice(0, 10),
      renewal: "",
      price: 0,
      frequency: "ONE_TIME",
      status: "PENDING_ACTIVATION",
      published: e.visibility === "CLIENT_VISIBLE",
    })),
  ];
  return (
    <section className="space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-widest text-emerald-700 uppercase">
          CLIENTE Y EQUIPO, CONECTADOS
        </p>
        <h1 className="mt-2 text-3xl font-bold">Servicios y agenda de clientes</h1>
        <p className="mt-2 text-sm text-slate-600">
          Gestiona qué servicios y compromisos aparecen en cada portal. Los documentos, informes y
          credenciales se comparten desde la ficha del cliente.
        </p>
      </header>
      <ClientResources
        users={users}
        resources={resources}
        quotes={quotes.map((q) => ({
          id: q.id,
          userId: q.userId!,
          title: q.name + " · $" + q.total.toLocaleString("es-CL"),
        }))}
        projects={projects.map((p) => ({ id: p.id, userId: p.clientId!, title: p.title }))}
      />
    </section>
  );
}
