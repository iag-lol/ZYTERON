import type { Metadata } from "next";
import { defaultJsonLdOrganization, defaultOpenGraph, defaultTwitter } from "@/config/seo";
import { siteConfig } from "@/config/site";
import { getAbsoluteOgImageUrl } from "@/config/og";

type SeoMetadataInput = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  ogImagePath?: string;
  ogImageAlt?: string;
};

type BreadcrumbItem = {
  name: string;
  path: string;
};

type WebPageJsonLdInput = {
  path: string;
  title: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
};

type ServiceJsonLdInput = {
  path: string;
  name: string;
  description: string;
  serviceType: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type ArticleJsonLdInput = {
  path: string;
  title: string;
  description: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  authorName?: string;
};

type ServicesListJsonLdInput = {
  path: string;
  title: string;
  services: Array<{
    name: string;
    description: string;
    path: string;
  }>;
};

type ProfessionalServiceJsonLdInput = {
  path: string;
  description?: string;
};

function normalizePath(path: string) {
  if (!path) return "/";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path === "/") return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function normalizeMetadataTitle(rawTitle: string) {
  const escapedBrand = siteConfig.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const brandSuffix = new RegExp(`\\s*[|\\-–—]\\s*${escapedBrand}\\s*$`, "i");
  return rawTitle.replace(brandSuffix, "").trim();
}

export function buildAbsoluteUrl(path: string) {
  const normalized = normalizePath(path);
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return normalized;
  }
  return normalized === "/" ? siteConfig.url : `${siteConfig.url}${normalized}`;
}

export function buildPrimaryOgImageUrl() {
  return getAbsoluteOgImageUrl("/");
}

export function createPageMetadata({
  title: rawTitle,
  description,
  path,
  ogImagePath,
  ogImageAlt,
  noIndex = false,
}: SeoMetadataInput): Metadata {
  const url = buildAbsoluteUrl(path);
  const socialImage = ogImagePath ? buildAbsoluteUrl(ogImagePath) : getAbsoluteOgImageUrl(path);
  const title = normalizeMetadataTitle(rawTitle);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      ...defaultOpenGraph,
      url,
      title,
      description,
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: ogImageAlt ?? `${title} - ${siteConfig.name}`,
        },
      ],
    },
    twitter: {
      ...defaultTwitter,
      title,
      description,
      images: [socialImage],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
          },
        },
  };
}

function buildServedAreas() {
  return [
    {
      "@type": "Country",
      name: "Chile",
    },
    {
      "@type": "City",
      name: "Santiago",
    },
    {
      "@type": "AdministrativeArea",
      name: "Región Metropolitana",
    },
  ];
}

function buildContactPoint() {
  return [
    {
      "@type": "ContactPoint",
      contactType: "sales",
      telephone: siteConfig.contact.phone,
      email: siteConfig.contact.email,
      areaServed: siteConfig.business.areaServed,
      availableLanguage: ["es-CL", "es"],
    },
  ];
}

export function buildOrganizationGraph() {
  const sameAs = [siteConfig.social.linkedin].filter(Boolean);
  const servedAreas = buildServedAreas();
  const contactPoint = buildContactPoint();

  return {
    "@context": "https://schema.org",
    "@graph": [
      defaultJsonLdOrganization,
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: siteConfig.name,
        inLanguage: siteConfig.locale,
        publisher: {
          "@id": `${siteConfig.url}/#organization`,
        },
      },
      {
        "@type": "ProfessionalService",
        "@id": `${siteConfig.url}/#professionalservice`,
        name: siteConfig.name,
        legalName: siteConfig.legalName,
        url: siteConfig.url,
        image: `${siteConfig.url}/logo.svg`,
        telephone: siteConfig.contact.phone,
        email: siteConfig.contact.email,
        description: siteConfig.description,
        areaServed: servedAreas,
        serviceType: siteConfig.business.serviceTypes,
        contactPoint,
        address: {
          "@type": "PostalAddress",
          addressLocality: siteConfig.address.city,
          addressRegion: siteConfig.address.region,
          addressCountry: siteConfig.address.countryCode,
        },
        openingHours: siteConfig.business.hours,
        priceRange: siteConfig.business.priceRange,
        sameAs,
        parentOrganization: {
          "@id": `${siteConfig.url}/#organization`,
        },
      },
      {
        "@type": "LocalBusiness",
        "@id": `${siteConfig.url}/#localbusiness`,
        name: siteConfig.name,
        legalName: siteConfig.legalName,
        taxID: siteConfig.taxId,
        url: siteConfig.url,
        image: `${siteConfig.url}/logo.svg`,
        telephone: siteConfig.contact.phone,
        email: siteConfig.contact.email,
        description: siteConfig.description,
        openingHours: siteConfig.business.hours,
        priceRange: siteConfig.business.priceRange,
        areaServed: servedAreas,
        serviceType: siteConfig.business.serviceTypes,
        contactPoint,
        address: {
          "@type": "PostalAddress",
          addressLocality: siteConfig.address.city,
          addressRegion: siteConfig.address.region,
          addressCountry: siteConfig.address.countryCode,
        },
        parentOrganization: {
          "@id": `${siteConfig.url}/#organization`,
        },
      },
    ],
  };
}

export function buildProfessionalServiceJsonLd({
  path,
  description = siteConfig.description,
}: ProfessionalServiceJsonLdInput) {
  const pageUrl = buildAbsoluteUrl(path);
  const sameAs = [siteConfig.social.linkedin].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${siteConfig.url}/#professionalservice`,
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.svg`,
    image: getAbsoluteOgImageUrl(path),
    description,
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    areaServed: buildServedAreas(),
    priceRange: siteConfig.business.priceRange,
    sameAs,
    contactPoint: buildContactPoint(),
    mainEntityOfPage: {
      "@id": `${pageUrl}#webpage`,
    },
  };
}

export function buildWebPageJsonLd({
  path,
  title,
  description,
  breadcrumbs = [],
}: WebPageJsonLdInput) {
  const pageUrl = buildAbsoluteUrl(path);

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description,
      inLanguage: siteConfig.locale,
      isPartOf: {
        "@id": `${siteConfig.url}/#website`,
      },
      about: {
        "@id": `${siteConfig.url}/#organization`,
      },
    },
  ];

  if (breadcrumbs.length) {
    graph.push(buildBreadcrumbJsonLd(breadcrumbs));
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function buildServiceJsonLd({
  path,
  name,
  description,
  serviceType,
}: ServiceJsonLdInput) {
  const pageUrl = buildAbsoluteUrl(path);
  const areaServed = buildServedAreas();

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${pageUrl}#service`,
    serviceType,
    name,
    description,
    url: pageUrl,
    areaServed,
    provider: {
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: `${siteConfig.url}/logo.svg`,
    },
  };
}

export function buildServicesListJsonLd({ path, title, services }: ServicesListJsonLdInput) {
  const pageUrl = buildAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${pageUrl}#services`,
    name: title,
    itemListElement: services.map((service, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Service",
        name: service.name,
        description: service.description,
        url: buildAbsoluteUrl(service.path),
        provider: {
          "@id": `${siteConfig.url}/#organization`,
        },
      },
    })),
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: buildAbsoluteUrl(item.path),
    })),
  };
}

export function buildFaqJsonLd(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildContactPageJsonLd(path: string, description: string) {
  const pageUrl = buildAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "@id": `${pageUrl}#contactpage`,
    url: pageUrl,
    name: "Contacto ZYTERON",
    description,
    isPartOf: {
      "@id": `${siteConfig.url}/#website`,
    },
    about: {
      "@id": `${siteConfig.url}/#organization`,
    },
  };
}

export function buildArticleJsonLd({
  path,
  title,
  description,
  datePublished,
  dateModified,
  image,
  authorName,
}: ArticleJsonLdInput) {
  const pageUrl = buildAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${pageUrl}#article`,
    headline: title,
    description,
    inLanguage: siteConfig.locale,
    url: pageUrl,
    image: image ? [buildAbsoluteUrl(image)] : [buildPrimaryOgImageUrl()],
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      "@type": "Organization",
      name: authorName ?? siteConfig.name,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo.svg`,
      },
    },
    mainEntityOfPage: {
      "@id": `${pageUrl}#webpage`,
    },
  };
}
