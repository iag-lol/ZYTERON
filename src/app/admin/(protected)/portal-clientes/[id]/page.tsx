import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck, CircleX } from "lucide-react";
import { PortalClientAdminActions } from "@/components/admin/portal-client-admin-actions";
import { getPortalAdminClientDetail } from "@/lib/portal/data";

type Params = {
  params: Promise<{ id: string }>;
};

function formatDate(value?: Date | null) {
  if (!value) return "—";
  return value.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminPortalClienteDetallePage({ params }: Params) {
  const { id } = await params;
  const detail = await getPortalAdminClientDetail(id);
  if (!detail) notFound();

  const { user, quotes, projects, sales, documents, taxDocuments, tickets, credentials, requests, communications, audit } = detail;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link
              href="/admin/portal-clientes"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Ficha de cliente</p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{user.name}</h1>
              <p className="mt-1 text-sm text-slate-600">{user.email} · {user.company || "Sin empresa"}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              Estado: {user.accountStatus}
            </span>
            {user.emailVerifiedAt ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <CircleCheck className="h-3.5 w-3.5" />
                Correo verificado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                <CircleX className="h-3.5 w-3.5" />
                Correo pendiente
              </span>
            )}
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Cotizaciones", value: quotes.length },
          { label: "Proyectos", value: projects.length },
          { label: "Compras", value: sales.length },
          { label: "Boletas", value: taxDocuments.length },
          { label: "Documentos", value: documents.length },
          { label: "Tickets", value: tickets.length },
          { label: "Credenciales", value: credentials.length },
          { label: "Solicitudes", value: requests.length },
        ].map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-2xl font-extrabold text-slate-900">{item.value}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{item.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 2xl:grid-cols-[1.1fr_1fr]">
        <PortalClientAdminActions
          userId={user.id}
          initial={{
            firstName: user.firstName || user.name.split(" ")[0] || "",
            lastName: user.lastName || user.name.split(" ").slice(1).join(" ") || "",
            company: user.company || "",
            phone: user.phone || "",
            notes: user.notes || "",
            accountStatus: user.accountStatus,
          }}
        />

        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Resumen perfil</h3>
            <div className="mt-3 space-y-1.5 text-sm text-slate-600">
              <p><span className="font-semibold">Empresa:</span> {user.company || "—"}</p>
              <p><span className="font-semibold">Teléfono:</span> {user.phone || "—"}</p>
              <p><span className="font-semibold">RUT:</span> {user.rut || "—"}</p>
              <p><span className="font-semibold">Industria:</span> {user.industry || "—"}</p>
              <p><span className="font-semibold">Tier:</span> {user.tier || "—"}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Actividad reciente</h3>
            <div className="mt-3 space-y-2">
              {audit.slice(0, 12).map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-800">{log.action}</p>
                  <p className="text-[11px] text-slate-500">
                    {log.entityType} · {formatDate(log.createdAt)}
                  </p>
                </div>
              ))}
              {audit.length === 0 ? (
                <p className="text-sm text-slate-500">Sin actividad registrada.</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Tickets y comunicación</h3>
            <div className="mt-3 space-y-2">
              {tickets.slice(0, 4).map((ticket) => (
                <div key={ticket.id} className="rounded-lg border border-slate-200 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">{ticket.title}</p>
                  <p className="text-xs text-slate-500">{ticket.status} · {ticket.priority}</p>
                </div>
              ))}
              {communications.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-900">{item.subject}</p>
                  <p className="text-xs text-slate-500">{item.direction} · {formatDate(item.createdAt)}</p>
                </div>
              ))}
              {tickets.length === 0 && communications.length === 0 ? (
                <p className="text-sm text-slate-500">Sin registros de soporte o comunicaciones.</p>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
