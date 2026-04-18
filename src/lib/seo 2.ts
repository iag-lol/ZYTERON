import { siteConfig } from "@/config/site";
import { defaultJsonLdOrganization } from "@/config/seo";

export function buildJsonLd(page: {
  type?: string;
  title: string;
  description: string;
  url?: string;
  breadcrumbs?: { name: string; url: string }[];
  faq?: { question: string; answer: string }[];
}) {
  const base = page.url ?? siteConfig.url;

  const graph: Record<string, unknown>[] = [defaultJsonLdOrganization as Record<string, unknown>];

  graph.push({
    "@context": "https://schema.org",
    "@type": page.type ?? "WebPage",
    name: page.title,
    description: page.description,
    url: base,
  });

  if (page.breadcrumbs?.length) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: page.breadcrumbs.map((crumb, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: crumb.name,
        item: crumb.url,
      })),
    });
  }

  if (page.faq?.length) {
    graph.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.answer,
        },
      })),
    });
  }

  return graph;
}
