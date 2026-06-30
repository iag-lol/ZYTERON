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

export type RecommendedBlogLink = { slug: string; title: string };

// Orden editorial deseado para las "rutas de aprendizaje". NO es una lista de
// enlaces: sólo define prioridad. Un slug que no esté publicado en la DB nunca
// se renderiza, así que esta sección no puede volver a apuntar a un 404.
const RECOMMENDED_SLUG_PRIORITY = [
  "cuanto-cuesta-pagina-web-empresa-chile",
  "que-debe-tener-pagina-web-profesional-pyme",
  "diferencia-pagina-web-tienda-online-sistema-web",
  "automatizacion-whatsapp-empresas-casos-reales-chile",
  "que-es-sistema-web-a-medida",
  "errores-criticos-contratar-desarrollo-web-chile",
];

/**
 * Construye los artículos recomendados SÓLO a partir de posts publicados:
 * primero los del orden editorial que existan, luego se completa con los más
 * recientes. Garantiza que ningún enlace recomendado apunte a un slug muerto.
 */
export function pickRecommendedFromPublished(
  items: BlogListItem[],
  limit = 6,
): RecommendedBlogLink[] {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const ordered: BlogListItem[] = [];
  const seen = new Set<string>();

  for (const slug of RECOMMENDED_SLUG_PRIORITY) {
    const item = bySlug.get(slug);
    if (item && !seen.has(slug)) {
      ordered.push(item);
      seen.add(slug);
    }
  }

  for (const item of items) {
    if (ordered.length >= limit) break;
    if (!seen.has(item.slug)) {
      ordered.push(item);
      seen.add(item.slug);
    }
  }

  return ordered.slice(0, limit).map((item) => ({ slug: item.slug, title: item.title }));
}
