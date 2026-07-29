/**
 * CENTRO DE CONOCIMIENTO COMERCIAL
 * --------------------------------
 * Material de estudio y consulta para ejecutivos, gestores de cartera y
 * partners. Reúne qué es Zyteron, qué entrega y qué no, cómo se venden los
 * planes, cómo se responde a las objeciones más frecuentes y cuáles son las
 * reglas del proceso comercial.
 *
 * Los precios se leen desde `@/config/pricing` (fuente única) para que este
 * material nunca quede desfasado respecto de la web pública.
 */

import { AI_SERVICES, ADDONS, MAINTENANCE, PLANS, PRICING_NOTE } from "@/config/pricing";
import { siteConfig } from "@/config/site";

export type PlaybookSection = { title: string; points: string[] };

// -- 1 · Identidad de la empresa --------------------------------------------

export const companyIdentity = {
  legalName: siteConfig.legalName,
  taxId: siteConfig.taxId,
  founded: siteConfig.foundingDate,
  experienceYears: siteConfig.business.experienceYears,
  areaServed: siteConfig.business.areaServed,
  hours: siteConfig.business.hoursDisplay,
  phone: siteConfig.contact.phoneDisplay,
  email: siteConfig.contact.email,
  site: siteConfig.url,
  representative: siteConfig.representative,
  pitch:
    "Zyteron desarrolla sitios web, sistemas administrativos, tiendas online, automatizaciones e inteligencia artificial aplicada para empresas en Chile. Trabajamos con alcance escrito, plazos definidos y una entrega que el cliente puede administrar.",
  differentiators: [
    "Alcance escrito antes de empezar: el cliente sabe exactamente qué recibe y qué no.",
    "Desarrollo propio, sin plantillas genéricas ni revendedores intermedios.",
    "Entregamos con capacitación y documentación para que el cliente opere su plataforma.",
    "Un solo proveedor para web, sistema, automatización, IA y soporte posterior.",
    "Trabajo remoto en todo Chile con documentación tributaria formal.",
  ],
};

// -- 2 · Qué hacemos y qué no -----------------------------------------------

export const whatWeDo: PlaybookSection[] = [
  {
    title: "Sitios y páginas web",
    points: [
      "Páginas de presentación, sitios corporativos y landing pages orientadas a conversión.",
      "Diseño responsivo (celular, tablet y computador) y optimización de carga.",
      "SEO técnico inicial: títulos, descripciones, estructura y datos estructurados.",
      "Formularios de contacto, cotización y derivación a WhatsApp.",
    ],
  },
  {
    title: "Ecommerce y catálogos",
    points: [
      "Catálogo administrable con pedidos por WhatsApp.",
      "Tienda online con carrito, stock y pasarelas de pago (Flow, Webpay, Mercado Pago).",
      "Gestión de productos, categorías, despacho y cupones según el alcance contratado.",
    ],
  },
  {
    title: "Sistemas y paneles administrativos",
    points: [
      "Paneles internos a medida: clientes, cotizaciones, ventas, proyectos, órdenes de trabajo.",
      "Portales privados para clientes finales con documentos, pagos y soporte.",
      "Reportes, dashboards e indicadores para la toma de decisiones.",
      "Integraciones vía API con sistemas que el cliente ya utiliza.",
    ],
  },
  {
    title: "Automatización e inteligencia artificial",
    points: [
      "Asistentes de IA para atención, ventas, cotizaciones y soporte, en web y WhatsApp.",
      "Automatización de formularios, avisos, respuestas y flujos internos repetitivos.",
      "Generación automática de documentos y PDF.",
    ],
  },
  {
    title: "Soporte y continuidad",
    points: [
      "Planes de mantención mensual para web, ecommerce, sistemas e IA.",
      "Correcciones, respaldos, actualizaciones y mejoras acordadas.",
      "Soporte TI y acompañamiento posterior a la entrega.",
    ],
  },
];

export const whatWeDoNot: PlaybookSection[] = [
  {
    title: "Fuera del alcance de los planes",
    points: [
      "El dominio, el hosting externo pagado, las licencias y los servicios de terceros se cotizan y cobran por separado.",
      "El consumo de modelos de inteligencia artificial y mensajería no está incluido en el valor de implementación.",
      "No incluimos redacción completa de contenidos ni carga masiva de productos salvo que se contrate como servicio adicional.",
      "No incluimos sesiones fotográficas, producción audiovisual ni diseño de marca desde cero.",
    ],
  },
  {
    title: "Servicios que no prestamos",
    points: [
      "No gestionamos campañas de publicidad pagada ni administración de redes sociales.",
      "No vendemos posicionamiento garantizado en Google: el SEO es un trabajo técnico y progresivo.",
      "No trabajamos sobre plataformas de terceros que no permitan acceso al código o a la base de datos, salvo evaluación previa.",
      "No asumimos responsabilidad tributaria, contable ni legal del negocio del cliente.",
    ],
  },
  {
    title: "Compromisos que nunca se ofrecen",
    points: [
      "No se prometen plazos, precios finales ni descuentos sin confirmación de administración.",
      "No se comprometen funcionalidades que no estén escritas en la propuesta.",
      "No se entrega información de otros clientes, credenciales ni documentación interna.",
      "No se firman acuerdos ni se reciben pagos directamente: todo pago se realiza a Zyteron SpA con documento tributario.",
    ],
  },
];

// -- 3 · Catálogo comercial (precios desde la fuente única) ------------------

export const catalog = {
  note: PRICING_NOTE,
  plans: PLANS,
  addons: ADDONS,
  aiServices: AI_SERVICES,
  maintenance: MAINTENANCE,
};

/** A quién le sirve cada plan: guía rápida para orientar la conversación. */
export const planGuidance: Array<{ plan: string; fit: string; signal: string }> = [
  {
    plan: "Web Básica",
    fit: "Emprendedores y profesionales que necesitan presencia online seria y económica.",
    signal: "“Solo quiero que me encuentren y me escriban por WhatsApp.”",
  },
  {
    plan: "Plan Emprendedor",
    fit: "Negocios en crecimiento que necesitan varias secciones y mejor posicionamiento.",
    signal: "“Tengo servicios distintos y quiero explicarlos bien.”",
  },
  {
    plan: "Plan Pyme",
    fit: "Empresas con operación estable que requieren más páginas, catálogo o integraciones.",
    signal: "“Necesito mostrar productos y recibir solicitudes ordenadas.”",
  },
  {
    plan: "Plan Empresa",
    fit: "Empresas consolidadas con requerimientos de imagen, contenido y estructura mayores.",
    signal: "“Somos una empresa formal y la web actual nos deja mal parados.”",
  },
  {
    plan: "Catálogo por WhatsApp",
    fit: "Comercios que venden por WhatsApp y necesitan ordenar su catálogo.",
    signal: "“Vendo por WhatsApp pero mando fotos sueltas.”",
  },
  {
    plan: "Ecommerce",
    fit: "Negocios listos para vender en línea con pago y stock.",
    signal: "“Quiero que me paguen en la web y controlar stock.”",
  },
  {
    plan: "Sistema web administrativo",
    fit: "Empresas que llevan su operación en planillas y necesitan un panel real.",
    signal: "“Tenemos todo en Excel y se nos pierde la información.”",
  },
  {
    plan: "Sistema avanzado a medida",
    fit: "Operaciones complejas con múltiples roles, integraciones y automatización.",
    signal: "“Necesitamos que el sistema converse con lo que ya usamos.”",
  },
];

// -- 4 · Proceso comercial ---------------------------------------------------

export const salesProcess: Array<{ step: number; title: string; detail: string; owner: string }> = [
  {
    step: 1,
    title: "Registro del contacto",
    detail:
      "Toda persona o empresa contactada se registra en el portal con datos completos y origen. Sin registro no hay respaldo ni comisión.",
    owner: "Ejecutivo",
  },
  {
    step: 2,
    title: "Evaluación de Zyteron",
    detail:
      "Administración revisa el registro, verifica que no exista en cartera y lo clasifica como potencial, aceptado, no califica o duplicado.",
    owner: "Zyteron",
  },
  {
    step: 3,
    title: "Descubrimiento",
    detail:
      "Se entiende el negocio, el problema real, el presupuesto disponible, el plazo y quién decide. Todo queda en la bitácora.",
    owner: "Ejecutivo",
  },
  {
    step: 4,
    title: "Propuesta formal",
    detail:
      "Zyteron prepara la cotización con alcance escrito, exclusiones, plazo y forma de pago. El ejecutivo la presenta y resuelve dudas.",
    owner: "Zyteron + Ejecutivo",
  },
  {
    step: 5,
    title: "Negociación y cierre",
    detail:
      "Se acuerdan ajustes de alcance. Cualquier cambio de precio o plazo requiere confirmación previa de administración.",
    owner: "Ejecutivo",
  },
  {
    step: 6,
    title: "Ejecución y comisión",
    detail:
      "Con el proyecto adjudicado y pagado, la comisión se registra, se aprueba y se incluye en la liquidación mensual.",
    owner: "Zyteron",
  },
];

export const qualificationChecklist: Array<{ question: string; why: string }> = [
  {
    question: "¿Qué problema concreto quiere resolver hoy?",
    why: "Separa una necesidad real de una consulta exploratoria.",
  },
  {
    question: "¿Tiene web o sistema hoy? ¿Quién lo administra?",
    why: "Define si es proyecto nuevo, migración o rescate de una plataforma existente.",
  },
  {
    question: "¿Quién toma la decisión y quién autoriza el presupuesto?",
    why: "Evita invertir semanas hablando con alguien que no decide.",
  },
  {
    question: "¿Qué rango de inversión tiene considerado?",
    why: "Permite orientar al plan correcto antes de generar expectativas.",
  },
  {
    question: "¿Para cuándo necesita estar funcionando?",
    why: "Un plazo real ordena la propuesta; un plazo imposible se conversa de inmediato.",
  },
  {
    question: "¿Tiene el contenido listo (textos, fotos, productos)?",
    why: "Es la causa más frecuente de atrasos y de expectativas mal calibradas.",
  },
];

export const objections: Array<{ objection: string; answer: string; avoid: string }> = [
  {
    objection: "“Está caro / lo encontré más barato.”",
    answer:
      "Compare lo que incluye cada propuesta: aquí el alcance está escrito, el desarrollo es propio y queda administrable. Podemos partir por una etapa acotada y crecer después sin rehacer el trabajo.",
    avoid: "Bajar el precio por iniciativa propia o criticar a otro proveedor.",
  },
  {
    objection: "“Lo voy a pensar.”",
    answer:
      "Perfecto. ¿Qué punto le falta resolver: alcance, plazo o inversión? Le dejo agendada una fecha concreta para retomarlo con esa información lista.",
    avoid: "Cerrar la conversación sin fecha de seguimiento.",
  },
  {
    objection: "“¿Me garantizan salir primero en Google?”",
    answer:
      "Nadie puede garantizar una posición. Sí garantizamos el trabajo técnico que Google evalúa: estructura, velocidad, contenido y datos estructurados; y le mostramos qué se hizo.",
    avoid: "Prometer posiciones, plazos de indexación o resultados de tráfico.",
  },
  {
    objection: "“Un familiar me lo hace gratis.”",
    answer:
      "Puede funcionar para partir. La diferencia aparece cuando el negocio necesita continuidad: respaldos, soporte, documento tributario y alguien responsable si algo falla.",
    avoid: "Descalificar a la persona; el foco es la continuidad del negocio.",
  },
  {
    objection: "“¿Y si después quiero cambiar cosas?”",
    answer:
      "La plataforma queda administrable y existen planes de mantención mensual. Los cambios mayores se cotizan como módulos adicionales con su propio alcance.",
    avoid: "Ofrecer cambios ilimitados o soporte indefinido sin costo.",
  },
  {
    objection: "“Necesito hablarlo con mi socio.”",
    answer:
      "Le preparo un resumen de una página con alcance, inversión y plazo para que lo revisen juntos, y coordinamos una llamada corta con ambos.",
    avoid: "Enviar solo la cotización sin acompañamiento ni fecha.",
  },
];

export const conductRules: PlaybookSection[] = [
  {
    title: "Siempre",
    points: [
      "Registrar cada contacto e informar cada gestión el mismo día en que ocurre.",
      "Confirmar precios y plazos con administración antes de comprometerlos.",
      "Entregar la información tal como está publicada: planes, exclusiones y valores referenciales sin IVA.",
      "Dejar por escrito lo que el cliente pide, aunque no esté dentro del alcance.",
      "Tratar los datos del cliente como confidenciales.",
    ],
  },
  {
    title: "Nunca",
    points: [
      "Ofrecer descuentos, regalías, plazos o funcionalidades sin autorización.",
      "Recibir pagos, transferencias o anticipos en cuentas personales.",
      "Usar la marca Zyteron en piezas, perfiles o publicidad propia sin aprobación.",
      "Contactar clientes activos de la cartera de la empresa sin coordinación previa.",
      "Comprometer soporte, mantención o garantías fuera de lo contratado.",
    ],
  },
];

export const executiveFaq: Array<{ question: string; answer: string }> = [
  {
    question: "¿Cuándo se genera mi comisión?",
    answer:
      "Cuando un registro clasificado como potencial o aceptado se convierte en proyecto adjudicado y el cliente paga. Si el proyecto se cobra por etapas, la comisión se libera en la misma proporción.",
  },
  {
    question: "¿Cómo y cuándo me pagan?",
    answer:
      "Las comisiones aprobadas del mes se consolidan en una liquidación mensual con su retención y monto neto, y se pagan por transferencia a la cuenta bancaria registrada en tu perfil.",
  },
  {
    question: "¿Qué pasa si otro ejecutivo registró antes al mismo cliente?",
    answer:
      "El registro se marca como duplicado y prevalece el primero que quedó ingresado en el sistema. Por eso conviene registrar apenas se produce el primer contacto.",
  },
  {
    question: "¿Puedo cotizar por mi cuenta?",
    answer:
      "Puedes orientar con los valores publicados, que son referenciales y sin IVA. La cotización formal, con alcance y plazo, siempre la emite Zyteron.",
  },
  {
    question: "¿Qué hago si el cliente pide algo que no hacemos?",
    answer:
      "Regístralo igual en la bitácora e infórmalo. Muchas veces existe una alternativa dentro del alcance, y si no la hay, es mejor decirlo a tiempo que comprometerlo.",
  },
  {
    question: "¿Cuánto tiempo tengo protegido un registro?",
    answer:
      "90 días desde su aceptación, siempre que informes gestiones. Sin actividad registrada en ese plazo, la oportunidad queda disponible nuevamente.",
  },
];

export const quickLinks: Array<{ label: string; href: string; description: string }> = [
  { label: "Planes y precios", href: "/planes", description: "Página pública con el detalle de cada plan." },
  { label: "Servicios", href: "/servicios", description: "Descripción de cada línea de servicio." },
  { label: "Casos de éxito", href: "/casos-exito", description: "Proyectos reales para respaldar la conversación." },
  { label: "Cotizador", href: "/cotizador", description: "Formulario que genera la solicitud formal." },
  { label: "Preguntas frecuentes", href: "/faq", description: "Respuestas publicadas al cliente final." },
  { label: "Términos del servicio", href: "/terminos", description: "Condiciones vigentes del servicio." },
  { label: "Quiénes somos", href: "/quienes-somos", description: "Historia, equipo y forma de trabajo." },
];
