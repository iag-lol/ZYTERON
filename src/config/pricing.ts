/**
 * FUENTE ÚNICA DE PRECIOS DE ZYTERON
 * ----------------------------------
 * Todos los valores son referenciales, se expresan "Desde" (salvo los de precio
 * cerrado) y NO incluyen IVA. Formato de moneda chileno: $1.990.000.
 *
 * Cualquier precio publicado —página /planes, cotizador, calculadora, tarjetas,
 * FAQ, conocimiento de la IA, datos estructurados— debe leerse desde aquí. Si un
 * precio se escribe a mano en un componente, tarde o temprano contradice a otro.
 *
 * La escalera comercial va de $99.990 a más de $14.990.000: desde una presencia
 * web inicial hasta una plataforma corporativa a medida.
 */

export const PRICING_NOTE =
  "Todos los valores son referenciales, se expresan desde el precio indicado y no incluyen IVA. " +
  "El precio final dependerá del alcance, cantidad de pantallas, módulos, usuarios, integraciones, " +
  "automatizaciones, volumen de uso y nivel de personalización. Los servicios externos, licencias, " +
  "dominios, hosting, mensajería, inteligencia artificial y proveedores de terceros se cobran por separado.";

export const AI_CONSUMPTION_NOTE =
  "Los valores de implementación no incluyen el consumo de modelos de inteligencia artificial, " +
  "servicios externos, almacenamiento adicional ni proveedores de terceros.";

/** Los proyectos corporativos no se cierran con un precio de tarifario. */
export const CORPORATE_SCOPE_NOTE =
  "Proyecto sujeto a levantamiento funcional y técnico. El valor final se define después de analizar " +
  "procesos, módulos, perfiles de usuario, integraciones y volumen de operación.";

/** Formatea un monto en pesos chilenos: 1990000 → "$1.990.000". */
export function clp(amount: number): string {
  return `$${amount.toLocaleString("es-CL")}`;
}

/** Etiqueta comercial completa: 1990000 → "Desde $1.990.000 + IVA". */
export function fromPrice(amount: number): string {
  return `Desde ${clp(amount)} + IVA`;
}

/** Etiqueta mensual: 99990 → "Desde $99.990 + IVA / mes". */
export function monthlyPrice(amount: number): string {
  return `Desde ${clp(amount)} + IVA / mes`;
}

// ---------------------------------------------------------------------------
// Planes principales
// ---------------------------------------------------------------------------

/**
 * Montos numéricos de la escalera comercial. Son la base de todo lo demás:
 * etiquetas, datos estructurados y cálculos del cotizador.
 */
export const PLAN_PRICE_AMOUNTS = {
  "web-basica": 99990,
  emprendedor: 179990,
  pyme: 299990,
  empresa: 549990,
  catalogo: 349990,
  ecommerce: 749990,
  sistema: 1990000,
  avanzado: 3490000,
  intranet: 5490000,
  operacional: 7990000,
  corporativa: 10990000,
  enterprise: 14990000,
} as const;

export type PlanId = keyof typeof PLAN_PRICE_AMOUNTS;

/** Precio por id de plan, ya formateado para mostrar. */
export const PLAN_PRICES: Record<string, string> = Object.fromEntries(
  Object.entries(PLAN_PRICE_AMOUNTS).map(([id, amount]) => [id, fromPrice(amount)]),
);

export const SERVICE_PRICE_AMOUNTS = {
  automationWhatsapp: 349990,
  supportTi: 49990,
} as const;

export type PricedItem = { name: string; price: string; note?: string };

/** A qué bloque de la página /planes pertenece cada nivel. */
export type PlanBlock = "web" | "ecommerce" | "sistemas" | "corporativo";

export type Plan = {
  id: PlanId;
  name: string;
  block: PlanBlock;
  amount: number;
  price: string;
  /** Para quién es, en una frase. */
  audience: string;
  /** Qué resuelve, en lenguaje de negocio. */
  summary: string;
  features: string[];
  /** Texto del botón. Cambia según el nivel: no se cotiza igual una web que una plataforma. */
  cta: string;
  tag?: "Más solicitado" | "Recomendado" | "Desarrollo corporativo";
  /** Los proyectos corporativos exigen levantamiento previo. */
  requiresDiscovery?: boolean;
  deadline: string;
};

export const PLAN_CATALOG: Plan[] = [
  {
    id: "web-basica",
    name: "Web Básica",
    block: "web",
    amount: PLAN_PRICE_AMOUNTS["web-basica"],
    price: fromPrice(PLAN_PRICE_AMOUNTS["web-basica"]),
    audience: "Profesionales independientes y negocios que parten.",
    summary:
      "Una página profesional para existir en Google, mostrar lo que haces y recibir consultas por WhatsApp.",
    features: [
      "Landing profesional de una página",
      "Diseño responsive",
      "Secciones de inicio, servicios, empresa y contacto",
      "Botón de WhatsApp",
      "Formulario de contacto",
      "SEO técnico base",
      "Optimización móvil",
      "Certificado SSL",
      "Analytics básico",
    ],
    cta: "Cotizar mi página",
    deadline: "1 a 2 semanas",
  },
  {
    id: "emprendedor",
    name: "Plan Emprendedor",
    block: "web",
    amount: PLAN_PRICE_AMOUNTS.emprendedor,
    price: fromPrice(PLAN_PRICE_AMOUNTS.emprendedor),
    audience: "Negocios que ya necesitan más que una landing.",
    summary:
      "Un sitio de varias secciones para explicar tu oferta completa y ordenar el primer contacto comercial.",
    features: [
      "Sitio multipágina hasta 4 secciones",
      "Diseño profesional a medida",
      "Formularios de contacto",
      "Botón de WhatsApp",
      "Galería de trabajos o productos",
      "Página de servicios",
      "Google Maps",
      "SEO técnico inicial",
      "Google Analytics",
      "Responsive completo",
    ],
    cta: "Cotizar mi página",
    deadline: "2 a 3 semanas",
  },
  {
    id: "pyme",
    name: "Plan Pyme",
    block: "web",
    amount: PLAN_PRICE_AMOUNTS.pyme,
    price: fromPrice(PLAN_PRICE_AMOUNTS.pyme),
    audience: "Pymes que viven de cotizaciones y necesitan captar clientes.",
    summary:
      "Sitio corporativo con arquitectura pensada para convertir visitas en consultas reales.",
    features: [
      "Sitio corporativo profesional",
      "Arquitectura orientada a conversión",
      "Hasta 6 páginas o secciones",
      "Páginas de servicios y empresa",
      "Formularios de cotización",
      "Botón de WhatsApp",
      "Galerías",
      "Blog básico si el proyecto lo requiere",
      "Optimización de velocidad",
      "SEO técnico inicial",
      "Google Analytics y Search Console",
      "Preparado para integraciones futuras",
    ],
    cta: "Cotizar mi página",
    tag: "Más solicitado",
    deadline: "3 a 4 semanas",
  },
  {
    id: "empresa",
    name: "Plan Empresa",
    block: "web",
    amount: PLAN_PRICE_AMOUNTS.empresa,
    price: fromPrice(PLAN_PRICE_AMOUNTS.empresa),
    audience: "Empresas, instituciones y organizaciones con oferta amplia.",
    summary:
      "Arquitectura web empresarial con diseño propio, integraciones básicas y base para crecer hacia un panel.",
    features: [
      "Arquitectura web empresarial",
      "Diseño personalizado",
      "Mayor número de páginas",
      "Formularios avanzados",
      "Catálogo básico cuando corresponda",
      "Analytics y Search Console",
      "SEO técnico avanzado inicial",
      "Integraciones básicas",
      "Optimización de rendimiento",
      "Componentes reutilizables",
      "Preparación para panel administrativo",
      "Seguridad y buenas prácticas",
    ],
    cta: "Cotizar mi página",
    deadline: "4 a 6 semanas",
  },
  {
    id: "ecommerce",
    name: "Ecommerce Profesional",
    block: "ecommerce",
    amount: PLAN_PRICE_AMOUNTS.ecommerce,
    price: fromPrice(PLAN_PRICE_AMOUNTS.ecommerce),
    audience: "Negocios que venden en línea con pago y despacho.",
    summary:
      "Tienda con catálogo administrable, carrito, pagos chilenos y panel para gestionar productos y pedidos.",
    features: [
      "Catálogo administrable con categorías",
      "Carrito y checkout",
      "Gestión de productos",
      "Gestión básica de stock",
      "Integración con Flow, Webpay o Mercado Pago según alcance",
      "Correos transaccionales",
      "Panel administrativo",
      "SEO para productos",
      "Analytics de ecommerce",
      "Responsive completo",
      "Seguridad",
      "Preparado para integraciones externas",
    ],
    cta: "Cotizar mi tienda",
    deadline: "5 a 8 semanas",
  },
  {
    id: "sistema",
    name: "Sistema Web Profesional",
    block: "sistemas",
    amount: PLAN_PRICE_AMOUNTS.sistema,
    price: fromPrice(PLAN_PRICE_AMOUNTS.sistema),
    audience: "Negocios que necesitan operar, no solo mostrarse.",
    summary:
      "Software con usuarios, base de datos y panel para gestionar registros, reportes y procesos internos.",
    features: [
      "Usuarios y login",
      "Base de datos propia",
      "Panel administrativo",
      "Roles",
      "Formularios y registros",
      "Dashboard",
      "Reportes",
      "Exportación a PDF y Excel",
      "Notificaciones",
      "Historial de actividad",
      "Gestión operacional básica",
    ],
    cta: "Analizar mi sistema",
    requiresDiscovery: true,
    deadline: "Desde 8 semanas, por etapas",
  },
  {
    id: "avanzado",
    name: "Sistema Avanzado",
    block: "sistemas",
    amount: PLAN_PRICE_AMOUNTS.avanzado,
    price: fromPrice(PLAN_PRICE_AMOUNTS.avanzado),
    audience: "Operaciones con varios procesos y equipos involucrados.",
    summary:
      "Plataforma multimódulo con permisos avanzados, automatizaciones, trazabilidad e integraciones externas.",
    features: [
      "Múltiples módulos",
      "Roles y permisos avanzados",
      "Dashboard ejecutivo",
      "Automatizaciones",
      "APIs",
      "Gestión documental",
      "Trazabilidad",
      "Historial de acciones",
      "Reportería avanzada",
      "Exportaciones",
      "Alertas",
      "Flujos de aprobación",
      "Integraciones externas",
      "Multiusuario",
    ],
    cta: "Analizar mi sistema",
    requiresDiscovery: true,
    deadline: "Desde 10 semanas, por etapas",
  },
  {
    id: "intranet",
    name: "Intranet Corporativa Pro",
    block: "corporativo",
    amount: PLAN_PRICE_AMOUNTS.intranet,
    price: fromPrice(PLAN_PRICE_AMOUNTS.intranet),
    audience: "Empresas que necesitan centralizar personas, documentos y procesos.",
    summary:
      "Portal interno con perfiles, documentación, solicitudes, aprobaciones y auditoría para toda la organización.",
    features: [
      "Portal interno",
      "Usuarios y perfiles",
      "Roles y permisos",
      "Organigrama",
      "Noticias internas y comunicados",
      "Documentación y procedimientos",
      "Formularios internos",
      "Solicitudes y aprobaciones",
      "Calendario",
      "Gestión de archivos",
      "Dashboard",
      "Notificaciones",
      "Auditoría",
      "Buscador interno",
      "Gestión multiárea",
      "Exportaciones",
      "Integraciones con servicios externos",
    ],
    cta: "Solicitar levantamiento",
    requiresDiscovery: true,
    deadline: "Desde 12 semanas, por etapas",
  },
  {
    id: "operacional",
    name: "Plataforma de Control Operacional",
    block: "corporativo",
    amount: PLAN_PRICE_AMOUNTS.operacional,
    price: fromPrice(PLAN_PRICE_AMOUNTS.operacional),
    audience: "Empresas con sucursales, flotas, activos o personal en terreno.",
    summary:
      "Control de operaciones distribuidas: tareas, incidencias, evidencias, activos y KPI en un solo lugar.",
    features: [
      "Control operacional por sucursal",
      "Personal y turnos",
      "Tareas e incidencias",
      "Checklist con evidencias y fotografías",
      "Documentos asociados",
      "Activos y equipos",
      "Mantenimiento y órdenes de trabajo",
      "KPI y dashboard gerencial",
      "Alertas automáticas",
      "Auditoría",
      "Georreferencia cuando corresponda",
      "Reportes en PDF y Excel",
      "API",
      "Roles avanzados",
      "Historial completo de cambios",
    ],
    cta: "Solicitar levantamiento",
    requiresDiscovery: true,
    deadline: "Desde 16 semanas, por etapas",
  },
  {
    id: "corporativa",
    name: "Plataforma Corporativa Integrada",
    block: "corporativo",
    amount: PLAN_PRICE_AMOUNTS.corporativa,
    price: fromPrice(PLAN_PRICE_AMOUNTS.corporativa),
    audience: "Organizaciones que necesitan centralizar varios departamentos.",
    summary:
      "Una sola plataforma para operaciones, personas, clientes, proveedores y documentación, con reportería ejecutiva.",
    features: [
      "Operaciones y recursos humanos",
      "Clientes y proveedores",
      "Documentos e inventario",
      "Activos",
      "Solicitudes y aprobaciones",
      "KPI y reportería ejecutiva",
      "Dashboards",
      "Automatizaciones",
      "Integraciones por API",
      "Conexión con CRM o ERP",
      "Microsoft 365 y Google Workspace",
      "WhatsApp Business y correo",
      "Firma y gestión documental",
      "Roles empresariales",
      "Multiempresa y multisucursal",
      "Trazabilidad y registros de auditoría",
      "Flujos automáticos",
    ],
    cta: "Solicitar levantamiento",
    tag: "Desarrollo corporativo",
    requiresDiscovery: true,
    deadline: "Desde 20 semanas, por etapas",
  },
  {
    id: "enterprise",
    name: "Enterprise 360",
    block: "corporativo",
    amount: PLAN_PRICE_AMOUNTS.enterprise,
    price: fromPrice(PLAN_PRICE_AMOUNTS.enterprise),
    audience: "Organizaciones con varios sistemas que deben conversar entre sí.",
    summary:
      "Arquitectura y desarrollo empresarial a medida. No es un paquete: se diseña sobre la operación real y se construye por etapas.",
    features: [
      "Plataforma completa personalizada",
      "Múltiples sistemas interconectados",
      "Arquitectura modular",
      "Integraciones empresariales",
      "APIs privadas",
      "Microservicios cuando realmente son necesarios",
      "Gran cantidad de roles y áreas",
      "Multiempresa y multisucursal",
      "Auditoría integral",
      "Seguridad avanzada",
      "Automatización de procesos",
      "Business Intelligence y dashboards ejecutivos",
      "Workflows",
      "IA aplicada a procesos internos",
      "Gestión documental avanzada",
      "Notificaciones multicanal",
      "Integración con sistemas existentes",
      "Desarrollo por etapas",
    ],
    cta: "Solicitar levantamiento corporativo",
    tag: "Desarrollo corporativo",
    requiresDiscovery: true,
    deadline: "Por etapas, según arquitectura",
  },
];

/** Compatibilidad con los consumidores que solo necesitan nombre y precio. */
export const PLANS: PricedItem[] = PLAN_CATALOG.map((plan) => ({
  name: plan.name,
  price: plan.price,
}));

export function getPlan(id: PlanId): Plan {
  const plan = PLAN_CATALOG.find((item) => item.id === id);
  if (!plan) throw new Error(`Plan desconocido: ${id}`);
  return plan;
}

export const plansByBlock = (block: PlanBlock) =>
  PLAN_CATALOG.filter((plan) => plan.block === block);

// ---------------------------------------------------------------------------
// Servicios adicionales
// ---------------------------------------------------------------------------

/**
 * Montos de los adicionales. La calculadora y el cotizador leen de aquí, así que
 * un cambio de precio se propaga solo. Las claves antiguas se conservan para no
 * romper a los consumidores existentes.
 */
export const ADDON_PRICE_AMOUNTS = {
  // Funcionalidades web
  extraSection: 49990,
  extraPage: 79990,
  advancedForm: 99990,
  multiStepForm: 199990,
  userLogin: 399990,
  blog: 249990,
  multiLanguage: 299990,
  advancedSearch: 249990,
  clientArea: 499990,
  // Ecommerce
  products20: 79990,
  products50: 149990,
  products100: 249990,
  manageableCatalog: 349990,
  stock: 399990,
  coupons: 149990,
  logistics: 299990,
  cartRecovery: 349990,
  // Paneles y sistemas
  miniAdminPanel: 499990,
  fullAdminPanel: 1290000,
  booking: 649990,
  dashboardReports: 549990,
  roles: 399990,
  auditLog: 449990,
  approvals: 649990,
  docManagement: 799990,
  multiBranch: 899990,
  // Integraciones
  payments: 199990,
  customApi: 499990,
  crm: 449990,
  whatsappAutomation: 349990,
  erp: 899990,
  workspace: 699990,
  sso: 899990,
  webhooks: 299990,
  // WhatsApp y comunicación
  whatsappButton: 49990,
  whatsappForm: 99990,
  whatsappNotifications: 349990,
  whatsappChatbot: 549990,
  followupAutomation: 499990,
  // SEO, analítica y reportería
  advancedSeo: 249990,
  technicalSeo: 349990,
  seoMonthly: 199990,
  pdfGenerator: 349990,
  excelExport: 149990,
  advancedAnalytics: 299990,
} as const;

export type AddonId = keyof typeof ADDON_PRICE_AMOUNTS;

export type AddonCategory =
  | "IA"
  | "WhatsApp y comunicación"
  | "Funcionalidades web"
  | "Ecommerce"
  | "Paneles y sistemas"
  | "Integraciones"
  | "SEO, analítica y reportería";

export type Addon = {
  id: AddonId;
  name: string;
  category: AddonCategory;
  amount: number;
  price: string;
  /** Costo recurrente cuando el servicio lo requiere. */
  monthlyAmount?: number;
  monthly?: string;
  note?: string;
};

const addon = (
  id: AddonId,
  name: string,
  category: AddonCategory,
  extra: { monthlyAmount?: number; note?: string } = {},
): Addon => ({
  id,
  name,
  category,
  amount: ADDON_PRICE_AMOUNTS[id],
  price: fromPrice(ADDON_PRICE_AMOUNTS[id]),
  monthlyAmount: extra.monthlyAmount,
  monthly: extra.monthlyAmount ? monthlyPrice(extra.monthlyAmount) : undefined,
  note: extra.note,
});

export const ADDON_CATALOG: Addon[] = [
  // Funcionalidades web
  addon("extraSection", "Sección adicional", "Funcionalidades web"),
  addon("extraPage", "Página adicional", "Funcionalidades web"),
  addon("advancedForm", "Formulario avanzado", "Funcionalidades web"),
  addon("multiStepForm", "Formulario multipaso", "Funcionalidades web"),
  addon("userLogin", "Login de usuarios", "Funcionalidades web"),
  addon("blog", "Blog administrable", "Funcionalidades web"),
  addon("multiLanguage", "Sistema multiidioma", "Funcionalidades web"),
  addon("advancedSearch", "Buscador avanzado", "Funcionalidades web"),
  addon("clientArea", "Área privada para clientes", "Funcionalidades web"),
  // WhatsApp y comunicación
  addon("whatsappButton", "Botón de WhatsApp personalizado", "WhatsApp y comunicación", {
    note: "precio cerrado",
  }),
  addon("whatsappForm", "Formulario conectado a WhatsApp", "WhatsApp y comunicación"),
  addon("whatsappNotifications", "Notificaciones por WhatsApp Business API", "WhatsApp y comunicación", {
    monthlyAmount: 59990,
    note: "el consumo de mensajes lo cobra Meta por separado",
  }),
  addon("whatsappChatbot", "Chatbot de WhatsApp", "WhatsApp y comunicación", {
    monthlyAmount: 79990,
    note: "el consumo de mensajes lo cobra Meta por separado",
  }),
  addon("followupAutomation", "Automatización de seguimiento", "WhatsApp y comunicación"),
  // Ecommerce
  addon("products20", "Carga inicial de hasta 20 productos", "Ecommerce"),
  addon("products50", "Carga inicial de hasta 50 productos", "Ecommerce"),
  addon("products100", "Carga inicial de hasta 100 productos", "Ecommerce"),
  addon("manageableCatalog", "Catálogo administrable", "Ecommerce"),
  addon("stock", "Gestión de stock", "Ecommerce"),
  addon("coupons", "Cupones y promociones", "Ecommerce"),
  addon("logistics", "Integración logística y despacho", "Ecommerce"),
  addon("cartRecovery", "Recuperación de carrito y automatización", "Ecommerce"),
  // Paneles y sistemas
  addon("miniAdminPanel", "Mini panel administrativo", "Paneles y sistemas"),
  addon("fullAdminPanel", "Panel administrativo completo", "Paneles y sistemas"),
  addon("booking", "Sistema de reservas", "Paneles y sistemas"),
  addon("dashboardReports", "Dashboard y estadísticas", "Paneles y sistemas"),
  addon("roles", "Roles y permisos avanzados", "Paneles y sistemas"),
  addon("auditLog", "Registro de auditoría", "Paneles y sistemas"),
  addon("approvals", "Workflow de aprobaciones", "Paneles y sistemas"),
  addon("docManagement", "Gestión documental", "Paneles y sistemas"),
  addon("multiBranch", "Gestión multisucursal", "Paneles y sistemas"),
  // Integraciones
  addon("payments", "Integración de pagos (Flow, Webpay, Mercado Pago)", "Integraciones", {
    note: "las comisiones por venta las cobra la pasarela",
  }),
  addon("customApi", "API personalizada", "Integraciones"),
  addon("crm", "Integración con CRM", "Integraciones"),
  addon("whatsappAutomation", "Integración WhatsApp API y automatización", "Integraciones"),
  addon("erp", "Integración con ERP", "Integraciones"),
  addon("workspace", "Integración Microsoft 365 o Google Workspace", "Integraciones", {
    note: "las licencias las contrata la empresa",
  }),
  addon("sso", "SSO y autenticación empresarial", "Integraciones"),
  addon("webhooks", "Webhooks e integración entre plataformas", "Integraciones"),
  // SEO, analítica y reportería
  addon("advancedSeo", "SEO inicial avanzado", "SEO, analítica y reportería"),
  addon("technicalSeo", "SEO técnico avanzado", "SEO, analítica y reportería"),
  addon("seoMonthly", "SEO mensual", "SEO, analítica y reportería", { monthlyAmount: 199990 }),
  addon("pdfGenerator", "Generador de PDF", "SEO, analítica y reportería"),
  addon("excelExport", "Exportación a Excel y PDF", "SEO, analítica y reportería"),
  addon("advancedAnalytics", "Analítica avanzada y eventos", "SEO, analítica y reportería"),
];

/** Compatibilidad: lista plana de nombre y precio. */
export const ADDONS: PricedItem[] = ADDON_CATALOG.map((item) => ({
  name: item.name,
  price: item.price,
  note: item.note,
}));

export const addonsByCategory = (category: AddonCategory) =>
  ADDON_CATALOG.filter((item) => item.category === category);

export const ADDON_CATEGORIES: AddonCategory[] = [
  "Funcionalidades web",
  "WhatsApp y comunicación",
  "Ecommerce",
  "Paneles y sistemas",
  "Integraciones",
  "SEO, analítica y reportería",
];

// ---------------------------------------------------------------------------
// Inteligencia artificial
// ---------------------------------------------------------------------------

export type AiService = {
  name: string;
  setup: string;
  setupAmount: number;
  monthly?: string;
  monthlyAmount?: number;
  tag?: "Más solicitado" | "Recomendado";
  description: string;
};

const aiService = (
  name: string,
  setupAmount: number,
  monthlyAmount: number,
  description: string,
  tag?: AiService["tag"],
): AiService => ({
  name,
  setup: fromPrice(setupAmount),
  setupAmount,
  monthly: monthlyPrice(monthlyAmount),
  monthlyAmount,
  description,
  tag,
});

export const AI_SERVICES: AiService[] = [
  aiService(
    "Chat IA informativo para página web",
    499990,
    69990,
    "Asistente que responde preguntas frecuentes con la información del negocio, captura datos de contacto y deriva a WhatsApp o formulario.",
  ),
  aiService(
    "Asistente IA comercial de ventas y atención",
    1190000,
    129990,
    "Atención permanente con respuestas comerciales, calificación de clientes, registro de oportunidades, panel de prospectos y derivación a ejecutivo.",
    "Más solicitado",
  ),
  aiService(
    "IA para generar cotizaciones o pedidos",
    1690000,
    179990,
    "Conversa, selecciona productos o servicios, calcula un preliminar, genera la solicitud de cotización en PDF y la registra en el panel.",
    "Recomendado",
  ),
  aiService(
    "IA omnicanal Web y WhatsApp",
    2490000,
    249990,
    "Atención desde web y WhatsApp con historial centralizado, base de conocimiento compartida, flujos automatizados y estadísticas.",
  ),
  aiService(
    "Copiloto IA interno empresarial",
    3490000,
    349990,
    "Asistente conectado a la documentación y los datos internos de la empresa para responder consultas del equipo y apoyar procesos operativos.",
  ),
];

// ---------------------------------------------------------------------------
// Mantención y continuidad
// ---------------------------------------------------------------------------

export const MAINTENANCE_PRICE_AMOUNTS = {
  basic: 49990,
  professional: 99990,
  ecommerce: 169990,
  system: 299990,
  corporate: 499990,
  enterprise: 799990,
} as const;

export type MaintenancePlan = PricedItem & { amount: number; includes: string[] };

export const MAINTENANCE_CATALOG: MaintenancePlan[] = [
  {
    name: "Mantención Web Básica",
    amount: MAINTENANCE_PRICE_AMOUNTS.basic,
    price: monthlyPrice(MAINTENANCE_PRICE_AMOUNTS.basic),
    includes: [
      "Actualizaciones de seguridad",
      "Respaldos periódicos",
      "Monitoreo de disponibilidad",
      "Cambios menores de texto e imágenes",
    ],
  },
  {
    name: "Mantención Web Profesional",
    amount: MAINTENANCE_PRICE_AMOUNTS.professional,
    price: monthlyPrice(MAINTENANCE_PRICE_AMOUNTS.professional),
    includes: [
      "Todo lo de la mantención básica",
      "Ajustes de contenido y secciones",
      "Revisión de rendimiento",
      "Informe mensual",
    ],
  },
  {
    name: "Mantención Ecommerce",
    amount: MAINTENANCE_PRICE_AMOUNTS.ecommerce,
    price: monthlyPrice(MAINTENANCE_PRICE_AMOUNTS.ecommerce),
    includes: [
      "Todo lo de la mantención profesional",
      "Soporte de catálogo y pedidos",
      "Revisión de pasarela de pagos",
      "Seguimiento de errores de compra",
    ],
  },
  {
    name: "Mantención Sistema Web",
    amount: MAINTENANCE_PRICE_AMOUNTS.system,
    price: monthlyPrice(MAINTENANCE_PRICE_AMOUNTS.system),
    includes: [
      "Soporte funcional del sistema",
      "Corrección de errores",
      "Respaldos y monitoreo",
      "Ajustes menores de configuración",
    ],
  },
  {
    name: "Soporte Corporativo",
    amount: MAINTENANCE_PRICE_AMOUNTS.corporate,
    price: monthlyPrice(MAINTENANCE_PRICE_AMOUNTS.corporate),
    includes: [
      "Todo lo del soporte de sistema",
      "Atención prioritaria",
      "Acompañamiento a usuarios internos",
      "Revisión periódica de la operación",
    ],
  },
  {
    name: "Soporte Enterprise",
    amount: MAINTENANCE_PRICE_AMOUNTS.enterprise,
    price: monthlyPrice(MAINTENANCE_PRICE_AMOUNTS.enterprise),
    includes: [
      "Todo lo del soporte corporativo",
      "Tiempos de respuesta acordados",
      "Coordinación con proveedores externos",
      "Planificación de evolución por etapas",
    ],
  },
];

/**
 * Qué NO cubre una mantención. Se publica para evitar la discusión de "pensé que
 * estaba incluido": desarrollar algo nuevo es un proyecto, no soporte.
 */
export const MAINTENANCE_EXCLUSIONS = [
  "Módulos, secciones o funcionalidades nuevas",
  "Rediseños completos",
  "Integraciones que no existían al momento de la entrega",
  "Migraciones a otra plataforma",
  "Licencias, hosting, dominios y servicios de terceros",
  "Consumo de inteligencia artificial y mensajería",
];

/** Compatibilidad con los consumidores anteriores. */
export const MAINTENANCE: PricedItem[] = MAINTENANCE_CATALOG.map((item) => ({
  name: item.name,
  price: item.price,
}));
