import type { DbCaseStudy } from "@/lib/admin/blog-cases-repository";

const CASH_CASE_SLUG = "casos-exito-sistema-control-interno-negocios-eliana";

/** La identidad pública y las vistas autorizadas se aplican sin modificar el registro administrativo. */
export function presentPublicCase(item: DbCaseStudy): DbCaseStudy {
  if (item.slug === "fenice-spa")
    return {
      ...item,
      imageUrl: "/projects/fenice.jpg",
      imageAlt: "Página de inicio actual del sitio web corporativo de Fenice SPA",
    };
  if (item.slug !== CASH_CASE_SLUG) return item;
  const publicText = (text: string | null) =>
    text?.replace(/Negocios?\s+Eliana(?:\s+Maipú)?|Eliana/gi, "Centro de Caja") ?? null;
  return {
    ...item,
    companyName: "Centro de Caja",
    problem: publicText(item.problem) ?? "",
    solution: publicText(item.solution) ?? "",
    results: publicText(item.results) ?? "",
    clientQuote: publicText(item.clientQuote),
    metaTitle: publicText(item.metaTitle),
    metaDescription: publicText(item.metaDescription),
    imageUrl: "/projects/centro-de-caja.svg",
    imageAlt:
      "Vista ilustrativa de Centro de Caja con información de ejemplo, sin datos de clientes",
  };
}
