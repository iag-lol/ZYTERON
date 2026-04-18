import { siteConfig } from "@/config/site";
import { servicePages } from "@/content/service-pages";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();
  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/servicios", priority: 0.95 },
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

  return [...staticRoutes, ...serviceRoutes];
}
