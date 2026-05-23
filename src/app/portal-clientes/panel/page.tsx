import Link from "next/link";
import {
  Bell,
  BriefcaseBusiness,
  FileDigit,
  FileText,
  LifeBuoy,
  ReceiptText,
} from "lucide-react";
import { PortalMetricCard } from "@/components/portal/panel/metric-card";
import { requirePortalSession } from "@/lib/auth/portal-session";
import { currencyCLP, getClientPortalSnapshot } from "@/lib/portal/data";

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return value.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function PortalDashboardPage() {
  const session = await requirePortalSession();
  const snapshot = await getClientPortalSnapshot(session.user.id);
  const totalSales = snapshot.sales.reduce((acc, sale) => acc + (sale.total || 0), 0);
  const pendingQuotes = snapshot.quotes.filter((quote) => String(quote.status).toUpperCase() === "PENDING").length;
  const activeProjects = snapshot.projects.filter((item) => {
    const status = String(item.status || "").toUpperCase();
    return status === "ACTIVE" || status === "IN_PROGRESS" || status === "EN_CURSO";
  }).length;
  const openTickets = snapshot.tickets.filter((ticket) => {
    const status = String(ticket.status || "").toUpperCase();
    return status !== "RESOLVED" && status !== "CLOSED";
  }).length;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Bienvenido</p>
        <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
          {snapshot.user?.firstName || session.user.name || "Cliente"}, este es tu portal privado
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Revisa estado de cuenta, proyectos, cotizaciones, documentación y soporte en un solo lugar.
          Toda la información está vinculada a tu correo y cuenta.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PortalMetricCard
          label="Proyectos activos"
          value={activeProjects}
          helper={`${snapshot.projects.length} proyectos totales`}
          icon={BriefcaseBusiness}
          tone="blue"
        />
        <PortalMetricCard
          label="Cotizaciones pendientes"
          value={pendingQuotes}
          helper={`${snapshot.quotes.length} cotizaciones registradas`}
          icon={FileDigit}
          tone="amber"
        />
        <PortalMetricCard
          label="Compras / historial"
          value={currencyCLP(totalSales)}
          helper={`${snapshot.sales.length} compras registradas`}
          icon={ReceiptText}
          tone="emerald"
        />
        <PortalMetricCard
          label="Soporte abierto"
          value={openTickets}
          helper={`${snapshot.tickets.length} tickets totales`}
          icon={LifeBuoy}
          tone="violet"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Últimos documentos</h3>
            <Link href="/portal-clientes/panel/documentos" className="text-xs font-semibold text-blue-700 hover:text-blue-800">
              Ver todo
            </Link>
          </div>
          <div className="space-y-2.5">
            {snapshot.documents.slice(0, 4).map((doc) => (
              <div key={doc.id} className="rounded-xl border border-slate-200 px-3.5 py-3">
                <p className="text-sm font-semibold text-slate-900">{doc.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {doc.category} · {formatDate(doc.createdAt)}
                </p>
              </div>
            ))}
            {snapshot.documents.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-3.5 py-6 text-center text-sm text-slate-500">
                Aún no tienes documentos en tu carpeta privada.
              </div>
            ) : null}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Comunicaciones recientes</h3>
            <Link href="/portal-clientes/panel/comunicacion" className="text-xs font-semibold text-blue-700 hover:text-blue-800">
              Ver historial
            </Link>
          </div>
          <div className="space-y-2.5">
            {snapshot.communications.slice(0, 4).map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 px-3.5 py-3">
                <p className="text-sm font-semibold text-slate-900">{item.subject}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {item.channel} · {formatDate(item.createdAt)}
                </p>
              </div>
            ))}
            {snapshot.communications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-3.5 py-6 text-center text-sm text-slate-500">
                No hay comunicaciones registradas todavía.
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Link href="/portal-clientes/panel/proyectos" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <BriefcaseBusiness className="h-5 w-5 text-blue-700" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">Ver proyectos</h3>
          <p className="mt-1 text-xs text-slate-500">Estados, avances, entregables y fechas.</p>
        </Link>
        <Link href="/portal-clientes/panel/asistencia" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <LifeBuoy className="h-5 w-5 text-blue-700" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">Asistencia y tickets</h3>
          <p className="mt-1 text-xs text-slate-500">Abre solicitudes y revisa su avance.</p>
        </Link>
        <Link href="/portal-clientes/panel/solicitudes" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
          <FileText className="h-5 w-5 text-blue-700" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">Crear nueva solicitud</h3>
          <p className="mt-1 text-xs text-slate-500">Nueva web, rediseño, integración, soporte y más.</p>
        </Link>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Bell className="h-4 w-4 text-blue-700" />
          <h3 className="text-sm font-bold text-slate-900">Notificaciones recientes</h3>
        </div>
        <div className="space-y-2">
          {snapshot.notifications.slice(0, 6).map((notification) => (
            <div
              key={notification.id}
              className={`rounded-xl border px-3.5 py-3 ${
                notification.isRead ? "border-slate-200 bg-white" : "border-blue-200 bg-blue-50/60"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
              <p className="mt-1 text-xs text-slate-600">{notification.body}</p>
              <p className="mt-1 text-[11px] text-slate-500">{formatDate(notification.createdAt)}</p>
            </div>
          ))}
          {snapshot.notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-3.5 py-6 text-center text-sm text-slate-500">
              No tienes notificaciones por ahora.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

