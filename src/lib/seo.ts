import type { Metadata } from "next";
import { defaultJsonLdOrganization, defaultOpenGraph, defaultTwitter } from "@/config/seo";
import { siteConfig } from "@/config/site";

type SeoMetadataInput = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noIndex?: boolean;
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

export function createPageMetadata({
  title: rawTitle,
  description,
  path,
  keywords = [],
  noIndex = false,
}: SeoMetadataInput): Metadata {
  const url = buildAbsoluteUrl(path);
  const socialImage = buildAbsoluteUrl("/logo.svg");
  const mergedKeywords = [...new Set([...siteConfig.keywords, ...keywords])];
  const title = normalizeMetadataTitle(rawTitle);

  return {
    title,
    description,
    keywords: mergedKeywords,
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
          width: 512,
          height: 512,
          alt: `${siteConfig.name} logo`,
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

export function buildOrganizationGraph() {
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
      },
      {
        "@type": "ProfessionalService",
        "@id": `${siteConfig.url}/#professionalservice`,
        name: `${siteConfig.name} Agencia Web`,
        url: siteConfig.url,
        image: `${siteConfig.url}/logo.svg`,
        telephone: siteConfig.contact.phone,
        email: siteConfig.contact.email,
        areaServed: "Chile",
        address: {
          "@type": "PostalAddress",
          addressLocality: siteConfig.address.city,
          addressRegion: siteConfig.address.region,
          addressCountry: "CL",
        },
        sameAs: [siteConfig.social.linkedin].filter(Boolean),
      },
      {
        "@type": "LocalBusiness",
        "@id": `${siteConfig.url}/#localbusiness`,
        name: siteConfig.name,
        url: siteConfig.url,
        image: `${siteConfig.url}/logo.svg`,
        telephone: siteConfig.contact.phone,
        email: siteConfig.contact.email,
        areaServed: "Chile",
        address: {
          "@type": "PostalAddress",
          addressLocality: siteConfig.address.city,
          addressRegion: siteConfig.address.region,
          addressCountry: "CL",
        },
        parentOrganization: {
          "@id": `${siteConfig.url}/#organization`,
        },
      },
    ],
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

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${pageUrl}#service`,
    serviceType,
    name,
    description,
    url: pageUrl,
    areaServed: "Chile",
    provider: {
      "@id": `${siteConfig.url}/#organization`,
    },
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
    name: "Contacto Zyteron",
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
}: ArticleJsonLdInput) {
  const pageUrl = buildAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${pageUrl}#article`,
    headline: title,
    description,
    inLanguage: siteConfig.locale,
    url: pageUrl,
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: {
      "@id": `${siteConfig.url}/#organization`,
    },
    publisher: {
      "@id": `${siteConfig.url}/#organization`,
    },
    mainEntityOfPage: {
      "@id": `${pageUrl}#webpage`,
    },
  };
}
