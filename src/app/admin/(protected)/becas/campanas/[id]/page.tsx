import { Metadata } from "next";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import CampaignForm from "../_components/campaign-form";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Editar Campaña | Becas Web Pyme",
};

export const dynamic = "force-dynamic";

export default async function EditarCampanaPage({ params }: { params: { id: string } }) {
  const supabase = getBecasSupabaseClient();
  const { data: campaign } = await supabase
    .from("scholarship_campaigns")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!campaign) {
    notFound();
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Editar Campaña: {campaign.title}</h1>
        <a
          href={`/admin/becas/campanas/${campaign.id}/legal`}
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500 shadow-sm"
        >
          ⚖️ Configurar Bases, Privacidad y Legal →
        </a>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <span className="pb-3 px-2 font-bold text-sm text-blue-600 border-b-2 border-blue-600">
          1. Configuración General y Fechas
        </span>
        <a
          href={`/admin/becas/campanas/${campaign.id}/legal`}
          className="pb-3 px-2 font-medium text-sm text-slate-500 hover:text-slate-800"
        >
          2. Bases, Privacidad y Legal
        </a>
      </div>

      <CampaignForm initialData={campaign} />
    </div>
  );
}
