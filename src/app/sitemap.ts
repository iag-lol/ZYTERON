import { siteConfig } from "@/config/site";
import { blogPosts } from "@/content/blog-posts";
import { caseStudies } from "@/content/case-studies";
import { priorityServicePages } from "@/content/priority-service-pages";
import { servicePages } from "@/content/service-pages";
import { seoServicePages } from "@/content/seo-service-pages";
import { getPublishedBlogPosts, getPublishedCaseStudies } from "@/lib/admin/blog-cases-repository";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();
  const staticRoutes = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/servicios", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/planes", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/contacto", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/cotizador", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/demos", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/blog", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/casos-exito", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/productos", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/quienes-somos", priority: 0.6, changeFrequency: "monthly" as const },
  ].map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? ("weekly" as const) : ("monthly" as const),
    priority,
  }));

  const priorityServiceRoutes = priorityServicePages.map((servicePage) => ({
    url: `${base}${servicePage.path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const seoServiceRoutes = seoServicePages.map((servicePage) => ({
    url: `${base}${servicePage.path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const serviceRoutes = servicePages.map((service) => ({
    url: `${base}/servicios/${service.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  // Combina artículos/casos publicados en Supabase con los curados (la BD gana por slug).
  const [dbPosts, dbCases] = await Promise.all([getPublishedBlogPosts(), getPublishedCaseStudies()]);
  const dbPostSlugs = new Set(dbPosts.map((p) => p.slug));
  const dbCaseSlugs = new Set(dbCases.map((c) => c.slug));

  const blogRoutes = [
    ...dbPosts.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.updatedAt ?? post.publishedAt ?? post.createdAt ?? Date.now()),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...blogPosts
      .filter((post) => !dbPostSlugs.has(post.slug))
      .map((post) => ({
        url: `${base}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt ?? post.publishedAt),
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
  ];

  const caseStudyRoutes = [
    ...dbCases.map((caseStudy) => ({
      url: `${base}/casos-exito/${caseStudy.slug}`,
      lastModified: new Date(caseStudy.updatedAt ?? caseStudy.publishedAt ?? caseStudy.createdAt ?? Date.now()),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...caseStudies
      .filter((caseStudy) => !dbCaseSlugs.has(caseStudy.slug))
      .map((caseStudy) => ({
        url: `${base}/casos-exito/${caseStudy.slug}`,
        lastModified: new Date(caseStudy.updatedAt ?? caseStudy.publishedAt),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      })),
  ];

  return [
    ...staticRoutes,
    ...seoServiceRoutes,
    ...priorityServiceRoutes,
    ...serviceRoutes,
    ...caseStudyRoutes,
    ...blogRoutes,
  ];
}
