import type { Metadata } from "next";
import { SeoServiceLanding } from "@/components/services/seo-service-landing";
import { getSeoServicePageBySlug } from "@/content/seo-service-pages";
import { createPageMetadata } from "@/lib/seo";

// Los casos de éxito destacados vienen de Supabase: ISR igual que /casos-exito.
export const revalidate = 3600;

const pageData = getSeoServicePageBySlug("desarrollo-web");

if (!pageData) {
  throw new Error("Missing SEO service page data for desarrollo-web");
}

const seoServicePage = pageData;

export const metadata: Metadata = createPageMetadata({
  title: seoServicePage.metaTitle,
  description: seoServicePage.metaDescription,
  path: seoServicePage.path,
});

export default function SeoServiceRoutePage() {
  return <SeoServiceLanding page={seoServicePage} />;
}
