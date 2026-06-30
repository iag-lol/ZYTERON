import { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";

export const metadata: Metadata = {
  title: "Vitrina de Postulantes | Becas Web Pyme Zyteron",
  description: "Emprendimientos que están postulando a nuestra beca.",
  robots: {
    index: false,
    follow: true,
  }
};

export const dynamic = "force-dynamic";

export default async function VitrinaPage() {
  const supabase = getBecasSupabaseClient();
  
  // En producción, obtener solo la campaña activa y sus perfiles
  const { data: campaign } = await supabase
    .from("scholarship_campaigns")
    .select("id")
    .eq("status", "active")
    .limit(1)
    .single();

  let profiles: any[] = [];
  if (campaign) {
    const { data } = await supabase
      .from("scholarship_public_profiles")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("status", "published")
      .order("published_at", { ascending: false });
    
    profiles = data || [];
  }

  return (
    <main className="min-h-screen bg-slate-50 py-20">
      <Container>
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-3xl font-extrabold text-slate-900 sm:text-4xl">Emprendimientos que están postulando</h1>
          <p className="mx-auto max-w-2xl text-sm text-slate-500">
            Esta vitrina presenta negocios que autorizaron voluntariamente la publicación de información básica de su emprendimiento. Aparecer aquí no aumenta las posibilidades de selección ni representa una recomendación, alianza o aprobación comercial por parte de Zyteron.
          </p>
        </div>

        {profiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
            Aún no hay emprendimientos publicados en esta edición.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <div key={profile.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">Postulación registrada</span>
                </div>
                <h3 className="mb-1 text-lg font-bold text-slate-900">{profile.business_name}</h3>
                <p className="mb-4 text-sm font-medium text-slate-500">{profile.industry} • {profile.comuna}</p>
                <p className="mb-4 text-sm text-slate-600 line-clamp-3 flex-1">{profile.public_description}</p>
                {profile.public_instagram_handle && (
                  <a 
                    href={`https://instagram.com/${profile.public_instagram_handle}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-auto text-sm font-semibold text-blue-600 hover:underline"
                  >
                    @{profile.public_instagram_handle}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
