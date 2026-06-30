import { Metadata } from "next";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";

export const metadata: Metadata = {
  title: "Vitrina | Becas Web Pyme",
};

export const dynamic = "force-dynamic";

export default async function AdminVitrinaPage() {
  const supabase = getBecasSupabaseClient();
  const { data: profiles } = await supabase.from("scholarship_public_profiles").select("*").order("created_at", { ascending: false });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Moderación de Vitrina</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {profiles?.map((profile) => (
          <div key={profile.id} className="rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${profile.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {profile.status}
              </span>
            </div>
            <h3 className="font-bold text-slate-900">{profile.business_name}</h3>
            <p className="text-sm text-slate-500">{profile.industry}</p>
            <p className="mt-4 text-sm text-slate-700">{profile.public_description}</p>
            
            <div className="mt-4 flex gap-2 border-t pt-4">
              <button className="rounded bg-slate-100 px-3 py-1 text-sm font-medium hover:bg-slate-200">Revisar</button>
              {profile.status !== 'published' && (
                <button className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-500">Publicar</button>
              )}
            </div>
          </div>
        ))}
        {(!profiles || profiles.length === 0) && (
          <div className="col-span-3 rounded-xl border border-dashed p-12 text-center text-slate-500">
            No hay perfiles en la vitrina.
          </div>
        )}
      </div>
    </div>
  );
}
