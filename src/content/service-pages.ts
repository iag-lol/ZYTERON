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
    navLabel: "Paginas web para empresas",
    metaTitle: "Paginas Web Para Empresas en Chile | Zyteron",
    metaDescription:
      "Disenamos paginas web para empresas en Chile con foco en captacion de leads, velocidad y conversion. Ideal para pymes y empresas B2B.",
    primaryKeyword: "paginas web para empresas",
    secondaryKeywords: ["sitio web corporativo", "paginas web para pymes", "web empresarial chile"],
    heroTitle: "Paginas web para empresas que generan oportunidades reales",
    heroDescription:
      "Construimos sitios corporativos pensados para ventas, con estructura SEO, carga rapida y mensajes claros para que tu empresa convierta visitas en reuniones.",
    summary:
      "Servicio orientado a empresas chilenas que necesitan una web comercial, confiable y lista para crecer con SEO y pauta.",
    idealFor: [
      "Empresas B2B que hoy dependen de referidos y necesitan generar leads desde Google.",
      "Pymes con sitio antiguo que no comunica bien su propuesta de valor.",
      "Equipos comerciales que requieren formularios, WhatsApp y trazabilidad de conversiones.",
    ],
    deliverables: [
      "Arquitectura de informacion por servicios, industrias y casos de uso.",
      "Copy comercial optimizado para intencion de busqueda transaccional.",
      "Implementacion tecnica con schema, metadatos y base SEO on-page.",
      "Eventos de conversion en formularios, WhatsApp y botones clave.",
    ],
    process: [
      "Discovery de negocio, propuesta de valor y perfil de cliente ideal.",
      "Wireframe comercial + definicion de jerarquia de contenidos.",
      "Diseno UI, desarrollo y optimizacion de velocidad.",
      "QA SEO tecnico + publicacion + seguimiento inicial de conversion.",
    ],
    faqs: [
      {
        question: "Cuanto demora una pagina web para empresa?",
        answer:
          "Un sitio corporativo estandar tarda entre 3 y 5 semanas segun la cantidad de secciones, integraciones y aprobaciones de contenido.",
      },
      {
        question: "Incluyen formularios y contacto por WhatsApp?",
        answer:
          "Si. Configuramos formularios de leads, CTA por WhatsApp y eventos para medir cada conversion.",
      },
    ],
    relatedSlugs: ["diseno-web-chile", "desarrollo-web-chile"],
  },
  {
    slug: "diseno-web-chile",
    navLabel: "Diseno web Chile",
    metaTitle: "Diseno Web Chile Para Empresas y Pymes | Zyteron",
    metaDescription:
      "Servicio de diseno web en Chile para empresas que buscan un sitio profesional, rapido y orientado a conversion comercial.",
    primaryKeyword: "diseno web chile",
    secondaryKeywords: ["diseno web empresas", "agencia web chile", "diseno UX chile"],
    heroTitle: "Diseno web en Chile con enfoque comercial, no solo estetico",
    heroDescription:
      "Creamos interfaces claras, modernas y orientadas a negocio para que tus potenciales clientes entiendan rapido que haces y por que elegirte.",
    summary:
      "Diseno UX/UI para sitios corporativos, landing pages y paginas de servicio con foco en conversion y confianza.",
    idealFor: [
      "Empresas que necesitan renovar imagen digital sin perder posicionamiento SEO.",
      "Marcas que estan invirtiendo en pauta y requieren mejores tasas de conversion.",
      "Equipos con servicios complejos que necesitan explicar su oferta de forma simple.",
    ],
    deliverables: [
      "Sistema visual adaptable a desktop y mobile.",
      "Estructura de bloques orientada a lectura rapida y escaneo.",
      "Biblioteca de componentes para escalar nuevas secciones.",
      "Ajustes de accesibilidad, legibilidad y consistencia de marca.",
    ],
    process: [
      "Benchmark competitivo en Chile y auditoria de sitio actual.",
      "Definicion de narrativa visual y estructura de conversion.",
      "Diseno de pantallas clave y pruebas de usabilidad rapida.",
      "Iteracion final y entrega lista para desarrollo.",
    ],
    faqs: [
      {
        question: "En que se diferencia su diseno web de una plantilla?",
        answer:
          "Disenamos en funcion de tu propuesta comercial, mercado y embudo de conversion. No usamos una plantilla generica para todos.",
      },
      {
        question: "Pueden adaptar el diseno a nuestra identidad de marca?",
        answer:
          "Si. Trabajamos con tu manual de marca o lo construimos en base a lineamientos visuales consistentes.",
      },
    ],
    relatedSlugs: ["paginas-web-para-empresas", "agencia-diseno-web-chile"],
  },
  {
    slug: "desarrollo-web-chile",
    navLabel: "Desarrollo web Chile",
    metaTitle: "Desarrollo Web Chile Para Empresas | Zyteron",
    metaDescription:
      "Desarrollo web en Chile para empresas: sitios corporativos, landing pages y plataformas con alto rendimiento y estructura SEO tecnica.",
    primaryKeyword: "desarrollo web chile",
    secondaryKeywords: ["desarrollo de paginas web", "programacion web chile", "sitio web corporativo chile"],
    heroTitle: "Desarrollo web en Chile con performance y escalabilidad",
    heroDescription:
      "Construimos sitios y plataformas empresariales con codigo mantenible, tiempos de carga bajos y arquitectura preparada para crecer.",
    summary:
      "Servicio tecnico para empresas que necesitan desarrollo confiable, rapido y alineado a objetivos comerciales.",
    idealFor: [
      "Empresas que requieren integraciones con CRM, formularios o sistemas internos.",
      "Negocios con problemas de velocidad, estabilidad o seguridad en su sitio actual.",
      "Equipos que necesitan evolucionar por etapas sin rehacer todo desde cero.",
    ],
    deliverables: [
      "Implementacion de frontend optimizado para Core Web Vitals.",
      "Estructura SEO tecnica: headings, metadata, schema y enlazado interno.",
      "Integraciones con herramientas comerciales y de analitica.",
      "Documentacion base para mantencion y crecimiento del sitio.",
    ],
    process: [
      "Levantamiento tecnico y definicion de alcance.",
      "Desarrollo iterativo por modulos con revisiones semanales.",
      "Testing funcional, responsive y de rendimiento.",
      "Puesta en produccion y monitoreo inicial post-lanzamiento.",
    ],
    faqs: [
      {
        question: "Trabajan con desarrollo a medida o CMS?",
        answer:
          "Podemos trabajar ambos enfoques. Definimos la arquitectura segun objetivos, presupuesto y velocidad de ejecucion.",
      },
      {
        question: "Incluyen soporte despues de publicar?",
        answer:
          "Si, todos los proyectos incluyen soporte inicial y opcion de plan mensual de mantencion.",
      },
    ],
    relatedSlugs: ["diseno-web-chile", "creacion-de-sitios-web-para-empresas"],
  },
  {
    slug: "agencia-diseno-web-chile",
    navLabel: "Agencia diseno web Chile",
    metaTitle: "Agencia Diseno Web Chile Para Empresas | Zyteron",
    metaDescription:
      "Somos una agencia de diseno web en Chile enfocada en resultados: estrategia, diseno, desarrollo SEO y conversion para empresas.",
    primaryKeyword: "agencia diseno web chile",
    secondaryKeywords: ["agencia web chile", "empresa diseno web", "agencia digital para pymes"],
    heroTitle: "Agencia de diseno web en Chile orientada a resultados",
    heroDescription:
      "Unimos estrategia comercial, UX, desarrollo y SEO tecnico para que tu sitio no sea un folleto, sino un canal activo de ventas.",
    summary:
      "Modelo de trabajo integral para empresas que necesitan una sola contraparte tecnica y comercial para su presencia digital.",
    idealFor: [
      "Empresas que quieren resolver web, SEO y conversion con un solo partner.",
      "Gerencias que necesitan reportabilidad de avances y resultados.",
      "Equipos que requieren continuidad post-lanzamiento.",
    ],
    deliverables: [
      "Plan de sitio y posicionamiento por servicio/keyword.",
      "Diseno web orientado a claridad, confianza y accion.",
      "Desarrollo tecnico con optimizacion de indexacion.",
      "Plan de mejoras continuas de conversion y contenido.",
    ],
    process: [
      "Sesion de objetivos y benchmark competitivo.",
      "Roadmap de arquitectura, contenidos y desarrollo.",
      "Implementacion por sprint con entregables medibles.",
      "Seguimiento con prioridades SEO y CRO.",
    ],
    faqs: [
      {
        question: "Por que elegir una agencia y no freelance?",
        answer:
          "Una agencia integra perfiles complementarios y da continuidad operativa en estrategia, diseno y desarrollo.",
      },
      {
        question: "Trabajan solo en Santiago?",
        answer:
          "No. Operamos remoto para todo Chile y coordinamos reuniones online o presenciales segun necesidad.",
      },
    ],
    relatedSlugs: ["diseno-web-chile", "diseno-web-santiago"],
  },
  {
    slug: "diseno-web-santiago",
    navLabel: "Diseno web Santiago",
    metaTitle: "Diseno Web Santiago Para Empresas | Zyteron",
    metaDescription:
      "Servicio de diseno web en Santiago para empresas y pymes: sitios corporativos, landing pages y soporte tecnico orientado a conversion.",
    primaryKeyword: "diseno web santiago",
    secondaryKeywords: ["diseno paginas web santiago", "agencia web santiago", "sitios web para empresas santiago"],
    heroTitle: "Diseno web en Santiago para empresas que quieren vender mas",
    heroDescription:
      "Creamos sitios para negocios de Santiago con enfoque local, mensajes claros y estructura tecnica para captar clientes desde Google.",
    summary:
      "Servicio local para empresas en Santiago con ejecucion remota y opcion de reuniones comerciales programadas.",
    idealFor: [
      "Empresas de Santiago que compiten por busquedas locales de alto valor.",
      "Negocios que necesitan mejorar su presencia digital en la RM.",
      "Equipos comerciales que requieren una web alineada a su discurso de venta.",
    ],
    deliverables: [
      "Estructura SEO local para Santiago y comunas objetivo.",
      "Paginas de servicio optimizadas para conversion.",
      "Implementacion de confianza local: cobertura, casos y contacto.",
      "CTAs claros para llamada, formulario y WhatsApp.",
    ],
    process: [
      "Definicion de territorio comercial y terminos locales.",
      "Plan de contenidos y arquitectura por intencion local.",
      "Diseno/desarrollo y optimizacion de experiencia mobile.",
      "Seguimiento de posicionamiento y conversion de leads locales.",
    ],
    faqs: [
      {
        question: "Pueden trabajar con empresas fuera de Santiago?",
        answer:
          "Si. El servicio esta optimizado para Santiago, pero atendemos proyectos en todas las regiones de Chile.",
      },
      {
        question: "Incluye SEO local desde el inicio?",
        answer:
          "Si. Desde la arquitectura inicial incorporamos terminos locales, schema y enlazado interno.",
      },
    ],
    relatedSlugs: ["agencia-diseno-web-chile", "paginas-web-para-empresas"],
  },
  {
    slug: "creacion-de-sitios-web-para-empresas",
    navLabel: "Creacion de sitios web para empresas",
    metaTitle: "Creacion de Sitios Web Para Empresas en Chile | Zyteron",
    metaDescription:
      "Servicio de creacion de sitios web para empresas en Chile con diseno profesional, desarrollo tecnico y enfoque en conversion.",
    primaryKeyword: "creacion de sitios web para empresas",
    secondaryKeywords: ["crear sitio web empresa", "sitio web corporativo chile", "desarrollo sitio empresarial"],
    heroTitle: "Creacion de sitios web para empresas con estrategia comercial",
    heroDescription:
      "Disenamos y desarrollamos sitios empresariales listos para captar leads, mostrar autoridad y respaldar tu crecimiento digital en Chile.",
    summary:
      "Servicio end-to-end para crear un sitio empresarial desde cero: arquitectura, contenido, desarrollo y lanzamiento.",
    idealFor: [
      "Empresas que aun no tienen sitio o tienen uno obsoleto.",
      "Marcas que necesitan posicionar servicios profesionales en Google.",
      "Equipos que buscan una implementacion completa sin depender de varios proveedores.",
    ],
    deliverables: [
      "Definicion de mapa de paginas y mensajes clave.",
      "Diseno responsive y desarrollo con buenas practicas SEO.",
      "Configuracion tecnica de indexacion, sitemap y schema.",
      "Plan inicial de crecimiento de contenidos por servicios.",
    ],
    process: [
      "Workshop de objetivos comerciales y propuesta de valor.",
      "Arquitectura del sitio y redaccion orientada a conversion.",
      "Diseno, desarrollo, QA y revision SEO final.",
      "Lanzamiento con checklist tecnico y soporte de estabilizacion.",
    ],
    faqs: [
      {
        question: "Que necesita mi empresa para iniciar un proyecto?",
        answer:
          "Solo objetivos comerciales, servicios principales y datos de contacto. Nosotros guiamos estructura, textos y ejecucion tecnica.",
      },
      {
        question: "El sitio queda preparado para futuras secciones?",
        answer:
          "Si. Dejamos arquitectura escalable para sumar nuevas paginas de servicio, blog y campanas sin rehacer el sitio.",
      },
    ],
    relatedSlugs: ["paginas-web-para-empresas", "desarrollo-web-chile"],
  },
];

export function getServicePageBySlug(slug: string) {
  return servicePages.find((service) => service.slug === slug);
}
