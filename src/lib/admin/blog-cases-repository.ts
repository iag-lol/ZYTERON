// Sólo debe importarse desde el servidor: usa el cliente service-role de Supabase
// vía los helpers de @/lib/admin/repository (mismo patrón que el resto del admin).
import {
  safeSelect,
  safeSelectSingle,
  insertRow,
  updateRows,
  deleteRows,
} from "@/lib/admin/repository";

// =========================================================
// Tipos de fila tal como viven en Supabase (camelCase).
// =========================================================
export type DbBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  category: string | null;
  tags: string[] | null;
  readMinutes: number | null;
  author: string | null;
  status: "draft" | "published" | string;
  metaTitle: string | null;
  metaDescription: string | null;
  keywords: string | null;
  ogImageUrl: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DbCaseStudy = {
  id: string;
  slug: string;
  companyName: string;
  industry: string | null;
  problem: string;
  solution: string;
  results: string | null;
  technologies: string[] | null;
  projectDuration: string | null;
  clientQuote: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  featured: boolean | null;
  sortOrder: number | null;
  status: "draft" | "published" | string;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const BLOG_TABLE = "BlogPost";
const CASE_TABLE = "CaseStudy";

const BLOG_COLUMNS =
  'id, slug, title, excerpt, content, "coverImageUrl", "coverImageAlt", category, tags, "readMinutes", author, status, "metaTitle", "metaDescription", keywords, "ogImageUrl", "publishedAt", "createdAt", "updatedAt"';

const CASE_COLUMNS =
  'id, slug, "companyName", industry, problem, solution, results, technologies, "projectDuration", "clientQuote", "imageUrl", "imageAlt", featured, "sortOrder", status, "metaTitle", "metaDescription", "publishedAt", "createdAt", "updatedAt"';

// =========================================================
// Utilidades
// =========================================================

/** Genera un slug kebab-case sin acentos a partir de un texto. */
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos (marcas diacríticas)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // no alfanumérico -> guion
    .replace(/^-+|-+$/g, "") // recorta guiones extremos
    .slice(0, 80);
}

/** Estima minutos de lectura a ~200 palabras por minuto (mínimo 1). */
export function estimateReadMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// =========================================================
// Blog
// =========================================================

/** Lista pública: sólo artículos publicados, recientes primero. */
export async function getPublishedBlogPosts(): Promise<DbBlogPost[]> {
  return safeSelect<DbBlogPost>(BLOG_TABLE, BLOG_COLUMNS, {
    filters: { status: "published" },
    orderBy: "publishedAt",
    ascending: false,
  });
}

/** Lista admin: todos (borradores y publicados). */
export async function getAllBlogPosts(): Promise<DbBlogPost[]> {
  return safeSelect<DbBlogPost>(BLOG_TABLE, BLOG_COLUMNS, {
    orderBy: "updatedAt",
    ascending: false,
  });
}

export async function getBlogPostBySlug(slug: string): Promise<DbBlogPost | null> {
  return safeSelectSingle<DbBlogPost>(BLOG_TABLE, BLOG_COLUMNS, { slug });
}

export async function getBlogPostById(id: string): Promise<DbBlogPost | null> {
  return safeSelectSingle<DbBlogPost>(BLOG_TABLE, BLOG_COLUMNS, { id });
}

export type BlogPostWriteInput = {
  slug: string;
  title: string;
  excerpt?: string | null;
  content: string;
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  category?: string | null;
  tags?: string[];
  readMinutes?: number | null;
  author?: string | null;
  status: "draft" | "published";
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string | null;
  ogImageUrl?: string | null;
};

function buildBlogPayload(input: BlogPostWriteInput) {
  const isPublished = input.status === "published";
  return {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt ?? null,
    content: input.content,
    coverImageUrl: input.coverImageUrl ?? null,
    coverImageAlt: input.coverImageAlt ?? null,
    category: input.category ?? null,
    tags: input.tags ?? [],
    readMinutes: input.readMinutes ?? estimateReadMinutes(input.content),
    author: input.author?.trim() || "Zyteron",
    status: input.status,
    metaTitle: input.metaTitle ?? null,
    metaDescription: input.metaDescription ?? null,
    keywords: input.keywords ?? null,
    ogImageUrl: input.ogImageUrl ?? null,
    isPublished,
  };
}

export async function createBlogPost(input: BlogPostWriteInput): Promise<DbBlogPost> {
  const { isPublished, ...payload } = buildBlogPayload(input);
  return insertRow<DbBlogPost>(
    BLOG_TABLE,
    { ...payload, publishedAt: isPublished ? new Date().toISOString() : null },
    BLOG_COLUMNS,
  );
}

export async function updateBlogPost(
  id: string,
  input: BlogPostWriteInput,
  currentPublishedAt: string | null,
): Promise<void> {
  const { isPublished, ...payload } = buildBlogPayload(input);
  // Al publicar por primera vez fija publishedAt; al despublicar lo limpia.
  const publishedAt = isPublished ? currentPublishedAt ?? new Date().toISOString() : null;
  await updateRows(BLOG_TABLE, { ...payload, publishedAt }, { id });
}

export async function deleteBlogPost(id: string): Promise<void> {
  await deleteRows(BLOG_TABLE, { id });
}

// =========================================================
// Casos de éxito
// =========================================================

/** Lista pública: publicados, destacados primero, luego sortOrder. */
export async function getPublishedCaseStudies(): Promise<DbCaseStudy[]> {
  const rows = await safeSelect<DbCaseStudy>(CASE_TABLE, CASE_COLUMNS, {
    filters: { status: "published" },
  });
  return sortCaseStudies(rows);
}

export async function getAllCaseStudies(): Promise<DbCaseStudy[]> {
  const rows = await safeSelect<DbCaseStudy>(CASE_TABLE, CASE_COLUMNS, {
    orderBy: "updatedAt",
    ascending: false,
  });
  return rows;
}

function sortCaseStudies(rows: DbCaseStudy[]): DbCaseStudy[] {
  return [...rows].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    if (order !== 0) return order;
    return String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? ""));
  });
}

export async function getCaseStudyBySlug(slug: string): Promise<DbCaseStudy | null> {
  return safeSelectSingle<DbCaseStudy>(CASE_TABLE, CASE_COLUMNS, { slug });
}

export async function getCaseStudyById(id: string): Promise<DbCaseStudy | null> {
  return safeSelectSingle<DbCaseStudy>(CASE_TABLE, CASE_COLUMNS, { id });
}

export type CaseStudyWriteInput = {
  slug: string;
  companyName: string;
  industry?: string | null;
  problem: string;
  solution: string;
  results?: string | null;
  technologies?: string[];
  projectDuration?: string | null;
  clientQuote?: string | null;
  imageUrl?: string | null;
  imageAlt?: string | null;
  featured?: boolean;
  sortOrder?: number | null;
  status: "draft" | "published";
  metaTitle?: string | null;
  metaDescription?: string | null;
};

function buildCasePayload(input: CaseStudyWriteInput) {
  const isPublished = input.status === "published";
  return {
    payload: {
      slug: input.slug,
      companyName: input.companyName,
      industry: input.industry ?? null,
      problem: input.problem,
      solution: input.solution,
      results: input.results ?? null,
      technologies: input.technologies ?? [],
      projectDuration: input.projectDuration ?? null,
      clientQuote: input.clientQuote ?? null,
      imageUrl: input.imageUrl ?? null,
      imageAlt: input.imageAlt ?? null,
      featured: input.featured ?? false,
      sortOrder: input.sortOrder ?? 0,
      status: input.status,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
    },
    isPublished,
  };
}

export async function createCaseStudy(input: CaseStudyWriteInput): Promise<DbCaseStudy> {
  const { payload, isPublished } = buildCasePayload(input);
  return insertRow<DbCaseStudy>(
    CASE_TABLE,
    { ...payload, publishedAt: isPublished ? new Date().toISOString() : null },
    CASE_COLUMNS,
  );
}

export async function updateCaseStudy(
  id: string,
  input: CaseStudyWriteInput,
  currentPublishedAt: string | null,
): Promise<void> {
  const { payload, isPublished } = buildCasePayload(input);
  const publishedAt = isPublished ? currentPublishedAt ?? new Date().toISOString() : null;
  await updateRows(CASE_TABLE, { ...payload, publishedAt }, { id });
}

export async function deleteCaseStudy(id: string): Promise<void> {
  await deleteRows(CASE_TABLE, { id });
}
