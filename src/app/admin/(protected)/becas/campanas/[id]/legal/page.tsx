import { Metadata } from "next";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { notFound } from "next/navigation";
import Link from "next/link";
import LegalManager from "../../_components/legal-manager";
import { getLegalVersions } from "../../legal-actions";

export const metadata: Metadata = {
  title: "Bases, Privacidad y Legal | Admin Becas",
};

export const dynamic = "force-dynamic";

export default async function AdminCampanaLegalPage({ params }: { params: { id: string } }) {
  const supabase = getBecasSupabaseClient();
  const { data: campaign } = await supabase
    .from("scholarship_campaigns")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!campaign) {
    notFound();
  }

  const versions = await getLegalVersions(campaign.id);

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bases, Privacidad y Legal: {campaign.title}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestione las versiones inmutables, publique bases oficiales y verifique el checklist obligatorio de activación.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/becas/campanas/${campaign.id}`}
            className="rounded-md border bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ← Volver a Datos Generales
          </Link>
          <Link
            href="/admin/becas/campanas"
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Lista de Campañas
          </Link>
        </div>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        <Link
          href={`/admin/becas/campanas/${campaign.id}`}
          className="pb-3 px-2 font-medium text-sm text-slate-500 hover:text-slate-800"
        >
          1. Configuración General y Fechas
        </Link>
        <span className="pb-3 px-2 font-bold text-sm text-blue-600 border-b-2 border-blue-600">
          2. Bases, Privacidad y Legal
        </span>
      </div>

      <LegalManager campaign={campaign} versions={versions} />
    </div>
  );
}
