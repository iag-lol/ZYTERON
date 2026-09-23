import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";

export type PublishedScholarshipWinnerRoute = {
  slug: string;
  publishedAt: string;
};

function usesLocalOrUnconfiguredSupabase() {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  ).toLowerCase();
  return !url || url.startsWith("http://localhost:54321");
}

/** Rutas de resultados que ya cuentan con un ganador publicado. */
export async function getPublishedScholarshipWinnerRoutes(): Promise<
  PublishedScholarshipWinnerRoute[]
> {
  try {
    const supabase = getBecasSupabaseClient();
    const { data: winners, error: winnersError } = await supabase
      .from("scholarship_winners")
      .select("campaign_id, winner_published_at")
      .not("winner_published_at", "is", null);

    if (winnersError) throw winnersError;

    const campaignIds = [
      ...new Set((winners ?? []).map((row) => String(row.campaign_id)).filter(Boolean)),
    ];
    if (campaignIds.length === 0) return [];

    const { data: campaigns, error: campaignsError } = await supabase
      .from("scholarship_campaigns")
      .select("id, slug")
      .in("id", campaignIds);

    if (campaignsError) throw campaignsError;

    const slugById = new Map(
      (campaigns ?? []).map((campaign) => [String(campaign.id), String(campaign.slug)]),
    );

    return (winners ?? []).flatMap((winner) => {
      const slug = slugById.get(String(winner.campaign_id));
      const publishedAt = winner.winner_published_at ? String(winner.winner_published_at) : "";
      return slug && publishedAt ? [{ slug, publishedAt }] : [];
    });
  } catch (error) {
    // El entorno local puede compilar sin levantar Supabase. En producción se
    // propaga el error para que ISR conserve el sitemap anterior en vez de
    // reemplazarlo por una versión que perdió URLs válidas.
    if (usesLocalOrUnconfiguredSupabase()) return [];
    throw error;
  }
}
