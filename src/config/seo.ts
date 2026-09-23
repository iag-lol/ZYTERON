import { siteConfig } from "@/config/site";

// El sameAs canónico vive en src/lib/schema.ts (Organization/LocalBusiness);
// aquí solo quedan los defaults de Open Graph y Twitter.
export const defaultOpenGraph = {
  type: "website",
  // Open Graph usa guion bajo (es_CL); el atributo lang conserva es-CL.
  locale: siteConfig.locale.replace("-", "_"),
  siteName: siteConfig.name,
  url: siteConfig.url,
};

export const defaultTwitter = {
  card: "summary_large_image",
};
