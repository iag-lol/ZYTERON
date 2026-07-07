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
  context: string[];
  benefits: string[];
  includes: string[];
  audience: string[];
  process: string[];
  faqs: PriorityServiceFaq[];
  serviceType: string;
  primaryCta: string;
  finalCtaTitle: string;
  finalCtaCopy: string;
};

export const priorityServicePages: PriorityServicePage[] = [
  {
    slug: "desarrollo-web-santiago",
    path: "/desarrollo-web-santiago",
    title: "Desarrollo web en Santiago para empresas y pymes",
    metaTitle: "Desarrollo web Santiago | ZYTERON",
    metaDescription:
      "Servicio de desarrollo web en Santiago para empresas, pymes y emprendedores: páginas profesionales, arquitectura SEO y enfoque en cotizaciones reales.",
    heroTitle: "Desarrollo web en Santiago con foco comercial y técnico",
    heroDescription:
      "Diseñamos y desarrollamos sitios web profesionales para empresas, pymes y emprendedores en Santiago. Nuestro enfoque combina estructura comercial, SEO técnico y experiencia de usuario para convertir visitas en oportunidades de negocio.",
    context: [
      "En un mercado competitivo como Santiago, una web no puede ser solo una vitrina. Debe explicar con claridad qué haces, a quién ayudas y por qué elegirte frente a otras opciones. Por eso trabajamos estructura, mensajes y llamados a la acción desde el inicio del proyecto.",
      "En ZYTERON construimos sitios orientados a resultados: mejor indexación, mejor confianza comercial y mejor ruta hacia contacto o cotización. Atendemos de forma remota en toda la Región Metropolitana y, cuando aplica, coordinamos reuniones para levantamiento de alcance.",
      "Cada propuesta se define por alcance real. Esto evita sobrecostos, promesas vagas y retrasos por falta de definición inicial. Primero levantamos requerimientos, luego construimos una hoja de ruta ejecutable.",
    ],
    benefits: [
      "Mayor credibilidad comercial desde la primera visita.",
      "Arquitectura preparada para crecer por servicios y búsquedas locales.",
      "Carga rápida en mobile y desktop para mejorar experiencia y SEO.",
      "Canales de conversión claros: formulario, WhatsApp y llamadas a cotizar.",
      "Base técnica estable para futuras integraciones o automatizaciones.",
    ],
    includes: [
      "Diagnóstico inicial de objetivo comercial y tipo de cliente.",
      "Definición de estructura de páginas y jerarquía de contenidos.",
      "Diseño responsive para celular, tablet y escritorio.",
      "Implementación con metadata, canonical y datos estructurados.",
      "Integración de formularios y botón de WhatsApp.",
      "Publicación y soporte inicial post-entrega según alcance.",
    ],
    audience: [
      "Empresas B2B que necesitan generar más reuniones comerciales.",
      "Pymes en crecimiento que quieren profesionalizar su presencia digital.",
      "Emprendedores que requieren una web clara para vender servicios.",
      "Equipos comerciales que hoy dependen solo de referidos.",
    ],
    process: [
      "Levantamiento de requerimientos y objetivos de negocio.",
      "Propuesta de alcance, tiempos y cotización formal.",
      "Diseño de estructura, contenido y bloques de conversión.",
      "Desarrollo, pruebas y ajustes finales con revisión del cliente.",
      "Publicación, validación y soporte inicial de operación.",
    ],
    faqs: [
      {
        question: "¿Trabajan solo en Santiago?",
        answer:
          "Atendemos Santiago y otras regiones de Chile en modalidad remota, manteniendo el mismo proceso de levantamiento y seguimiento.",
      },
      {
        question: "¿Cuánto demora una web corporativa?",
        answer:
          "Depende del alcance. Una implementación estándar puede tomar entre 3 y 6 semanas según secciones, contenido e integraciones.",
      },
      {
        question: "¿Puedo solicitar mejoras después del lanzamiento?",
        answer:
          "Sí. Podemos trabajar por etapas y definir nuevas mejoras con prioridades técnicas y comerciales.",
      },
    ],
    serviceType: "desarrollo web santiago",
    primaryCta: "Solicitar cotización de desarrollo web",
    finalCtaTitle: "¿Necesitas una web profesional para tu empresa en Santiago?",
    finalCtaCopy:
      "Podemos revisar tu caso y proponerte una estructura de sitio alineada a tu objetivo comercial, presupuesto y nivel de urgencia.",
  },
  {
    slug: "tiendas-online-chile",
    path: "/tiendas-online-chile",
    title: "Tiendas online en Chile para pymes y empresas",
    metaTitle: "Tiendas online Chile para pymes y empresas | ZYTERON",
    metaDescription:
      "Desarrollo de tiendas online en Chile para pymes y empresas: catálogo, carrito, integración comercial y acompañamiento para vender con orden.",
    heroTitle: "Tiendas online en Chile para vender con estructura y confianza",
    heroDescription:
      "Te ayudamos a crear tu tienda online en Chile (o tienda virtual) orientada a operación real: catálogo online bien organizado, experiencia de compra clara, pagos con Webpay, Flow o Mercado Pago y rutas de contacto para cerrar ventas por web o WhatsApp.",
    context: [
      "Muchas pymes quieren vender online, pero se frenan por desorden en catálogo, falta de flujo comercial o problemas de mantención. Nuestra propuesta es construir una tienda que puedas operar sin fricción y que escale por etapas.",
      "Trabajamos con compromisos concretos: definimos junto a ti qué incluye tu implementación —tipos de productos, cantidad inicial, forma de pago, envíos, reglas comerciales y soporte posterior— para que sepas exactamente qué recibirás.",
      "La meta no es solo publicar productos. La meta es que tu tienda genere consultas, pedidos o ventas con una experiencia profesional que aumente confianza en tu marca.",
    ],
    benefits: [
      "Catálogo ordenado para mejorar navegación y decisión de compra.",
      "Diseño responsive para comprar desde celular sin fricción.",
      "Integración gradual de funciones según etapa del negocio.",
      "Mensajes comerciales claros para reducir dudas frecuentes.",
      "Base SEO para posicionar categorías y productos clave.",
    ],
    includes: [
      "Estructura de tienda según tipo de producto y público objetivo.",
      "Categorías, fichas de producto y llamados a la acción.",
      "Carrito y flujos comerciales según alcance contratado.",
      "Integración con WhatsApp para venta asistida.",
      "Configuración técnica inicial para indexación y rendimiento.",
      "Capacitación breve para gestión operativa básica.",
    ],
    audience: [
      "Pymes que venden productos físicos o mixtos en Chile.",
      "Empresas que quieren pasar de catálogo estático a venta digital.",
      "Marcas que ya venden por redes y necesitan un canal propio.",
      "Negocios que requieren ordenar su proceso de cotización y pedido.",
    ],
    process: [
      "Diagnóstico de catálogo, operación y objetivo comercial.",
      "Definición de alcance, módulos y costos por etapa.",
      "Diseño de estructura y experiencia de compra.",
      "Desarrollo, carga inicial y pruebas de flujo.",
      "Salida a producción y soporte de estabilización.",
    ],
    faqs: [
      {
        question: "¿Incluye integración de pagos en línea con Webpay, Flow o Mercado Pago?",
        answer:
          "Puede incluirse según alcance. Integramos tu tienda online con Webpay, Flow o Mercado Pago según proveedor, requisitos técnicos y flujo comercial de tu negocio.",
      },
      {
        question: "¿Puedo comenzar con un catálogo pequeño?",
        answer:
          "Sí. Es una estrategia común para validar operación y escalar funciones cuando ya exista tracción.",
      },
      {
        question: "¿La tienda queda lista para SEO?",
        answer:
          "Sí. Se implementa base técnica SEO para indexación, metadata y estructura de navegación por categorías.",
      },
    ],
    serviceType: "tienda online para pyme chile",
    primaryCta: "Cotizar mi tienda online",
    finalCtaTitle: "¿Quieres vender online con una tienda clara y mantenible?",
    finalCtaCopy:
      "Definimos contigo la mejor estructura para vender según tipo de producto, operación interna y presupuesto disponible.",
  },
  {
    slug: "sistemas-web-a-medida",
    path: "/sistemas-web-a-medida",
    title: "Sistemas web a medida en Chile para empresas",
    metaTitle: "Sistemas web a medida Chile | ZYTERON",
    metaDescription:
      "Desarrollo de sistemas web a medida para empresas en Chile: paneles administrativos, control de procesos, generación de reportes y automatización.",
    heroTitle: "Sistemas web a medida para ordenar procesos y escalar operación",
    heroDescription:
      "Cuando una planilla ya no alcanza, hacemos desarrollo de software a medida en Chile: sistemas web y aplicaciones web personalizadas para controlar información, usuarios, flujos internos y trazabilidad operativa.",
    context: [
      "Los sistemas a medida permiten transformar tareas manuales en procesos controlados. En vez de adaptar tu negocio a una herramienta genérica, construimos una solución alineada a tu flujo real de trabajo.",
      "Nuestro enfoque parte por prioridades: qué duele hoy, qué proceso consume más tiempo y qué resultado esperas al digitalizar. Con eso definimos módulos, tiempos y una implementación por etapas.",
      "Esto te permite reducir reprocesos, mejorar control interno y tomar decisiones con datos actualizados. Todo con una base escalable para nuevas funciones futuras.",
    ],
    benefits: [
      "Mayor control de información crítica del negocio.",
      "Reducción de tareas manuales y errores operativos.",
      "Trazabilidad por estados, usuarios y fechas.",
      "Escalabilidad por módulos sin rehacer todo el sistema.",
      "Visibilidad ejecutiva mediante paneles y reportes.",
    ],
    includes: [
      "Levantamiento funcional del proceso actual.",
      "Diseño de arquitectura de módulos y permisos.",
      "Desarrollo de panel administrativo y formularios internos.",
      "Generación de documentos o reportes según necesidad.",
      "Pruebas, ajustes y capacitación de uso.",
      "Soporte inicial post implementación.",
    ],
    audience: [
      "Empresas que gestionan múltiples registros o flujos internos.",
      "Pymes que buscan software para pymes en Chile con control por roles.",
      "Equipos que necesitan sistema de inventario, cotizaciones o control de flota.",
      "Negocios que buscan automatizar cotizaciones y documentos.",
    ],
    process: [
      "Diagnóstico de procesos y definición de objetivos medibles.",
      "Diseño funcional por módulos priorizados.",
      "Cotización formal y planificación por hitos.",
      "Desarrollo incremental con revisiones periódicas.",
      "Entrega, capacitación y soporte de adopción.",
    ],
    faqs: [
      {
        question: "¿Puedo partir con un módulo y luego crecer?",
        answer:
          "Sí. Recomendamos comenzar por el módulo de mayor impacto y luego ampliar el sistema por etapas.",
      },
      {
        question: "¿Incluye panel de administración?",
        answer:
          "Sí. El panel forma parte de la arquitectura base para gestionar datos, estados y usuarios según alcance.",
      },
      {
        question: "¿Trabajan con integración de servicios externos?",
        answer:
          "Sí, cuando aplica. Se evalúa factibilidad técnica y comercial durante el levantamiento inicial.",
      },
    ],
    serviceType: "sistemas web a medida chile",
    primaryCta: "Solicitar evaluación técnica",
    finalCtaTitle: "¿Tu operación necesita un sistema web personalizado?",
    finalCtaCopy:
      "Revisemos tu proceso actual y diseñemos una solución por etapas para digitalizar con control, sin improvisación.",
  },
  {
    slug: "automatizacion-whatsapp-empresas",
    path: "/automatizacion-whatsapp-empresas",
    title: "Automatización de WhatsApp para empresas y pymes",
    metaTitle: "Automatización WhatsApp para empresas | ZYTERON",
    metaDescription:
      "Implementamos automatización de WhatsApp para pymes y empresas en Chile: respuestas, derivaciones, formularios e integración con procesos comerciales.",
    heroTitle: "Automatización de WhatsApp para responder mejor y vender con orden",
    heroDescription:
      "Diseñamos flujos y chatbot de WhatsApp para empresas en Chile que necesitan responder más rápido, filtrar solicitudes y conectar conversaciones con su proceso comercial interno.",
    context: [
      "WhatsApp suele ser el canal con más consultas, pero también el más desordenado cuando no existe un flujo definido. Automatizar no significa deshumanizar: significa responder con lógica, priorizar mejor y evitar pérdidas de oportunidad.",
      "En ZYTERON configuramos automatizaciones según tipo de negocio: filtros iniciales, rutas por servicio, captura de datos clave y derivación al equipo correcto.",
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
        question: "¿Sirve para cualquier rubro?",
        answer:
          "Sí, siempre que se defina un flujo coherente con el tipo de atención y objetivo comercial del negocio.",
      },
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
    metaTitle: "Cotizador web con PDF en Chile | ZYTERON",
    metaDescription:
      "Desarrollamos cotizadores web con generación automática de PDF para empresas en Chile: captura de requerimientos, propuesta ordenada y trazabilidad comercial.",
    heroTitle: "Cotizador web con PDF para agilizar propuestas comerciales",
    heroDescription:
      "Implementamos cotizadores web que permiten levantar requerimientos, calcular rangos y generar documentos PDF para responder más rápido y con mejor control comercial.",
    context: [
      "Muchos equipos comerciales pierden tiempo armando cotizaciones manuales. Un cotizador web ordena la captura de datos, estandariza criterios y reduce errores al construir propuestas.",
      "Además, la generación de PDF permite formalizar la respuesta al cliente, mantener consistencia de formato y dejar trazabilidad interna de cada solicitud.",
      "En ZYTERON adaptamos el flujo según tu operación: desde formularios simples hasta motores con lógica por módulos, servicios, rangos o condiciones específicas.",
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
    metaTitle: "Soporte TI pymes Santiago | ZYTERON",
    metaDescription:
      "Servicio de soporte TI para pymes en Santiago: continuidad operativa, asistencia técnica, configuración de equipos y acompañamiento preventivo.",
    heroTitle: "Soporte TI para pymes en Santiago con foco en continuidad",
    heroDescription:
      "Entregamos soporte TI y soporte informático para pymes en Santiago y el resto de Chile: soporte técnico remoto, mantención computacional, correo corporativo y hosting para mantener tu operación estable, resolver incidentes con rapidez y prevenir caídas que impactan ventas y productividad.",
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
