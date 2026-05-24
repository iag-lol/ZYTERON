import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CircleCheck,
  CircleX,
  FileText,
  FolderKanban,
  LifeBuoy,
  Receipt,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
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

function currencyCLP(value?: number | null) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export default async function AdminPortalClienteDetallePage({ params }: Params) {
  const { id } = await params;
  const detail = await getPortalAdminClientDetail(id);
  if (!detail) notFound();

  const {
    user,
    quotes,
    projects,
    sales,
    documents,
    taxDocuments,
    tickets,
    credentials,
    requests,
    communications,
    audit,
  } = detail;

  const totalSales = sales.reduce((acc, sale) => acc + (sale.total || 0), 0);
  const totalTax = taxDocuments.reduce((acc, doc) => acc + (doc.totalAmount || 0), 0);

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-6 md:px-7">
          <div className="pointer-events-none absolute right-2 top-1 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Link
                href="/admin/portal-clientes"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Ficha empresarial</p>
                <h1 className="mt-1 text-2xl font-extrabold text-slate-900 md:text-3xl">{user.name}</h1>
                <p className="mt-1 text-sm text-slate-600">
                  {user.email} · {user.company || "Sin empresa"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                Estado: {user.accountStatus}
              </span>
              {user.emailVerifiedAt ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CircleCheck className="h-3.5 w-3.5" />
                  Verificado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                  <CircleX className="h-3.5 w-3.5" />
                  Pendiente
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Comercial generado",
              value: currencyCLP(totalSales),
              helper: `${sales.length} compras registradas`,
              icon: ShoppingBag,
            },
            {
              label: "Documentación tributaria",
              value: currencyCLP(totalTax),
              helper: `${taxDocuments.length} boletas/facturas`,
              icon: Receipt,
            },
            {
              label: "Carga de ejecución",
              value: `${projects.length}`,
              helper: `${documents.length} documentos · ${credentials.length} credenciales`,
              icon: FolderKanban,
            },
            {
              label: "Soporte y seguimiento",
              value: `${tickets.length}`,
              helper: `${requests.length} solicitudes · ${communications.length} comunicaciones`,
              icon: LifeBuoy,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="flex items-center gap-3 bg-slate-50 px-5 py-4">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-xl font-extrabold text-slate-900">{item.value}</p>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
                  <p className="text-xs text-slate-500">{item.helper}</p>
                </div>
              </article>
            );
          })}
        </div>
      </header>

      <section className="grid gap-6 2xl:grid-cols-[1.35fr_1fr]">
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
            <h3 className="text-sm font-bold text-slate-900">Perfil corporativo</h3>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <p>
                <span className="font-semibold text-slate-800">Empresa:</span> {user.company || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Teléfono:</span> {user.phone || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">RUT:</span> {user.rut || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Industria:</span> {user.industry || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Tier:</span> {user.tier || "—"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Alta:</span> {formatDate(user.createdAt)}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900">Actividad reciente</h3>
            <div className="mt-3 space-y-2">
              {audit.slice(0, 10).map((log) => (
                <div key={log.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-800">{log.action}</p>
                  <p className="text-[11px] text-slate-500">
                    {log.entityType} · {formatDate(log.createdAt)}
                  </p>
                </div>
              ))}
              {audit.length === 0 ? <p className="text-sm text-slate-500">Sin actividad registrada.</p> : null}
            </div>
          </section>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Cotizaciones</h3>
          <div className="mt-3 space-y-2">
            {quotes.slice(0, 4).map((quote) => (
              <div key={quote.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{quote.name || "Cotización sin nombre"}</p>
                <p className="text-xs text-slate-500">{quote.status || "PENDING"} · {formatDate(quote.createdAt)}</p>
              </div>
            ))}
            {quotes.length === 0 ? <p className="text-sm text-slate-500">Sin cotizaciones asociadas.</p> : null}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Proyectos y entrega</h3>
          <div className="mt-3 space-y-2">
            {projects.slice(0, 4).map((project) => (
              <div key={project.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                <p className="text-xs text-slate-500">{project.status || "Sin estado"} · {formatDate(project.createdAt)}</p>
              </div>
            ))}
            {projects.length === 0 ? <p className="text-sm text-slate-500">Sin proyectos vinculados.</p> : null}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Soporte y comunicaciones</h3>
          <div className="mt-3 space-y-2">
            {tickets.slice(0, 3).map((ticket) => (
              <div key={ticket.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{ticket.title}</p>
                <p className="text-xs text-slate-500">{ticket.status} · {ticket.priority}</p>
              </div>
            ))}
            {communications.slice(0, 2).map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{item.subject}</p>
                <p className="text-xs text-slate-500">{item.direction} · {formatDate(item.createdAt)}</p>
              </div>
            ))}
            {tickets.length === 0 && communications.length === 0 ? (
              <p className="text-sm text-slate-500">Sin registros de soporte o comunicación.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
          <h3 className="text-sm font-bold text-slate-900">Credenciales y accesos</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {credentials.slice(0, 6).map((credential) => (
              <div key={credential.id} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-sm font-semibold text-slate-900">{credential.serviceName}</p>
                <p className="text-xs text-slate-500">
                  {credential.username || "Sin usuario"} ·{" "}
                  {credential.hasSecret ? "Con secreto cifrado" : "Sin secreto"} · {formatDate(credential.createdAt)}
                </p>
              </div>
            ))}
            {credentials.length === 0 ? (
              <p className="text-sm text-slate-500">No hay credenciales registradas para este cliente.</p>
            ) : null}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Identidad y seguridad</h3>
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UserRound className="h-4 w-4 text-blue-700" />
                Cuenta de cliente
              </div>
              <p className="mt-1 text-xs text-slate-500">{user.email}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                Verificación
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {user.emailVerifiedAt ? `Verificado el ${formatDate(user.emailVerifiedAt)}` : "Correo pendiente"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileText className="h-4 w-4 text-indigo-700" />
                Estado actual
              </div>
              <p className="mt-1 text-xs text-slate-500">{user.accountStatus}</p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
