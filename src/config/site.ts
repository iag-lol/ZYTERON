export const siteConfig = {
  name: "ZYTERON",
  legalName: "ZYTERON SpA",
  taxId: "78.398.774-0",
  domain: "zyteron.cl",
  url: "https://www.zyteron.cl",
  locale: "es-CL",
  description:
    "Desarrollamos páginas web, sistemas internos y soluciones digitales para empresas, pymes y emprendedores en Chile.",
  address: {
    city: "Santiago",
    region: "Región Metropolitana",
    country: "Chile",
    countryCode: "CL",
  },
  contact: {
    phone: "+56 9 8475 2936",
    email: "eduardo.avila@zyteron.cl",
    whatsapp: "+56 9 8475 2936",
  },
  business: {
    priceRange: "$$",
    hours: ["Mo-Fr 09:00-18:00"],
    areaServed: "Chile",
  },
  social: {
    linkedin: "https://www.linkedin.com/company/zyteron",
  },
};

export type SiteConfig = typeof siteConfig;
