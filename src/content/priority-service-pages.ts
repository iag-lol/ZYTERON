import {
  PLAN_PRICE_AMOUNTS,
  ADDON_PRICE_AMOUNTS,
  MAINTENANCE_PRICE_AMOUNTS,
  SERVICE_PRICE_AMOUNTS,
} from "@/config/pricing";

/** Formatea un monto CLP con separador de miles chileno: 79990 → "$79.990". */
const clp = (amount: number) => `$${amount.toLocaleString("es-CL")}`;

export type PriorityServiceFaq = {
  question: string;
  answer: string;
};

export type PriorityServicePage = {
  slug: string;
  path: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroDescription: string;
  /**
   * Respuesta directa a la intención de búsqueda (TL;DR). Se renderiza bajo el
   * H1: 2-3 frases con precio "Desde" real interpolado desde pricing.ts y plazo típico.
   */
  directAnswer?: string;
  context: string[];
  benefits: string[];
  includes: string[];
  audience: string[];
  process: string[];
  faqs: PriorityServiceFaq[];
  /** Enlaces cruzados descriptivos hacia money pages, planes, cotizador y casos. */
  relatedLinks?: { label: string; href: string }[];
  serviceType: string;
  primaryCta: string;
  finalCtaTitle: string;
  finalCtaCopy: string;
};

export const priorityServicePages: PriorityServicePage[] = [
  {
    slug: "paginas-web-santiago",
    path: "/paginas-web-santiago",
    title: "Páginas web en Santiago para empresas y pymes",
    metaTitle: "Páginas Web en Santiago para Empresas | Zyteron",
    metaDescription:
      "Creación de páginas web en Santiago para empresas y pymes: diseño profesional, SEO local y foco en cotizaciones. Oficina en Providencia, atención en toda la Región Metropolitana.",
    heroTitle: "Páginas web en Santiago que generan oportunidades comerciales",
    heroDescription:
      "Diseñamos y creamos páginas web para empresas y pymes de Santiago y la Región Metropolitana. Trabajamos desde Providencia, con reuniones presenciales cuando el proyecto lo requiere, y atendemos clientes en todo Chile en modalidad remota.",
    directAnswer: `Una página web en Santiago cuesta entre ${clp(PLAN_PRICE_AMOUNTS["web-basica"])} y ${clp(PLAN_PRICE_AMOUNTS.empresa)} CLP + IVA según alcance, y está lista en 1 a 6 semanas. Zyteron la diseña y desarrolla desde su oficina en Antonio Bellet 193, Providencia, con reuniones presenciales en Santiago y atención remota para toda la Región Metropolitana y Chile.`,
    context: [
      "Si tu empresa está en Santiago, tus clientes te buscan en Google antes de llamarte. Una página web bien construida responde esas búsquedas: explica qué haces, muestra trabajos reales y deja claro cómo cotizar. Eso es lo que construimos: sitios que funcionan como un canal comercial, no como un folleto.",
      "Atendemos empresas de Providencia, Las Condes, Ñuñoa, Santiago Centro, Maipú, Huechuraba, Quilicura y el resto de la Región Metropolitana. Nuestra oficina está en Antonio Bellet 193, Providencia, y coordinamos reuniones presenciales para levantamiento de requerimientos cuando el proyecto lo amerita.",
      "Cada página web se cotiza por alcance definido: cantidad de secciones, contenido, integraciones y soporte posterior. Publicamos precios referenciales en nuestros planes para que compares con información real antes de conversar con nosotros.",
    ],
    benefits: [
      "Presencia profesional que genera confianza en clientes de Santiago y RM.",
      "Estructura SEO pensada para búsquedas locales de tu rubro.",
      "Carga rápida en celular, donde ocurre la mayoría de las visitas.",
      "Formulario, WhatsApp y teléfono visibles para captar cotizaciones.",
      "Autoadministración o mantención mensual según tu equipo y tiempo.",
    ],
    includes: [
      "Reunión de levantamiento (presencial en Providencia o por videollamada).",
      "Definición de estructura, textos y jerarquía de contenidos.",
      "Diseño responsive adaptado a celular, tablet y escritorio.",
      "SEO técnico: metadata, canonical, datos estructurados y sitemap.",
      "Integración de formularios de contacto y botón de WhatsApp.",
      "Publicación con dominio, hosting y correos según alcance.",
    ],
    audience: [
      "Empresas de servicios de Santiago que necesitan más cotizaciones.",
      "Pymes de la Región Metropolitana que quieren profesionalizar su imagen.",
      "Negocios establecidos cuya web actual no aparece en Google.",
      "Emprendedores de Santiago que parten y necesitan una base seria.",
    ],
    process: [
      "Conversación inicial para entender tu negocio y objetivo comercial.",
      "Propuesta formal con alcance, plazos y precio cerrado.",
      "Diseño y construcción del sitio con revisiones tuyas en el camino.",
      "Optimización SEO y pruebas en celular y escritorio.",
      "Publicación, capacitación de uso y soporte inicial.",
    ],
    faqs: [
      {
        question: "¿Puedo reunirme con ustedes en persona en Santiago?",
        answer:
          "Sí. Nuestra oficina está en Antonio Bellet 193, Providencia. Coordinamos reuniones presenciales para levantamiento de proyectos y también trabajamos por videollamada con clientes de toda la Región Metropolitana y de otras regiones de Chile.",
      },
      {
        question: "¿Cuánto cuesta una página web en Santiago?",
        answer: `Una página web en Santiago cuesta entre ${clp(PLAN_PRICE_AMOUNTS["web-basica"])} y ${clp(PLAN_PRICE_AMOUNTS.empresa)} + IVA: una web básica parte en ${clp(PLAN_PRICE_AMOUNTS["web-basica"])}, un sitio pyme con varias secciones en ${clp(PLAN_PRICE_AMOUNTS.pyme)} y un sitio corporativo en ${clp(PLAN_PRICE_AMOUNTS.empresa)} + IVA. Si necesitas tienda online, el rango va de ${clp(PLAN_PRICE_AMOUNTS.catalogo)} a ${clp(PLAN_PRICE_AMOUNTS.ecommerce)} + IVA. Entregamos cotización formal sin costo después de una conversación inicial.`,
      },
      {
        question: "¿Atienden empresas fuera de Santiago?",
        answer:
          "Sí. Santiago y la Región Metropolitana concentran la mayoría de nuestros clientes, pero desarrollamos páginas web para empresas de todo Chile en modalidad remota, con el mismo proceso y seguimiento.",
      },
      {
        question: "¿Incluyen posicionamiento en Google?",
        answer:
          "Toda página que entregamos incluye base SEO técnica: estructura, metadata, datos estructurados y sitemap. Si necesitas posicionamiento continuo por keywords competitivas, ofrecemos SEO como servicio mensual aparte.",
      },
    ],
    relatedLinks: [
      { label: "Desarrollo web en Santiago", href: "/desarrollo-web-santiago" },
      { label: "Páginas web para pymes", href: "/paginas-web-para-pymes" },
      { label: "Páginas web para empresas", href: "/paginas-web-para-empresas" },
      { label: "Planes y precios de páginas web", href: "/planes" },
      { label: "Cotiza tu página web", href: "/cotizador" },
      { label: "Casos de éxito", href: "/casos-exito" },
    ],
    serviceType: "creación de páginas web santiago",
    primaryCta: "Cotizar mi página web",
    finalCtaTitle: "¿Tu empresa en Santiago necesita una página web que venda?",
    finalCtaCopy:
      "Cuéntanos qué hace tu negocio y te proponemos una estructura de sitio con alcance, plazos y precio claros. Sin compromiso y con respuesta rápida.",
  },
  {
    slug: "desarrollo-web-santiago",
    path: "/desarrollo-web-santiago",
    title: "Desarrollo web a medida en Santiago para empresas",
    metaTitle: "Desarrollo Web a Medida en Santiago | Zyteron",
    metaDescription:
      "Desarrollo web a medida en Santiago: integraciones con API, CRM o ERP, migraciones y optimización de rendimiento para plataformas empresariales.",
    heroTitle: "Desarrollo web a medida en Santiago para integrar, migrar y escalar",
    heroDescription:
      "Desarrollamos soluciones web para empresas que necesitan más que un sitio de presentación: funcionalidades propias, integraciones con sistemas existentes, migraciones cuidadas y mejoras de rendimiento medibles. Trabajamos desde Providencia para organizaciones de Santiago y proyectos remotos en todo Chile.",
    directAnswer: `Un desarrollo web empresarial a medida en Santiago parte en ${clp(PLAN_PRICE_AMOUNTS.empresa)} CLP + IVA; una integración API personalizada parte en ${clp(ADDON_PRICE_AMOUNTS.customApi)} + IVA y una plataforma con usuarios, base de datos o panel parte en ${clp(PLAN_PRICE_AMOUNTS.sistema)} + IVA. El alcance y el plazo se confirman después de revisar la arquitectura actual, las integraciones y la migración requerida.`,
    context: [
      "Esta página está orientada a proyectos con requerimientos técnicos propios. Si necesitas una web corporativa estándar para presentar servicios y captar consultas, revisa nuestro servicio de páginas web en Santiago. Si necesitas conectar un CRM o ERP, consumir una API, crear lógica de negocio o evolucionar una plataforma existente, este es el servicio adecuado.",
      "Antes de intervenir un sitio activo levantamos sus URLs, contenidos, analítica, formularios y dependencias. Con ese inventario definimos qué se conserva, qué se reconstruye y qué redirecciones o pruebas son necesarias para migrar sin romper rutas, medición ni procesos comerciales.",
      "También abordamos rendimiento con datos: revisamos carga, recursos, componentes y experiencia móvil antes de priorizar cambios. Nuestra oficina está en Antonio Bellet 193, Providencia, donde coordinamos sesiones técnicas presenciales para empresas de Santiago cuando el proyecto lo requiere.",
    ],
    benefits: [
      "Arquitectura definida según funcionalidades, datos y crecimiento previsto.",
      "Integraciones trazables con APIs, CRM, ERP, pagos o herramientas internas.",
      "Migración planificada de URLs, contenidos y medición existente.",
      "Mejoras de rendimiento priorizadas con diagnóstico y pruebas comparables.",
      "Código modular para evolucionar la solución por etapas.",
    ],
    includes: [
      "Levantamiento funcional y auditoría de la solución actual.",
      "Diseño de arquitectura, datos, permisos e integraciones necesarias.",
      "Desarrollo de componentes y flujos adaptados al proceso de la empresa.",
      "Integración y pruebas con servicios externos según su documentación.",
      "Plan de migración, redirecciones y validación de analítica cuando aplica.",
      "Pruebas funcionales, responsive y de rendimiento antes de publicar.",
    ],
    audience: [
      "Empresas de Santiago con una plataforma heredada que necesitan modernizar.",
      "Equipos que deben conectar su web con CRM, ERP, pagos o APIs externas.",
      "Organizaciones que migran desde WordPress u otra tecnología sin perder rutas útiles.",
      "Negocios que necesitan funciones propias, paneles o lógica que una plantilla no resuelve.",
    ],
    process: [
      "Inventario del sistema actual, objetivos, usuarios, datos y dependencias.",
      "Definición de arquitectura, etapas, riesgos y criterios de aceptación.",
      "Desarrollo iterativo de funcionalidades e integraciones priorizadas.",
      "Migración controlada y pruebas con escenarios reales del equipo.",
      "Validación de rendimiento, medición, publicación y estabilización inicial.",
    ],
    faqs: [
      {
        question: "¿Cuánto cuesta un desarrollo web a medida en Santiago?",
        answer: `Una implementación web empresarial parte en ${clp(PLAN_PRICE_AMOUNTS.empresa)} + IVA, una integración API personalizada desde ${clp(ADDON_PRICE_AMOUNTS.customApi)} + IVA y un sistema con usuarios, base de datos y panel desde ${clp(PLAN_PRICE_AMOUNTS.sistema)} + IVA. El valor final depende de funciones, datos, proveedores externos y migración; se confirma en una propuesta técnica por etapas.`,
      },
      {
        question: "¿En qué se diferencia de una página web en Santiago?",
        answer:
          "Una página web estándar se concentra en presentar la empresa, sus servicios y canales de contacto. El desarrollo a medida agrega requerimientos técnicos propios, como lógica de negocio, integraciones, migración de una plataforma activa, paneles o mejoras profundas de arquitectura y rendimiento.",
      },
      {
        question: "¿Pueden migrar mi sitio actual sin perder sus URLs?",
        answer:
          "Sí. Antes de migrar levantamos las URLs y contenidos existentes, identificamos qué debe conservarse y definimos redirecciones para las rutas que cambian. También revisamos formularios, analítica y elementos SEO; la estrategia concreta depende del acceso y del estado de la plataforma actual.",
      },
      {
        question: "¿Integran la web con CRM, ERP, pagos u otras APIs?",
        answer:
          "Sí, cuando el proveedor dispone de API, webhooks o un mecanismo de intercambio compatible. Primero revisamos su documentación, autenticación, límites y ambiente de pruebas; con esa información confirmamos factibilidad, alcance y costo.",
      },
      {
        question: "¿Cómo trabajan la optimización de rendimiento?",
        answer:
          "Medimos el comportamiento actual, identificamos recursos y componentes costosos y priorizamos cambios según impacto. Después comparamos resultados en condiciones equivalentes; no prometemos una puntuación universal porque depende también del contenido, servicios externos y dispositivo.",
      },
      {
        question: "¿Puedo reunirme con ustedes en Providencia?",
        answer:
          "Sí. Coordinamos reuniones técnicas en nuestra oficina de Antonio Bellet 193, Providencia, y también realizamos todo el levantamiento por videollamada para equipos de Santiago y otras regiones de Chile.",
      },
    ],
    relatedLinks: [
      { label: "Páginas web estándar en Santiago", href: "/paginas-web-santiago" },
      { label: "Sistemas web a medida", href: "/sistemas-web" },
      { label: "Mantención y evolución web", href: "/servicios/mantencion-web-chile" },
      { label: "SEO técnico para empresas", href: "/servicios/seo-para-empresas-chile" },
      { label: "WordPress vs. desarrollo a medida", href: "/recursos/wordpress-vs-web-a-medida-chile" },
      { label: "Cotiza tu desarrollo a medida", href: "/cotizador" },
      { label: "Casos de éxito", href: "/casos-exito" },
    ],
    serviceType: "desarrollo web a medida e integraciones en Santiago",
    primaryCta: "Solicitar evaluación técnica",
    finalCtaTitle: "¿Tu empresa necesita integrar, migrar o escalar su plataforma web?",
    finalCtaCopy:
      "Revisamos la solución actual, sus dependencias y el resultado que necesitas para proponer etapas, riesgos, plazo y presupuesto con claridad.",
  },
  {
    slug: "automatizacion-whatsapp-empresas",
    path: "/automatizacion-whatsapp-empresas",
    title: "Automatización de WhatsApp para empresas y pymes",
    metaTitle: "Automatización de WhatsApp para Empresas | Zyteron",
    metaDescription:
      "Implementamos automatización de WhatsApp para pymes y empresas en Chile: respuestas, derivaciones, formularios e integración con procesos comerciales.",
    heroTitle: "Automatización de WhatsApp para responder mejor y vender con orden",
    heroDescription:
      "Diseñamos flujos y chatbot de WhatsApp para empresas en Chile que necesitan responder más rápido, filtrar solicitudes y conectar conversaciones con su proceso comercial interno.",
    directAnswer: `Automatizar WhatsApp en una empresa chilena cuesta desde ${clp(SERVICE_PRICE_AMOUNTS.automationWhatsapp)} CLP + IVA de implementación, más los costos de consumo del proveedor de mensajería. Zyteron diagnostica tu flujo de atención actual, diseña el árbol de respuestas y deja la automatización probada con escenarios reales, atendiendo desde Santiago a empresas de todo Chile.`,
    context: [
      "WhatsApp suele ser el canal con más consultas, pero también el más desordenado cuando no existe un flujo definido. Automatizar no significa deshumanizar: significa responder con lógica, priorizar mejor y evitar pérdidas de oportunidad.",
      "En Zyteron configuramos automatizaciones según tipo de negocio: filtros iniciales, rutas por servicio, captura de datos clave y derivación al equipo correcto.",
      "El objetivo es claro: menos tiempo en tareas repetitivas y más foco en conversaciones de alto valor comercial.",
    ],
    benefits: [
      "Respuesta inicial más rápida y profesional.",
      "Filtrado automático de consultas por tipo de necesidad.",
      "Mejor trazabilidad comercial de contactos entrantes.",
      "Reducción de carga operativa en tareas repetitivas.",
      "Integración con formularios, cotización o seguimiento interno.",
    ],
    includes: [
      "Diagnóstico del flujo actual de atención por WhatsApp.",
      "Diseño de árbol de respuestas y rutas de derivación.",
      "Implementación técnica de automatizaciones acordadas.",
      "Conexión con formularios o proceso de cotización cuando aplica.",
      "Pruebas de escenarios y ajustes de mensajes.",
      "Documentación básica para operación del equipo.",
    ],
    audience: [
      "Pymes con alto volumen de mensajes diarios.",
      "Empresas que atienden por WhatsApp sin sistema de prioridad.",
      "Equipos comerciales que necesitan pre-calificar contactos.",
      "Negocios que quieren enlazar WhatsApp con su proceso de ventas.",
    ],
    process: [
      "Levantamiento del flujo de atención actual.",
      "Definición de objetivos, reglas y casos de uso.",
      "Configuración e integración técnica.",
      "Pruebas controladas con ajustes por comportamiento real.",
      "Puesta en marcha y soporte inicial.",
    ],
    faqs: [
      {
        question: "¿Reemplaza al equipo comercial?",
        answer:
          "No. La automatización apoya al equipo, filtra mejor y acelera respuestas iniciales para que los ejecutivos se enfoquen en cierres.",
      },
      {
        question: "¿Implementan un chatbot de WhatsApp para empresas?",
        answer:
          "Sí. Implementamos chatbot para empresas y flujos de chatbot de WhatsApp en Chile que responden preguntas frecuentes, capturan datos y derivan cada consulta al área correcta antes de pasar a una persona.",
      },
      {
        question: "¿Se puede integrar con formularios web?",
        answer:
          "Sí. Es posible conectar flujos de WhatsApp con formularios para capturar mejor la información del cliente.",
      },
      {
        question: "¿Cuánto cuesta automatizar WhatsApp en mi empresa?",
        answer: `La automatización por WhatsApp cuesta desde ${clp(SERVICE_PRICE_AMOUNTS.automationWhatsapp)} + IVA de implementación, más los costos de consumo del proveedor de mensajería, que se pagan por separado según el volumen de conversaciones. El valor final depende de la cantidad de rutas, integraciones y reglas del flujo; lo confirmamos en una cotización formal después del diagnóstico.`,
      },
      {
        question: "¿Sirve para cualquier rubro?",
        answer:
          "Sí, siempre que se defina un flujo coherente con el tipo de atención y objetivo comercial del negocio.",
      },
    ],
    relatedLinks: [
      { label: "Automatización de procesos", href: "/automatizacion" },
      { label: "Sistemas web para empresas", href: "/sistemas-web" },
      { label: "Planes y precios", href: "/planes" },
      { label: "Cotiza tu automatización", href: "/cotizador" },
      { label: "Casos de éxito", href: "/casos-exito" },
    ],
    serviceType: "automatizacion whatsapp pyme chile",
    primaryCta: "Cotizar automatización de WhatsApp",
    finalCtaTitle: "¿Tu equipo pierde tiempo respondiendo lo mismo cada día?",
    finalCtaCopy:
      "Podemos automatizar la primera capa de atención para mejorar tiempos de respuesta y calidad de los leads.",
  },
  {
    slug: "cotizador-web-pdf",
    path: "/cotizador-web-pdf",
    title: "Cotizador web con generación de PDF para empresas",
    metaTitle: "Cotizador Web con PDF en Chile | Zyteron",
    metaDescription:
      "Desarrollamos cotizadores web con generación automática de PDF para empresas en Chile: captura de requerimientos, propuesta ordenada y trazabilidad comercial.",
    heroTitle: "Cotizador web con PDF para agilizar propuestas comerciales",
    heroDescription:
      "Implementamos cotizadores web que permiten levantar requerimientos, calcular rangos y generar documentos PDF para responder más rápido y con mejor control comercial.",
    directAnswer: `Un cotizador web con PDF para empresas en Chile combina un formulario multipaso desde ${clp(ADDON_PRICE_AMOUNTS.multiStepForm)} CLP + IVA y un generador de PDF desde ${clp(ADDON_PRICE_AMOUNTS.pdfGenerator)} + IVA, sobre tu sitio actual o uno nuevo. Zyteron diseña la lógica de cálculo con tus reglas comerciales reales y la prueba con escenarios de tu equipo antes de salir a producción.`,
    context: [
      "Muchos equipos comerciales pierden tiempo armando cotizaciones manuales. Un cotizador web ordena la captura de datos, estandariza criterios y reduce errores al construir propuestas.",
      "Además, la generación de PDF permite formalizar la respuesta al cliente, mantener consistencia de formato y dejar trazabilidad interna de cada solicitud.",
      "En Zyteron adaptamos el flujo según tu operación: desde formularios simples hasta motores con lógica por módulos, servicios, rangos o condiciones específicas.",
    ],
    benefits: [
      "Menor tiempo de respuesta a solicitudes de cotización.",
      "Mayor consistencia en criterios comerciales.",
      "Documentos PDF listos para enviar al cliente.",
      "Registro ordenado para seguimiento de oportunidades.",
      "Integración con proceso interno de ventas.",
    ],
    includes: [
      "Diseño de formulario de levantamiento de requerimientos.",
      "Lógica de cálculo según estructura acordada.",
      "Generación automática de PDF con datos del cliente.",
      "Panel o registro para revisar solicitudes enviadas.",
      "Integración de notificaciones por correo o WhatsApp.",
      "Pruebas funcionales y soporte inicial.",
    ],
    audience: [
      "Empresas que reciben cotizaciones repetitivas por correo o WhatsApp.",
      "Pymes con servicios modulares y múltiples variables de precio.",
      "Equipos comerciales que necesitan formalizar propuestas más rápido.",
      "Negocios que quieren mejorar trazabilidad de sus oportunidades.",
    ],
    process: [
      "Levantamiento de reglas de cotización actuales.",
      "Diseño del flujo de formulario y estructura de salida.",
      "Desarrollo del cotizador y generación de PDF.",
      "Pruebas de escenarios reales con tu equipo.",
      "Ajustes finales y salida a producción.",
    ],
    faqs: [
      {
        question: "¿El PDF puede tener branding de mi empresa?",
        answer:
          "Sí. Se puede personalizar con tu identidad visual, datos comerciales y estructura de propuesta.",
      },
      {
        question: "¿Sirve para cotizaciones simples y complejas?",
        answer:
          "Sí. Se diseña una lógica proporcional al nivel de complejidad de tus servicios o productos.",
      },
      {
        question: "¿Se integra con formulario web y WhatsApp?",
        answer:
          "Sí. Podemos conectar el flujo para que la solicitud llegue por múltiples canales con un mismo registro.",
      },
      {
        question: "¿Cuánto cuesta implementar un cotizador web con PDF?",
        answer: `Los componentes base cuestan: formulario multipaso desde ${clp(ADDON_PRICE_AMOUNTS.multiStepForm)} + IVA y generador de PDF desde ${clp(ADDON_PRICE_AMOUNTS.pdfGenerator)} + IVA. Si además necesitas un panel para revisar y dar seguimiento a las solicitudes, un mini panel administrativo parte desde ${clp(ADDON_PRICE_AMOUNTS.miniAdminPanel)} + IVA. El total depende de la lógica de cálculo de tu negocio; entregamos cotización formal tras el levantamiento de reglas.`,
      },
    ],
    relatedLinks: [
      { label: "Sistemas web para empresas", href: "/sistemas-web" },
      { label: "Automatización de procesos", href: "/automatizacion" },
      { label: "Planes y precios", href: "/planes" },
      { label: "Cotiza tu proyecto", href: "/cotizador" },
      { label: "Casos de éxito", href: "/casos-exito" },
    ],
    serviceType: "cotizador web con pdf chile",
    primaryCta: "Solicitar cotizador con PDF",
    finalCtaTitle: "¿Quieres cotizar más rápido y con mejor control?",
    finalCtaCopy:
      "Definimos una estructura de cotización adaptada a tu negocio para responder con agilidad y profesionalismo.",
  },
  {
    slug: "soporte-ti-pymes-santiago",
    path: "/soporte-ti-pymes-santiago",
    title: "Soporte TI para pymes en Santiago",
    metaTitle: "Soporte TI para Pymes en Santiago | Zyteron",
    metaDescription:
      "Servicio de soporte TI para pymes en Santiago: continuidad operativa, asistencia técnica, configuración de equipos y acompañamiento preventivo.",
    heroTitle: "Soporte TI para pymes en Santiago con foco en continuidad",
    heroDescription:
      "Entregamos soporte TI y soporte informático para pymes en Santiago y el resto de Chile: soporte técnico remoto, mantención computacional, correo corporativo y hosting para mantener tu operación estable, resolver incidentes con rapidez y prevenir caídas que impactan ventas y productividad.",
    directAnswer: `El soporte TI para pymes en Santiago cuesta desde ${clp(SERVICE_PRICE_AMOUNTS.supportTi)} CLP + IVA por requerimiento puntual, y la mantención mensual desde ${clp(MAINTENANCE_PRICE_AMOUNTS.basic)} + IVA. Zyteron atiende de forma remota con diagnóstico rápido y resolución por prioridad, desde su oficina en Providencia para pymes de Santiago y todo Chile.`,
    context: [
      "Una pyme no siempre tiene equipo TI interno, pero sí necesita estabilidad diaria para trabajar. Nuestro servicio cubre soporte operativo y acciones preventivas para reducir interrupciones.",
      "Trabajamos con enfoque práctico: diagnóstico rápido, resolución ordenada y recomendaciones concretas para fortalecer continuidad. Si el problema escala, definimos plan de acción por prioridad.",
      "Atendemos pymes de Santiago y otras regiones de Chile en modalidad remota, con posibilidad de coordinación según tipo de requerimiento.",
    ],
    benefits: [
      "Respuesta técnica orientada a continuidad del negocio.",
      "Reducción de tiempos muertos por fallas recurrentes.",
      "Mejor control de infraestructura básica y configuraciones.",
      "Acompañamiento para decisiones tecnológicas sin sobrecompra.",
      "Integración con mejoras web o sistemas cuando aplica.",
    ],
    includes: [
      "Evaluación inicial de situación técnica actual.",
      "Soporte técnico remoto para incidentes de operación y configuración.",
      "Configuración de correo corporativo, hosting y dominios.",
      "Mantención computacional y servicio técnico computacional para empresas.",
      "Asistencia en equipos, redes y herramientas clave.",
      "Recomendaciones preventivas para evitar fallas repetidas.",
      "Coordinación de mejoras según prioridad y presupuesto.",
      "Seguimiento comercial y técnico del servicio contratado.",
    ],
    audience: [
      "Pymes con operación diaria dependiente de sistemas y equipos.",
      "Negocios sin área TI interna y con incidencias frecuentes.",
      "Empresas que requieren soporte técnico cercano y confiable.",
      "Equipos que buscan mejorar orden y seguridad operativa.",
    ],
    process: [
      "Recepción y clasificación del requerimiento.",
      "Diagnóstico técnico y propuesta de resolución.",
      "Ejecución del soporte según criticidad.",
      "Verificación de continuidad y cierre técnico.",
      "Recomendaciones de mejora preventiva.",
    ],
    faqs: [
      {
        question: "¿Atienden solo soporte web?",
        answer:
          "No. También apoyamos configuración, continuidad técnica y necesidades TI operativas de pymes.",
      },
      {
        question: "¿Cuánto cuesta el soporte TI para una pyme en Santiago?",
        answer: `El soporte TI parte desde ${clp(SERVICE_PRICE_AMOUNTS.supportTi)} + IVA por requerimiento puntual. Si tu operación necesita atención recurrente, la mantención mensual parte desde ${clp(MAINTENANCE_PRICE_AMOUNTS.basic)} + IVA (web básica) y desde ${clp(MAINTENANCE_PRICE_AMOUNTS.system)} + IVA para sistemas críticos. El esquema se ajusta al volumen de requerimientos y lo confirmamos en una cotización formal.`,
      },
      {
        question: "¿Puedo contratar soporte recurrente?",
        answer:
          "Sí. Se puede definir modalidad de soporte periódico según carga operativa y prioridades de tu empresa.",
      },
      {
        question: "¿Atienden fuera de Santiago?",
        answer:
          "Sí. Atendemos en modalidad remota a empresas, pymes y emprendedores de distintas regiones de Chile.",
      },
    ],
    relatedLinks: [
      { label: "Soporte TI para empresas", href: "/soporte-ti" },
      { label: "Mantención web en Chile", href: "/servicios/mantencion-web-chile" },
      { label: "Desarrollo web en Santiago", href: "/desarrollo-web-santiago" },
      { label: "Planes y precios", href: "/planes" },
      { label: "Cotiza tu soporte TI", href: "/cotizador" },
    ],
    serviceType: "soporte TI pymes Santiago",
    primaryCta: "Solicitar soporte TI",
    finalCtaTitle: "¿Tu pyme necesita soporte TI confiable?",
    finalCtaCopy:
      "Revisemos tu escenario técnico actual y definamos un plan de soporte acorde a tu nivel de operación.",
  },
];

export function getPriorityServicePageBySlug(slug: string) {
  return priorityServicePages.find((page) => page.slug === slug);
}
