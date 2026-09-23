import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

type WinnerApplication = {
  business_name: string;
  industry: string | null;
  comuna: string | null;
  region: string | null;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getBecasSupabaseClient();
  const { data: campaign, error: campaignError } = await supabase
    .from("scholarship_campaigns")
    .select("id, title")
    .eq("slug", slug)
    .maybeSingle();

  if (campaignError) throw campaignError;

  if (!campaign) {
    return createPageMetadata({
      title: "Resultado de Becas Web Pyme no encontrado",
      description: "El resultado solicitado de Becas Web Pyme no está disponible.",
      path: `/becas-web-pyme/ganador/${slug}`,
      noIndex: true,
      ogImagePath: "/becas-web-pyme/opengraph-image",
      ogImageAlt: "Becas Web Pyme de Zyteron",
    });
  }

  const { data: winner, error: winnerError } = await supabase
    .from("scholarship_winners")
    .select("winner_published_at")
    .eq("campaign_id", campaign.id)
    .not("winner_published_at", "is", null)
    .maybeSingle();

  if (winnerError) throw winnerError;

  const isPublished = !!winner?.winner_published_at;

  return createPageMetadata({
    title: `Ganador de ${campaign.title} | Becas Web Pyme`,
    description: "Conoce al emprendimiento seleccionado para la Beca Web Pyme de Zyteron.",
    path: `/becas-web-pyme/ganador/${slug}`,
    noIndex: !isPublished,
    ogImagePath: "/becas-web-pyme/opengraph-image",
    ogImageAlt: `Ganador de ${campaign.title} en Becas Web Pyme de Zyteron`,
  });
}

export const dynamic = "force-dynamic";

export default async function WinnerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getBecasSupabaseClient();

  // En un caso real, el slug correspondería al campaign.slug o a un id
  const { data: campaign, error: campaignError } = await supabase
    .from("scholarship_campaigns")
    .select("id, title")
    .eq("slug", slug)
    .maybeSingle();

  if (campaignError) throw campaignError;

  if (!campaign) {
    notFound();
  }

  const { data: winner, error: winnerError } = await supabase
    .from("scholarship_winners")
    .select("*, application:scholarship_applications(business_name, industry, comuna, region)")
    .eq("campaign_id", campaign.id)
    .not("winner_published_at", "is", null)
    .maybeSingle();

  if (winnerError) throw winnerError;

  if (!winner) {
    notFound();
  }

  const applicationRelation = winner.application as WinnerApplication | WinnerApplication[] | null;
  const application = Array.isArray(applicationRelation)
    ? applicationRelation[0]
    : applicationRelation;

  if (!application) {
    notFound();
  }

  const businessDetails = [
    application.industry,
    [application.comuna, application.region].filter(Boolean).join(", "),
  ].filter(Boolean);
  const path = `/becas-web-pyme/ganador/${slug}`;

  return (
    <>
      <JsonLd
        id="becas-web-pyme-winner-schema"
        data={buildWebPageJsonLd({
          path,
          title: `Ganador de ${campaign.title} | Becas Web Pyme`,
          description: "Resultado oficial publicado de la Beca Web Pyme de Zyteron.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Becas Web Pyme", path: "/becas-web-pyme" },
            { name: `Ganador de ${campaign.title}`, path },
          ],
        })}
      />
      <main className="min-h-screen bg-slate-50 py-20">
        <Container className="max-w-4xl text-center">
          <h1 className="mb-4 text-3xl font-extrabold text-slate-900 sm:text-5xl">
            Ganador: {campaign.title}
          </h1>
          <p className="mb-12 text-lg text-slate-500">
            Nos enorgullece presentar al emprendimiento seleccionado para esta edición de Becas Web
            Pyme.
          </p>

          <div className="rounded-2xl border border-slate-200 bg-white p-12 shadow-md">
            <div className="mb-8">
              <span className="mb-4 inline-block rounded-full bg-yellow-100 px-4 py-2 text-sm font-bold text-yellow-800">
                Negocio Seleccionado
              </span>
              <h2 className="text-4xl font-black text-blue-900">{application.business_name}</h2>
              {businessDetails.length > 0 ? (
                <p className="mt-2 text-lg font-medium text-slate-600">
                  {businessDetails.join(" • ")}
                </p>
              ) : null}
            </div>

            <div className="prose prose-slate mx-auto text-left">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h2>{children}</h2>,
                }}
              >
                {winner.public_announcement_text || "El proyecto ya se encuentra en desarrollo."}
              </ReactMarkdown>
            </div>
          </div>
        </Container>
      </main>
    </>
  );
}
