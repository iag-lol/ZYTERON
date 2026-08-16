import { siteConfig } from "@/config/site";
import { priorityServicePages } from "@/content/priority-service-pages";
import { servicePages } from "@/content/service-pages";
import { seoServicePages } from "@/content/seo-service-pages";
import { getPublishedBlogPosts, getPublishedCaseStudies } from "@/lib/admin/blog-cases-repository";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  // Sin lastModified en rutas estáticas: emitir new Date() en cada build le
  // señala a Google cambios falsos y degrada la confianza en el sitemap.
  const staticRoutes = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/servicios", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/planes", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/contacto", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/cotizador", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/demos", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/casos-exito", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/productos", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/quienes-somos", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/recursos/checklist-seo-pymes-chile", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/becas-web-pyme", priority: 0.5, changeFrequency: "monthly" as const },
  ].map(({ path, priority, changeFrequency }) => ({
    url: `${base}${path}`,
    changeFrequency,
    priority,
  }));

  const priorityServiceRoutes = priorityServicePages.map((servicePage) => ({
    url: `${base}${servicePage.path}`,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const seoServiceRoutes = seoServicePages.map((servicePage) => ({
    url: `${base}${servicePage.path}`,
    changeFrequency: "monthly" as const,
    priority: 0.9,
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
  const [dbPosts, dbCases] = await Promise.all([getPublishedBlogPosts(), getPublishedCaseStudies()]);

  const blogRoutes = dbPosts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt ?? post.publishedAt ?? post.createdAt ?? Date.now()),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const caseStudyRoutes = dbCases.map((caseStudy) => ({
    url: `${base}/casos-exito/${caseStudy.slug}`,
    lastModified: new Date(caseStudy.updatedAt ?? caseStudy.publishedAt ?? caseStudy.createdAt ?? Date.now()),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...staticRoutes,
    ...seoServiceRoutes,
    ...priorityServiceRoutes,
    ...serviceRoutes,
    ...caseStudyRoutes,
    ...blogRoutes,
  ];
}
