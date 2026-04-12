import { siteConfig } from "@/config/site";

export const defaultOpenGraph = {
  type: "website",
  locale: siteConfig.locale,
  siteName: siteConfig.name,
  url: siteConfig.url,
};

export const defaultTwitter = {
  card: "summary_large_image",
  creator: "@zyteron",
};

export const defaultJsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteConfig.name,
  url: siteConfig.url,
  logo: `${siteConfig.url}/logo.svg`,
  sameAs: [siteConfig.social.linkedin].filter(Boolean),
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: siteConfig.contact.phone,
      contactType: "customer service",
      areaServed: "CL",
      availableLanguage: ["es", "en"],
    },
  ],
};
