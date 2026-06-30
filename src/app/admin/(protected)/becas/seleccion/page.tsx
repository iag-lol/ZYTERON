import { Metadata } from "next";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";

export const metadata: Metadata = {
  title: "Selección | Becas Web Pyme",
};

export const dynamic = "force-dynamic";

export default async function AdminSeleccionPage() {
  const supabase = getBecasSupabaseClient();
  const { data: winners } = await supabase.from("scholarship_winners").select("*, application:scholarship_applications(business_name)").order("created_at", { ascending: false });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Selección de Ganadores</h1>
        <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Elegir Ganador
        </button>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Ganadores Registrados</h2>
        {winners && winners.length > 0 ? (
          <div className="space-y-4">
            {winners.map(w => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-bold">{(w.application as any).business_name}</p>
                  <p className="text-sm text-slate-500">Estado: {w.acceptance_status}</p>
                </div>
                <button className="text-blue-600 hover:underline">Gestionar Acuerdo</button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">Aún no se ha seleccionado a ningún ganador formal.</p>
        )}
      </div>
    </div>
  );
}
