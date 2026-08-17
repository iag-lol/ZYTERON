import Link from "next/link";
import { Building2, Mail, Phone, Sparkles } from "lucide-react";

import { listCompanies } from "@/lib/sales-ai/repository";
import { SALES_STATUSES, SALES_STATUS_LABELS, SALES_POTENTIALS, type SalesStatus, type SalesPotential } from "@/lib/sales-ai/types";

export const dynamic = "force-dynamic";

export const metadata = { title: "Prospectos" };

const POTENTIAL_STYLES: Record<string, string> = {
  ALTO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  POTENCIAL: "bg-blue-50 text-blue-700 border-blue-200",
  MEDIO: "bg-slate-100 text-slate-700 border-slate-300",
  BAJO: "bg-slate-50 text-slate-500 border-slate-200",
};

const STATUS_STYLES: Record<string, string> = {
  NUEVO: "bg-sky-50 text-sky-700 border-sky-200",
  INVESTIGADO: "bg-indigo-50 text-indigo-700 border-indigo-200",
  CONTACTADO: "bg-violet-50 text-violet-700 border-violet-200",
  RESPONDIO: "bg-cyan-50 text-cyan-700 border-cyan-200",
  INTERESADO: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PRESUPUESTO_ENVIADO: "bg-amber-50 text-amber-700 border-amber-200",
  NEGOCIACION: "bg-orange-50 text-orange-700 border-orange-200",
  GANADO: "bg-emerald-600 text-white border-emerald-600",
  PERDIDO: "bg-rose-50 text-rose-700 border-rose-200",
  EN_PAUSA: "bg-slate-100 text-slate-600 border-slate-300",
};

type PageProps = {
  searchParams: Promise<{ estado?: string; potencial?: string; q?: string }>;
};

export default async function ProspectosPage({ searchParams }: PageProps) {
  const params = await searchParams;

  let companies: Awaited<ReturnType<typeof listCompanies>>["companies"] = [];
  let total = 0;
  let loadError: string | null = null;

  try {
    const result = await listCompanies({
      status: (params.estado as SalesStatus) || "TODOS",
      potential: (params.potencial as SalesPotential) || "TODOS",
      search: params.q,
      limit: 100,
    });
    companies = result.companies;
    total = result.total;
  } catch (error) {
    loadError = error instanceof Error ? error.message : "No se pudo cargar el CRM.";
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Prospectos</h1>
            <p className="mt-1 text-sm text-slate-600">
              {total} {total === 1 ? "empresa" : "empresas"} en el CRM comercial.
            </p>
          </div>
        </div>
        <Link
          href="/admin/ventas-ia/importar"
          className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-800"
        >
          Importar prospectos
        </Link>
      </header>

      {loadError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-bold">El CRM aún no está disponible.</p>
          <p className="mt-1">{loadError}</p>
          <p className="mt-2 text-xs">
            Si es la primera vez, ejecuta la migración <code>supabase/sales_ai_zara.sql</code> en tu
            proyecto de Supabase.
          </p>
        </div>
      ) : null}

      <form className="flex flex-wrap gap-2" action="/admin/ventas-ia/prospectos">
        <input
          name="q"
          defaultValue={params.q ?? ""}
          placeholder="Buscar por nombre, email o RUT…"
          className="min-w-[220px] flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          name="estado"
          defaultValue={params.estado ?? ""}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          {SALES_STATUSES.map((status) => (
            <option key={status} value={status}>
              {SALES_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select
          name="potencial"
          defaultValue={params.potencial ?? ""}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">Todo potencial</option>
          {SALES_POTENTIALS.map((potential) => (
            <option key={potential} value={potential}>
              {potential}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Filtrar
        </button>
      </form>

      {companies.length === 0 && !loadError ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <Sparkles className="mx-auto h-9 w-9 text-slate-400" />
          <h2 className="mt-3 text-base font-bold text-slate-900">Todavía no hay prospectos</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            Sube un Excel con empresas investigadas para empezar. Zara no contacta a nadie hasta que
            tú lo autorices.
          </p>
          <Link
            href="/admin/ventas-ia/importar"
            className="mt-4 inline-block rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-800"
          >
            Importar prospectos
          </Link>
        </div>
      ) : null}

      {companies.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="p-3 font-bold text-slate-900">Empresa</th>
                <th className="p-3 font-bold text-slate-900">Contacto</th>
                <th className="p-3 font-bold text-slate-900">Estado</th>
                <th className="p-3 font-bold text-slate-900">Potencial</th>
                <th className="p-3 font-bold text-slate-900">Rubro</th>
                <th className="p-3 font-bold text-slate-900">Última interacción</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <Link
                      href={`/admin/ventas-ia/prospectos/${company.id}`}
                      className="font-bold text-slate-900 hover:text-blue-700"
                    >
                      {company.name}
                    </Link>
                    {company.do_not_contact ? (
                      <span className="ml-2 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        NO CONTACTAR
                      </span>
                    ) : null}
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {company.commune ?? ""}
                      {company.commune && company.region ? " · " : ""}
                      {company.region ?? ""}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-600">
                    {company.contact_name ? (
                      <span className="block font-semibold text-slate-800">{company.contact_name}</span>
                    ) : null}
                    {company.primary_email ? (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {company.primary_email}
                      </span>
                    ) : (
                      <span className="text-slate-400">Sin email</span>
                    )}
                    {company.phone ? (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {company.phone}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                        STATUS_STYLES[company.status] ?? "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {SALES_STATUS_LABELS[company.status] ?? company.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                        POTENTIAL_STYLES[company.potential] ?? "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {company.potential}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-600">{company.industry ?? "—"}</td>
                  <td className="p-3 text-xs text-slate-500">
                    {company.last_interaction_at
                      ? new Date(company.last_interaction_at).toLocaleDateString("es-CL")
                      : "Sin contacto"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
