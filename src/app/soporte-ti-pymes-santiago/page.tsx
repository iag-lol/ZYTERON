import type { Metadata } from "next";
import { PriorityServicePageTemplate } from "@/components/services/priority-service-page";
import { getPriorityServicePageBySlug } from "@/content/priority-service-pages";
import { createPageMetadata } from "@/lib/seo";

const pageData = getPriorityServicePageBySlug("soporte-ti-pymes-santiago");

if (!pageData) {
  throw new Error("Missing SEO priority page data for soporte-ti-pymes-santiago");
}

export const metadata: Metadata = createPageMetadata({
  title: pageData.metaTitle,
  description: pageData.metaDescription,
  path: pageData.path,
});

export default function PriorityServiceRoutePage() {
  return <PriorityServicePageTemplate page={pageData} />;
}
