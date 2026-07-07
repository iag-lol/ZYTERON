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

    return (data as RawProfileRow[]).map((row) => {
      const logoUrl = row.public_logo_path
        ? supabase.storage.from("becas-web-pyme-assets").getPublicUrl(row.public_logo_path).data.publicUrl
        : null;

      return {
        id: row.id,
        businessName: row.business_name,
        industry: row.industry,
        region: row.region,
        comuna: row.comuna,
        publicDescription: row.public_description,
        publicInstagramHandle: row.public_instagram_handle,
        publicLogoUrl: logoUrl,
        publishedAt: row.published_at,
      };
    });
  } catch (error) {
    console.warn("No se pudo consultar la vitrina pública de becas", error);
    return [] as PublishedScholarshipProfile[];
  }
}
