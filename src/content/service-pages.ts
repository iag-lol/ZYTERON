export type ServiceFaq = {
  question: string;
  answer: string;
};

export type ServicePageData = {
  slug: string;
  navLabel: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  heroTitle: string;
  heroDescription: string;
  summary: string;
  idealFor: string[];
  deliverables: string[];
  process: string[];
  faqs: ServiceFaq[];
  relatedSlugs: string[];
};

export const servicePages: ServicePageData[] = [
  {
    slug: "paginas-web-para-empresas",
    navLabel: "Páginas web para empresas",
    metaTitle: "Páginas web para empresas en Chile",
    metaDescription:
      "Diseñamos páginas web para empresas en Chile con foco en generación de leads, credibilidad comercial y conversión B2B.",
    primaryKeyword: "paginas web para empresas",
    secondaryKeywords: ["paginas corporativas", "sitio web corporativo chile", "web empresarial b2b"],
    heroTitle: "Páginas web para empresas que venden, no solo muestran información",
    heroDescription:
      "Creamos sitios corporativos orientados a captación comercial: propuesta de valor clara, estructura SEO y llamados a la acción para generar reuniones.",
    summary:
      "Servicio principal para empresas que necesitan escalar adquisición orgánica y convertir tráfico en oportunidades comerciales reales.",
    idealFor: [
      "Empresas B2B con ciclo comercial consultivo.",
      "Pymes en expansión que dependen de referidos y quieren un canal digital estable.",
      "Equipos de ventas que necesitan más reuniones calificadas desde web.",
    ],
    deliverables: [
      "Arquitectura de contenidos por servicios, industrias y objeciones de compra.",
      "Mensajería comercial orientada a decisión B2B (sin copy genérico).",
      "Implementación técnica con metadatos, schema y tracking de conversiones.",
      "Plan de iteración para mejorar tasas de contacto en 90 días.",
    ],
    process: [
      "Diagnóstico de oferta, ICP y benchmark competitivo en Chile.",
      "Diseño de arquitectura y wireframes orientados a intención comercial.",
      "Desarrollo, QA técnico SEO y ajustes de conversión.",
      "Publicación + soporte de estabilización + plan de mejora continua.",
    ],
    faqs: [
      {
        question: "¿Cuál es el plazo promedio para una web corporativa?",
        answer:
          "Un proyecto estándar toma entre 3 y 6 semanas según cantidad de páginas, integraciones y velocidad de revisión del cliente.",
      },
      {
        question: "¿Incluye analítica y medición de leads?",
        answer:
          "Sí. Configuramos eventos de formularios, clics en WhatsApp y conversiones para evaluar desempeño comercial.",
      },
    ],
    relatedSlugs: ["paginas-web-para-pymes", "desarrollo-web-chile", "creacion-de-sitios-web-para-empresas"],
  },
  {
    slug: "diseno-web-chile",
    navLabel: "Diseño web Chile",
    metaTitle: "Diseño web Chile para empresas B2B",
    metaDescription:
      "Servicio de diseño web en Chile para empresas: UX comercial, propuesta de valor clara y experiencia de usuario enfocada en conversión.",
    primaryKeyword: "diseño web chile",
    secondaryKeywords: ["agencia diseño web", "diseño ux web chile", "diseño web empresas chile"],
    heroTitle: "Diseño web en Chile con foco comercial y experiencia de usuario",
    heroDescription:
      "Diseñamos interfaces que reducen fricción, ordenan la decisión de compra y mejoran la calidad de los contactos entrantes.",
    summary:
      "Diseño UX/UI para empresas que necesitan diferenciarse, aumentar confianza y mejorar conversión de formularios y llamadas.",
    idealFor: [
      "Empresas con sitio antiguo que no refleja su posicionamiento actual.",
      "Negocios que invierten en pauta y requieren mejor conversión de tráfico.",
      "Equipos con oferta técnica compleja que necesitan explicar mejor su valor.",
    ],
    deliverables: [
      "Sistema visual adaptable a desktop, tablet y mobile.",
      "Jerarquía de contenidos optimizada para lectura rápida y escaneo.",
      "Componentes orientados a confianza: pruebas sociales, casos y CTA.",
      "Diseño preparado para crecimiento de nuevas páginas SEO.",
    ],
    process: [
      "Auditoría de UX y benchmark de referentes en Chile.",
      "Definición de narrativa visual y bloques de conversión.",
      "Diseño de pantallas clave y validación funcional.",
      "Handoff para desarrollo con criterios de performance.",
    ],
    faqs: [
      {
        question: "¿Trabajan rediseño sobre sitio existente?",
        answer:
          "Sí. Evaluamos migración por etapas para no perder indexación ni conversiones activas.",
      },
      {
        question: "¿El diseño considera SEO desde el inicio?",
        answer:
          "Sí. Definimos headings, bloques semánticos y jerarquía de contenidos para facilitar posicionamiento.",
      },
    ],
    relatedSlugs: ["agencia-diseno-web-chile", "diseno-web-santiago", "landing-pages-para-empresas"],
  },
  {
    slug: "desarrollo-web-chile",
    navLabel: "Desarrollo web Chile",
    metaTitle: "Desarrollo web Chile para empresas",
    metaDescription:
      "Desarrollo web en Chile para empresas: sitios corporativos, landing pages y plataformas con alta velocidad, estabilidad y escalabilidad.",
    primaryKeyword: "desarrollo web chile",
    secondaryKeywords: ["programación web chile", "desarrollo de paginas web", "sitios web escalables"],
    heroTitle: "Desarrollo web en Chile con base técnica para crecer",
    heroDescription:
      "Implementamos sitios y plataformas con arquitectura limpia, tiempos de carga bajos y evolución por etapas sin rehacer todo el proyecto.",
    summary:
      "Servicio técnico para empresas que necesitan fiabilidad en producción, integraciones y evolución continua del sitio.",
    idealFor: [
      "Empresas con necesidades de integración con CRM, ERP o automatizaciones.",
      "Sitios lentos o inestables que afectan posicionamiento y ventas.",
      "Equipos que requieren soporte técnico continuo post-lanzamiento.",
    ],
    deliverables: [
      "Frontend optimizado para Core Web Vitals y SEO técnico.",
      "Integraciones con formularios, CRM, correo y herramientas comerciales.",
      "Arquitectura mantenible para nuevas secciones y módulos.",
      "Checklist técnico de seguridad y continuidad operativa.",
    ],
    process: [
      "Levantamiento funcional y técnico con prioridades de negocio.",
      "Desarrollo por iteraciones con revisiones semanales.",
      "Testing funcional, responsive y de rendimiento.",
      "Puesta en producción y soporte de estabilización.",
    ],
    faqs: [
      {
        question: "¿Trabajan con CMS o desarrollo a medida?",
        answer:
          "Sí. Definimos el stack según necesidades de negocio, velocidad y costo total de mantención.",
      },
      {
        question: "¿Incluye soporte posterior al lanzamiento?",
        answer:
          "Sí. Entregamos soporte inicial y opciones de mantención mensual para continuidad técnica.",
      },
    ],
    relatedSlugs: ["mantencion-web-chile", "creacion-de-sitios-web-para-empresas", "seo-para-empresas-chile"],
  },
  {
    slug: "agencia-diseno-web-chile",
    navLabel: "Agencia diseño web Chile",
    metaTitle: "Agencia diseño web Chile orientada a resultados",
    metaDescription:
      "Somos una agencia de diseño web en Chile para empresas B2B: estrategia, UX, desarrollo, SEO técnico y optimización de conversión.",
    primaryKeyword: "agencia diseño web chile",
    secondaryKeywords: ["agencia web chile", "empresa diseño web", "agencia digital b2b"],
    heroTitle: "Agencia de diseño web en Chile para crecimiento comercial sostenido",
    heroDescription:
      "Integramos estrategia de negocio, diseño, desarrollo y SEO para que tu sitio sea una plataforma de adquisición y no un folleto estático.",
    summary:
      "Modelo integral para empresas que buscan una sola contraparte técnica y estratégica con foco en resultados medibles.",
    idealFor: [
      "Gerencias comerciales que necesitan pipeline más predecible.",
      "Equipos de marketing con baja conversión en tráfico orgánico o pagado.",
      "Empresas que quieren ordenar su presencia digital en una hoja de ruta única.",
    ],
    deliverables: [
      "Estrategia de arquitectura SEO + plan de conversión.",
      "Diseño y desarrollo bajo KPIs comerciales claros.",
      "Roadmap de contenidos y mejoras técnicas de 90 días.",
      "Reportabilidad ejecutiva para toma de decisiones.",
    ],
    process: [
      "Discovery estratégico y priorización por impacto comercial.",
      "Diseño de arquitectura y narrativa de posicionamiento.",
      "Ejecución técnica + QA integral + salida a producción.",
      "Optimización continua de SEO y CRO.",
    ],
    faqs: [
      {
        question: "¿En qué se diferencia su agencia de un proveedor freelance?",
        answer:
          "Combinamos perfiles complementarios y continuidad operativa en estrategia, diseño, desarrollo y análisis de resultados.",
      },
      {
        question: "¿Atienden proyectos fuera de Santiago?",
        answer:
          "Sí. Operamos remoto en todo Chile y coordinamos reuniones comerciales cuando corresponde.",
      },
    ],
    relatedSlugs: ["diseno-web-chile", "seo-para-empresas-chile", "landing-pages-para-empresas"],
  },
  {
    slug: "diseno-web-santiago",
    navLabel: "Diseño web Santiago",
    metaTitle: "Diseño web Santiago para empresas y pymes",
    metaDescription:
      "Servicio de diseño web en Santiago: sitios corporativos y landing pages para empresas que buscan más leads en la Región Metropolitana.",
    primaryKeyword: "diseño web santiago",
    secondaryKeywords: ["agencia web santiago", "diseño paginas web santiago", "web para empresas rm"],
    heroTitle: "Diseño web en Santiago para competir mejor en búsquedas locales",
    heroDescription:
      "Estrategia local para empresas de la Región Metropolitana: contenido geográfico, mensajes comerciales y estructura de conversión.",
    summary:
      "Servicio local para empresas en Santiago con enfoque en posicionamiento por comuna y generación de demanda en la RM.",
    idealFor: [
      "Empresas con foco comercial en Santiago y comunas de alto valor.",
      "Negocios con competencia local intensa en Google Maps y Search.",
      "Equipos que necesitan landing local con contexto real de mercado.",
    ],
    deliverables: [
      "Arquitectura SEO local para Santiago y comunas prioritarias.",
      "Bloques de confianza local: cobertura, horarios y modalidad de atención.",
      "CTA orientados a llamadas, reuniones y WhatsApp comercial.",
      "Enlace con páginas por ciudad para expansión regional.",
    ],
    process: [
      "Diagnóstico de intención local y competencia por comuna.",
      "Diseño de landing local con diferenciadores reales.",
      "Implementación SEO + schema + enlazado interno.",
      "Seguimiento inicial de consultas comerciales locales.",
    ],
    faqs: [
      {
        question: "¿Pueden atender reuniones presenciales en Santiago?",
        answer:
          "Sí. Coordinamos reuniones presenciales o híbridas según el alcance del proyecto.",
      },
      {
        question: "¿Incluye estrategia para Providencia, Las Condes u otras comunas?",
        answer:
          "Sí. Definimos estructura por comuna cuando existe demanda y diferenciación real de oferta.",
      },
    ],
    relatedSlugs: ["paginas-web-para-empresas", "diseno-web-chile", "landing-pages-para-empresas"],
  },
  {
    slug: "creacion-de-sitios-web-para-empresas",
    navLabel: "Creación de sitios web para empresas",
    metaTitle: "Creación de sitios web para empresas en Chile",
    metaDescription:
      "Servicio de creación de sitios web para empresas en Chile: estrategia, diseño, desarrollo y lanzamiento con base SEO y conversión.",
    primaryKeyword: "creacion de sitios web para empresas",
    secondaryKeywords: ["crear sitio web empresa", "sitio web corporativo", "sitios empresariales chile"],
    heroTitle: "Creación de sitios web para empresas de forma integral",
    heroDescription:
      "Construimos tu sitio desde cero con una metodología comercial y técnica para salir a mercado con estructura escalable y medible.",
    summary:
      "Solución end-to-end para empresas que necesitan un sitio profesional sin coordinar múltiples proveedores.",
    idealFor: [
      "Empresas que aún no tienen sitio o poseen uno obsoleto.",
      "Equipos que necesitan lanzar rápido sin comprometer calidad técnica.",
      "Negocios que requieren base sólida para SEO y campañas futuras.",
    ],
    deliverables: [
      "Mapa de páginas y mensajes según embudo de venta.",
      "Diseño responsive y desarrollo técnico SEO-ready.",
      "Configuración de indexación, sitemap, schema y conversiones.",
      "Guía de crecimiento para contenidos y nuevas landings.",
    ],
    process: [
      "Workshop de objetivos y propuesta de valor.",
      "Arquitectura, contenidos y diseño de experiencia.",
      "Desarrollo, QA y preparación de lanzamiento.",
      "Publicación y soporte de salida a producción.",
    ],
    faqs: [
      {
        question: "¿Qué debe tener listo mi empresa para empezar?",
        answer:
          "Solo objetivos comerciales, servicios principales y referencias. Nosotros guiamos estructura y ejecución.",
      },
      {
        question: "¿La web queda preparada para agregar blog o nuevas páginas?",
        answer:
          "Sí. Dejamos arquitectura escalable para crecer sin rehacer el sitio completo.",
      },
    ],
    relatedSlugs: ["paginas-web-para-empresas", "desarrollo-web-chile", "paginas-web-para-pymes"],
  },
  {
    slug: "paginas-web-para-pymes",
    navLabel: "Páginas web para pymes",
    metaTitle: "Páginas web para pymes en Chile",
    metaDescription:
      "Creamos páginas web para pymes en Chile con foco en ventas, rápida implementación y presupuesto eficiente para crecer digitalmente.",
    primaryKeyword: "paginas web para pymes",
    secondaryKeywords: ["web para pymes chile", "sitio pyme", "pagina web negocio local"],
    heroTitle: "Páginas web para pymes que necesitan vender más con menos complejidad",
    heroDescription:
      "Diseñamos sitios para pymes con estructura simple de administración, mensajes comerciales claros y base SEO para captar clientes.",
    summary:
      "Servicio orientado a pequeñas y medianas empresas que requieren velocidad de salida y retorno comercial rápido.",
    idealFor: [
      "Pymes sin equipo interno de marketing o tecnología.",
      "Negocios locales que necesitan presencia digital profesional.",
      "Empresas que priorizan tiempo de implementación y claridad de costos.",
    ],
    deliverables: [
      "Estructura de sitio enfocada en servicios y contacto.",
      "Bloques de confianza y diferenciación competitiva.",
      "Implementación SEO base para búsquedas comerciales.",
      "Capacitación breve para gestión de contenido esencial.",
    ],
    process: [
      "Diagnóstico comercial y definición de alcance realista.",
      "Diseño funcional orientado a contacto y cotización.",
      "Implementación técnica y revisión final.",
      "Publicación con soporte inicial de operación.",
    ],
    faqs: [
      {
        question: "¿Tienen planes para pymes con presupuesto acotado?",
        answer:
          "Sí. Definimos un alcance por etapas para lanzar rápido y escalar cuando el negocio lo requiera.",
      },
      {
        question: "¿Incluyen soporte luego de la entrega?",
        answer:
          "Sí. Incluimos soporte inicial y alternativas de mantención mensual.",
      },
    ],
    relatedSlugs: ["paginas-web-para-empresas", "landing-pages-para-empresas", "mantencion-web-chile"],
  },
  {
    slug: "landing-pages-para-empresas",
    navLabel: "Landing pages para empresas",
    metaTitle: "Landing pages para empresas en Chile",
    metaDescription:
      "Diseño y desarrollo de landing pages para empresas en Chile orientadas a campañas, generación de leads y mejora de tasa de conversión.",
    primaryKeyword: "landing pages para empresas",
    secondaryKeywords: ["landing page chile", "landing de conversión", "pagina de campaña b2b"],
    heroTitle: "Landing pages para empresas con foco absoluto en conversión",
    heroDescription:
      "Construimos páginas de campaña para captar leads de alta intención con estructura de oferta, prueba social y CTA claros.",
    summary:
      "Servicio especializado para campañas de pago, lanzamientos y captación rápida de oportunidades comerciales.",
    idealFor: [
      "Empresas que invierten en Google Ads o LinkedIn Ads.",
      "Lanzamientos de servicios nuevos o promociones puntuales.",
      "Equipos comerciales que requieren mejorar CPL y calidad de lead.",
    ],
    deliverables: [
      "Estructura de landing por hipótesis de conversión.",
      "Copy y diseño orientados a objeciones de compra B2B.",
      "Integración con formularios, CRM y analytics.",
      "Versiones para test A/B y mejora continua.",
    ],
    process: [
      "Definición de oferta, audiencia y objetivo de campaña.",
      "Diseño de propuesta de valor y elementos de confianza.",
      "Implementación técnica y tracking de conversiones.",
      "Monitoreo inicial y recomendaciones de optimización.",
    ],
    faqs: [
      {
        question: "¿Cuál es la diferencia entre landing y sitio corporativo?",
        answer:
          "La landing se enfoca en una sola acción comercial y minimiza distracciones para maximizar conversión.",
      },
      {
        question: "¿Pueden integrar la landing con mi CRM?",
        answer:
          "Sí. Integramos formularios con CRM, correo y automatizaciones según tu stack.",
      },
    ],
    relatedSlugs: ["diseno-web-chile", "agencia-diseno-web-chile", "seo-para-empresas-chile"],
  },
  {
    slug: "mantencion-web-chile",
    navLabel: "Mantención web Chile",
    metaTitle: "Mantención web Chile para empresas",
    metaDescription:
      "Servicio de mantención web en Chile: soporte técnico, mejoras continuas, seguridad, actualizaciones y performance para sitios empresariales.",
    primaryKeyword: "mantencion web chile",
    secondaryKeywords: ["soporte web chile", "mantenimiento sitio web", "soporte técnico web empresas"],
    heroTitle: "Mantención web en Chile para no perder posicionamiento ni leads",
    heroDescription:
      "Nos encargamos de la continuidad técnica de tu sitio: actualizaciones, monitoreo, seguridad y mejoras periódicas de rendimiento.",
    summary:
      "Servicio recurrente para empresas que quieren estabilidad operativa y evolución continua sin depender de emergencias.",
    idealFor: [
      "Sitios con caídas, lentitud o fallos recurrentes.",
      "Empresas sin equipo técnico interno dedicado.",
      "Negocios con campañas activas que no pueden permitirse interrupciones.",
    ],
    deliverables: [
      "Plan mensual de mantención preventiva y correctiva.",
      "Monitoreo de uptime y alertas de incidentes críticos.",
      "Actualización técnica y control de riesgos de seguridad.",
      "Backlog de mejoras SEO/CRO priorizado por impacto.",
    ],
    process: [
      "Auditoría técnica inicial y levantamiento de deuda.",
      "Definición de SLA, prioridades y calendario de ejecución.",
      "Implementación de mejoras y soporte reactivo.",
      "Reporte mensual de estado y próximos pasos.",
    ],
    faqs: [
      {
        question: "¿El servicio es solo correctivo o también preventivo?",
        answer:
          "Es ambos. Corregimos incidentes y trabajamos mejoras preventivas para reducir riesgos futuros.",
      },
      {
        question: "¿Pueden tomar un sitio desarrollado por otro proveedor?",
        answer:
          "Sí. Evaluamos el estado actual, definimos riesgos y tomamos continuidad con un plan de estabilización.",
      },
    ],
    relatedSlugs: ["desarrollo-web-chile", "seo-para-empresas-chile", "paginas-web-para-pymes"],
  },
  {
    slug: "seo-para-empresas-chile",
    navLabel: "SEO para empresas Chile",
    metaTitle: "SEO para empresas Chile orientado a leads B2B",
    metaDescription:
      "Servicio de SEO para empresas en Chile: estrategia, arquitectura, contenido y optimización técnica para aumentar tráfico calificado y leads.",
    primaryKeyword: "SEO para empresas chile",
    secondaryKeywords: ["seo b2b chile", "seo tecnico chile", "posicionamiento web empresas"],
    heroTitle: "SEO para empresas en Chile con foco en intención comercial",
    heroDescription:
      "Planificamos y ejecutamos SEO con enfoque en revenue: arquitectura de servicios, contenidos útiles y optimización técnica medible.",
    summary:
      "Servicio para empresas que quieren crecer en tráfico orgánico no-marca y convertir búsquedas de alta intención en oportunidades.",
    idealFor: [
      "Sitios con tráfico pero baja conversión comercial.",
      "Empresas que dependen excesivamente de pauta paga.",
      "Equipos de marketing que necesitan estructura SEO escalable.",
    ],
    deliverables: [
      "Auditoría técnica + plan de arquitectura por intención.",
      "Cluster de contenidos comerciales e informativos útiles.",
      "Optimización on-page, schema y enlazado interno.",
      "Roadmap 30/60/90 con foco en impacto de negocio.",
    ],
    process: [
      "Diagnóstico de demanda, competencia y brechas de cobertura.",
      "Priorización de quick wins técnicos y páginas transaccionales.",
      "Implementación por sprint con control de calidad.",
      "Medición continua de impresiones, CTR y leads orgánicos.",
    ],
    faqs: [
      {
        question: "¿En cuánto tiempo se ven resultados en SEO?",
        answer:
          "Depende del punto de partida y competencia, pero los primeros cambios suelen observarse entre 8 y 16 semanas.",
      },
      {
        question: "¿Incluyen contenido y optimización técnica?",
        answer:
          "Sí. Trabajamos ambas capas en paralelo porque una sin la otra limita resultados.",
      },
    ],
    relatedSlugs: ["agencia-diseno-web-chile", "desarrollo-web-chile", "mantencion-web-chile"],
  },
];

export function getServicePageBySlug(slug: string) {
  return servicePages.find((service) => service.slug === slug);
}
