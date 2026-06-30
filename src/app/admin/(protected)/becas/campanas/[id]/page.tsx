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
      </div>
      <CampaignForm initialData={campaign} />
    </div>
  );
}
