import { siteConfig } from "@/config/site";
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: ["/admin/", "/api/", "/checkout/", "/pagos/", "/roadmap"],
      },
    ],
    host: "www.zyteron.cl",
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
