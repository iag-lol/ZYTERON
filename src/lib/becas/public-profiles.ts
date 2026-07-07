import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";

export type PublishedScholarshipProfile = {
  id: string;
  businessName: string;
  industry: string | null;
  region: string | null;
  comuna: string | null;
  publicDescription: string | null;
  publicInstagramHandle: string | null;
  publicLogoUrl: string | null;
  publishedAt: string | null;
};

type RawProfileRow = {
  id: string;
  business_name: string;
  industry: string | null;
  region: string | null;
  comuna: string | null;
  public_description: string | null;
  public_instagram_handle: string | null;
  public_logo_path: string | null;
  published_at: string | null;
};

export async function getPublishedScholarshipProfiles(limit?: number) {
  try {
    const supabase = getBecasSupabaseClient();

    let query = supabase
      .from("scholarship_public_profiles")
      .select(
        "id, business_name, industry, region, comuna, public_description, public_instagram_handle, public_logo_path, published_at",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (typeof limit === "number") {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error || !data) {
      if (error) {
        console.warn("No se pudieron obtener los perfiles publicados de becas", error);
      }
      return [] as PublishedScholarshipProfile[];
    }

    const rows = data as RawProfileRow[];
    const signedLogoEntries = await Promise.all(
      rows.map(async (row) => {
        if (!row.public_logo_path) {
          return [row.id, null] as const;
        }

        const { data: signedData, error: signedError } = await supabase.storage
          .from("becas-web-pyme-assets")
          .createSignedUrl(row.public_logo_path, 60 * 60);

        if (signedError || !signedData?.signedUrl) {
          console.warn("No se pudo firmar el logo de vitrina", {
            profileId: row.id,
            path: row.public_logo_path,
            error: signedError,
          });
          return [row.id, null] as const;
        }

        return [row.id, signedData.signedUrl] as const;
      }),
    );

    const signedLogoMap = new Map<string, string | null>(signedLogoEntries);

    return rows.map((row) => ({
      id: row.id,
      businessName: row.business_name,
      industry: row.industry,
      region: row.region,
      comuna: row.comuna,
      publicDescription: row.public_description,
      publicInstagramHandle: row.public_instagram_handle,
      publicLogoUrl: signedLogoMap.get(row.id) ?? null,
      publishedAt: row.published_at,
    }));
  } catch (error) {
    console.warn("No se pudo consultar la vitrina pública de becas", error);
    return [] as PublishedScholarshipProfile[];
  }
}
