import { siteConfig } from "@/config/site";

const sameAs = [
  siteConfig.social.linkedin,
  siteConfig.social.instagram,
  siteConfig.social.facebook,
  siteConfig.social.goodfirms,
  siteConfig.social.theManifest,
].filter(Boolean);

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
  telephone: siteConfig.contact.phone,
  email: siteConfig.contact.email,
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: siteConfig.contact.phone,
      email: siteConfig.contact.email,
      areaServed: siteConfig.business.areaServed,
      availableLanguage: ["es-CL", "es"],
    },
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: siteConfig.address.city,
    addressRegion: siteConfig.address.region,
    addressCountry: siteConfig.address.countryCode,
  },
  founder: {
    "@type": "Person",
    "@id": `${siteConfig.url}/quienes-somos#eduardo-avila`,
    name: siteConfig.representative.name,
    jobTitle: siteConfig.representative.role,
    description: siteConfig.representative.description,
    worksFor: {
      "@id": `${siteConfig.url}/#organization`,
    },
  },
  knowsAbout: siteConfig.business.serviceTypes,
  sameAs,
};
