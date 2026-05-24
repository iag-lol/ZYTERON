import Link from "next/link";
import {
  BriefcaseBusiness,
  CircleCheck,
  CircleX,
  FolderKanban,
  LifeBuoy,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { PortalCreateUserForm } from "@/components/admin/portal-create-user-form";
import { getPortalClientsAdminOverview } from "@/lib/portal/data";

type SearchParams = Promise<{
  q?: string;
  company?: string;
  verified?: "yes" | "no" | "all";
  status?: "ACTIVE" | "DISABLED" | "PENDING" | "all";
}>;

function statusLabel(status: "ACTIVE" | "DISABLED" | "PENDING") {
  if (status === "ACTIVE") return "Activo";
  if (status === "DISABLED") return "Desactivado";
  return "Pendiente";
}

function statusTone(status: "ACTIVE" | "DISABLED" | "PENDING") {
  if (status === "ACTIVE") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "DISABLED") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default async function AdminPortalClientesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const users = await getPortalClientsAdminOverview({
    search: params.q || "",
    company: params.company || "",
    verified: params.verified || "all",
    status: params.status || "all",
  });

  const metrics = users.reduce(
    (acc, user) => {
      acc.total += 1;
      if (user.emailVerifiedAt) acc.verified += 1;
      if (!user.emailVerifiedAt) acc.pendingVerification += 1;
      if (user.accountStatus === "ACTIVE") acc.active += 1;
      if (user.accountStatus === "DISABLED") acc.disabled += 1;
      acc.projects += user._count.projects;
      acc.documents += user._count.documents;
      acc.tickets += user._count.supportTickets;
      return acc;
    },
    {
      total: 0,
      verified: 0,
      pendingVerification: 0,
      active: 0,
      disabled: 0,
      projects: 0,
      documents: 0,
      tickets: 0,
    },
  );

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-6 md:px-7">
          <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-blue-500/10 blur-2xl" />
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-600">Portal de Clientes</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 md:text-3xl">
            Centro de administración empresarial
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Gestiona identidades, seguridad, documentos, proyectos y soporte desde un módulo unificado con trazabilidad
            operacional por cliente.
          </p>
        </div>
        <div className="grid gap-px border-t border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Clientes en portal",
              value: metrics.total,
              helper: `${metrics.active} activos · ${metrics.disabled} desactivados`,
              icon: UserRound,
            },
            {
              label: "Correo verificado",
              value: metrics.verified,
              helper: `${metrics.pendingVerification} pendientes`,
              icon: ShieldCheck,
            },
            {
              label: "Carga documental",
              value: metrics.documents,
              helper: `${metrics.projects} proyectos asociados`,
              icon: FolderKanban,
            },
            {
              label: "Soporte acumulado",
              value: metrics.tickets,
              helper: "Tickets registrados",
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

      <PortalCreateUserForm />

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4 md:px-6">
          <form className="grid gap-2 md:grid-cols-[1.2fr_1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={params.q || ""}
                placeholder="Buscar por nombre o correo..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm"
              />
            </div>
            <div className="relative">
              <BriefcaseBusiness className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="company"
                defaultValue={params.company || ""}
                placeholder="Filtrar por empresa..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm"
              />
            </div>
            <select
              name="verified"
              defaultValue={params.verified || "all"}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            >
              <option value="all">Verificación: todos</option>
              <option value="yes">Verificados</option>
              <option value="no">No verificados</option>
            </select>
            <select
              name="status"
              defaultValue={params.status || "all"}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
            >
              <option value="all">Estado: todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="PENDING">Pendientes</option>
              <option value="DISABLED">Desactivados</option>
            </select>
            <button
              type="submit"
              className="h-10 rounded-xl bg-blue-700 px-5 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Aplicar
            </button>
          </form>
        </div>

        {users.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-500">No hay usuarios con esos filtros.</div>
        ) : (
          <>
            <div className="hidden md:block">
              <div className="grid grid-cols-[1.3fr_1fr_0.7fr_0.85fr_0.9fr_auto] gap-3 border-b border-slate-200 bg-slate-50 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                <span>Cliente</span>
                <span>Empresa</span>
                <span>Estado</span>
                <span>Verificación</span>
                <span>Módulos</span>
                <span className="text-right">Acciones</span>
              </div>
              <div className="divide-y divide-slate-100">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="grid grid-cols-[1.3fr_1fr_0.7fr_0.85fr_0.9fr_auto] items-center gap-3 px-6 py-3 text-sm transition hover:bg-blue-50/30"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <p className="text-slate-600">{user.company || "—"}</p>
                    <span
                      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(user.accountStatus)}`}
                    >
                      {statusLabel(user.accountStatus)}
                    </span>
                    {user.emailVerifiedAt ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <CircleCheck className="h-3.5 w-3.5" />
                        Verificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                        <CircleX className="h-3.5 w-3.5" />
                        Pendiente
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {user._count.projects} proyectos · {user._count.supportTickets} tickets
                    </span>
                    <div className="text-right">
                      <Link
                        href={`/admin/portal-clientes/${user.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Abrir ficha
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {users.map((user) => (
                <article key={user.id} className="space-y-3 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(user.accountStatus)}`}
                    >
                      {statusLabel(user.accountStatus)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <p>
                      <span className="font-semibold text-slate-800">Empresa:</span> {user.company || "—"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Verificación:</span>{" "}
                      {user.emailVerifiedAt ? "Verificado" : "Pendiente"}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Proyectos:</span> {user._count.projects}
                    </p>
                    <p>
                      <span className="font-semibold text-slate-800">Tickets:</span> {user._count.supportTickets}
                    </p>
                  </div>
                  <Link
                    href={`/admin/portal-clientes/${user.id}`}
                    className="inline-flex h-9 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Abrir ficha cliente
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
