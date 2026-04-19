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

export const localPages: LocalPageData[] = [
  {
    slug: "santiago",
    city: "Santiago",
    region: "Región Metropolitana",
    metaTitle: "Diseño web Santiago para empresas B2B",
    metaDescription:
      "Servicio de diseño y desarrollo web en Santiago para empresas: captación de leads, SEO local y sitios orientados a conversión.",
    heroTitle: "Diseño web en Santiago para empresas que buscan más oportunidades comerciales",
    heroDescription:
      "Trabajamos con empresas de Santiago y la RM en proyectos web orientados a demanda comercial, posicionamiento y cierre de ventas.",
    businessContext: [
      "Alta competencia digital en búsquedas de servicios B2B en la RM.",
      "Mayor exigencia en velocidad de respuesta y confianza comercial.",
      "Necesidad de diferenciarse por especialización y casos reales.",
    ],
    opportunities: [
      "Optimizar páginas de servicio para comunas de alto valor (Providencia, Las Condes, Ñuñoa).",
      "Estrategia de contenidos para búsquedas comparativas y de decisión.",
      "Mejorar tasa de contacto con landing pages específicas por industria.",
    ],
    faqs: [
      {
        question: "¿Atienden reuniones presenciales en Santiago?",
        answer:
          "Sí. Coordinamos reuniones presenciales o híbridas para levantamiento y presentación de propuestas.",
      },
      {
        question: "¿Pueden segmentar por comuna?",
        answer:
          "Sí. Cuando existe demanda real y diferenciación de oferta, se pueden crear landings por comuna sin generar contenido duplicado.",
      },
    ],
  },
  {
    slug: "vina-del-mar",
    city: "Viña del Mar",
    region: "Región de Valparaíso",
    metaTitle: "Diseño web Viña del Mar para empresas",
    metaDescription:
      "Desarrollo y diseño web en Viña del Mar para empresas de servicios, comercio y turismo con foco en captación de clientes.",
    heroTitle: "Diseño web en Viña del Mar para empresas que compiten por clientes todo el año",
    heroDescription:
      "Creamos sitios para empresas de Viña del Mar con estructura comercial, posicionamiento local y experiencia mobile optimizada.",
    businessContext: [
      "Demanda estacional y competencia alta en rubros de servicios y turismo.",
      "Usuarios móviles con decisiones rápidas y múltiples comparaciones.",
      "Importancia de confianza local y claridad de oferta.",
    ],
    opportunities: [
      "Landing pages por servicio principal con mensajes orientados a decisión.",
      "Bloques de confianza local: cobertura, tiempos y modalidad de atención.",
      "Integración de SEO local con campañas pagadas de alta temporada.",
    ],
    faqs: [
      {
        question: "¿Trabajan con empresas de Viña y Valparaíso?",
        answer:
          "Sí. Atendemos proyectos en toda la región con ejecución remota y reuniones programadas.",
      },
      {
        question: "¿Qué tipo de empresas atienden en la zona?",
        answer:
          "Principalmente servicios profesionales, comercio y empresas que requieren generación constante de consultas.",
      },
    ],
  },
  {
    slug: "concepcion",
    city: "Concepción",
    region: "Región del Biobío",
    metaTitle: "Diseño web Concepción para empresas y pymes",
    metaDescription:
      "Servicio de diseño web en Concepción para empresas del Biobío: sitios corporativos, SEO local y generación de leads.",
    heroTitle: "Diseño web en Concepción para empresas que quieren escalar su demanda en el sur de Chile",
    heroDescription:
      "Acompañamos empresas de Concepción en estrategia digital con páginas orientadas a conversión y posicionamiento por intención comercial.",
    businessContext: [
      "Mercado regional con creciente competencia digital en servicios B2B.",
      "Necesidad de posicionamiento técnico y contenido útil de nicho.",
      "Oportunidad de crecimiento orgánico en búsquedas de media cola.",
    ],
    opportunities: [
      "Creación de páginas por servicio con enfoque industrial y profesional.",
      "Casos de éxito regionales para aumentar confianza comercial.",
      "Optimización técnica continua para sostener visibilidad orgánica.",
    ],
    faqs: [
      {
        question: "¿Pueden trabajar con empresas industriales del Biobío?",
        answer:
          "Sí. Tenemos enfoque B2B y estructura de contenidos para ciclos de venta consultivos.",
      },
      {
        question: "¿El servicio incluye SEO local en Concepción?",
        answer:
          "Sí. Diseñamos la página con señales locales y enlazado interno hacia servicios relevantes.",
      },
    ],
  },
];

export function getLocalPageBySlug(slug: string) {
  return localPages.find((page) => page.slug === slug);
}
