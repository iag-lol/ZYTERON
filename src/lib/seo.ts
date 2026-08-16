import type { Metadata } from "next";
import { defaultOpenGraph, defaultTwitter } from "@/config/seo";
import { siteConfig } from "@/config/site";
import { getAbsoluteOgImageUrl } from "@/config/og";
import {
  buildAbsoluteUrl as buildAbsoluteUrlFromSchema,
  buildPrimaryOgImageUrl as buildPrimaryOgImageUrlFromSchema,
  computeAggregateRatingFromReviews,
  getAggregateRatingSchema,
  getBlogPostingSchema,
  getBreadcrumbSchema,
  getFAQSchema,
  getLocalBusinessSchema,
  getLocalLandingSchema,
  getOrganizationSchema,
  getPersonSchema,
  getServiceSchema,
  getWebPageSchema,
} from "@/lib/schema";
import type { PublicReview } from "@/lib/web-control-types";

type SeoMetadataInput = {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  ogImagePath?: string;
  ogImageAlt?: string;
  keywords?: string[];
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
  offers?: Array<{
    name: string;
    lowPrice: number;
    highPrice?: number;
    description?: string;
  }>;
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
  authorType?: "Person" | "Organization";
  authorUrl?: string;
  authorId?: string;
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

function normalizeMetadataTitle(rawTitle: string) {
  const escapedBrand = siteConfig.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const brandSuffix = new RegExp(
    `\\s*[|\\-–—]\\s*${escapedBrand}(?:\\.cl|\\s+SpA)?(?:\\s*[|·\\-–—].*)?$`,
    "i",
  );
  return rawTitle.replace(brandSuffix, "").trim();
}

function formatMetadataTitle(rawTitle: string) {
  const title = normalizeMetadataTitle(rawTitle);
  if (!title || title.toLowerCase() === siteConfig.name.toLowerCase()) return siteConfig.name;
  return `${title} | ${siteConfig.name}`;
}

export function buildAbsoluteUrl(path: string) {
  return buildAbsoluteUrlFromSchema(path);
}

export function buildPrimaryOgImageUrl() {
  return buildPrimaryOgImageUrlFromSchema();
}

const IMAGE_EXTENSION_RE = /\.(png|jpe?g|webp|gif|avif|svg)$/i;

/**
 * Valida que un valor sea una URL/ruta de imagen usable para og:image y
 * twitter:image. Rechaza el texto de ayuda del CMS guardado por error en el
 * campo (frases con espacios y sin extensión de imagen) que de otro modo se
 * emitiría como og:image roto y rompería la miniatura al compartir.
 */
export function isLikelySocialImagePath(value: string | null | undefined): boolean {
  if (typeof value !== "string") return false;
  const candidate = value.trim();
  if (!candidate) return false;
  // El texto de ayuda del editor trae espacios/saltos: nunca es una URL válida.
  if (/\s/.test(candidate)) return false;

  // Ruta interna de Next que genera una imagen dinámica (opengraph-image).
  if (candidate.endsWith("/opengraph-image")) return true;

  let pathname: string;
  if (/^https?:\/\//i.test(candidate)) {
    try {
      pathname = new URL(candidate).pathname;
    } catch {
      return false;
    }
  } else if (candidate.startsWith("/")) {
    pathname = candidate.split(/[?#]/)[0] ?? "";
  } else {
    return false;
  }

  return IMAGE_EXTENSION_RE.test(pathname);
}

export function createPageMetadata({
  title: rawTitle,
  description,
  path,
  ogImagePath,
  ogImageAlt,
  keywords,
  noIndex = false,
}: SeoMetadataInput): Metadata {
  const url = buildAbsoluteUrl(path);
  // Sólo se confía en ogImagePath si es realmente una imagen; si viene vacío o
  // con texto basura (ej. instructivo del CMS) se usa el OG por defecto válido.
  const socialImage =
    ogImagePath && isLikelySocialImagePath(ogImagePath)
      ? buildAbsoluteUrl(ogImagePath)
      : getAbsoluteOgImageUrl(path);
  const title = formatMetadataTitle(rawTitle);

  return {
    title: {
      absolute: title,
    },
    description,
    keywords,
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
          follow: true,
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
  return getOrganizationSchema();
}

export function buildProfessionalServiceJsonLd({
  path,
  description = siteConfig.description,
}: ProfessionalServiceJsonLdInput) {
  const pageUrl = buildAbsoluteUrl(path);
  const sameAs = [siteConfig.social.linkedin, siteConfig.social.instagram, siteConfig.social.facebook].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${pageUrl}#professionalservice`,
    name: siteConfig.name,
    legalName: siteConfig.legalName,
    url: pageUrl,
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
  return getWebPageSchema({ path, title, description, breadcrumbs });
}

export function buildServiceJsonLd({
  path,
  name,
  description,
  serviceType,
  offers,
}: ServiceJsonLdInput) {
  return getServiceSchema({ path, name, description, serviceType, offers });
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
  return getBreadcrumbSchema(items);
}

export function buildFaqJsonLd(faqs: FaqItem[]) {
  return getFAQSchema(faqs);
}

type AboutPageJsonLdInput = {
  path: string;
  title: string;
  description: string;
  team: Array<{
    id: string;
    name: string;
    role: string;
    description?: string;
    photoPath?: string;
  }>;
  breadcrumbs?: BreadcrumbItem[];
};

/**
 * Schema para /quienes-somos: AboutPage + Person por cada integrante visible
 * del equipo, enlazados a la Organization. Los @id de las personas deben
 * calzar con los usados en defaultJsonLdOrganization (founder) para que
 * Google consolide la entidad en un solo grafo.
 */
export function buildAboutPageJsonLd({
  path,
  title,
  description,
  team,
  breadcrumbs = [],
}: AboutPageJsonLdInput) {
  const pageUrl = buildAbsoluteUrl(path);

  const graph: Record<string, unknown>[] = [
    ...(getWebPageSchema({
      path,
      title,
      description,
      pageType: "AboutPage",
    })["@graph"] as Record<string, unknown>[]),
    ...team.map((member) =>
      getPersonSchema({
        id: `${pageUrl}#${member.id}`,
        name: member.name,
        jobTitle: member.role,
        description: member.description,
        image: member.photoPath,
        url: pageUrl,
      }),
    ),
  ];

  if (breadcrumbs.length) {
    graph.push(buildBreadcrumbJsonLd(breadcrumbs));
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function buildContactPageJsonLd(path: string, description: string) {
  return getWebPageSchema({
    path,
    title: "Contacto ZYTERON",
    description,
    pageType: "ContactPage",
  });
}

export function buildArticleJsonLd({
  path,
  title,
  description,
  datePublished,
  dateModified,
  image,
  authorName,
  authorType,
  authorUrl,
  authorId,
}: ArticleJsonLdInput) {
  return getBlogPostingSchema({
    path,
    title,
    description,
    datePublished,
    dateModified,
    image: image && isLikelySocialImagePath(image) ? image : buildPrimaryOgImageUrl(),
    authorName,
    authorType,
    authorUrl,
    authorId,
  });
}

export function buildLocalBusinessJsonLd(path = "/", description = siteConfig.description) {
  return getLocalBusinessSchema({ path, description });
}

export function buildAggregateRatingJsonLd(reviews: PublicReview[], itemUrl = "/") {
  const aggregate = computeAggregateRatingFromReviews(reviews);
  if (!aggregate) return null;
  return getAggregateRatingSchema({
    ratingValue: aggregate.ratingValue,
    reviewCount: aggregate.reviewCount,
    itemName: siteConfig.legalName,
    itemType: "Organization",
    itemUrl,
  });
}

export function buildLocalLandingJsonLd(input: Parameters<typeof getLocalLandingSchema>[0]) {
  return getLocalLandingSchema(input);
}

export function buildPlanPriceSpecificationJsonLd(path: string) {
  const pageUrl = buildAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": `${pageUrl}#price-specifications`,
    name: "Planes referenciales ZYTERON",
    url: pageUrl,
    itemListElement: [
      {
        "@type": "Offer",
        name: "Web Básica de Presentación",
        priceCurrency: "CLP",
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "CLP",
          minPrice: 79990,
          valueAddedTaxIncluded: false,
        },
      },
      {
        "@type": "Offer",
        name: "Plan Emprendedor",
        priceCurrency: "CLP",
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "CLP",
          minPrice: 129990,
          valueAddedTaxIncluded: false,
        },
      },
      {
        "@type": "Offer",
        name: "Plan Pyme",
        priceCurrency: "CLP",
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "CLP",
          minPrice: 219990,
          valueAddedTaxIncluded: false,
        },
      },
      {
        "@type": "Offer",
        name: "Plan Empresa",
        priceCurrency: "CLP",
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "CLP",
          minPrice: 399990,
          valueAddedTaxIncluded: false,
        },
      },
      {
        "@type": "Offer",
        name: "Catálogo por WhatsApp",
        priceCurrency: "CLP",
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "CLP",
          minPrice: 299990,
          valueAddedTaxIncluded: false,
        },
      },
      {
        "@type": "Offer",
        name: "Ecommerce con carrito y pagos",
        priceCurrency: "CLP",
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "CLP",
          minPrice: 599990,
          valueAddedTaxIncluded: false,
        },
      },
      {
        "@type": "Offer",
        name: "Sistema Web / Panel Administrativo",
        priceCurrency: "CLP",
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "CLP",
          minPrice: 1290000,
          valueAddedTaxIncluded: false,
        },
      },
      {
        "@type": "Offer",
        name: "Sistema Avanzado / Desarrollo a medida",
        priceCurrency: "CLP",
        priceSpecification: {
          "@type": "PriceSpecification",
          priceCurrency: "CLP",
          minPrice: 2490000,
          valueAddedTaxIncluded: false,
        },
      },
    ],
  };
}
