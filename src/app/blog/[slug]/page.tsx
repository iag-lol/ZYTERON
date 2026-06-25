import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/json-ld";
import { getDbBlogPost } from "@/lib/content/blog-merge";
import { DbBlogArticle } from "@/components/blog/db-blog-article";
import { buildArticleJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

type BlogDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

// Solo contenido publicado desde Supabase, siempre fresco.
export const dynamic = "force-dynamic";

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

  return createPageMetadata({
    title: post.metaTitle || post.title,
    description: post.metaDescription || post.excerpt || "",
    path: `/blog/${post.slug}`,
    ogImagePath: post.ogImageUrl || post.coverImageUrl || undefined,
    ogImageAlt: post.coverImageAlt || `${post.title} | Zyteron`,
  });
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
          image: post.ogImageUrl || post.coverImageUrl || `/blog/${post.slug}/opengraph-image`,
          authorName: post.author ?? "Zyteron",
        })}
      />
      <DbBlogArticle post={post} />
    </>
  );
}
