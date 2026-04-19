import { siteConfig } from "@/config/site";
import { blogPosts } from "@/content/blog-posts";
import { caseStudies } from "@/content/case-studies";
import { localPages } from "@/content/local-pages";
import { servicePages } from "@/content/service-pages";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();
  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/servicios", priority: 0.95 },
    { path: "/casos-exito", priority: 0.9 },
    { path: "/blog", priority: 0.85 },
    { path: "/faq", priority: 0.8 },
    { path: "/ciudades", priority: 0.82 },
    { path: "/contacto", priority: 0.9 },
    { path: "/paquetes", priority: 0.85 },
    { path: "/planes", priority: 0.85 },
    { path: "/productos", priority: 0.75 },
    { path: "/nosotros", priority: 0.7 },
    { path: "/privacidad", priority: 0.3 },
    { path: "/terminos", priority: 0.3 },
  ].map(({ path, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority,
  }));

  const serviceRoutes = servicePages.map((service) => ({
    url: `${base}/servicios/${service.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const localRoutes = localPages.map((city) => ({
    url: `${base}/ciudades/${city.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.72,
  }));

  const caseRoutes = caseStudies.map((caseStudy) => ({
    url: `${base}/casos-exito/${caseStudy.slug}`,
    lastModified: new Date(caseStudy.updatedAt ?? caseStudy.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.74,
  }));

  const blogRoutes = blogPosts.map((post) => ({
    url: `${base}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt ?? post.publishedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticRoutes, ...serviceRoutes, ...localRoutes, ...caseRoutes, ...blogRoutes];
}
