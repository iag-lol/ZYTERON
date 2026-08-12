import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { getDbCaseStudy } from "@/lib/content/cases-merge";
import { DbCaseArticle } from "@/components/casos/db-case-article";
import { buildArticleJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

type CaseDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

// El admin invalida el detalle al publicar; React cache deduplica metadata y página.
export const revalidate = 3600;

export async function generateMetadata({ params }: CaseDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const item = await getDbCaseStudy(slug);

  if (!item) {
    return createPageMetadata({
      title: "Caso no encontrado",
      description: "El caso solicitado no está disponible.",
      path: `/casos-exito/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: item.metaTitle || `${item.companyName} | Caso de éxito`,
    description: item.metaDescription || item.results || item.problem,
    path: `/casos-exito/${item.slug}`,
    ogImagePath: item.imageUrl || undefined,
    ogImageAlt: item.imageAlt || `Caso de éxito: ${item.companyName}`,
  });
}

export default async function CaseDetailPage({ params }: CaseDetailProps) {
  const { slug } = await params;
  const item = await getDbCaseStudy(slug);

  if (!item) {
    notFound();
  }

  const path = `/casos-exito/${item.slug}`;

  return (
    <>
      <JsonLd
        id={`${item.slug}-webpage-schema`}
        data={buildWebPageJsonLd({
          path,
          title: item.metaTitle || `${item.companyName} | Caso de éxito`,
          description: item.metaDescription || item.results || item.problem,
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Casos de éxito", path: "/casos-exito" },
            { name: item.companyName, path },
          ],
        })}
      />
      <JsonLd
        id={`${item.slug}-article-schema`}
        data={buildArticleJsonLd({
          path,
          title: item.companyName,
          description: item.results || item.problem,
          datePublished: item.publishedAt ?? item.createdAt ?? new Date().toISOString(),
          dateModified: item.updatedAt ?? undefined,
          image: item.imageUrl || undefined,
          authorName: "Equipo Zyteron",
        })}
      />
      <DbCaseArticle item={item} />
    </>
  );
}
