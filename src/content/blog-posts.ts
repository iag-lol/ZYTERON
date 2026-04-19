export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogPostData = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  intent: "comercial" | "informativa" | "mixta";
  readingTime: string;
  publishedAt: string;
  updatedAt?: string;
  sections: BlogSection[];
  faqs: BlogFaq[];
  relatedServices: string[];
};

export const blogPosts: BlogPostData[] = [
  {
    slug: "cuanto-cuesta-pagina-web-empresa-chile",
    title: "Cuánto cuesta una página web para empresa en Chile en 2026",
    metaTitle: "Cuánto cuesta una página web para empresas en Chile",
    metaDescription:
      "Guía práctica para estimar el costo real de una página web para empresas en Chile: alcances, variables, errores frecuentes y cómo cotizar sin pagar de más.",
    excerpt:
      "Si vas a cotizar una web corporativa en Chile, esta guía te ayuda a separar precio de valor y a definir un alcance que sí genere resultados comerciales.",
    primaryKeyword: "paginas web para empresas",
    secondaryKeywords: [
      "creacion de sitios web para empresas",
      "cotizacion pagina web empresa",
      "paginas corporativas",
    ],
    intent: "comercial",
    readingTime: "8 min",
    publishedAt: "2026-04-18",
    sections: [
      {
        heading: "Qué incluye realmente una web corporativa",
        paragraphs: [
          "El precio no depende solo del diseño. En proyectos B2B, el costo real está en la estrategia de estructura, los mensajes comerciales, la implementación técnica y la configuración de medición.",
          "Una web de empresa debería cubrir mínimo: arquitectura por servicios, contenido orientado a decisión, formulario usable, base SEO técnica y un plan de mejora posterior al lanzamiento.",
        ],
        bullets: [
          "Arquitectura de páginas (home, servicios, contacto, apoyo comercial)",
          "Copywriting y propuesta de valor por tipo de cliente",
          "Desarrollo responsive y rendimiento en mobile",
          "Metadatos, schema, sitemap y robots",
          "Tracking de conversiones (formularios, WhatsApp, clics clave)",
        ],
      },
      {
        heading: "Variables que más mueven el presupuesto",
        paragraphs: [
          "Dos cotizaciones pueden parecer similares, pero cambiar mucho en alcance. La diferencia suele estar en cuántas páginas se crean, cuánta personalización tiene el diseño y qué tan preparado queda el sitio para SEO y crecimiento.",
          "También influyen las integraciones: CRM, automatizaciones, catálogos, pasarelas de pago o paneles administrativos.",
        ],
        bullets: [
          "Cantidad de páginas y nivel de diferenciación por URL",
          "Complejidad de diseño UX/UI",
          "Integraciones técnicas requeridas",
          "Nivel de soporte y mantención post-lanzamiento",
        ],
      },
      {
        heading: "Errores comunes al cotizar",
        paragraphs: [
          "El error más frecuente es comparar solo precio final sin revisar entregables. Eso termina en proyectos baratos que luego requieren rehacer estructura, contenido y SEO.",
          "Otro error típico es lanzar sin plan de continuidad. Una web B2B no se termina al publicar; se optimiza con datos reales de comportamiento y conversión.",
        ],
        bullets: [
          "Elegir proveedor sin revisar ejemplos comparables",
          "Aceptar propuestas sin detalle de alcance",
          "No exigir setup técnico mínimo de indexación",
          "No definir quién mantendrá el sitio después de salir a producción",
        ],
      },
    ],
    faqs: [
      {
        question: "¿Conviene partir con una web pequeña e ir creciendo?",
        answer:
          "Sí, siempre que la base técnica y de arquitectura quede bien planteada desde el inicio para escalar sin rehacer todo.",
      },
      {
        question: "¿Una web más cara garantiza mejores resultados?",
        answer:
          "No necesariamente. Lo clave es la calidad del enfoque comercial, técnico y de conversión, no solo el costo bruto.",
      },
    ],
    relatedServices: ["paginas-web-para-empresas", "creacion-de-sitios-web-para-empresas"],
  },
  {
    slug: "diseno-web-chile-vs-plantillas",
    title: "Diseño web en Chile: agencia especializada vs plantilla",
    metaTitle: "Diseño web Chile: agencia vs plantilla",
    metaDescription:
      "Comparativa real entre contratar agencia de diseño web en Chile o usar plantillas: cuándo conviene cada opción y su impacto en SEO y conversión.",
    excerpt:
      "Las plantillas pueden ser útiles en etapas tempranas, pero no siempre resuelven necesidades de posicionamiento y ventas en empresas B2B.",
    primaryKeyword: "diseño web chile",
    secondaryKeywords: ["agencia diseño web chile", "paginas web para pymes", "paginas corporativas"],
    intent: "mixta",
    readingTime: "7 min",
    publishedAt: "2026-04-18",
    sections: [
      {
        heading: "Cuándo una plantilla sí funciona",
        paragraphs: [
          "Si tu empresa necesita validar una oferta de forma rápida, una plantilla puede ayudar a lanzar en poco tiempo. Es una buena etapa de aprendizaje inicial.",
          "Pero debes considerar limitaciones de estructura SEO, personalización y velocidad real cuando empiezas a escalar tráfico.",
        ],
        bullets: [
          "Lanzamiento rápido con presupuesto acotado",
          "Sitios simples con pocas páginas",
          "Necesidades técnicas básicas y sin integraciones complejas",
        ],
      },
      {
        heading: "Cuándo conviene una agencia de diseño web",
        paragraphs: [
          "Cuando el sitio es parte de la estrategia comercial, la diferencia está en cómo se organiza el contenido para captar intención real de compra.",
          "Una agencia con enfoque B2B construye páginas por servicio, mensajes por objeción y rutas claras hacia contacto o cotización.",
        ],
        bullets: [
          "Sitios con varios servicios y segmentos de cliente",
          "Necesidad de SEO estructural y crecimiento por clúster",
          "Objetivo de convertir tráfico en reuniones comerciales",
        ],
      },
      {
        heading: "Impacto en SEO y conversión",
        paragraphs: [
          "Las plantillas tienden a repetir estructuras genéricas. Eso dificulta diferenciar intención por URL y aumenta riesgo de canibalización.",
          "Con arquitectura personalizada puedes asignar una keyword primaria por página, mejorar el enlazado interno y ajustar CTA por etapa de decisión.",
        ],
      },
    ],
    faqs: [
      {
        question: "¿Se puede partir con plantilla y luego migrar a desarrollo propio?",
        answer:
          "Sí, pero conviene planificar migración con redirecciones y estructura SEO para no perder señales de indexación.",
      },
      {
        question: "¿Una agencia siempre implica proyectos largos?",
        answer:
          "No. Se puede ejecutar por etapas, priorizando páginas comerciales críticas y expandiendo después.",
      },
    ],
    relatedServices: ["diseno-web-chile", "agencia-diseno-web-chile"],
  },
  {
    slug: "como-elegir-agencia-diseno-web-chile",
    title: "Cómo elegir una agencia de diseño web en Chile sin equivocarte",
    metaTitle: "Cómo elegir agencia diseño web Chile",
    metaDescription:
      "Checklist para seleccionar una agencia de diseño web en Chile: qué evaluar en propuesta, metodología, SEO técnico y capacidad de ejecución.",
    excerpt:
      "Antes de firmar con una agencia web, revisa este checklist para evitar sobrecostos, atrasos y soluciones genéricas que no convierten.",
    primaryKeyword: "agencia diseño web chile",
    secondaryKeywords: ["desarrollo web chile", "diseño web santiago", "paginas web para empresas"],
    intent: "comercial",
    readingTime: "9 min",
    publishedAt: "2026-04-18",
    sections: [
      {
        heading: "1) Revisa especialización por tipo de negocio",
        paragraphs: [
          "No es lo mismo diseñar para ecommerce masivo que para servicios B2B. Busca evidencia de proyectos similares al ciclo comercial de tu empresa.",
          "Una buena agencia hace preguntas de negocio antes de hablar de diseño visual.",
        ],
      },
      {
        heading: "2) Exige claridad en alcance y entregables",
        paragraphs: [
          "Las propuestas vagas generan conflictos después. Debe quedar definido qué páginas incluye, qué nivel de copy se entrega y qué setup técnico se implementa.",
        ],
        bullets: [
          "Arquitectura de información",
          "Wireframes o diseño de pantallas",
          "Desarrollo y QA",
          "SEO técnico base",
          "Soporte post-lanzamiento",
        ],
      },
      {
        heading: "3) Evalúa método de trabajo y comunicación",
        paragraphs: [
          "La ejecución importa tanto como la propuesta. Prioriza equipos con planificación por etapas, revisiones periódicas y responsables claros.",
          "Si el proyecto depende de múltiples perfiles, valida quién coordina la entrega end-to-end.",
        ],
      },
      {
        heading: "4) Pide enfoque de continuidad, no solo lanzamiento",
        paragraphs: [
          "Una web que no evoluciona se estanca. La agencia ideal propone roadmap de mejora en SEO, contenidos y conversión para los primeros 90 días.",
        ],
      },
    ],
    faqs: [
      {
        question: "¿Qué señales indican una mala agencia?",
        answer:
          "Promesas de posicionamiento garantizado, propuestas genéricas y ausencia de alcance técnico detallado son señales de riesgo.",
      },
      {
        question: "¿Conviene pedir solo diseño o diseño + desarrollo + SEO?",
        answer:
          "Para proyectos comerciales suele funcionar mejor una ejecución integrada, porque evita fricciones entre capas.",
      },
    ],
    relatedServices: ["agencia-diseno-web-chile", "desarrollo-web-chile"],
  },
  {
    slug: "seo-para-empresas-chile-primeros-90-dias",
    title: "SEO para empresas en Chile: qué hacer en los primeros 90 días",
    metaTitle: "SEO para empresas Chile: plan 90 días",
    metaDescription:
      "Plan de SEO para empresas en Chile durante los primeros 90 días: quick wins técnicos, arquitectura de contenido y optimización de conversión.",
    excerpt:
      "Si quieres crecer en orgánico sin improvisar, esta hoja de ruta te muestra qué priorizar en 30, 60 y 90 días.",
    primaryKeyword: "SEO para empresas chile",
    secondaryKeywords: ["seo tecnico chile", "desarrollo web chile", "diseno web chile"],
    intent: "mixta",
    readingTime: "8 min",
    publishedAt: "2026-04-18",
    sections: [
      {
        heading: "Días 1-30: limpiar base técnica",
        paragraphs: [
          "Empieza por indexación y consistencia: metadata, canonicals, sitemap, robots, status codes y enlaces internos básicos.",
          "Sin esta base, cualquier esfuerzo de contenido pierde eficiencia.",
        ],
      },
      {
        heading: "Días 31-60: construir páginas transaccionales",
        paragraphs: [
          "Define un keyword map con intención comercial y crea páginas específicas por servicio. Cada URL debe resolver una búsqueda distinta.",
        ],
        bullets: [
          "Hub de servicios",
          "Páginas de servicio por intención",
          "FAQs de objeciones reales",
          "Rutas de conversión claras a contacto/cotizador",
        ],
      },
      {
        heading: "Días 61-90: escalar autoridad temática",
        paragraphs: [
          "Publica casos de éxito y artículos útiles conectados al clúster comercial. Así aumentas cobertura semántica sin canibalizar páginas de venta.",
          "Usa datos de Search Console para priorizar páginas con mayor potencial de CTR y posición.",
        ],
      },
    ],
    faqs: [
      {
        question: "¿Se puede ver impacto antes de 90 días?",
        answer:
          "Sí, sobre todo en cobertura e impresiones. El impacto fuerte en posiciones y leads depende de competencia y punto de partida.",
      },
      {
        question: "¿Qué pesa más: técnica o contenido?",
        answer:
          "Ambos. Sin técnica no indexas bien y sin contenido no cubres intención de búsqueda real.",
      },
    ],
    relatedServices: ["seo-para-empresas-chile", "paginas-web-para-empresas"],
  },
  {
    slug: "landing-pages-para-empresas-checklist",
    title: "Checklist de landing pages para empresas que sí convierten",
    metaTitle: "Landing pages para empresas: checklist de conversión",
    metaDescription:
      "Checklist práctico para crear landing pages para empresas en Chile: estructura, copy, confianza, medición y optimización continua.",
    excerpt:
      "Una landing efectiva no es solo diseño bonito. Este checklist te ayuda a construir una página enfocada en resultados comerciales.",
    primaryKeyword: "landing pages para empresas",
    secondaryKeywords: ["diseño web santiago", "paginas web para pymes", "agencia diseño web chile"],
    intent: "comercial",
    readingTime: "6 min",
    publishedAt: "2026-04-18",
    sections: [
      {
        heading: "Estructura mínima recomendada",
        paragraphs: [
          "La landing debe conducir a una sola acción principal. Si compite con múltiples CTA, normalmente cae la conversión.",
        ],
        bullets: [
          "Titular con propuesta de valor concreta",
          "Subtítulo con resultado esperado y contexto",
          "Bloque de objeciones frecuentes",
          "Prueba social o evidencia de experiencia",
          "Formulario simple y CTA visible",
        ],
      },
      {
        heading: "Copy orientado a decisión B2B",
        paragraphs: [
          "Habla de problemas de negocio, no de características aisladas. El visitante quiere claridad de impacto, tiempos y forma de trabajo.",
        ],
      },
      {
        heading: "Medición y optimización",
        paragraphs: [
          "Sin medición no hay mejora. Configura eventos de envío, clics de WhatsApp y scroll para entender dónde se frena la intención de contacto.",
        ],
      },
    ],
    faqs: [
      {
        question: "¿Cuántos campos debería tener el formulario?",
        answer:
          "Los mínimos para calificar la oportunidad: nombre, correo, empresa y contexto breve del proyecto.",
      },
      {
        question: "¿Conviene tener menú completo en una landing?",
        answer:
          "En campañas de alto foco suele funcionar mejor reducir distracciones y mantener una ruta principal de conversión.",
      },
    ],
    relatedServices: ["landing-pages-para-empresas", "diseno-web-chile"],
  },
  {
    slug: "mantencion-web-chile-que-incluye",
    title: "Mantención web en Chile: qué incluye un servicio serio",
    metaTitle: "Mantención web Chile: qué incluye y cómo evaluar",
    metaDescription:
      "Qué debe incluir un servicio de mantención web en Chile para empresas: soporte, seguridad, performance, SEO técnico y continuidad operativa.",
    excerpt:
      'La mantención web no es solo "arreglar cuando algo falla". Es un sistema preventivo para proteger posicionamiento y conversiones.',
    primaryKeyword: "mantencion web chile",
    secondaryKeywords: ["desarrollo web chile", "seo para empresas chile", "soporte web chile"],
    intent: "comercial",
    readingTime: "7 min",
    publishedAt: "2026-04-18",
    sections: [
      {
        heading: "Componentes clave del servicio",
        paragraphs: [
          "Un plan de mantención útil combina soporte reactivo y trabajo preventivo. Si solo actúa ante caídas, ya llegaste tarde.",
        ],
        bullets: [
          "Monitoreo de uptime y alertas",
          "Actualizaciones y parches de seguridad",
          "Respaldo y plan de recuperación",
          "Optimización de performance y Core Web Vitals",
          "Corrección técnica SEO recurrente",
        ],
      },
      {
        heading: "Cómo evaluar proveedores de mantención",
        paragraphs: [
          "Pregunta por tiempos de respuesta, alcance mensual y qué tipo de reportes recibirás. Sin trazabilidad, el servicio se vuelve opaco.",
        ],
      },
      {
        heading: "Relación entre mantención, SEO y ventas",
        paragraphs: [
          "Cada caída o lentitud impacta indexación, experiencia y conversión. La mantención protege ingresos porque evita pérdida de confianza y consultas.",
        ],
      },
    ],
    faqs: [
      {
        question: "¿Puedo contratar mantención aunque otro proveedor haya hecho la web?",
        answer:
          "Sí. Primero se hace auditoría técnica para evaluar riesgos y definir un plan de estabilización.",
      },
      {
        question: "¿La mantención incluye mejoras de contenido?",
        answer:
          "Puede incluirlas si se acuerda en alcance mensual, sobre todo en páginas de servicio críticas.",
      },
    ],
    relatedServices: ["mantencion-web-chile", "desarrollo-web-chile", "seo-para-empresas-chile"],
  },
];

export function getBlogPostBySlug(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}
