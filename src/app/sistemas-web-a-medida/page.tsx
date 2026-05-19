import type { Metadata } from "next";
import { PriorityServicePageTemplate } from "@/components/services/priority-service-page";
import { getPriorityServicePageBySlug } from "@/content/priority-service-pages";
import { createPageMetadata } from "@/lib/seo";

const pageData = getPriorityServicePageBySlug("sistemas-web-a-medida");

if (!pageData) {
  throw new Error("Missing SEO priority page data for sistemas-web-a-medida");
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
