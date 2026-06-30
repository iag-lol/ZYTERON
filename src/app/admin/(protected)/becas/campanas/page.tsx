import { Metadata } from "next";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Campañas | Becas Web Pyme",
};

export const dynamic = "force-dynamic";

export default async function AdminCampanasPage() {
  const supabase = getBecasSupabaseClient();
  const { data: campaigns } = await supabase.from("scholarship_campaigns").select("*").order("created_at", { ascending: false });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campañas de Becas</h1>
        <Link href="/admin/becas/campanas/nueva" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Nueva Campaña
        </Link>
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-700">
            <tr>
              <th className="px-6 py-3">Nombre</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">Fechas</th>
              <th className="px-6 py-3">Beneficios</th>
              <th className="px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {campaigns?.map((c) => (
              <tr key={c.id} className="border-b hover:bg-slate-50">
                <td className="px-6 py-4 font-medium text-slate-900">{c.title}</td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">{c.status}</span>
                </td>
                <td className="px-6 py-4">
                  {c.starts_at ? new Date(c.starts_at).toLocaleDateString() : 'N/A'} - {c.ends_at ? new Date(c.ends_at).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-6 py-4">{c.benefits_quantity}</td>
                <td className="px-6 py-4">
                  <Link href={`/admin/becas/campanas/${c.id}`} className="text-blue-600 hover:underline">Editar</Link>
                </td>
              </tr>
            ))}
            {(!campaigns || campaigns.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                  No hay campañas creadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
