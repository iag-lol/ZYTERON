// Fuente de datos del blog público: SOLO artículos publicados en Supabase
// (creados desde /admin/blog). El contenido curado/hardcodeado fue eliminado.
import { getPublishedBlogPosts, getBlogPostBySlug, type DbBlogPost } from "@/lib/admin/blog-cases-repository";
import { formatStableDateEsCl } from "@/lib/stable-date";

export type BlogListItem = {
  slug: string;
  title: string;
  excerpt: string;
  label: string;
  readingTime: string;
  updatedLabel: string;
};

/** Tarjetas para /blog: artículos publicados, más recientes primero. */
export async function getBlogListItems(): Promise<BlogListItem[]> {
  const posts = await getPublishedBlogPosts();
  return posts
    .slice()
    .sort((a, b) => String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt ?? "",
      label: p.category?.trim() || "Artículo",
      readingTime: `${p.readMinutes ?? 5} min de lectura`,
      updatedLabel: formatStableDateEsCl(p.updatedAt ?? p.publishedAt ?? p.createdAt ?? new Date().toISOString()),
    }));
}

/** Devuelve el artículo publicado por slug, o null. */
export async function getDbBlogPost(slug: string): Promise<DbBlogPost | null> {
  const post = await getBlogPostBySlug(slug);
  if (!post || post.status !== "published") return null;
  return post;
}
