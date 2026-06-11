export const siteConfig = {
  name: "Zyteron",
  legalName: "Zyteron SpA",
  taxId: "78.398.774-0",
  domain: "zyteron.cl",
  url: "https://www.zyteron.cl",
  locale: "es-CL",
  description:
    "Desarrollamos sitios web, sistemas digitales, automatizaciones y soporte TI para empresas en Chile con foco en claridad comercial y operación estable.",
  address: {
    city: "Santiago",
    region: "Región Metropolitana",
    country: "Chile",
    countryCode: "CL",
  },
  contact: {
    phone: "+56939526626",
    phoneDisplay: "+56 9 3952 6626",
    email: "contacto@zyteron.cl",
    whatsapp: "+56939526626",
  },
  business: {
    priceRange: "$$",
    hours: ["Mo-Fr 09:00-18:00"],
    areaServed: "Chile",
    serviceTypes: [
      "Desarrollo web",
      "Sistemas web",
      "Software a medida",
      "Tiendas online",
      "Automatización",
      "Soporte TI",
      "SEO técnico",
    ],
  },
  social: {
    linkedin: "https://www.linkedin.com/company/zyteron",
    whatsapp: "https://wa.me/56939526626",
  },
  representative: {
    name: "Eduardo Ávila",
    role: "Fundador y líder de proyectos",
  },
};

export type SiteConfig = typeof siteConfig;
