import { Metadata } from "next";
import { MapPin, Store } from "lucide-react";
import { InstagramIcon } from "@/components/ui/instagram-icon";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { BecasHeader } from "../_components/becas-nav";
import { ScholarshipStatusBadge } from "../_components/status-badge";

export const metadata: Metadata = {
  title: "Vitrina | Becas Web Pyme",
};

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("es-CL");
const dateFmt = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type ProfileRow = {
  id: string;
  status: string;
  business_name: string;
  industry: string | null;
  region: string | null;
  comuna: string | null;
  public_description: string | null;
  public_instagram_handle: string | null;
  published_at: string | null;
  created_at: string;
};

export default async function AdminVitrinaPage() {
  const supabase = getBecasSupabaseClient();
  const { data } = await supabase
    .from("scholarship_public_profiles")
    .select(
      "id, status, business_name, industry, region, comuna, public_description, public_instagram_handle, published_at, created_at",
    )
    .order("created_at", { ascending: false });

  const profiles = (data as ProfileRow[] | null) ?? [];
  const counts = {
    pending: profiles.filter((p) => p.status === "pending_approval").length,
    published: profiles.filter((p) => p.status === "published").length,
    hidden: profiles.filter((p) => p.status === "hidden").length,
    removed: profiles.filter((p) => p.status === "removed").length,
  };

  return (
    <div className="space-y-6">
      <BecasHeader
        active="vitrina"
        title="Vitrina pública"
        description="Modera los perfiles de emprendimientos que autorizaron aparecer en la vitrina."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Pendientes de aprobación", value: counts.pending, accent: "text-amber-600" },
          { label: "Publicadas", value: counts.published, accent: "text-emerald-600" },
          { label: "Ocultas", value: counts.hidden, accent: "text-slate-500" },
          { label: "Removidas", value: counts.removed, accent: "text-rose-600" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className={`text-3xl font-extrabold tracking-tight ${item.accent}`}>
              {nf.format(item.value)}
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-500">{item.label}</p>
          </div>
        ))}
      </div>

      {profiles.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((profile) => (
            <article
              key={profile.id}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-blue-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-extrabold text-blue-700">
                    {profile.business_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-900">{profile.business_name}</h3>
                    <p className="truncate text-xs text-slate-500">{profile.industry ?? "Sin rubro"}</p>
                  </div>
                </div>
                <ScholarshipStatusBadge status={profile.status} />
              </div>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">
                {profile.public_description || "Sin descripción pública."}
              </p>

              <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {[profile.comuna, profile.region].filter(Boolean).join(", ") || "Sin ubicación"}
                </p>
                {profile.public_instagram_handle ? (
                  <p className="flex items-center gap-1.5">
                    <InstagramIcon className="h-3.5 w-3.5 text-slate-400" />@
                    {profile.public_instagram_handle.replace(/^@/, "")}
                  </p>
                ) : null}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                <span>Creado {dateFmt.format(new Date(profile.created_at))}</span>
                {profile.published_at ? (
                  <span>Publicado {dateFmt.format(new Date(profile.published_at))}</span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-14 text-center shadow-sm">
          <Store className="mx-auto h-8 w-8 text-slate-300" />
          <h2 className="mt-3 text-sm font-bold text-slate-700">La vitrina está vacía</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Los perfiles aparecerán aquí cuando los postulantes autoricen la vitrina pública y sus
            postulaciones sean validadas.
          </p>
        </div>
      )}
    </div>
  );
}
