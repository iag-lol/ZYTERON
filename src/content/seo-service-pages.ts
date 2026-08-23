import {
  PLAN_PRICE_AMOUNTS,
  MAINTENANCE_PRICE_AMOUNTS,
  SERVICE_PRICE_AMOUNTS,
} from "@/config/pricing";

/** Formatea un monto CLP con separador de miles chileno: 79990 → "$79.990". */
const clp = (amount: number) => `$${amount.toLocaleString("es-CL")}`;

export type SeoServiceFaq = {
  question: string;
  answer: string;
};

export type SeoServiceProcessStep = {
  title: string;
  description: string;
};

export type SeoServiceRelatedLink = {
  label: string;
  href: string;
  description: string;
};

export type SeoServicePage = {
  slug: string;
  path: string;
  navLabel: string;
  metaTitle: string;
  metaDescription: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  heroTitle: string;
  heroDescription: string;
  /**
   * Respuesta directa a la intención de búsqueda (TL;DR). Se renderiza bajo el
   * H1: 2-3 frases con precio "Desde" real interpolado desde pricing.ts y plazo típico.
   */
  directAnswer?: string;
  problemTitle: string;
  problemDescription: string;
  benefits: string[];
  includes: string[];
  audience: string[];
  process: SeoServiceProcessStep[];
  faqs: SeoServiceFaq[];
  relatedLinks: SeoServiceRelatedLink[];
  serviceType: string;
  primaryCta: string;
  finalCtaTitle: string;
  finalCtaCopy: string;
};

const baseProcess: SeoServiceProcessStep[] = [
  {
    title: "Diagnóstico inicial",
    description:
      "Entendemos el negocio, objetivos, clientes, problemas actuales y prioridades antes de proponer una solución.",
  },
  {
    title: "Propuesta clara",
    description:
      "Definimos alcance, estructura, funcionalidades, tiempos estimados y condiciones comerciales por escrito.",
  },
  {
    title: "Diseño y desarrollo",
    description:
      "Construimos una solución profesional, responsive y adaptada al rubro, con foco en uso real y conversión.",
  },
  {
    title: "Revisión y mejoras",
    description:
      "Probamos el flujo, revisamos contenido, rendimiento y experiencia para ajustar antes de publicar o entregar.",
  },
  {
    title: "Entrega y acompañamiento",
    description:
      "Entregamos el proyecto con orientación de uso y opciones de mantención, soporte o nuevas funcionalidades.",
  },
];

const commonRelatedLinks: SeoServiceRelatedLink[] = [
  {
    label: "Planes y precios",
    href: "/planes",
    description: "Revisa valores referenciales y formas de trabajo por etapa de negocio.",
  },
  {
    label: "Quiénes somos",
    href: "/quienes-somos",
    description: "Conoce el enfoque, trayectoria y metodología de Zyteron.",
  },
  {
    label: "Casos anónimos",
    href: "/casos-exito",
    description: "Revisa problemas reales resueltos con sistemas, automatización, ecommerce y SEO.",
  },
  {
    label: "Guías y recursos",
    href: "/recursos",
    description: "Cómo elegir proveedor, qué exigir en una cotización y qué revisar antes de contratar.",
  },
  {
    label: "Contacto",
    href: "/contacto",
    description: "Solicita una orientación inicial para definir el alcance de tu proyecto.",
  },
];

export const seoServicePages: SeoServicePage[] = [
  {
    slug: "desarrollo-web",
    path: "/desarrollo-web",
    navLabel: "Desarrollo web",
    metaTitle: "Desarrollo Web a Medida en Chile | Zyteron",
    metaDescription:
      "Empresa de desarrollo web en Santiago para empresas de todo Chile: webs profesionales con SEO base, diseño responsive y rutas de contacto claras. Cotiza sin compromiso.",
    primaryKeyword: "desarrollo web en Chile",
    secondaryKeywords: [
      "páginas web profesionales",
      "diseño web para empresas",
      "empresa de desarrollo web en Santiago",
      "sitios web responsive",
    ],
    heroTitle: "Desarrollo web personalizado para proyectos que necesitan más que una plantilla",
    heroDescription:
      "Hacemos diseño de páginas web y desarrollo web para empresas, pymes y emprendedores de Santiago y todo Chile: sitios profesionales, modernos y rápidos para mostrar tus servicios con confianza, captar consultas y crecer con una base técnica escalable.",
    directAnswer: `Crear una página web profesional en Chile cuesta desde ${clp(PLAN_PRICE_AMOUNTS["web-basica"])} CLP + IVA y está lista en 1 a 3 semanas; un sitio corporativo completo parte desde ${clp(PLAN_PRICE_AMOUNTS.empresa)} + IVA y toma 3 a 6 semanas. Zyteron, empresa chilena con oficina en Providencia, Santiago, diseña, desarrolla y publica tu sitio con SEO técnico incluido, y atiende proyectos en todo Chile.`,
    problemTitle: "Una web profesional debe vender confianza, no solo verse bien",
    problemDescription:
      "Muchas empresas tienen sitios lentos, desordenados o genéricos que no explican bien sus servicios. Si necesitas hacer una página web para tu negocio, en Zyteron trabajamos estructura, copy, diseño web profesional y responsive, SEO base y rutas de conversión para que la web ayude al negocio desde el primer contacto.",
    benefits: [
      "Mejora la credibilidad de tu empresa frente a clientes nuevos.",
      "Ordena servicios, propuesta de valor y llamados a la acción.",
      "Deja una base técnica preparada para indexación y crecimiento SEO.",
      "Facilita contacto por formulario, correo y WhatsApp.",
      "Permite escalar con blog, páginas internas, sistemas o automatizaciones.",
      "Te acompaña de punta a punta si es tu primera web: guiamos contenido, dominio, hosting y publicación para crear una página web sin conocimientos técnicos.",
    ],
    includes: [
      "Arquitectura de contenidos por servicios y objetivos comerciales.",
      "Diseño responsive para celular, tablet y escritorio.",
      "Implementación de title, meta description, canonical, Open Graph y schema.",
      "Formulario de contacto, botones de WhatsApp y CTAs claros.",
      "Optimización básica de velocidad, accesibilidad y experiencia móvil.",
      "Publicación, revisión final y soporte inicial según alcance contratado.",
    ],
    audience: [
      "Empresas que necesitan renovar una web antigua o poco confiable.",
      "Pymes que quieren captar clientes desde Google y redes sociales.",
      "Emprendedores que necesitan una página web para emprendedores con imagen profesional.",
      "Negocios B2B que requieren explicar una oferta compleja de forma simple.",
    ],
    process: baseProcess,
    faqs: [
      {
        question: "¿Cómo puedo crear una página web profesional para mi empresa?",
        answer:
          "Para crear una página web partimos con un diagnóstico de tus objetivos, definimos estructura y contenido, y nos encargamos del diseño de páginas web, el desarrollo, la base SEO y la publicación. Tú solo entregas la información del negocio.",
      },
      {
        question: "¿Cuánto cuesta hacer una página web profesional?",
        answer: `Hacer una página web profesional en Chile cuesta entre ${clp(PLAN_PRICE_AMOUNTS["web-basica"])} y ${clp(PLAN_PRICE_AMOUNTS.empresa)} + IVA según alcance: una web básica de presentación parte en ${clp(PLAN_PRICE_AMOUNTS["web-basica"])}, un sitio para pyme con varias secciones en ${clp(PLAN_PRICE_AMOUNTS.pyme)} y un sitio corporativo completo en ${clp(PLAN_PRICE_AMOUNTS.empresa)} + IVA. El valor final depende de páginas, contenido e integraciones; entregamos cotización formal por escrito antes de iniciar.`,
      },
      {
        question: "¿El desarrollo incluye diseño web profesional adaptado a celular?",
        answer:
          "Sí. Cada proyecto incluye diseño web profesional trabajado responsive: el mismo sitio se adapta a celular, tablet y escritorio cuidando legibilidad, velocidad de carga y facilidad de contacto, porque la mayoría de las visitas en Chile llega desde el teléfono.",
      },
      {
        question: "¿El desarrollo web incluye SEO?",
        answer:
          "Sí. Todo desarrollo web de Zyteron incluye base SEO técnica y on-page: metadata, estructura de encabezados, sitemap, robots, schema cuando corresponde y contenido organizado por intención de búsqueda, para que el sitio quede posicionable en Google desde el día uno.",
      },
      {
        question: "¿Podré administrar el contenido de mi sitio web?",
        answer:
          "Sí, cuando el proyecto lo requiere implementamos panel administrativo o estructura editable para que tu equipo actualice textos, imágenes o productos sin depender de un desarrollador. Se define en el alcance de la cotización.",
      },
      {
        question: "¿Qué información necesito entregar para comenzar?",
        answer:
          "Objetivos comerciales, servicios principales, referencias visuales, datos de contacto, identidad de marca y cualquier contenido disponible para estructurar una primera propuesta.",
      },
    ],
    relatedLinks: [
      { label: "Páginas web para pymes", href: "/paginas-web-para-pymes", description: "Soluciones web para pymes chilenas con foco en contacto y presencia profesional." },
      { label: "Páginas web para empresas", href: "/paginas-web-para-empresas", description: "Sitios corporativos con UX, confianza y enfoque comercial." },
      { label: "SEO para empresas", href: "/servicios/seo-para-empresas-chile", description: "Mejoras técnicas y contenido para crecer en tráfico orgánico." },
      { label: "Mantención web en Chile", href: "/servicios/mantencion-web-chile", description: "Actualizaciones, monitoreo y mejoras continuas después del lanzamiento." },
      { label: "Calculadora de precio", href: "/calculadora-precio-pagina-web", description: "Estima cuánto costaría tu página web antes de cotizar." },
      ...commonRelatedLinks,
    ],
    serviceType: "Desarrollo web",
    primaryCta: "Solicitar cotización",
    finalCtaTitle: "¿Necesitas una web profesional para tu empresa?",
    finalCtaCopy:
      "Cuéntanos qué vende tu negocio, qué necesitas comunicar y qué objetivo esperas lograr. Te orientamos con una propuesta clara y escalable.",
  },
  {
    slug: "paginas-web-para-pymes",
    path: "/paginas-web-para-pymes",
    navLabel: "Páginas web para pymes",
    metaTitle: "Páginas Web para Pymes en Chile | Zyteron",
    metaDescription:
      "Creamos páginas web para pymes en Chile: rápidas, responsivas y orientadas a generar consultas por Google, WhatsApp y formulario. Revisa planes y cotiza.",
    primaryKeyword: "páginas web para pymes en Chile",
    secondaryKeywords: [
      "página web para pyme",
      "web para pymes Chile",
      "sitios web para pequeñas empresas",
      "diseño web para pymes",
    ],
    heroTitle: "Páginas web profesionales para pymes chilenas",
    heroDescription:
      "Creamos sitios profesionales para pequeñas y medianas empresas que necesitan explicar sus servicios, construir visibilidad en búsquedas relevantes y transformar visitas en consultas por WhatsApp, formulario o correo.",
    directAnswer: `Una página web para pyme en Chile cuesta entre ${clp(PLAN_PRICE_AMOUNTS["web-basica"])} y ${clp(PLAN_PRICE_AMOUNTS.pyme)} CLP + IVA según secciones y funcionalidades, y está lista en 1 a 3 semanas. Zyteron la diseña, desarrolla y deja posicionable en Google, con contacto por WhatsApp y formulario integrado, atendiendo desde Santiago a pymes de todo Chile.`,
    problemTitle: "Una pyme necesita una web que explique rápido y genere contacto",
    problemDescription:
      "Una web para pyme no debe ser compleja por obligación. Debe mostrar qué haces, por qué confiar, cómo contactarte y qué pasos seguir. Diseñamos estructuras simples de entender, pero sólidas para crecer.",
    benefits: [
      "Mayor confianza frente a clientes que buscan tu negocio en Google.",
      "Servicios y productos explicados con lenguaje claro.",
      "Contacto directo por WhatsApp, formulario y correo.",
      "Base SEO para búsquedas locales y comerciales.",
      "Posibilidad de crecer hacia tienda online, blog o sistema interno.",
    ],
    includes: [
      "Home profesional con propuesta de valor y CTA.",
      "Secciones de servicios, beneficios, preguntas frecuentes y contacto.",
      "Diseño responsive y carga optimizada.",
      "Textos comerciales orientados a clientes reales.",
      "Integración con WhatsApp, correo y formulario.",
      "Configuración SEO base para indexación inicial.",
    ],
    audience: [
      "Pymes que aún dependen solo de redes sociales o referidos.",
      "Negocios locales que quieren proyectar una imagen más profesional.",
      "Servicios técnicos, profesionales, comerciales o B2B.",
      "Empresas pequeñas que necesitan cotizar por etapas.",
    ],
    process: baseProcess,
    faqs: [
      {
        question: "¿Cuánto cuesta una página web para una pyme en Chile?",
        answer: `Una página web para pyme cuesta entre ${clp(PLAN_PRICE_AMOUNTS["web-basica"])} y ${clp(PLAN_PRICE_AMOUNTS.pyme)} + IVA: la web básica de presentación parte en ${clp(PLAN_PRICE_AMOUNTS["web-basica"])}, el plan emprendedor en ${clp(PLAN_PRICE_AMOUNTS.emprendedor)} y el plan pyme, con más secciones y funcionalidades, en ${clp(PLAN_PRICE_AMOUNTS.pyme)} + IVA. El valor final depende de secciones, contenido e integraciones, y lo confirmamos en una cotización formal antes de comenzar.`,
      },
      {
        question: "¿Qué debe incluir una página web para pyme?",
        answer:
          "Como base debe explicar qué hace el negocio, a quién ayuda, sus servicios o productos, señales reales de confianza, preguntas frecuentes y una ruta simple hacia WhatsApp, formulario, correo o llamada.",
      },
      {
        question: "¿Mi pyme es muy chica para tener página web?",
        answer:
          "Ninguna pyme es demasiado chica: trabajamos con emprendedores que parten de cero y con pymes establecidas, ajustando alcance, contenidos y presupuesto a la etapa real del negocio. Se puede partir con una web básica y crecer por etapas.",
      },
      {
        question: "¿Cuánto demora desarrollar una web para pyme?",
        answer:
          "Una web simple puede tomar 1 a 3 semanas. Un sitio más completo puede requerir 3 a 6 semanas según contenido y revisiones.",
      },
      {
        question: "¿La web de mi pyme puede recibir consultas por WhatsApp?",
        answer:
          "Sí. Integramos botón de WhatsApp, formulario y correo en puntos visibles del sitio, porque para una pyme chilena WhatsApp suele ser el canal donde se cierran las cotizaciones.",
      },
      {
        question: "¿Atienden pymes de regiones o solo de Santiago?",
        answer:
          "Atendemos pymes de todo Chile. La mayoría de nuestros clientes está en Santiago y la Región Metropolitana, pero el proceso completo —levantamiento, revisiones y entrega— funciona igual de bien en modalidad remota para cualquier región.",
      },
    ],
    relatedLinks: [
      { label: "Páginas web para empresas", href: "/paginas-web-para-empresas", description: "Sitios corporativos para organizaciones con una oferta y proceso comercial más amplios." },
      { label: "Desarrollo web en Chile", href: "/desarrollo-web", description: "Implementación técnica de sitios profesionales, rápidos y escalables." },
      { label: "Tiendas online para pymes", href: "/tiendas-online", description: "Ecommerce y catálogos digitales para vender productos online." },
      { label: "Blog para pymes", href: "/blog/que-debe-tener-pagina-web-profesional-pyme", description: "Checklist de una web profesional para una pyme." },
      ...commonRelatedLinks,
    ],
    serviceType: "Páginas web para pymes",
    primaryCta: "Cotizar página web para pyme",
    finalCtaTitle: "¿Tu pyme necesita una web clara y profesional?",
    finalCtaCopy:
      "Podemos ayudarte a definir una primera versión sólida, con posibilidad de crecer por etapas según presupuesto y prioridades.",
  },
  {
    slug: "paginas-web-para-empresas",
    path: "/paginas-web-para-empresas",
    navLabel: "Páginas web para empresas",
    metaTitle: "Páginas Web para Empresas en Chile | Zyteron",
    metaDescription:
      "Creamos páginas web para empresas en Chile con diseño corporativo, contenido comercial, SEO técnico y rutas claras para captar consultas y cotizaciones.",
    primaryKeyword: "páginas web para empresas en Chile",
    secondaryKeywords: [
      "diseño web para empresas Chile",
      "sitios web corporativos",
      "página web empresarial",
      "diseño web corporativo Chile",
    ],
    heroTitle: "Páginas web empresariales diseñadas para generar negocios",
    heroDescription:
      "Diseñamos y desarrollamos sitios corporativos para que clientes, proveedores y equipos de compra entiendan tu oferta, encuentren respaldo real y avancen hacia una consulta o cotización.",
    directAnswer: `Una página web corporativa para empresa en Chile cuesta desde ${clp(PLAN_PRICE_AMOUNTS.empresa)} CLP + IVA y se entrega en 3 a 6 semanas según cantidad de páginas e integraciones. Zyteron la construye con arquitectura comercial, SEO técnico y medición de conversiones, desde su oficina en Providencia, Santiago, para empresas de todo Chile.`,
    problemTitle: "Una página web empresarial debe apoyar la decisión comercial",
    problemDescription:
      "Una empresa puede ofrecer buenos servicios y aun así perder oportunidades si su sitio se ve antiguo, no explica diferencias o esconde el contacto. Trabajamos arquitectura, contenido, navegación, llamados a la acción y evidencia para convertir la web en un canal comercial serio.",
    benefits: [
      "Imagen profesional alineada a servicios B2B y clientes exigentes.",
      "Mejor lectura en móvil y escritorio.",
      "Estructura visual preparada para servicios, equipo, casos y FAQ.",
      "Copy comercial para explicar valor sin textos genéricos.",
      "Mayor consistencia entre marca, propuesta y conversión.",
      "Base SEO preparada para servicios, industrias y contenido futuro.",
    ],
    includes: [
      "Arquitectura visual para home y páginas internas.",
      "Componentes de confianza: proceso, beneficios, FAQ, CTAs y contacto.",
      "Diseño responsive con buena legibilidad y contraste.",
      "Revisión de jerarquía H1, H2 y H3.",
      "Optimización de navegación y enlaces internos.",
      "Analítica y eventos preparados para medir formularios, WhatsApp y cotizaciones.",
    ],
    audience: [
      "Empresas con sitio antiguo o poco alineado a su nivel actual.",
      "Equipos comerciales que necesitan explicar servicios complejos.",
      "Organizaciones que quieren ordenar su presencia digital.",
      "Negocios que invierten en Google Ads o SEO y necesitan mejor conversión.",
    ],
    process: baseProcess,
    faqs: [
      {
        question: "¿Qué debe incluir una página web para una empresa?",
        answer:
          "Debe presentar una propuesta de valor clara, servicios o soluciones, experiencia comprobable, proceso de trabajo, preguntas frecuentes, información comercial y rutas de contacto medibles. La estructura exacta depende del ciclo de venta y del tipo de cliente.",
      },
      {
        question: "¿Cuánto cuesta una página web para empresa en Chile?",
        answer: `Un sitio corporativo para empresa cuesta desde ${clp(PLAN_PRICE_AMOUNTS.empresa)} + IVA, e incluye varias páginas internas, diseño a medida y base SEO. Si el proyecto requiere módulos administrables o un sistema interno, el rango sube desde ${clp(PLAN_PRICE_AMOUNTS.sistema)} + IVA. Zyteron entrega una cotización formal con alcance, plazos y condiciones antes de iniciar.`,
      },
      {
        question: "¿Hacen rediseño de sitios existentes?",
        answer:
          "Sí. Revisamos estructura actual, riesgos SEO y oportunidades antes de proponer rediseño o migración.",
      },
      {
        question: "¿El diseño incluye textos comerciales?",
        answer:
          "Podemos apoyar con redacción base, estructura de mensajes y ajustes de copy según alcance contratado.",
      },
      {
        question: "¿Pueden mantener la identidad visual actual?",
        answer:
          "Sí. Mejoramos orden, legibilidad y confianza sin cambiar bruscamente la identidad existente.",
      },
      {
        question: "¿El diseño considera conversión?",
        answer:
          "Sí. Incluimos llamados a la acción, bloques de confianza y rutas claras hacia contacto o cotización.",
      },
    ],
    relatedLinks: [
      { label: "Páginas web para pymes", href: "/paginas-web-para-pymes", description: "Una solución de menor alcance para pequeñas y medianas empresas." },
      { label: "Desarrollo web en Chile", href: "/desarrollo-web", description: "Implementación técnica de sitios rápidos, indexables y escalables." },
      { label: "Sistemas web para empresas", href: "/sistemas-web", description: "Plataformas internas para procesos administrativos y operación." },
      { label: "Landing pages para campañas", href: "/servicios/landing-pages-para-empresas", description: "Páginas de campaña orientadas a conversión para Google Ads o lanzamientos." },
      { label: "Páginas web para constructoras", href: "/paginas-web/constructoras", description: "Sitio corporativo enfocado en mostrar obra ejecutada y capacidad técnica." },
      { label: "Páginas web para empresas industriales", href: "/paginas-web/industria-b2b", description: "Catálogo técnico, fichas de producto y captación de clientes B2B." },
      { label: "Páginas web para servicios profesionales", href: "/paginas-web/servicios-profesionales", description: "Sitios para estudios y consultoras que necesitan agendar y calificar consultas." },
      { label: "Páginas web para transporte y logística", href: "/paginas-web/transporte-logistica", description: "Presencia comercial para operadores de carga, flotas y distribución." },
      ...commonRelatedLinks,
    ],
    serviceType: "Páginas web corporativas para empresas",
    primaryCta: "Cotizar página web para empresa",
    finalCtaTitle: "¿Tu empresa necesita una página web que genere confianza y consultas?",
    finalCtaCopy:
      "Revisamos tu situación y proponemos una estructura visual y comercial más clara, moderna y confiable.",
  },
  {
    slug: "tiendas-online",
    path: "/tiendas-online",
    navLabel: "Tiendas online",
    metaTitle: "Tiendas Online en Chile para Empresas | Zyteron",
    metaDescription:
      "Desarrollo de tiendas online en Chile para pymes y empresas: catálogo, pagos con Webpay, Flow o Mercado Pago, WhatsApp y base SEO lista para crecer. Cotiza sin compromiso.",
    primaryKeyword: "tiendas online para pymes",
    secondaryKeywords: [
      "ecommerce Chile",
      "crear tienda online",
      "crear tienda online en Chile",
      "diseño y desarrollo de tienda online",
      "tienda virtual Chile",
      "catálogo online",
      "tienda online con Webpay",
      "tienda online con Flow",
      "tienda online con Mercado Pago",
      "página web con tienda online",
      "catálogo digital para empresas",
    ],
    heroTitle: "Tiendas online preparadas para vender en Chile",
    heroDescription:
      "Hacemos diseño y desarrollo de tiendas online para crear tu tienda virtual en Chile: catálogo online administrable, fichas de producto y flujos de compra o cotización para mostrar productos, recibir pedidos y vender con una experiencia profesional.",
    directAnswer: `Una tienda online en Chile cuesta desde ${clp(PLAN_PRICE_AMOUNTS.catalogo)} CLP + IVA como catálogo con venta por WhatsApp, y desde ${clp(PLAN_PRICE_AMOUNTS.ecommerce)} + IVA con carrito y pagos por Webpay, Flow o Mercado Pago; la entrega típica toma 3 a 6 semanas. Zyteron la desarrolla con catálogo administrable, base SEO y capacitación para operar, desde Santiago para todo Chile.`,
    problemTitle: "Vender online requiere más que subir productos",
    problemDescription:
      "Una tienda efectiva necesita categorías claras, fichas útiles, confianza, contacto, rendimiento móvil y un flujo de compra coherente con la operación real del negocio.",
    benefits: [
      "Catálogo ordenado para facilitar la decisión de compra.",
      "Experiencia responsive para usuarios que compran desde celular.",
      "Opciones de compra, cotización o contacto por WhatsApp según modelo comercial.",
      "Base SEO para productos, categorías y búsquedas comerciales.",
      "Integración con medios de pago como Webpay, Flow o Mercado Pago según tu operación.",
      "Escalabilidad hacia pagos online, stock o panel administrativo.",
    ],
    includes: [
      "Catálogo online administrable con categorías, fichas de producto y buscador.",
      "Diseño visual adaptado a marca, rubro y tipo de catálogo.",
      "Carrito o flujo de pedido según alcance.",
      "Integración con WhatsApp y formulario de consulta.",
      "Preparación para pasarela de pago (Webpay, Flow o Mercado Pago) cuando corresponde.",
      "Capacitación básica para operación inicial.",
    ],
    audience: [
      "Pymes que venden productos físicos o servicios paquetizados.",
      "Marcas que venden por redes y necesitan crear una tienda online propia.",
      "Empresas que requieren catálogo online ordenado para clientes y vendedores.",
      "Negocios que quieren crear un ecommerce o tienda virtual por etapas.",
    ],
    process: baseProcess,
    faqs: [
      {
        question: "¿Qué tipos de tiendas online desarrollan?",
        answer:
          "Desarrollamos desde catálogos online con venta asistida por WhatsApp hasta ecommerce completos con carrito, pagos online y gestión de stock. El formato se elige según cómo vende hoy tu negocio y cómo quiere operar los pedidos.",
      },
      {
        question: "¿Incluye carga de productos?",
        answer:
          "Puede incluir una carga inicial limitada o carga masiva como adicional, según cantidad de productos y datos disponibles.",
      },
      {
        question: "¿Puedo vender por WhatsApp además de la tienda?",
        answer:
          "Sí. Podemos integrar botones y flujos para venta asistida por WhatsApp.",
      },
      {
        question: "¿Pueden integrar pagos online con Webpay, Flow o Mercado Pago?",
        answer:
          "Sí. Evaluamos tu tienda online con Webpay, Flow o Mercado Pago según el rubro, el volumen de ventas y los requisitos de cada pasarela, y dejamos el flujo de cobro probado antes de publicar.",
      },
      {
        question: "¿Cuánto cuesta crear una tienda online en Chile?",
        answer: `Crear una tienda online en Chile cuesta entre ${clp(PLAN_PRICE_AMOUNTS.catalogo)} y ${clp(PLAN_PRICE_AMOUNTS.ecommerce)} + IVA: un catálogo por WhatsApp parte en ${clp(PLAN_PRICE_AMOUNTS.catalogo)} y un ecommerce con carrito y pagos online (Webpay, Flow o Mercado Pago) en ${clp(PLAN_PRICE_AMOUNTS.ecommerce)} + IVA. El valor final depende de la cantidad de productos, las pasarelas y la administración requerida; entregamos cotización formal antes de iniciar.`,
      },
      {
        question: "¿Pueden agregar una tienda online a mi página web actual?",
        answer:
          "Sí. Podemos convertir tu sitio en una página web con tienda online integrada o crear una tienda virtual nueva, según cómo prefieras operar.",
      },
      {
        question: "¿La tienda puede partir como catálogo sin pago online?",
        answer:
          "Sí. Muchas pymes parten con un catálogo online y venta asistida por WhatsApp, y luego incorporan carrito, pagos o stock según avance comercial.",
      },
    ],
    relatedLinks: [
      { label: "Páginas web para pymes", href: "/paginas-web-para-pymes", description: "Presencia digital profesional antes de escalar a ecommerce." },
      { label: "Sistemas web", href: "/sistemas-web", description: "Paneles y módulos internos para stock, pedidos o reportes." },
      ...commonRelatedLinks,
    ],
    serviceType: "Tiendas online y ecommerce",
    primaryCta: "Cotizar tienda online",
    finalCtaTitle: "¿Quieres vender online con una tienda profesional?",
    finalCtaCopy:
      "Cuéntanos qué vendes, cuántos productos tienes y cómo operas hoy. Definimos una tienda realista, ordenada y escalable.",
  },
  {
    slug: "sistemas-web",
    path: "/sistemas-web",
    navLabel: "Sistemas web",
    metaTitle: "Sistemas Web para Empresas en Chile | Zyteron",
    metaDescription:
      "Desarrollo de sistemas web a medida en Santiago y todo Chile: paneles administrativos, reportes, permisos y automatización para ordenar tu operación. Conoce nuestra metodología.",
    primaryKeyword: "sistemas web a medida",
    secondaryKeywords: [
      "software a medida en Chile",
      "desarrollo de software a medida",
      "software para pymes en Chile",
      "panel administrativo web",
      "aplicaciones web",
      "sistema de gestión para empresas",
      "sistema de inventario",
      "sistema de cotizaciones",
      "sistema de control de flota",
      "plataformas administrativas para empresas",
    ],
    heroTitle: "Sistemas web a medida para digitalizar procesos empresariales",
    heroDescription:
      "Hacemos desarrollo de software y sistemas web a medida para empresas de Santiago y todo Chile: plataformas administrativas, aplicaciones web y paneles de gestión para controlar datos, usuarios, documentos, clientes, reportes y flujos críticos del negocio.",
    directAnswer: `Un sistema web a medida en Chile cuesta desde ${clp(PLAN_PRICE_AMOUNTS.sistema)} CLP + IVA, y un sistema avanzado con múltiples módulos e integraciones desde ${clp(PLAN_PRICE_AMOUNTS.avanzado)} + IVA, con plazo definido por módulos en la cotización. Zyteron lo desarrolla por etapas, partiendo por el módulo más crítico de tu operación, con soporte desde Santiago para todo Chile.`,
    problemTitle: "Cuando la operación crece, las planillas dejan de ser suficientes",
    problemDescription:
      "Los sistemas web permiten centralizar información, reducir errores, controlar estados y entregar trazabilidad. Desarrollamos soluciones por etapas para resolver primero el proceso de mayor impacto.",
    benefits: [
      "Control centralizado de información y procesos internos.",
      "Menos tareas manuales y menor riesgo de errores repetitivos.",
      "Paneles con roles, estados, registros y reportes.",
      "Generación de PDF, notificaciones o integraciones cuando aplica.",
      "Escalabilidad por módulos según presupuesto y prioridad.",
      "Un mismo camino de crecimiento: del primer panel a una intranet corporativa o una plataforma multiárea, sin rehacer lo construido.",
    ],
    includes: [
      "Levantamiento funcional del proceso actual.",
      "Diseño de módulos, permisos y flujos principales.",
      "Panel administrativo web responsive y aplicaciones web internas.",
      "Formularios, registros, estados y filtros según alcance.",
      "Reportes, documentos o exportaciones si corresponde.",
      "Pruebas, capacitación y soporte inicial.",
    ],
    audience: [
      "Empresas que necesitan un sistema de gestión para clientes, pedidos, cotizaciones o proyectos.",
      "Pymes que trabajan con planillas dispersas y buscan software para pymes en Chile.",
      "Equipos que requieren sistema de inventario, control de asistencia o control de flota.",
      "Negocios que requieren software a medida propio en vez de herramientas genéricas.",
      "Organizaciones que ya necesitan una intranet corporativa, control operacional multisucursal o una plataforma que integre varios departamentos.",
    ],
    process: baseProcess,
    faqs: [
      {
        question: "¿Qué tipos de sistemas web y software a medida desarrollan?",
        answer:
          "Desarrollamos software a medida en Chile como sistema de inventario, sistema de cotizaciones, control de asistencia, control de flota, sistema de gestión para empresas y paneles administrativos web, según el proceso que necesites ordenar.",
      },
      {
        question: "¿Cuánto cuesta un sistema web a medida en Chile?",
        answer: `Un sistema web administrativo cuesta desde ${clp(PLAN_PRICE_AMOUNTS.sistema)} + IVA y un sistema avanzado a medida, con múltiples módulos, roles e integraciones, desde ${clp(PLAN_PRICE_AMOUNTS.avanzado)} + IVA. Para operaciones corporativas la escalera continúa con intranet corporativa desde ${clp(PLAN_PRICE_AMOUNTS.intranet)} + IVA, plataforma de control operacional desde ${clp(PLAN_PRICE_AMOUNTS.operacional)} + IVA, plataforma corporativa integrada desde ${clp(PLAN_PRICE_AMOUNTS.corporativa)} + IVA y arquitectura Enterprise 360 desde ${clp(PLAN_PRICE_AMOUNTS.enterprise)} + IVA. Como el alcance se define por módulos, puedes partir con una primera etapa acotada y escalar; el precio final se confirma en una cotización formal tras el levantamiento del proceso.`,
      },
      {
        question: "¿Puedo partir con un módulo pequeño?",
        answer:
          "Sí. Recomendamos iniciar por el módulo más crítico y luego escalar por etapas.",
      },
      {
        question: "¿Desarrollan intranets y plataformas corporativas?",
        answer: `Sí. Cuando la operación supera un sistema de gestión, seguimos la misma metodología en escala corporativa: intranet corporativa con perfiles, documentación, solicitudes y aprobaciones desde ${clp(PLAN_PRICE_AMOUNTS.intranet)} + IVA; plataforma de control operacional para sucursales, activos y personal en terreno desde ${clp(PLAN_PRICE_AMOUNTS.operacional)} + IVA; plataforma corporativa integrada que reúne varios departamentos desde ${clp(PLAN_PRICE_AMOUNTS.corporativa)} + IVA; y arquitectura Enterprise 360, con varios sistemas conectados entre sí, desde ${clp(PLAN_PRICE_AMOUNTS.enterprise)} + IVA. Todos parten con un levantamiento funcional y se construyen por etapas, para que veas resultados en cada entrega.`,
      },
      {
        question: "¿Incluye usuarios y permisos?",
        answer:
          "Puede incluir login, roles y permisos si el proceso lo requiere. Se define en el alcance técnico.",
      },
      {
        question: "¿Se puede conectar con correo, WhatsApp o PDF?",
        answer:
          "Sí. Podemos integrar notificaciones, generación de documentos y flujos de contacto según factibilidad.",
      },
      {
        question: "¿Cómo se define el alcance de un sistema web?",
        answer:
          "Partimos con levantamiento del proceso, usuarios, datos, reglas, reportes y prioridades para separar una primera versión viable de mejoras futuras.",
      },
    ],
    relatedLinks: [
      { label: "Automatización", href: "/automatizacion", description: "Automatiza tareas repetitivas y notificaciones del negocio." },
      { label: "Cotizador web con PDF", href: "/cotizador-web-pdf", description: "Automatiza solicitudes comerciales y generación de propuestas." },
      { label: "Intranet corporativa", href: "/sistemas-web/intranet-corporativa", description: "Comunicación interna, documentos y solicitudes del personal con permisos por rol." },
      { label: "Gestión documental", href: "/sistemas-web/gestion-documental", description: "Versionado, vencimientos y trazabilidad para documentación crítica." },
      { label: "Control de flota", href: "/sistemas-web/control-flota", description: "Mantenciones, documentación y costo real por vehículo." },
      ...commonRelatedLinks,
    ],
    serviceType: "Sistemas web a medida",
    primaryCta: "Solicitar evaluación técnica",
    finalCtaTitle: "¿Tu empresa necesita un sistema web propio?",
    finalCtaCopy:
      "Revisemos el proceso actual, sus puntos críticos y una primera etapa viable para digitalizar sin improvisar.",
  },
  {
    slug: "automatizacion",
    path: "/automatizacion",
    navLabel: "Automatización",
    metaTitle: "Automatización de Procesos para Empresas | Zyteron",
    metaDescription:
      "Automatiza tareas, formularios y WhatsApp para tu empresa en Chile con flujos medibles, alertas y soporte técnico. Conoce nuestra metodología hoy.",
    primaryKeyword: "automatización de procesos para empresas",
    secondaryKeywords: [
      "automatización de procesos en Chile",
      "automatización para pymes",
      "digitalización de procesos",
      "digitalización de empresas",
      "chatbot para empresas",
      "chatbot de WhatsApp en Chile",
      "formularios automatizados",
      "sistema de cotización online",
      "automatización de tareas administrativas",
    ],
    heroTitle: "Automatización de procesos para empresas que quieren operar con menos fricción",
    heroDescription:
      "Diseñamos la digitalización de procesos con flujos automatizados para reducir tareas administrativas repetitivas, ordenar solicitudes, conectar formularios automatizados, activar notificaciones y mejorar tiempos de respuesta.",
    directAnswer: `Automatizar un proceso en Chile cuesta desde ${clp(SERVICE_PRICE_AMOUNTS.automationWhatsapp)} CLP + IVA en el caso de la automatización por WhatsApp, la más solicitada por pymes y empresas. Zyteron diagnostica el flujo actual, diseña las reglas y deja la automatización probada con escenarios reales, atendiendo desde Santiago a todo Chile.`,
    problemTitle: "Automatizar no es complicar: es eliminar tareas que consumen tiempo",
    problemDescription:
      "Muchas empresas pierden horas en copiar datos, responder lo mismo, revisar solicitudes manualmente o enviar avisos repetitivos. La automatización permite crear procesos más claros y trazables.",
    benefits: [
      "Menos tareas manuales repetitivas.",
      "Mejor respuesta a clientes y solicitudes internas.",
      "Mayor trazabilidad de formularios, estados y responsables.",
      "Conexión entre web, correo, WhatsApp y paneles internos.",
      "Procesos más claros para equipos comerciales y operativos.",
    ],
    includes: [
      "Diagnóstico del flujo actual y puntos de pérdida de tiempo.",
      "Diseño de reglas, estados y mensajes automáticos.",
      "Formularios automatizados, sistema de cotización online, notificaciones y derivaciones según necesidad.",
      "Integración con WhatsApp, chatbot, correo o sistema interno cuando aplica.",
      "Pruebas de escenarios reales antes de publicar.",
      "Documentación básica para el equipo.",
    ],
    audience: [
      "Pymes con consultas frecuentes por WhatsApp o formulario.",
      "Empresas con procesos manuales de cotización o seguimiento.",
      "Equipos comerciales que necesitan pre-calificar solicitudes.",
      "Negocios que quieren conectar web, datos y comunicación.",
    ],
    process: baseProcess,
    faqs: [
      {
        question: "¿Qué procesos se pueden automatizar?",
        answer:
          "Formularios, avisos por correo, respuestas iniciales, derivaciones, generación de documentos, estados de atención y flujos de seguimiento.",
      },
      {
        question: "¿Cuánto cuesta automatizar un proceso en mi empresa?",
        answer: `La automatización por WhatsApp, la más solicitada, cuesta desde ${clp(SERVICE_PRICE_AMOUNTS.automationWhatsapp)} + IVA de implementación, más los costos de consumo del proveedor de mensajería. Otras automatizaciones —formularios, notificaciones, generación de PDF— se cotizan según el flujo; entregamos el valor exacto en una cotización formal después del diagnóstico.`,
      },
      {
        question: "¿Pueden integrar WhatsApp?",
        answer:
          "Sí. Podemos diseñar flujos de WhatsApp o rutas de contacto según el objetivo comercial y técnico.",
      },
      {
        question: "¿Pueden implementar un chatbot de WhatsApp para empresas?",
        answer:
          "Sí. Implementamos chatbot para empresas y flujos de WhatsApp en Chile que responden preguntas frecuentes, derivan solicitudes y ordenan la primera atención antes de pasar a una persona del equipo.",
      },
      {
        question: "¿La automatización ayuda a digitalizar la empresa?",
        answer:
          "Sí. La automatización es parte de la digitalización de empresas y procesos: conecta formularios, datos y comunicación para reemplazar tareas administrativas manuales por flujos ordenados y medibles.",
      },
      {
        question: "¿Reemplaza al equipo humano?",
        answer:
          "No necesariamente. La automatización reduce tareas repetitivas para que el equipo se enfoque en casos de mayor valor.",
      },
      {
        question: "¿Necesito un sistema web para automatizar?",
        answer:
          "No siempre. Algunas automatizaciones pueden partir con formularios y notificaciones; otras requieren panel o sistema interno.",
      },
      {
        question: "¿Cómo se mide si una automatización funcionó?",
        answer:
          "Definimos indicadores simples como tiempo ahorrado, solicitudes ordenadas, errores evitados, respuestas entregadas o casos derivados correctamente.",
      },
    ],
    relatedLinks: [
      { label: "Sistemas web", href: "/sistemas-web", description: "Crea paneles y módulos para operar procesos internos." },
      { label: "Automatización WhatsApp", href: "/automatizacion-whatsapp-empresas", description: "Flujos de atención y pre-calificación para WhatsApp." },
      { label: "Landing pages para campañas", href: "/servicios/landing-pages-para-empresas", description: "Páginas de campaña que alimentan tus flujos automatizados con leads." },
      { label: "Soporte TI", href: "/soporte-ti", description: "Acompañamiento técnico para continuidad operativa." },
      ...commonRelatedLinks,
    ],
    serviceType: "Automatización de procesos",
    primaryCta: "Cotizar automatización",
    finalCtaTitle: "¿Qué tarea repetitiva quieres dejar de hacer manualmente?",
    finalCtaCopy:
      "Cuéntanos el flujo actual y revisamos una automatización práctica, medible y proporcional a tu operación.",
  },
  {
    slug: "soporte-ti",
    path: "/soporte-ti",
    navLabel: "Soporte TI",
    metaTitle: "Soporte TI para Empresas y Pymes en Chile | Zyteron",
    metaDescription:
      "Soporte TI para pymes y empresas en Chile: correos, equipos, mantención, seguridad básica y continuidad operativa. Atención remota y en Santiago. Cotiza atención técnica clara.",
    primaryKeyword: "soporte TI para pymes",
    secondaryKeywords: [
      "soporte TI en Chile",
      "soporte informático para empresas",
      "soporte técnico para empresas",
      "soporte técnico remoto",
      "servicio técnico computacional para empresas",
      "mantención computacional para empresas",
      "correo corporativo para empresas",
      "hosting en Chile",
      "mantención TI para pymes",
    ],
    heroTitle: "Soporte TI para pymes y empresas que necesitan continuidad operativa",
    heroDescription:
      "Damos soporte TI y soporte informático en Chile: asistencia técnica, soporte técnico remoto, configuración, mantención computacional, correo corporativo, hosting y orientación tecnológica para mantener tu operación diaria estable.",
    directAnswer: `El soporte TI para pymes en Chile cuesta desde ${clp(SERVICE_PRICE_AMOUNTS.supportTi)} CLP + IVA por requerimiento, y la mantención web mensual desde ${clp(MAINTENANCE_PRICE_AMOUNTS.basic)} + IVA. Zyteron atiende de forma remota a empresas de todo Chile y coordina soporte presencial en Santiago cuando el requerimiento lo necesita.`,
    problemTitle: "Un problema técnico pequeño puede frenar ventas, atención y productividad",
    problemDescription:
      "El soporte TI debe resolver incidentes, pero también prevenir problemas repetidos. Trabajamos con diagnóstico, prioridad y recomendaciones concretas para empresas que no siempre tienen equipo técnico interno.",
    benefits: [
      "Mayor continuidad para herramientas, equipos y operación diaria.",
      "Respuesta ordenada ante incidentes y requerimientos técnicos.",
      "Apoyo en configuración de correos, cuentas, equipos y sistemas.",
      "Recomendaciones para evitar compras o soluciones innecesarias.",
      "Posibilidad de conectar soporte con mejoras web o sistemas internos.",
    ],
    includes: [
      "Evaluación inicial del requerimiento o situación técnica.",
      "Soporte técnico remoto y coordinación según tipo de necesidad.",
      "Configuración de correo corporativo, hosting, dominios y herramientas.",
      "Mantención computacional y servicio técnico computacional para empresas.",
      "Orientación para continuidad, respaldo o seguridad operativa.",
      "Registro de acciones y recomendaciones de mejora.",
      "Opciones de soporte recurrente según carga y prioridad.",
    ],
    audience: [
      "Pymes sin equipo TI interno.",
      "Empresas que necesitan soporte preventivo y correctivo.",
      "Negocios con herramientas digitales críticas para vender o atender.",
      "Equipos que requieren orientación antes de implementar tecnología.",
    ],
    process: baseProcess,
    faqs: [
      {
        question: "¿Qué planes de mantención ofrecen después de entregar un proyecto?",
        answer: `Ofrecemos mantención web básica desde ${clp(MAINTENANCE_PRICE_AMOUNTS.basic)} + IVA al mes, profesional desde ${clp(MAINTENANCE_PRICE_AMOUNTS.professional)}, para ecommerce desde ${clp(MAINTENANCE_PRICE_AMOUNTS.ecommerce)} y para sistemas o IA desde ${clp(MAINTENANCE_PRICE_AMOUNTS.system)} + IVA al mes. Cada plan combina actualizaciones, monitoreo y horas de mejora según la criticidad de tu operación.`,
      },
      {
        question: "¿El soporte TI es solo para páginas web?",
        answer:
          "No. También apoyamos configuración, correos, herramientas, equipos, sistemas y continuidad operativa.",
      },
      {
        question: "¿Ofrecen correo corporativo, hosting y soporte informático?",
        answer:
          "Sí. Configuramos correo corporativo para empresas, gestionamos hosting en Chile y entregamos soporte informático y servicio técnico computacional, ya sea de forma remota o coordinada según el requerimiento.",
      },
      {
        question: "¿Atienden fuera de Santiago?",
        answer:
          "Sí. Podemos atender muchos requerimientos de forma remota para empresas y pymes de distintas regiones de Chile.",
      },
      {
        question: "¿Cuánto cuesta el soporte TI para una pyme?",
        answer: `El soporte TI parte desde ${clp(SERVICE_PRICE_AMOUNTS.supportTi)} + IVA por requerimiento puntual. Para necesidades recurrentes conviene un esquema mensual, que se cotiza según volumen de requerimientos y criticidad de la operación, con valores de referencia desde ${clp(MAINTENANCE_PRICE_AMOUNTS.basic)} + IVA al mes.`,
      },
      {
        question: "¿El soporte incluye recomendaciones preventivas?",
        answer:
          "Sí. Además de resolver incidentes, entregamos recomendaciones para disminuir recurrencias, mejorar continuidad y priorizar próximas acciones técnicas.",
      },
    ],
    relatedLinks: [
      { label: "Soporte TI Santiago", href: "/soporte-ti-pymes-santiago", description: "Landing local para soporte técnico de pymes en Santiago." },
      { label: "Mantención web en Chile", href: "/servicios/mantencion-web-chile", description: "Planes mensuales de actualizaciones, monitoreo y mejoras para tu sitio." },
      { label: "Desarrollo web", href: "/desarrollo-web", description: "Mejora tu presencia digital y base técnica web." },
      { label: "Automatización", href: "/automatizacion", description: "Reduce tareas manuales con flujos digitales." },
      ...commonRelatedLinks,
    ],
    serviceType: "Soporte TI",
    primaryCta: "Solicitar soporte TI",
    finalCtaTitle: "¿Tu empresa necesita apoyo técnico confiable?",
    finalCtaCopy:
      "Descríbenos el problema o necesidad y te orientamos con una ruta de soporte clara, priorizada y ejecutable.",
  },
];

export function getSeoServicePageBySlug(slug: string) {
  return seoServicePages.find((page) => page.slug === slug);
}
