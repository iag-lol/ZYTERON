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
  "@type": "Organization",
  "@id": `${siteConfig.url}/#organization`,
  name: siteConfig.name,
  url: siteConfig.url,
  logo: `${siteConfig.url}/logo.svg`,
  email: siteConfig.contact.email,
  telephone: siteConfig.contact.phone,
  areaServed: "CL",
  address: {
    "@type": "PostalAddress",
    addressLocality: siteConfig.address.city,
    addressRegion: siteConfig.address.region,
    addressCountry: "CL",
  },
  sameAs: [siteConfig.social.linkedin].filter(Boolean),
};
