import Link from "next/link";
import { CircleCheck, CircleX, Search } from "lucide-react";
import { PortalCreateUserForm } from "@/components/admin/portal-create-user-form";
import { getPortalClientsAdminOverview } from "@/lib/portal/data";

type SearchParams = Promise<{
  q?: string;
  verified?: "yes" | "no" | "all";
  status?: "ACTIVE" | "DISABLED" | "PENDING" | "all";
}>;

export default async function AdminPortalClientesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const users = await getPortalClientsAdminOverview({
    search: params.q || "",
    verified: params.verified || "all",
    status: params.status || "all",
  });

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Portal de Clientes</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Administración de cuentas privadas</h1>
        <p className="mt-2 text-sm text-slate-600">
          Crea usuarios, controla verificación, activa/desactiva cuentas y gestiona su información integrada.
        </p>
      </header>

      <PortalCreateUserForm />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={params.q || ""}
                placeholder="Buscar por nombre, correo o empresa..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm"
              />
            </div>
            <select name="verified" defaultValue={params.verified || "all"} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
              <option value="all">Verificación: todos</option>
              <option value="yes">Verificados</option>
              <option value="no">No verificados</option>
            </select>
            <select name="status" defaultValue={params.status || "all"} className="h-10 rounded-lg border border-slate-200 px-3 text-sm">
              <option value="all">Estado: todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="PENDING">Pendientes</option>
              <option value="DISABLED">Desactivados</option>
            </select>
            <button type="submit" className="h-10 rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800">
              Filtrar
            </button>
          </form>
        </div>

        <div className="grid grid-cols-[1.3fr_1fr_0.7fr_0.8fr_0.8fr_auto] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
          <span>Cliente</span>
          <span>Empresa</span>
          <span>Estado</span>
          <span>Verificación</span>
          <span>Módulos</span>
          <span>Acciones</span>
        </div>

        {users.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">No hay usuarios con esos filtros.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((user) => (
              <div key={user.id} className="grid grid-cols-[1.3fr_1fr_0.7fr_0.8fr_0.8fr_auto] items-center gap-3 px-5 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
                <p className="text-slate-600">{user.company || "—"}</p>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  {user.accountStatus}
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
                  {user._count.projects} proyectos · {user._count.documents} docs
                </span>
                <div className="text-right">
                  <Link
                    href={`/admin/portal-clientes/${user.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Ver ficha
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
