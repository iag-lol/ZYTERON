// Capa de fusión de casos de éxito: combina los casos publicados en Supabase
// (creados desde /admin/casos) con los casos curados en src/content.
// Regla: si un slug existe en ambos, gana la base de datos.
import {
  getPublishedCaseStudies,
  getCaseStudyBySlug,
  type DbCaseStudy,
} from "@/lib/admin/blog-cases-repository";
import {
  caseStudies,
  getCaseStudyBySlug as getCuratedCaseStudyBySlug,
} from "@/content/case-studies";

export type CaseListItem = {
  slug: string;
  heading: string;
  badgePrimary: string;
  badgeSecondary: string;
  summary: string;
  highlights: string[];
  featured: boolean;
  source: "db" | "curated";
};

/** Tarjetas para /casos-exito: BD destacados primero, luego BD, luego curados. */
export async function getCaseListItems(): Promise<CaseListItem[]> {
  const dbCases = await getPublishedCaseStudies(); // ya ordenados (featured, sortOrder)
  const dbSlugs = new Set(dbCases.map((c) => c.slug));

  const dbItems: CaseListItem[] = dbCases.map((c) => ({
    slug: c.slug,
    heading: c.companyName,
    badgePrimary: c.industry?.trim() || "Caso de éxito",
    badgeSecondary: c.projectDuration?.trim() || "",
    summary: c.results?.trim() || c.problem,
    highlights: c.results?.trim() ? [c.results.trim()] : [],
    featured: Boolean(c.featured),
    source: "db",
  }));

  const curatedItems: CaseListItem[] = caseStudies
    .filter((c) => !dbSlugs.has(c.slug))
    .map((c) => ({
      slug: c.slug,
      heading: c.title,
      badgePrimary: c.industry,
      badgeSecondary: c.location,
      summary: c.summary,
      highlights: c.outcomes.slice(0, 2),
      featured: false,
      source: "curated",
    }));

  return [...dbItems, ...curatedItems];
}

/** Todos los slugs publicados (BD + curado), sin duplicados. */
export async function getAllCaseSlugs(): Promise<string[]> {
  const dbCases = await getPublishedCaseStudies();
  const slugs = new Set<string>(dbCases.map((c) => c.slug));
  for (const c of caseStudies) slugs.add(c.slug);
  return [...slugs];
}

export async function getDbCaseStudy(slug: string): Promise<DbCaseStudy | null> {
  const item = await getCaseStudyBySlug(slug);
  if (!item || item.status !== "published") return null;
  return item;
}

/** Resuelve un slug: primero BD, si no, curado. */
export async function resolveCaseStudy(slug: string): Promise<
  | { source: "db"; db: DbCaseStudy }
  | { source: "curated"; curated: NonNullable<ReturnType<typeof getCuratedCaseStudyBySlug>> }
  | null
> {
  const db = await getDbCaseStudy(slug);
  if (db) return { source: "db", db };
  const curated = getCuratedCaseStudyBySlug(slug);
  if (curated) return { source: "curated", curated };
  return null;
}
