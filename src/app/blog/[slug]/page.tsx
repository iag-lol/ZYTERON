import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { getDbBlogPost } from "@/lib/content/blog-merge";
import { DbBlogArticle } from "@/components/blog/db-blog-article";
import type { DbBlogPost } from "@/lib/admin/blog-cases-repository";
import { siteConfig } from "@/config/site";
import {
  buildArticleJsonLd,
  buildWebPageJsonLd,
  createPageMetadata,
  isLikelySocialImagePath,
} from "@/lib/seo";

type BlogDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

// Solo contenido publicado desde Supabase, siempre fresco.
export const dynamic = "force-dynamic";

/**
 * Imagen para compartir del artículo: usa og/portada sólo si son URLs de
 * imagen válidas; si el campo trae texto basura o está vacío, cae a la imagen
 * OG dinámica del propio artículo (siempre resuelve con 200).
 */
function resolveArticleSocialImage(post: DbBlogPost): string {
  if (isLikelySocialImagePath(post.ogImageUrl)) return post.ogImageUrl as string;
  if (isLikelySocialImagePath(post.coverImageUrl)) return post.coverImageUrl as string;
  return `/blog/${post.slug}/opengraph-image`;
}

export async function generateMetadata({ params }: BlogDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getDbBlogPost(slug);

  if (!post) {
    return createPageMetadata({
      title: "Artículo no encontrado",
      description: "El artículo solicitado no existe.",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }

  const baseMetadata = createPageMetadata({
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || "",
    path: `/blog/${post.slug}`,
    ogImagePath: resolveArticleSocialImage(post),
    ogImageAlt: post.coverImageAlt || `${post.title} | Zyteron`,
  });

  return {
    ...baseMetadata,
    openGraph: {
      ...baseMetadata.openGraph,
      type: "article",
      publishedTime: post.publishedAt ?? post.createdAt ?? undefined,
      modifiedTime: post.updatedAt ?? post.publishedAt ?? post.createdAt ?? undefined,
      authors: [`${siteConfig.url}/quienes-somos`],
      section: post.category ?? "Blog",
      tags: post.tags ?? undefined,
    },
    other: {
      "article:published_time": post.publishedAt ?? post.createdAt ?? "",
      "article:modified_time": post.updatedAt ?? post.publishedAt ?? post.createdAt ?? "",
      "article:author": `${siteConfig.url}/quienes-somos`,
      "article:section": post.category ?? "Blog",
    },
  };
}

export default async function BlogDetailPage({ params }: BlogDetailProps) {
  const { slug } = await params;
  const post = await getDbBlogPost(slug);

  if (!post) {
    notFound();
  }

  const path = `/blog/${post.slug}`;

  return (
    <>
      <JsonLd
        id={`blog-webpage-schema-${post.slug}`}
        data={buildWebPageJsonLd({
          path,
          title: post.metaTitle || post.title,
          description: post.metaDescription || post.excerpt || "",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path },
          ],
        })}
      />
      <JsonLd
        id={`blog-article-schema-${post.slug}`}
        data={buildArticleJsonLd({
          path,
          title: post.title,
          description: post.excerpt || post.metaDescription || "",
          datePublished: post.publishedAt ?? post.createdAt ?? new Date().toISOString(),
          dateModified: post.updatedAt ?? undefined,
          image: resolveArticleSocialImage(post),
          authorName: post.author ?? siteConfig.representative.name,
          authorType: "Person",
          authorUrl: `${siteConfig.url}/quienes-somos`,
          authorId: `${siteConfig.url}/quienes-somos#eduardo-avila`,
        })}
      />
      <DbBlogArticle post={post} />
    </>
  );
}
