import type { Metadata } from "next";
import { SeoServiceLanding } from "@/components/services/seo-service-landing";
import { getSeoServicePageBySlug } from "@/content/seo-service-pages";
import { createPageMetadata } from "@/lib/seo";

const pageData = getSeoServicePageBySlug("paginas-web-para-empresas");

if (!pageData) {
  throw new Error("Missing SEO service page data for paginas-web-para-empresas");
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
