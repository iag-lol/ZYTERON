import { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getBecasSupabaseClient();
  const { data: campaign } = await supabase
    .from("scholarship_campaigns")
    .select("id, title")
    .eq("slug", slug)
    .maybeSingle();

  if (!campaign) {
    return { title: "No encontrado | Becas Web Pyme", robots: { index: false, follow: false } };
  }

  const { data: winner } = await supabase
    .from("scholarship_winners")
    .select("winner_published_at")
    .eq("campaign_id", campaign.id)
    .not("winner_published_at", "is", null)
    .maybeSingle();

  const isPublished = !!winner?.winner_published_at;

  return {
    title: `Ganador: ${campaign.title} | Becas Web Pyme Zyteron`,
    description: "Conoce al emprendimiento seleccionado para la Beca Web Pyme de Zyteron.",
    alternates: { canonical: `https://www.zyteron.cl/becas-web-pyme/ganador/${slug}` },
    robots: {
      index: isPublished,
      follow: true,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function WinnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getBecasSupabaseClient();
  
  // En un caso real, el slug correspondería al campaign.slug o a un id
  const { data: campaign } = await supabase
    .from("scholarship_campaigns")
    .select("id, title")
    .eq("slug", slug)
    .single();

  if (!campaign) {
    notFound();
  }

  const { data: winner } = await supabase
    .from("scholarship_winners")
    .select("*, application:scholarship_applications(business_name, industry, comuna, region)")
    .eq("campaign_id", campaign.id)
    .not("winner_published_at", "is", null)
    .single();

  if (!winner) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50 py-20">
      <Container className="max-w-4xl text-center">
        <h1 className="mb-4 text-3xl font-extrabold text-slate-900 sm:text-5xl">Ganador: {campaign.title}</h1>
        <p className="mb-12 text-lg text-slate-500">
          Nos enorgullece presentar al emprendimiento seleccionado para esta edición de Becas Web Pyme.
        </p>

        <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-md">
          <div className="mb-8">
            <span className="mb-4 inline-block rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-800">
              Negocio Seleccionado
            </span>
            <h2 className="text-4xl font-black text-blue-900">{(winner.application as any).business_name}</h2>
            <p className="mt-2 text-lg font-medium text-slate-600">{(winner.application as any).industry} • {(winner.application as any).comuna}, {(winner.application as any).region}</p>
          </div>

          <div className="prose prose-slate mx-auto text-left">
            <ReactMarkdown>{winner.public_announcement_text || "El proyecto ya se encuentra en desarrollo."}</ReactMarkdown>
          </div>
        </div>
      </Container>
    </main>
  );
}
