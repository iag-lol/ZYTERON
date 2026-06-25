import { CaseManager, type CaseStudyRow } from "@/components/admin/case-manager";
import { getAllCaseStudies } from "@/lib/admin/blog-cases-repository";

export const dynamic = "force-dynamic";

export default async function AdminCasosPage() {
  const cases = await getAllCaseStudies();
  const rows: CaseStudyRow[] = cases.map((c) => ({
    id: c.id,
    slug: c.slug,
    companyName: c.companyName,
    industry: c.industry,
    problem: c.problem,
    solution: c.solution,
    results: c.results,
    technologies: c.technologies,
    projectDuration: c.projectDuration,
    clientQuote: c.clientQuote,
    imageUrl: c.imageUrl,
    imageAlt: c.imageAlt,
    featured: c.featured,
    sortOrder: c.sortOrder,
    status: c.status,
    metaTitle: c.metaTitle,
    metaDescription: c.metaDescription,
    updatedAt: c.updatedAt,
  }));

  return <CaseManager cases={rows} />;
}
