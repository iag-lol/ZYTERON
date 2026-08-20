import { siteConfig } from "@/config/site";
import { getAbsoluteOgImageUrl } from "@/config/og";

export type SchemaBreadcrumbItem = {
  name: string;
  path: string;
};

export type SchemaFaqItem = {
  question: string;
  answer: string;
};

export type SchemaServiceOffer = {
  name: string;
  lowPrice: number;
  highPrice?: number;
  description?: string;
};

export type SchemaServiceInput = {
  path: string;
  name: string;
  description: string;
  serviceType: string;
  offers?: SchemaServiceOffer[];
};

export type SchemaWebPageInput = {
  path: string;
  title: string;
  description: string;
  breadcrumbs?: SchemaBreadcrumbItem[];
  pageType?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage";
};

export type SchemaArticleInput = {
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

export type SchemaPersonInput = {
  id?: string;
  name: string;
  jobTitle: string;
  description?: string;
  image?: string;
  url?: string;
  knowsAbout?: string[];
};

const ROUTE_LABELS: Record<string, string> = {
  blog: "Blog",
  "casos-exito": "Casos de éxito",
  contacto: "Contacto",
  cotizador: "Cotizador",
  demos: "Demos",
  "desarrollo-web": "Desarrollo web",
  "diseno-web": "Diseño web",
  "paginas-web-para-empresas": "Páginas web para empresas",
  faq: "FAQ",
  planes: "Planes",
  productos: "Productos",
  "paginas-web-para-pymes": "Páginas web para pymes",
  "paginas-web-santiago": "Páginas web Santiago",
  "desarrollo-web-santiago": "Desarrollo web Santiago",
  "quienes-somos": "Quiénes somos",
  servicios: "Servicios",
  "sistemas-web": "Sistemas web",
  "soporte-ti": "Soporte TI",
  "tiendas-online": "Tiendas online",
  automatizacion: "Automatización",
};

function normalizePath(path: string) {
  if (!path) return "/";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    const parsed = new URL(path);
    return parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/$/, "");
  }
  if (path === "/") return "/";
  const withoutQuery = path.split("?")[0]?.split("#")[0] || "/";
  const normalized = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  return normalized === "/" ? "/" : normalized.replace(/\/$/, "");
}

function humanizeSegment(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getOrganizationId() {
  return `${siteConfig.url}/#organization`;
}

function getWebsiteId() {
  return `${siteConfig.url}/#website`;
}

function getLocalBusinessId() {
  return `${siteConfig.url}/#localbusiness`;
}

function buildServedAreas() {
  return [
    { "@type": "Country", name: "Chile" },
    { "@type": "City", name: siteConfig.address.city },
    { "@type": "AdministrativeArea", name: siteConfig.address.region },
  ];
}

function buildPostalAddress() {
  return {
    "@type": "PostalAddress",
    streetAddress: siteConfig.address.streetAddress,
    addressLocality: siteConfig.address.commune,
    addressRegion: siteConfig.address.region,
    postalCode: siteConfig.address.postalCode,
    addressCountry: siteConfig.address.countryCode,
  };
}

export function buildGoogleMapsUrl() {
  const query = encodeURIComponent(
    `${siteConfig.address.streetAddress}, ${siteConfig.address.commune}, ${siteConfig.address.city}, Chile`,
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

function buildContactPoint() {
  return {
    "@type": "ContactPoint",
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    contactType: "customer service",
    areaServed: siteConfig.business.areaServed,
    availableLanguage: ["Spanish", "es-CL", "es"],
  };
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

export function getBreadcrumbs(route: string) {
  const normalized = normalizePath(route);
  if (normalized === "/") return [{ name: "Inicio", path: "/" }];

  const segments = normalized.split("/").filter(Boolean);
  const items: SchemaBreadcrumbItem[] = [{ name: "Inicio", path: "/" }];

  segments.forEach((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join("/")}`;
    items.push({
      name: ROUTE_LABELS[segment] ?? humanizeSegment(segment),
      path,
    });
  });

  return items;
}

export function getOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": getOrganizationId(),
        name: siteConfig.name,
        alternateName: siteConfig.legalName,
        legalName: siteConfig.legalName,
        slogan: siteConfig.slogan,
        taxID: siteConfig.taxId,
        url: `${siteConfig.url}/`,
        logo: {
          "@type": "ImageObject",
          url: `${siteConfig.url}/logo.svg`,
        },
        image: buildAbsoluteUrl("/og/home.png"),
        description: siteConfig.description,
        email: siteConfig.contact.email,
        telephone: siteConfig.contact.phone,
        foundingDate: siteConfig.foundingDate,
        numberOfEmployees: {
          "@type": "QuantitativeValue",
          value: siteConfig.business.teamSize,
        },
        ...(siteConfig.business.hasPublicOffice ? { address: buildPostalAddress() } : {}),
        founder: {
          "@type": "Person",
          "@id": `${siteConfig.url}/quienes-somos#eduardo-avila`,
          name: siteConfig.representative.name,
          jobTitle: siteConfig.representative.role,
          url: `${siteConfig.url}/quienes-somos`,
        },
        sameAs: [
          siteConfig.social.linkedin,
          siteConfig.social.instagram,
          siteConfig.social.facebook,
          siteConfig.social.goodfirms,
          siteConfig.social.theManifest,
        ].filter(Boolean),
        areaServed: {
          "@type": "Country",
          name: siteConfig.business.areaServed,
        },
        knowsAbout: [
          ...siteConfig.business.serviceTypes,
          ...siteConfig.business.expertiseTopics,
        ],
        contactPoint: [buildContactPoint()],
      },
      {
        "@type": "WebSite",
        "@id": getWebsiteId(),
        url: `${siteConfig.url}/`,
        name: siteConfig.name,
        alternateName: siteConfig.domain,
        description: siteConfig.description,
        inLanguage: siteConfig.locale,
        publisher: {
          "@id": getOrganizationId(),
        },
      },
    ],
  };
}

export function getLocalBusinessSchema({
  path = "/",
  description = siteConfig.description,
}: {
  path?: string;
  description?: string;
} = {}) {
  const pageUrl = buildAbsoluteUrl(path);

  const publicLocation = siteConfig.business.hasPublicOffice
    ? {
        address: buildPostalAddress(),
        geo: {
          "@type": "GeoCoordinates",
          latitude: siteConfig.geo.latitude,
          longitude: siteConfig.geo.longitude,
        },
        hasMap: buildGoogleMapsUrl(),
      }
    : {
        address: {
          "@type": "PostalAddress",
          addressLocality: siteConfig.address.city,
          addressRegion: siteConfig.address.region,
          addressCountry: siteConfig.address.countryCode,
        },
      };

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": getLocalBusinessId(),
    name: siteConfig.legalName,
    description,
    url: pageUrl,
    image: buildAbsoluteUrl("/og/home.png"),
    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
    priceRange: siteConfig.business.priceRange,
    foundingDate: siteConfig.foundingDate,
    ...publicLocation,
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:00",
        closes: "18:00",
      },
    ],
    areaServed: {
      "@type": "Country",
      name: siteConfig.business.areaServed,
    },
    contactPoint: [buildContactPoint()],
    sameAs: [
      siteConfig.social.linkedin,
      siteConfig.social.instagram,
      siteConfig.social.facebook,
      siteConfig.social.goodfirms,
      siteConfig.social.theManifest,
    ].filter(Boolean),
    parentOrganization: {
      "@id": getOrganizationId(),
    },
  };
}

export function getServiceSchema({
  path,
  name,
  description,
  serviceType,
  offers,
}: SchemaServiceInput) {
  const pageUrl = buildAbsoluteUrl(path);

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${pageUrl}#service`,
    serviceType,
    name,
    description,
    url: pageUrl,
    areaServed: buildServedAreas(),
    provider: {
      "@id": getOrganizationId(),
      name: siteConfig.name,
      url: siteConfig.url,
      logo: `${siteConfig.url}/logo.svg`,
    },
    ...(offers?.length
      ? {
          offers: {
            "@type": "OfferCatalog",
            name: `Ofertas referenciales de ${name}`,
            itemListElement: offers.map((offer) => ({
              "@type": "Offer",
              name: offer.name,
              description: offer.description,
              priceCurrency: "CLP",
              priceSpecification: {
                "@type": "PriceSpecification",
                priceCurrency: "CLP",
                minPrice: offer.lowPrice,
                ...(offer.highPrice ? { maxPrice: offer.highPrice } : {}),
                valueAddedTaxIncluded: false,
              },
              availability: "https://schema.org/InStock",
              url: pageUrl,
              seller: {
                "@id": getOrganizationId(),
              },
            })),
          },
        }
      : {}),
  };
}

export function getFAQSchema(faqs: SchemaFaqItem[]) {
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

export function getBreadcrumbSchema(items: SchemaBreadcrumbItem[]) {
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

export function getBlogPostingSchema({
  path,
  title,
  description,
  datePublished,
  dateModified,
  image,
  authorName,
  authorType = "Organization",
  authorUrl,
  authorId,
}: SchemaArticleInput) {
  const pageUrl = buildAbsoluteUrl(path);
  // El @id de una Person sólo se emite si el llamador lo entrega explícito:
  // asignar por defecto el @id del fundador marcaría a cualquier autor como
  // la entidad Eduardo Ávila y contaminaría el grafo de personas.
  const authorEntity =
    authorType === "Person"
      ? {
          "@type": "Person",
          ...(authorId ? { "@id": authorId } : {}),
          name: authorName ?? siteConfig.representative.name,
          ...(authorUrl ? { url: authorUrl } : {}),
        }
      : {
          "@type": "Organization",
          "@id": authorId ?? getOrganizationId(),
          name: authorName ?? siteConfig.name,
          url: authorUrl ?? siteConfig.url,
        };

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${pageUrl}#article`,
    headline: title,
    description,
    inLanguage: siteConfig.locale,
    url: pageUrl,
    image: [image ? buildAbsoluteUrl(image) : buildPrimaryOgImageUrl()],
    datePublished,
    dateModified: dateModified ?? datePublished,
    author: authorEntity,
    publisher: {
      "@type": "Organization",
      "@id": getOrganizationId(),
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
    },
  };
}

export function getPersonSchema(person?: Partial<SchemaPersonInput>) {
  const id = person?.id ?? `${siteConfig.url}/quienes-somos#eduardo-avila`;
  const url = person?.url ?? `${siteConfig.url}/quienes-somos`;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": id,
    name: person?.name ?? siteConfig.representative.name,
    jobTitle: person?.jobTitle ?? siteConfig.representative.role,
    ...(person?.description ?? siteConfig.representative.description
      ? { description: person?.description ?? siteConfig.representative.description }
      : {}),
    ...(person?.image ? { image: buildAbsoluteUrl(person.image) } : {}),
    url,
    worksFor: {
      "@id": getOrganizationId(),
    },
    ...(person?.knowsAbout?.length
      ? {
          knowsAbout: person.knowsAbout,
        }
      : {}),
  };
}

export function getWebPageSchema({
  path,
  title,
  description,
  breadcrumbs = [],
  pageType = "WebPage",
}: SchemaWebPageInput) {
  const pageUrl = buildAbsoluteUrl(path);
  const graph: Record<string, unknown>[] = [
    {
      "@type": pageType,
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: title,
      description,
      inLanguage: siteConfig.locale,
      isPartOf: {
        "@id": getWebsiteId(),
      },
      about: {
        "@id": getOrganizationId(),
      },
    },
  ];

  if (breadcrumbs.length) {
    graph.push(getBreadcrumbSchema(breadcrumbs));
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

