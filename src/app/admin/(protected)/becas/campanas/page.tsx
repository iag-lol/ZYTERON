import { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Gift, Pencil, Plus, Scale, Store } from "lucide-react";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { BecasHeader } from "../_components/becas-nav";
import { ScholarshipStatusBadge } from "../_components/status-badge";

export const metadata: Metadata = {
  title: "Campañas | Becas Web Pyme",
};

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("es-CL");
const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const dateFmt = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type CampaignRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  benefit_title: string | null;
  benefit_value_clp: number | null;
  benefits_quantity: number | null;
  is_public_gallery_enabled: boolean | null;
  created_at: string;
};

function formatDate(value: string | null) {
  return value ? dateFmt.format(new Date(value)) : "Sin fecha";
}

export default async function AdminCampanasPage() {
  const supabase = getBecasSupabaseClient();
  const { data } = await supabase
    .from("scholarship_campaigns")
    .select(
      "id, slug, title, subtitle, status, starts_at, ends_at, benefit_title, benefit_value_clp, benefits_quantity, is_public_gallery_enabled, created_at",
    )
    .order("created_at", { ascending: false });

  const campaigns = (data as CampaignRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <BecasHeader
        active="campanas"
        title="Campañas"
        description="Crea y administra las convocatorias del programa de becas."
        actions={
          <Link
            href="/admin/becas/campanas/nueva"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" /> Nueva campaña
          </Link>
        }
      />

      {campaigns.length > 0 ? (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <article
              key={campaign.id}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-blue-200"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg font-extrabold text-slate-900">{campaign.title}</h2>
                    <ScholarshipStatusBadge status={campaign.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">/{campaign.slug}</p>
                  {campaign.subtitle ? (
                    <p className="mt-1.5 max-w-2xl text-sm text-slate-600">{campaign.subtitle}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/admin/becas/campanas/${campaign.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Link>
                  <Link
                    href={`/admin/becas/campanas/${campaign.id}/legal`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Scale className="h-3.5 w-3.5" /> Legal
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-3">
                <div className="flex items-center gap-2 text-slate-600">
                  <CalendarClock className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    {formatDate(campaign.starts_at)} → {formatDate(campaign.ends_at)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Gift className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    {campaign.benefit_value_clp
                      ? clp.format(campaign.benefit_value_clp)
                      : campaign.benefit_title ?? "Beneficio sin definir"}
                    <span className="ml-1 text-slate-400">
                      × {nf.format(campaign.benefits_quantity ?? 1)}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Store className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>
                    Vitrina pública{" "}
                    <span
                      className={
                        campaign.is_public_gallery_enabled
                          ? "font-bold text-emerald-600"
                          : "font-bold text-slate-400"
                      }
                    >
                      {campaign.is_public_gallery_enabled ? "habilitada" : "deshabilitada"}
                    </span>
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center shadow-sm">
          <CalendarClock className="mx-auto h-8 w-8 text-slate-300" />
          <h2 className="mt-3 text-sm font-bold text-slate-700">No hay campañas creadas</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Crea la primera convocatoria para habilitar postulaciones en la página pública de Becas
            Web Pyme.
          </p>
          <Link
            href="/admin/becas/campanas/nueva"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" /> Crear campaña
          </Link>
        </div>
      )}
    </div>
  );
}
