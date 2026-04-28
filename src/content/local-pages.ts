export type LocalPageData = {
  slug: string;
  city: string;
  region: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroDescription: string;
  businessContext: string[];
  opportunities: string[];
  faqs: { question: string; answer: string }[];
};

type LocalSeed = {
  slug: string;
  city: string;
  region: string;
  marketFocus: string;
  sectors: string[];
};

function createLocalPage(seed: LocalSeed): LocalPageData {
  const sectorsLine = seed.sectors.join(", ");

  return {
    slug: seed.slug,
    city: seed.city,
    region: seed.region,
    metaTitle: `Diseño web ${seed.city} para empresas`,
    metaDescription:
      `Servicio de diseño y desarrollo web en ${seed.city} para empresas en ${seed.region}, con SEO local, estructura comercial y enfoque en conversión.`,
    heroTitle: `Diseño web en ${seed.city} para empresas con foco comercial real`,
    heroDescription:
      `Apoyamos empresas de ${seed.city} y ${seed.region} con proyectos web orientados a demanda, posicionamiento y cierre de oportunidades en ${seed.marketFocus}.`,
    businessContext: [
      `Competencia digital creciente en ${seed.city} para servicios empresariales y pymes.`,
      `Usuarios comparan proveedores por confianza, tiempos de respuesta y claridad de oferta.`,
      `Sectores con mayor demanda local: ${sectorsLine}.`,
    ],
    opportunities: [
      `Crear páginas de servicio por intención de búsqueda para ${seed.city} y su zona de influencia.`,
      "Mejorar formularios y llamados a la acción para aumentar contactos calificados.",
      "Integrar estrategia SEO local con contenido útil y pruebas de confianza comercial.",
    ],
    faqs: [
      {
        question: `¿Atienden empresas de ${seed.city} en modalidad remota o presencial?`,
        answer:
          `Sí. Trabajamos remoto con reuniones online y coordinamos instancias presenciales cuando el proyecto en ${seed.city} lo requiere.`,
      },
      {
        question: `¿El servicio incluye SEO local para ${seed.city}?`,
        answer:
          `Sí. Estructuramos contenidos, metadatos y enlazado interno con enfoque local para mejorar visibilidad en búsquedas de ${seed.city} y ${seed.region}.`,
      },
    ],
  };
}

const localSeeds: LocalSeed[] = [
  {
    slug: "region-metropolitana",
    city: "Región Metropolitana",
    region: "Región Metropolitana de Santiago",
    marketFocus: "Santiago y comunas de alta actividad empresarial",
    sectors: ["servicios profesionales", "tecnología", "salud", "logística"],
  },
  {
    slug: "santiago",
    city: "Santiago",
    region: "Región Metropolitana",
    marketFocus: "mercados B2B y servicios de alto ticket",
    sectors: ["consultoría", "finanzas", "tecnología", "servicios industriales"],
  },
  {
    slug: "vina-del-mar",
    city: "Viña del Mar",
    region: "Región de Valparaíso",
    marketFocus: "servicios y comercio con demanda anual",
    sectors: ["turismo profesional", "inmobiliario", "servicios médicos", "educación"],
  },
  {
    slug: "valparaiso",
    city: "Valparaíso",
    region: "Región de Valparaíso",
    marketFocus: "servicios profesionales, marítimos y comercio local",
    sectors: ["logística portuaria", "servicios técnicos", "educación", "turismo"],
  },
  {
    slug: "la-serena",
    city: "La Serena",
    region: "Región de Coquimbo",
    marketFocus: "pymes de servicios y comercio regional",
    sectors: ["salud", "educación", "turismo", "servicios legales"],
  },
  {
    slug: "rancagua",
    city: "Rancagua",
    region: "Región de O'Higgins",
    marketFocus: "servicios corporativos y proveedores industriales",
    sectors: ["minería", "logística", "servicios técnicos", "agroindustria"],
  },
  {
    slug: "talca",
    city: "Talca",
    region: "Región del Maule",
    marketFocus: "empresas regionales en crecimiento digital",
    sectors: ["agroindustria", "servicios profesionales", "retail", "educación"],
  },
  {
    slug: "chillan",
    city: "Chillán",
    region: "Región de Ñuble",
    marketFocus: "pymes locales con foco comercial y servicios",
    sectors: ["construcción", "salud", "servicios técnicos", "agro"],
  },
  {
    slug: "concepcion",
    city: "Concepción",
    region: "Región del Biobío",
    marketFocus: "empresas industriales y de servicios B2B",
    sectors: ["industria", "ingeniería", "tecnología", "servicios profesionales"],
  },
  {
    slug: "temuco",
    city: "Temuco",
    region: "Región de La Araucanía",
    marketFocus: "servicios regionales y comercio especializado",
    sectors: ["salud", "educación", "retail", "servicios legales"],
  },
  {
    slug: "valdivia",
    city: "Valdivia",
    region: "Región de Los Ríos",
    marketFocus: "servicios profesionales y empresas regionales",
    sectors: ["turismo", "educación", "tecnología", "servicios ambientales"],
  },
  {
    slug: "puerto-montt",
    city: "Puerto Montt",
    region: "Región de Los Lagos",
    marketFocus: "empresas logísticas y de servicios del sur",
    sectors: ["acuicultura", "logística", "servicios técnicos", "transporte"],
  },
  {
    slug: "antofagasta",
    city: "Antofagasta",
    region: "Región de Antofagasta",
    marketFocus: "servicios para industria minera y proveedores B2B",
    sectors: ["minería", "energía", "ingeniería", "logística"],
  },
  {
    slug: "calama",
    city: "Calama",
    region: "Región de Antofagasta",
    marketFocus: "proveedores industriales y servicios en minería",
    sectors: ["mantención industrial", "transportes", "seguridad", "ingeniería"],
  },
  {
    slug: "iquique",
    city: "Iquique",
    region: "Región de Tarapacá",
    marketFocus: "comercio, logística y servicios empresariales",
    sectors: ["comercio exterior", "logística", "retail", "servicios financieros"],
  },
  {
    slug: "arica",
    city: "Arica",
    region: "Región de Arica y Parinacota",
    marketFocus: "servicios transfronterizos y comercio local",
    sectors: ["logística", "salud", "turismo", "servicios técnicos"],
  },
  {
    slug: "copiapo",
    city: "Copiapó",
    region: "Región de Atacama",
    marketFocus: "servicios para minería y empresas regionales",
    sectors: ["minería", "servicios industriales", "logística", "construcción"],
  },
  {
    slug: "punta-arenas",
    city: "Punta Arenas",
    region: "Región de Magallanes",
    marketFocus: "servicios especializados y operaciones austral",
    sectors: ["energía", "turismo", "logística", "servicios marítimos"],
  },
];

export const localPages: LocalPageData[] = localSeeds.map(createLocalPage);

export function getLocalPageBySlug(slug: string) {
  return localPages.find((page) => page.slug === slug);
}
