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
    phone: "+56 9 8475 2936",
    email: "contacto@zyteron.cl",
    whatsapp: "+56 9 8475 2936",
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
    whatsapp: "https://wa.me/56984752936",
  },
  representative: {
    name: "Eduardo Ávila",
    role: "Fundador y líder de proyectos",
  },
};

export type SiteConfig = typeof siteConfig;
