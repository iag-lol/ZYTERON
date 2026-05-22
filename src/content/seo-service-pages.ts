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
    label: "Nosotros",
    href: "/nosotros",
    description: "Conoce el enfoque, trayectoria y metodología de Zyteron.",
  },
  {
    label: "Casos anónimos",
    href: "/casos-exito",
    description: "Revisa problemas reales resueltos con sistemas, automatización, ecommerce y SEO.",
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
    metaTitle: "Desarrollo Web para Empresas | ZYTERON · Santiago, Chile",
    metaDescription:
      "Desarrolla una web profesional para captar clientes en Chile, con SEO base, diseño responsive y rutas de contacto claras. Cotiza sin compromiso hoy.",
    primaryKeyword: "desarrollo web en Chile",
    secondaryKeywords: [
      "páginas web profesionales",
      "diseño web para empresas",
      "agencia de desarrollo web en Santiago",
      "sitios web responsive",
    ],
    heroTitle: "Desarrollo web en Chile para empresas que necesitan una presencia digital profesional",
    heroDescription:
      "Creamos sitios web modernos, rápidos y claros para empresas, pymes y emprendedores que necesitan mostrar sus servicios con confianza, captar consultas y crecer con una base técnica escalable.",
    problemTitle: "Una web profesional debe vender confianza, no solo verse bien",
    problemDescription:
      "Muchas empresas tienen sitios lentos, desordenados o genéricos que no explican bien sus servicios. En Zyteron trabajamos estructura, copy, diseño responsive, SEO base y rutas de conversión para que la web ayude al negocio desde el primer contacto.",
    benefits: [
      "Mejora la credibilidad de tu empresa frente a clientes nuevos.",
      "Ordena servicios, propuesta de valor y llamados a la acción.",
      "Deja una base técnica preparada para indexación y crecimiento SEO.",
      "Facilita contacto por formulario, correo y WhatsApp.",
      "Permite escalar con blog, páginas internas, sistemas o automatizaciones.",
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
      "Emprendedores que necesitan una imagen profesional para vender servicios.",
      "Negocios B2B que requieren explicar una oferta compleja de forma simple.",
    ],
    process: baseProcess,
    faqs: [
      {
        question: "¿Cuánto cuesta una página web profesional?",
        answer:
          "Depende del alcance, cantidad de páginas, contenido, integraciones y nivel de personalización. Trabajamos con valores referenciales y cotización formal antes de iniciar.",
      },
      {
        question: "¿La web queda adaptada a celular?",
        answer:
          "Sí. Todos los desarrollos se trabajan responsive para celular, tablet y escritorio.",
      },
      {
        question: "¿Incluyen SEO?",
        answer:
          "Incluimos una base SEO técnica y on-page: metadata, estructura de encabezados, sitemap, robots, schema cuando corresponde y contenido organizado por intención.",
      },
      {
        question: "¿Puedo administrar mi sitio web?",
        answer:
          "Sí, cuando el proyecto lo requiere podemos implementar panel administrativo o estructura editable según alcance.",
      },
      {
        question: "¿Qué información necesito entregar para comenzar?",
        answer:
          "Objetivos comerciales, servicios principales, referencias visuales, datos de contacto, identidad de marca y cualquier contenido disponible para estructurar una primera propuesta.",
      },
    ],
    relatedLinks: [
      { label: "Páginas web para pymes", href: "/paginas-web-para-pymes", description: "Soluciones web para pymes chilenas con foco en contacto y presencia profesional." },
      { label: "Diseño web para empresas", href: "/diseno-web-empresas", description: "Sitios corporativos con UX, confianza y enfoque comercial." },
      { label: "SEO para empresas", href: "/servicios/seo-para-empresas-chile", description: "Mejoras técnicas y contenido para crecer en tráfico orgánico." },
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
    metaTitle: "Páginas Web para Pymes en Chile | Sitios Profesionales y Escalables",
    metaDescription:
      "Diseñamos páginas web para pymes chilenas que necesitan presencia digital, contacto directo, servicios claros y una imagen profesional.",
    primaryKeyword: "páginas web para pymes",
    secondaryKeywords: ["web para pymes Chile", "sitios para negocios", "páginas web profesionales Chile"],
    heroTitle: "Páginas web para pymes en Chile con foco en confianza, contacto y crecimiento",
    heroDescription:
      "Ayudamos a pymes chilenas a tener una web clara, profesional y fácil de usar, preparada para explicar servicios, mostrar productos, recibir consultas y proyectar una imagen más seria.",
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
        question: "¿Trabajan con pymes y emprendedores?",
        answer:
          "Sí. Adaptamos alcance, contenidos y presupuesto según la etapa real del negocio.",
      },
      {
        question: "¿Cuánto demora desarrollar una web para pyme?",
        answer:
          "Una web simple puede tomar 1 a 3 semanas. Un sitio más completo puede requerir 3 a 6 semanas según contenido y revisiones.",
      },
      {
        question: "¿Pueden integrar WhatsApp o formularios?",
        answer:
          "Sí. Dejamos rutas de contacto visibles para facilitar consultas y cotizaciones.",
      },
      {
        question: "¿Trabajan con empresas fuera de Santiago?",
        answer:
          "Sí. Atendemos pymes de Santiago, Región Metropolitana y otras regiones de Chile en modalidad remota.",
      },
    ],
    relatedLinks: [
      { label: "Desarrollo web", href: "/desarrollo-web", description: "Sitios web profesionales para empresas y negocios en Chile." },
      { label: "Tiendas online", href: "/tiendas-online", description: "Ecommerce y catálogos digitales para vender productos online." },
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
    slug: "diseno-web-empresas",
    path: "/diseno-web-empresas",
    navLabel: "Diseño web para empresas",
    metaTitle: "Diseño Web para Empresas | Sitios Corporativos Profesionales | Zyteron",
    metaDescription:
      "Diseño web corporativo para empresas que buscan mejorar su presencia digital, captar clientes y mostrar sus servicios con confianza.",
    primaryKeyword: "diseño web para empresas",
    secondaryKeywords: ["sitios corporativos", "UX para empresas", "diseño web corporativo Chile"],
    heroTitle: "Diseño web para empresas que necesitan comunicar confianza desde el primer clic",
    heroDescription:
      "Diseñamos sitios corporativos con estructura visual limpia, mensajes claros y experiencia de usuario orientada a que un visitante entienda tu valor y avance hacia contacto.",
    problemTitle: "El diseño corporativo debe ordenar la decisión del cliente",
    problemDescription:
      "Una empresa puede tener buenos servicios y aun así perder oportunidades si su web se ve antigua, confusa o poco confiable. Trabajamos jerarquía, contenido, navegación, CTA y señales de confianza para mejorar la experiencia completa.",
    benefits: [
      "Imagen profesional alineada a servicios B2B y clientes exigentes.",
      "Mejor lectura en móvil y escritorio.",
      "Estructura visual preparada para servicios, equipo, casos y FAQ.",
      "Copy comercial para explicar valor sin textos genéricos.",
      "Mayor consistencia entre marca, propuesta y conversión.",
    ],
    includes: [
      "Arquitectura visual para home y páginas internas.",
      "Componentes de confianza: proceso, beneficios, FAQ, CTAs y contacto.",
      "Diseño responsive con buena legibilidad y contraste.",
      "Revisión de jerarquía H1, H2 y H3.",
      "Optimización de navegación y enlaces internos.",
      "Base preparada para medición y mejoras futuras.",
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
      { label: "Desarrollo web", href: "/desarrollo-web", description: "Implementación técnica de sitios rápidos, indexables y escalables." },
      { label: "Sistemas web", href: "/sistemas-web", description: "Plataformas internas para procesos administrativos y operación." },
      { label: "Agencia diseño web Chile", href: "/servicios/agencia-diseno-web-chile", description: "Página ampliada sobre estrategia web para empresas." },
      ...commonRelatedLinks,
    ],
    serviceType: "Diseño web corporativo",
    primaryCta: "Solicitar diseño web corporativo",
    finalCtaTitle: "¿Tu sitio actual ya no representa a tu empresa?",
    finalCtaCopy:
      "Revisamos tu situación y proponemos una estructura visual y comercial más clara, moderna y confiable.",
  },
  {
    slug: "tiendas-online",
    path: "/tiendas-online",
    navLabel: "Tiendas online",
    metaTitle: "Tiendas Online para Pymes | ZYTERON · Chile",
    metaDescription:
      "Crea una tienda online profesional para vender en Chile con catálogo, pagos, WhatsApp y base SEO lista para crecer. Cotiza sin compromiso para pymes.",
    primaryKeyword: "tiendas online para pymes",
    secondaryKeywords: ["ecommerce Chile", "tienda online administrable", "catálogo digital para empresas"],
    heroTitle: "Tiendas online para pymes y empresas que quieren vender con orden",
    heroDescription:
      "Desarrollamos tiendas online, catálogos digitales y flujos de compra o cotización para negocios que necesitan mostrar productos, recibir pedidos y vender con una experiencia profesional.",
    problemTitle: "Vender online requiere más que subir productos",
    problemDescription:
      "Una tienda efectiva necesita categorías claras, fichas útiles, confianza, contacto, rendimiento móvil y un flujo de compra coherente con la operación real del negocio.",
    benefits: [
      "Catálogo ordenado para facilitar la decisión de compra.",
      "Experiencia responsive para usuarios que compran desde celular.",
      "Opciones de compra, cotización o contacto por WhatsApp según modelo comercial.",
      "Base SEO para productos, categorías y búsquedas comerciales.",
      "Escalabilidad hacia pagos online, stock o panel administrativo.",
    ],
    includes: [
      "Estructura de categorías y fichas de producto.",
      "Diseño visual adaptado a marca, rubro y tipo de catálogo.",
      "Carrito o flujo de pedido según alcance.",
      "Integración con WhatsApp y formulario de consulta.",
      "Preparación para pasarela de pago cuando corresponde.",
      "Capacitación básica para operación inicial.",
    ],
    audience: [
      "Pymes que venden productos físicos o servicios paquetizados.",
      "Marcas que venden por redes y necesitan canal propio.",
      "Empresas que requieren catálogo ordenado para clientes y vendedores.",
      "Negocios que quieren iniciar ecommerce por etapas.",
    ],
    process: baseProcess,
    faqs: [
      {
        question: "¿Crean tiendas online?",
        answer:
          "Sí. Desarrollamos tiendas online, catálogos y flujos de compra o cotización según modelo de negocio.",
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
        question: "¿Pueden integrar pagos online?",
        answer:
          "Sí, evaluamos integración con pasarelas según proveedor, requisitos técnicos y alcance del proyecto.",
      },
      {
        question: "¿La tienda puede partir como catálogo sin pago online?",
        answer:
          "Sí. Muchas pymes parten con catálogo y venta asistida por WhatsApp, y luego incorporan carrito, pagos o stock según avance comercial.",
      },
    ],
    relatedLinks: [
      { label: "Páginas web para pymes", href: "/paginas-web-para-pymes", description: "Presencia digital profesional antes de escalar a ecommerce." },
      { label: "Sistemas web", href: "/sistemas-web", description: "Paneles y módulos internos para stock, pedidos o reportes." },
      { label: "Tienda online Chile", href: "/tiendas-online-chile", description: "Landing local ampliada para tiendas online en Chile." },
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
    metaTitle: "Sistemas Web a Medida | ZYTERON · Chile",
    metaDescription:
      "Ordena procesos con sistemas web a medida para pymes y empresas en Chile: paneles, reportes, permisos y automatización. Conoce nuestra metodología.",
    primaryKeyword: "sistemas web a medida",
    secondaryKeywords: ["software a medida", "panel administrativo", "plataformas administrativas para empresas"],
    heroTitle: "Sistemas web a medida para empresas que necesitan ordenar su operación",
    heroDescription:
      "Creamos plataformas administrativas, paneles de gestión y sistemas internos para controlar datos, usuarios, documentos, clientes, reportes y flujos críticos del negocio.",
    problemTitle: "Cuando la operación crece, las planillas dejan de ser suficientes",
    problemDescription:
      "Los sistemas web permiten centralizar información, reducir errores, controlar estados y entregar trazabilidad. Desarrollamos soluciones por etapas para resolver primero el proceso de mayor impacto.",
    benefits: [
      "Control centralizado de información y procesos internos.",
      "Menos tareas manuales y menor riesgo de errores repetitivos.",
      "Paneles con roles, estados, registros y reportes.",
      "Generación de PDF, notificaciones o integraciones cuando aplica.",
      "Escalabilidad por módulos según presupuesto y prioridad.",
    ],
    includes: [
      "Levantamiento funcional del proceso actual.",
      "Diseño de módulos, permisos y flujos principales.",
      "Panel administrativo responsive.",
      "Formularios, registros, estados y filtros según alcance.",
      "Reportes, documentos o exportaciones si corresponde.",
      "Pruebas, capacitación y soporte inicial.",
    ],
    audience: [
      "Empresas que gestionan clientes, pedidos, cotizaciones o proyectos.",
      "Pymes que trabajan con planillas dispersas y tareas repetitivas.",
      "Equipos que necesitan trazabilidad y reportes internos.",
      "Negocios que requieren software propio en vez de herramientas genéricas.",
    ],
    process: baseProcess,
    faqs: [
      {
        question: "¿Desarrollan sistemas internos para empresas?",
        answer:
          "Sí. Diseñamos sistemas web personalizados para procesos administrativos, comerciales y operativos.",
      },
      {
        question: "¿Puedo partir con un módulo pequeño?",
        answer:
          "Sí. Recomendamos iniciar por el módulo más crítico y luego escalar por etapas.",
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
      { label: "Sistemas web a medida Chile", href: "/sistemas-web-a-medida", description: "Página ampliada sobre desarrollo de sistemas personalizados." },
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
    metaTitle: "Automatización de Procesos | ZYTERON · Chile",
    metaDescription:
      "Automatiza tareas, formularios y WhatsApp para tu empresa en Chile con flujos medibles, alertas y soporte técnico. Conoce nuestra metodología hoy.",
    primaryKeyword: "automatización de procesos para empresas",
    secondaryKeywords: ["automatización para pymes", "flujos digitales", "automatización WhatsApp empresas"],
    heroTitle: "Automatización de procesos para empresas que quieren operar con menos fricción",
    heroDescription:
      "Diseñamos flujos digitales para reducir tareas repetitivas, ordenar solicitudes, conectar formularios, activar notificaciones y mejorar tiempos de respuesta.",
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
      "Formularios, notificaciones y derivaciones según necesidad.",
      "Integración con WhatsApp, correo o sistema interno cuando aplica.",
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
        question: "¿Pueden integrar WhatsApp?",
        answer:
          "Sí. Podemos diseñar flujos de WhatsApp o rutas de contacto según el objetivo comercial y técnico.",
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
    metaTitle: "Soporte TI para Pymes | ZYTERON · Santiago, Chile",
    metaDescription:
      "Soporte TI para pymes y empresas en Santiago: correos, equipos, mantención, seguridad básica y continuidad operativa. Cotiza atención técnica clara.",
    primaryKeyword: "soporte TI para pymes",
    secondaryKeywords: ["soporte TI empresas Chile", "asistencia tecnológica", "mantención TI para pymes"],
    heroTitle: "Soporte TI para pymes y empresas que necesitan continuidad operativa",
    heroDescription:
      "Apoyamos a negocios que requieren asistencia técnica, configuración, mantención, orientación tecnológica y soporte para mantener su operación diaria estable.",
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
      "Soporte remoto y coordinación según tipo de necesidad.",
      "Configuración de herramientas, correos o entornos básicos.",
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
        question: "¿Realizan mantención después de entregar un proyecto?",
        answer:
          "Sí. Podemos definir soporte post-entrega o planes recurrentes de mantención y mejoras.",
      },
      {
        question: "¿El soporte TI es solo para páginas web?",
        answer:
          "No. También apoyamos configuración, correos, herramientas, equipos, sistemas y continuidad operativa.",
      },
      {
        question: "¿Atienden fuera de Santiago?",
        answer:
          "Sí. Podemos atender muchos requerimientos de forma remota para empresas y pymes de distintas regiones de Chile.",
      },
      {
        question: "¿Puedo contratar soporte mensual?",
        answer:
          "Sí. Se puede evaluar un esquema recurrente según volumen de requerimientos y criticidad de la operación.",
      },
      {
        question: "¿El soporte incluye recomendaciones preventivas?",
        answer:
          "Sí. Además de resolver incidentes, entregamos recomendaciones para disminuir recurrencias, mejorar continuidad y priorizar próximas acciones técnicas.",
      },
    ],
    relatedLinks: [
      { label: "Soporte TI Santiago", href: "/soporte-ti-pymes-santiago", description: "Landing local para soporte técnico de pymes en Santiago." },
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
