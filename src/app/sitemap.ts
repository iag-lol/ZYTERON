import { siteConfig } from "@/config/site";
import { priorityServicePages } from "@/content/priority-service-pages";
import { servicePages } from "@/content/service-pages";
import { seoServicePages } from "@/content/seo-service-pages";
import { verticalPages } from "@/content/vertical-pages";
import { systemPages } from "@/content/system-pages";
import { getPublishedBlogPosts, getPublishedCaseStudies } from "@/lib/admin/blog-cases-repository";
import { getPublishedScholarshipWinnerRoutes } from "@/lib/becas/public-winners";
import { buildAbsoluteUrl, isLikelySocialImagePath } from "@/lib/seo";
import type { MetadataRoute } from "next";

export const revalidate = 3600;

function validDate(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) continue;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return undefined;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  // Sin lastModified en rutas estáticas: emitir new Date() en cada build le
  // señala a Google cambios falsos y degrada la confianza en el sitemap.
  const staticRoutes = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/servicios", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/planes", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/contacto", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/cotizador", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/calculadora-precio-pagina-web", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/demos", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/blog", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/casos-exito", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/quienes-somos", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/recursos", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/recursos/checklist-seo-pymes-chile", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/recursos/como-elegir-empresa-desarrollo-web-chile", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/recursos/wordpress-vs-web-a-medida-chile", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/becas-web-pyme", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/becas-web-pyme/bases", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/becas-web-pyme/privacidad", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/becas-web-pyme/vitrina", priority: 0.5, changeFrequency: "weekly" as const },
    { path: "/politica-editorial", priority: 0.4, changeFrequency: "yearly" as const },
    { path: "/mapa-del-sitio", priority: 0.4, changeFrequency: "monthly" as const },
    { path: "/privacidad", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terminos", priority: 0.3, changeFrequency: "yearly" as const },
  ].map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    changeFrequency,
    priority,
  }));

  const consolidatedPriorityPaths = new Set(["/tiendas-online-chile", "/sistemas-web-a-medida"]);

  const priorityServiceRoutes = priorityServicePages
    .filter((servicePage) => !consolidatedPriorityPaths.has(servicePage.path))
    .map((servicePage) => ({
      url: `${base}${servicePage.path}`,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    }));

  const seoServiceRoutes = seoServicePages.map((servicePage) => ({
    url: `${base}${servicePage.path}`,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  // Landings por rubro y subpáginas de sistemas: contenido propio por URL.
  const verticalRoutes = verticalPages.map((page) => ({
    url: `${base}${page.path}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const systemRoutes = systemPages.map((page) => ({
    url: `${base}${page.path}`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const consolidatedServiceSlugs = new Set([
    "desarrollo-web-chile",
    "paginas-web-para-empresas",
    "creacion-de-sitios-web-para-empresas",
    "paginas-web-para-pymes",
    "diseno-web-chile",
    "agencia-diseno-web-chile",
    "diseno-web-santiago",
  ]);

  const serviceRoutes = servicePages.filter((service) => !consolidatedServiceSlugs.has(service.slug)).map((service) => ({
    url: `${base}/servicios/${service.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  // Solo artículos y casos publicados en Supabase.
  const [dbPosts, dbCases, scholarshipWinners] = await Promise.all([
    getPublishedBlogPosts(),
    getPublishedCaseStudies(),
    getPublishedScholarshipWinnerRoutes(),
  ]);

  const blogRoutes = dbPosts.map((post) => {
    const lastModified = validDate(post.updatedAt, post.publishedAt, post.createdAt);
    const image = post.ogImageUrl || post.coverImageUrl;
    return {
      url: `${base}/blog/${post.slug}`,
      ...(lastModified ? { lastModified } : {}),
      ...(isLikelySocialImagePath(image) ? { images: [buildAbsoluteUrl(image as string)] } : {}),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    };
  });

  const caseStudyRoutes = dbCases.map((caseStudy) => {
    const lastModified = validDate(caseStudy.updatedAt, caseStudy.publishedAt, caseStudy.createdAt);
    return {
      url: `${base}/casos-exito/${caseStudy.slug}`,
      ...(lastModified ? { lastModified } : {}),
      ...(isLikelySocialImagePath(caseStudy.imageUrl)
        ? { images: [buildAbsoluteUrl(caseStudy.imageUrl as string)] }
        : {}),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    };
  });

  const scholarshipWinnerRoutes = scholarshipWinners.map((winner) => {
    const lastModified = validDate(winner.publishedAt);
    return {
      url: `${base}/becas-web-pyme/ganador/${winner.slug}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "yearly" as const,
      priority: 0.4,
    };
  });

  return [
    ...staticRoutes,
    ...seoServiceRoutes,
    ...priorityServiceRoutes,
    ...verticalRoutes,
    ...systemRoutes,
    ...serviceRoutes,
    ...scholarshipWinnerRoutes,
    ...caseStudyRoutes,
    ...blogRoutes,
  ];
}
