// Capa de fusión del blog: combina los artículos publicados en Supabase
// (creados desde /admin/blog) con los artículos curados en src/content.
// Regla: si un slug existe en ambos, gana la base de datos. El contenido
// curado se conserva (no es relleno) y sigue renderizándose con su layout
// estructurado; los artículos de BD se renderizan desde Markdown.
import { getPublishedBlogPosts, getBlogPostBySlug, type DbBlogPost } from "@/lib/admin/blog-cases-repository";
import { blogPosts, getBlogPostBySlug as getCuratedBlogPostBySlug, type BlogPostData } from "@/content/blog-posts";
import { formatStableDateEsCl } from "@/lib/stable-date";

const INTENT_LABELS: Record<BlogPostData["intent"], string> = {
  comercial: "Guía comercial",
  informativa: "Guía informativa",
  mixta: "Análisis aplicado",
};

export type BlogListItem = {
  slug: string;
  title: string;
  excerpt: string;
  label: string;
  readingTime: string;
  updatedLabel: string;
  source: "db" | "curated";
};

/** Tarjetas para /blog: BD publicados primero (recientes), luego curados. */
export async function getBlogListItems(): Promise<BlogListItem[]> {
  const dbPosts = await getPublishedBlogPosts();
  const dbSlugs = new Set(dbPosts.map((p) => p.slug));

  const dbItems: BlogListItem[] = dbPosts
    .slice()
    .sort((a, b) => String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt ?? "",
      label: p.category?.trim() || "Artículo",
      readingTime: `${p.readMinutes ?? 5} min de lectura`,
      updatedLabel: formatStableDateEsCl(p.publishedAt ?? p.createdAt ?? new Date().toISOString()),
      source: "db",
    }));

  const curatedItems: BlogListItem[] = blogPosts
    .filter((p) => !dbSlugs.has(p.slug))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      label: INTENT_LABELS[p.intent],
      readingTime: p.readingTime,
      updatedLabel: formatStableDateEsCl(p.updatedAt ?? p.publishedAt),
      source: "curated",
    }));

  return [...dbItems, ...curatedItems];
}

/** Todos los slugs publicados (BD + curado), sin duplicados. Para static params y sitemap. */
export async function getAllBlogSlugs(): Promise<string[]> {
  const dbPosts = await getPublishedBlogPosts();
  const slugs = new Set<string>(dbPosts.map((p) => p.slug));
  for (const p of blogPosts) slugs.add(p.slug);
  return [...slugs];
}

/** Devuelve el artículo de BD si el slug corresponde a uno publicado. */
export async function getDbBlogPost(slug: string): Promise<DbBlogPost | null> {
  const post = await getBlogPostBySlug(slug);
  if (!post || post.status !== "published") return null;
  return post;
}

/** Resuelve un slug: primero BD (markdown), si no, curado (estructurado). */
export async function resolveBlogPost(slug: string): Promise<
  | { source: "db"; db: DbBlogPost }
  | { source: "curated"; curated: NonNullable<ReturnType<typeof getCuratedBlogPostBySlug>> }
  | null
> {
  const db = await getDbBlogPost(slug);
  if (db) return { source: "db", db };
  const curated = getCuratedBlogPostBySlug(slug);
  if (curated) return { source: "curated", curated };
  return null;
}
