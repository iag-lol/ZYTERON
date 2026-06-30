import { Metadata } from "next";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Becas Web Pyme | Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminBecasPage() {
  const supabase = getBecasSupabaseClient();
  
  const { data: campaign } = await supabase
    .from("scholarship_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let stats = {
    total: 0,
    valid: 0,
    rejected: 0,
    vitrina: 0,
  };

  if (campaign) {
    const { data: apps } = await supabase
      .from("scholarship_applications")
      .select("status, public_gallery_consent")
      .eq("campaign_id", campaign.id);

    if (apps) {
      stats.total = apps.length;
      stats.valid = apps.filter(a => a.status === 'validated').length;
      stats.rejected = apps.filter(a => a.status === 'rejected').length;
      stats.vitrina = apps.filter(a => a.public_gallery_consent).length;
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Becas Web Pyme</h1>
        <Link href="/admin/becas/campanas" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
          Gestionar Campañas
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Estado de Campaña</p>
          <p className="mt-2 text-3xl font-bold capitalize text-slate-900">{campaign?.status || "Ninguna"}</p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Postulaciones Totales</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Válidas</p>
          <p className="mt-2 text-3xl font-bold text-green-600">{stats.valid}</p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Vitrina Autorizada</p>
          <p className="mt-2 text-3xl font-bold text-blue-600">{stats.vitrina}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/admin/becas/participantes" className="group rounded-xl border bg-white p-6 transition-all hover:border-blue-500 hover:shadow-md">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600">Participantes</h3>
          <p className="mt-2 text-sm text-slate-500">Ver, filtrar y evaluar las postulaciones recibidas.</p>
        </Link>
        <Link href="/admin/becas/vitrina" className="group rounded-xl border bg-white p-6 transition-all hover:border-blue-500 hover:shadow-md">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600">Vitrina Pública</h3>
          <p className="mt-2 text-sm text-slate-500">Moderar y publicar las tarjetas de emprendimientos.</p>
        </Link>
        <Link href="/admin/becas/seleccion" className="group rounded-xl border bg-white p-6 transition-all hover:border-blue-500 hover:shadow-md">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600">Selección y Ganador</h3>
          <p className="mt-2 text-sm text-slate-500">Formalizar al ganador y subir acuerdos.</p>
        </Link>
      </div>
    </div>
  );
}
