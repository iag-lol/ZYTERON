import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/portal-clientes/", "/checkout/", "/pagos/"],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
