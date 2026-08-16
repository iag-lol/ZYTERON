const ZYTERON_PHONE_E164 = "+56939526626";
const ZYTERON_WHATSAPP_URL = `https://wa.me/${ZYTERON_PHONE_E164.replace(/\D/g, "")}`;
const ZYTERON_PHONE_DISPLAY = "+56 9 3952 6626";
const ZYTERON_ADDRESS_DISPLAY =
  "Antonio Bellet 193, Providencia, Santiago, Región Metropolitana, Chile";
const ZYTERON_BUSINESS_HOURS_DISPLAY = "Lun-Vie 09:00 a 18:00";

export const siteConfig = {
  name: "Zyteron",
  legalName: "Zyteron SpA",
  taxId: "78.398.774-0",
  domain: "zyteron.cl",
  url: "https://www.zyteron.cl",
  locale: "es-CL",
  foundingDate: "2024",
  description:
    "Desarrollamos páginas web, sistemas digitales, automatizaciones y soporte TI para empresas y pymes de Santiago, Región Metropolitana y todo Chile, con foco en claridad comercial y operación estable.",
  address: {
    streetAddress: "Antonio Bellet 193",
    commune: "Providencia",
    city: "Santiago",
    region: "Región Metropolitana",
    postalCode: "7500000",
    country: "Chile",
    countryCode: "CL",
    display: ZYTERON_ADDRESS_DISPLAY,
  },
  geo: {
    latitude: -33.4238,
    longitude: -70.6182,
  },
  contact: {
    phone: ZYTERON_PHONE_E164,
    phoneDisplay: ZYTERON_PHONE_DISPLAY,
    email: "contacto@zyteron.cl",
    whatsapp: ZYTERON_PHONE_E164,
  },
  business: {
    hasPublicOffice: true,
    priceRange: "$$",
    hours: ["Mo-Fr 09:00-18:00"],
    hoursDisplay: ZYTERON_BUSINESS_HOURS_DISPLAY,
    areaServed: "Chile",
    primaryArea: "Santiago y Región Metropolitana",
    experienceYears: 7,
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
    // URLs canónicas de perfiles: deben ser idénticas en footer, schemas y
    // cualquier mención, sin parámetros de query, para consolidar la entidad.
    linkedin: "https://www.linkedin.com/company/zyteron-spa/",
    instagram: "https://www.instagram.com/zyteron.spa",
    facebook: "https://www.facebook.com/people/Zyteron-Cl/61588716751111/",
    whatsapp: ZYTERON_WHATSAPP_URL,
  },
  representative: {
    name: "Eduardo Ávila",
    role: "Fundador y Líder de Proyectos",
    description:
      "Fundador de Zyteron con más de 7 años de experiencia en tecnología, análisis de procesos, liderazgo operativo y desarrollo de soluciones digitales para empresas en Chile.",
  },
};

export type SiteConfig = typeof siteConfig;
