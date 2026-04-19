export type CaseStudyData = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  summary: string;
  clientProfile: string;
  location: string;
  industry: string;
  publishedAt: string;
  updatedAt?: string;
  challenge: string[];
  strategy: string[];
  implementation: string[];
  outcomes: string[];
  notes?: string[];
  relatedServices: string[];
  relatedCities: string[];
};

export const caseStudies: CaseStudyData[] = [
  {
    slug: "sitio-corporativo-b2b-santiago",
    title: "Caso modelo: sitio corporativo B2B para empresa industrial en Santiago",
    metaTitle: "Caso de éxito web corporativa B2B en Santiago",
    metaDescription:
      "Caso modelo de rediseño y desarrollo web corporativo para empresa B2B en Santiago, enfocado en posicionamiento, confianza y generación de leads.",
    summary:
      "Proyecto orientado a transformar un sitio institucional en una plataforma comercial para captar reuniones con empresas de la Región Metropolitana.",
    clientProfile: "Empresa de servicios industriales para clientes corporativos",
    location: "Santiago, Región Metropolitana",
    industry: "Servicios industriales B2B",
    publishedAt: "2026-04-18",
    challenge: [
      "Sitio antiguo con estructura plana y sin páginas de servicio diferenciadas.",
      "Tráfico orgánico bajo en búsquedas no-marca de alta intención comercial.",
      "Mensajería técnica poco clara para perfiles de decisión (gerencia y compras).",
      "Formulario de contacto sin contexto comercial y baja tasa de respuesta útil.",
    ],
    strategy: [
      "Definir arquitectura por intención: página hub + páginas específicas por servicio clave.",
      "Reescribir propuesta de valor con lenguaje orientado a problemas de negocio.",
      "Implementar bloques de confianza (proceso, cobertura, soporte y FAQs reales).",
      "Alinear metadata, H1 y semántica de contenido por URL para evitar canibalización.",
    ],
    implementation: [
      "Creación de clúster transaccional con páginas para servicios prioritarios.",
      "Optimización técnica: canonicals, sitemap, robots, Open Graph y schema JSON-LD.",
      "Enlazado interno entre home, servicios, contacto, planes y cotizador.",
      "Plan de iteración mensual para SEO + CRO en base a consultas comerciales reales.",
    ],
    outcomes: [
      "Mayor claridad comercial en home y páginas de servicio para visitas orgánicas nuevas.",
      "Mejor cobertura de búsquedas objetivo con URLs específicas y diferenciadas.",
      "Reducción de fricción en la navegación hacia contacto y cotización.",
      "Base técnica más sólida para escalar contenido por ciudad, casos y blog.",
    ],
    notes: [
      "Caso modelo con datos anonimizados para proteger información de cliente.",
      "No se publican métricas confidenciales; se describe el enfoque implementado.",
    ],
    relatedServices: ["paginas-web-para-empresas", "desarrollo-web-chile", "seo-para-empresas-chile"],
    relatedCities: ["santiago"],
  },
  {
    slug: "landing-b2b-concepcion-servicios-profesionales",
    title: "Caso modelo: landing B2B para servicios profesionales en Concepción",
    metaTitle: "Caso de éxito landing pages B2B en Concepción",
    metaDescription:
      "Caso modelo de landing page comercial para empresa de servicios profesionales en Concepción, con foco en generación de oportunidades calificadas.",
    summary:
      "Implementación de landing comercial enfocada en campañas y SEO local para captar consultas de empresas en Biobío.",
    clientProfile: "Empresa de servicios profesionales para pymes y medianas empresas",
    location: "Concepción, Región del Biobío",
    industry: "Servicios profesionales B2B",
    publishedAt: "2026-04-18",
    challenge: [
      "Campañas pagadas enviaban tráfico a páginas genéricas con bajo rendimiento comercial.",
      "Oferta poco diferenciada frente a proveedores locales en búsquedas comparativas.",
      "No existía página local con contexto de mercado regional.",
      "Ausencia de contenido de objeciones y preguntas frecuentes para decisión rápida.",
    ],
    strategy: [
      "Diseñar una landing con objetivo único de conversión y CTA visibles en todo el recorrido.",
      "Incluir narrativa local y señales de confianza relevantes para empresas del Biobío.",
      "Conectar landing con servicios relacionados para ampliar intención sin dispersar el mensaje.",
      "Incorporar FAQs orientadas a decisión y contacto comercial inmediato.",
    ],
    implementation: [
      "Estructura de bloques: problema, solución, alcance, proceso, FAQ y CTA.",
      "Integración con contacto y WhatsApp para respuesta comercial rápida.",
      "Optimización de metadata y schema para contexto local y transaccional.",
      "Enlazado interno con hub de servicios, página de ciudad y cotizador.",
    ],
    outcomes: [
      "Mejor alineación entre intención de campaña y contenido de destino.",
      "Mayor calidad percibida de la propuesta al mostrar especialización y contexto local.",
      "Ruta de conversión más directa para consultas y solicitudes de reunión.",
      "Escalabilidad para replicar el enfoque en otras ciudades con demanda real.",
    ],
    notes: [
      "Caso modelo con datos anonimizados; los aprendizajes son transferibles a proyectos B2B similares.",
    ],
    relatedServices: ["landing-pages-para-empresas", "diseno-web-chile", "seo-para-empresas-chile"],
    relatedCities: ["concepcion"],
  },
];

export function getCaseStudyBySlug(slug: string) {
  return caseStudies.find((caseStudy) => caseStudy.slug === slug);
}
