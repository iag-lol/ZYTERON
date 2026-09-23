// Fuente de datos de casos públicos: SOLO casos publicados en Supabase
// (creados desde /admin/casos). El contenido curado/hardcodeado fue eliminado.
import { cache } from "react";
import {
  getPublishedCaseStudies,
  getCaseStudyBySlug,
  type DbCaseStudy,
} from "@/lib/admin/blog-cases-repository";

export type CaseListItem = {
  slug: string;
  heading: string;
  badgePrimary: string;
  badgeSecondary: string;
  summary: string;
  highlights: string[];
  featured: boolean;
};

/** Tarjetas para /casos-exito: publicados, destacados primero. */
export async function getCaseListItems(): Promise<CaseListItem[]> {
  const cases = await getPublishedCaseStudies(); // ya ordenados (featured, sortOrder)
  return cases.map((c) => ({
    slug: c.slug,
    heading: c.companyName,
    badgePrimary: c.industry?.trim() || "Caso de éxito",
    badgeSecondary: c.projectDuration?.trim() || "",
    summary: c.results?.trim() || c.problem,
    highlights: c.results?.trim() ? [c.results.trim()] : [],
    featured: Boolean(c.featured),
  }));
}

/** Casos destacados para la home (limita la cantidad). */
export async function getFeaturedCaseItems(limit = 4): Promise<CaseListItem[]> {
  const items = await getCaseListItems();
  return items.slice(0, limit);
}

/**
 * Casos publicados seleccionados por slug, en el mismo orden editorial recibido.
 * Los slugs duplicados o que no estén publicados se omiten sin completar el
 * resultado con casos ajenos al servicio.
 */
export async function getCaseListItemsBySlugs(slugs: readonly string[]): Promise<CaseListItem[]> {
  const items = await getCaseListItems();
  const itemsBySlug = new Map(items.map((item) => [item.slug, item]));

  return [...new Set(slugs)]
    .map((slug) => itemsBySlug.get(slug))
    .filter((item): item is CaseListItem => Boolean(item));
}

/** Devuelve el caso publicado por slug, o null. */
export const getDbCaseStudy = cache(async (slug: string): Promise<DbCaseStudy | null> => {
  const item = await getCaseStudyBySlug(slug);
  if (!item || item.status !== "published") return null;
  return item;
});
