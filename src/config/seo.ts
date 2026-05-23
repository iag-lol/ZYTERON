import { siteConfig } from "@/config/site";

const sameAs = [siteConfig.social.linkedin, siteConfig.social.whatsapp].filter(Boolean);

export const defaultOpenGraph = {
  type: "website",
  locale: siteConfig.locale,
  siteName: siteConfig.name,
  url: siteConfig.url,
};

export const defaultTwitter = {
  card: "summary_large_image",
};

export const defaultJsonLdOrganization = {
  "@type": "Organization",
  "@id": `${siteConfig.url}/#organization`,
  name: siteConfig.name,
  legalName: siteConfig.legalName,
  taxID: siteConfig.taxId,
  url: `${siteConfig.url}/`,
  logo: `${siteConfig.url}/logo.svg`,
  description: siteConfig.description,
  founder: {
    "@type": "Person",
    name: siteConfig.representative.name,
    jobTitle: siteConfig.representative.role,
  },
  knowsAbout: siteConfig.business.serviceTypes,
  sameAs,
};
