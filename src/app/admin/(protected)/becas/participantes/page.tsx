import { Metadata } from "next";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";

export const metadata: Metadata = {
  title: "Participantes | Becas Web Pyme",
};

export const dynamic = "force-dynamic";

export default async function AdminParticipantesPage() {
  const supabase = getBecasSupabaseClient();
  const { data: participants } = await supabase.from("scholarship_applications").select("id, application_code, full_name, business_name, email, status, submitted_at").order("submitted_at", { ascending: false });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Postulantes</h1>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="border-b bg-slate-50 text-xs uppercase text-slate-700">
            <tr>
              <th className="px-6 py-3">Código</th>
              <th className="px-6 py-3">Negocio</th>
              <th className="px-6 py-3">Representante</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {participants?.map((p) => (
              <tr key={p.id} className="border-b hover:bg-slate-50">
                <td className="px-6 py-4 font-mono text-xs">{p.application_code}</td>
                <td className="px-6 py-4 font-medium text-slate-900">{p.business_name}</td>
                <td className="px-6 py-4">
                  {p.full_name}<br/>
                  <span className="text-xs text-slate-500">{p.email}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-800">{p.status}</span>
                </td>
                <td className="px-6 py-4">{new Date(p.submitted_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <button className="text-blue-600 hover:underline">Ver detalle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
