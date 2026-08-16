import { siteConfig } from "@/config/site";

// El sameAs canónico vive en src/lib/schema.ts (Organization/LocalBusiness);
// aquí solo quedan los defaults de Open Graph y Twitter.
export const defaultOpenGraph = {
  type: "website",
  locale: siteConfig.locale,
  siteName: siteConfig.name,
  url: siteConfig.url,
};

export const defaultTwitter = {
  card: "summary_large_image",
};
