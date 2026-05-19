import type { Metadata } from "next";
import { PriorityServicePageTemplate } from "@/components/services/priority-service-page";
import { getPriorityServicePageBySlug } from "@/content/priority-service-pages";
import { createPageMetadata } from "@/lib/seo";

const pageData = getPriorityServicePageBySlug("automatizacion-whatsapp-empresas");

if (!pageData) {
  throw new Error("Missing SEO priority page data for automatizacion-whatsapp-empresas");
}

const priorityServicePage = pageData;

export const metadata: Metadata = createPageMetadata({
  title: priorityServicePage.metaTitle,
  description: priorityServicePage.metaDescription,
  path: priorityServicePage.path,
});

export default function PriorityServiceRoutePage() {
  return <PriorityServicePageTemplate page={priorityServicePage} />;
}
