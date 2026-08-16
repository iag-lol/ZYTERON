/**
 * FUENTE ÚNICA DE PRECIOS DE ZYTERON
 * ----------------------------------
 * Todos los valores son referenciales, se expresan "Desde" y NO incluyen IVA.
 * Formato de moneda chileno: $1.290.000.
 *
 * Cualquier precio publicado (página /planes, cotizador, tarjetas, conocimiento
 * de la IA, datos SEO) debe leerse desde aquí para evitar inconsistencias.
 */

export const PRICING_NOTE =
  "Todos los valores son referenciales, se expresan desde el precio indicado y no incluyen IVA. " +
  "El precio final dependerá del alcance, cantidad de pantallas, módulos, usuarios, integraciones, " +
  "automatizaciones, volumen de uso y nivel de personalización. Los servicios externos, licencias, " +
  "dominios, hosting, mensajería, inteligencia artificial y proveedores de terceros se cobran por separado.";

export const AI_CONSUMPTION_NOTE =
  "Los valores de implementación no incluyen el consumo de modelos de inteligencia artificial, " +
  "servicios externos, almacenamiento adicional ni proveedores de terceros.";

/** Precio por id de plan, usado por la página /planes y el cotizador. */
export const PLAN_PRICES: Record<string, string> = {
  "web-basica": "$79.990 + IVA",
  emprendedor: "Desde $129.990 + IVA",
  pyme: "Desde $219.990 + IVA",
  empresa: "Desde $399.990 + IVA",
  catalogo: "Desde $299.990 + IVA",
  ecommerce: "Desde $599.990 + IVA",
  sistema: "Desde $1.290.000 + IVA",
  avanzado: "Desde $2.490.000 + IVA",
};

/** Valores numéricos para cálculos y datos estructurados; mismas claves de PLAN_PRICES. */
export const PLAN_PRICE_AMOUNTS = {
  "web-basica": 79990,
  emprendedor: 129990,
  pyme: 219990,
  empresa: 399990,
  catalogo: 299990,
  ecommerce: 599990,
  sistema: 1290000,
  avanzado: 2490000,
} as const;

export const SERVICE_PRICE_AMOUNTS = {
  automationWhatsapp: 249990,
  supportTi: 49990,
} as const;

/**
 * Montos numéricos de los servicios adicionales más cotizados. Se usan en la
 * calculadora pública de precio; deben mantenerse alineados con ADDONS.
 */
export const ADDON_PRICE_AMOUNTS = {
  extraPage: 59990,
  advancedForm: 79990,
  multiStepForm: 149990,
  userLogin: 299990,
  blog: 199990,
  clientArea: 399990,
  manageableCatalog: 249990,
  stock: 249990,
  miniAdminPanel: 349990,
  fullAdminPanel: 990000,
  booking: 499990,
  dashboardReports: 399990,
  payments: 149990,
  customApi: 349990,
  whatsappAutomation: 249990,
  advancedSeo: 179990,
  pdfGenerator: 249990,
  multiLanguage: 199990,
} as const;

/** Mantención mensual referencial usada por la calculadora; alineada con MAINTENANCE. */
export const MAINTENANCE_PRICE_AMOUNTS = {
  basic: 39990,
  professional: 79990,
  ecommerce: 129990,
  system: 199990,
} as const;

export type PricedItem = { name: string; price: string; note?: string };

export const PLANS: PricedItem[] = [
  { name: "Web Básica", price: "$79.990 + IVA", note: "pago único" },
  { name: "Plan Emprendedor", price: "Desde $129.990 + IVA" },
  { name: "Plan Pyme", price: "Desde $219.990 + IVA" },
  { name: "Plan Empresa", price: "Desde $399.990 + IVA" },
  { name: "Catálogo por WhatsApp", price: "Desde $299.990 + IVA" },
  { name: "Ecommerce con carrito y pagos", price: "Desde $599.990 + IVA" },
  { name: "Sistema web administrativo", price: "Desde $1.290.000 + IVA" },
  { name: "Sistema avanzado a medida", price: "Desde $2.490.000 + IVA" },
];

/** Servicios adicionales de pago único (los más consultados). */
export const ADDONS: PricedItem[] = [
  { name: "Sección adicional", price: "Desde $39.990 + IVA" },
  { name: "Página adicional", price: "Desde $59.990 + IVA" },
  { name: "Formulario avanzado", price: "Desde $79.990 + IVA" },
  { name: "Formulario multipaso", price: "Desde $149.990 + IVA" },
  { name: "Login de usuarios", price: "Desde $299.990 + IVA" },
  { name: "Blog administrable", price: "Desde $199.990 + IVA" },
  { name: "Área privada para clientes", price: "Desde $399.990 + IVA" },
  { name: "Catálogo administrable", price: "Desde $249.990 + IVA" },
  { name: "Gestión de stock", price: "Desde $249.990 + IVA" },
  { name: "Mini panel administrativo", price: "Desde $349.990 + IVA" },
  { name: "Panel administrativo completo", price: "Desde $990.000 + IVA" },
  { name: "Sistema de reservas", price: "Desde $499.990 + IVA" },
  { name: "Dashboard y reportes", price: "Desde $399.990 + IVA" },
  { name: "Integración de pagos (Flow, Webpay, Mercado Pago)", price: "Desde $149.990 + IVA" },
  { name: "Integración API personalizada", price: "Desde $349.990 + IVA" },
  {
    name: "Automatización por WhatsApp",
    price: "Desde $249.990 + IVA",
    note: "más costos de consumo",
  },
  { name: "SEO inicial avanzado", price: "Desde $179.990 + IVA" },
  { name: "Generador de PDF", price: "Desde $249.990 + IVA" },
];

/** Servicios de Inteligencia Artificial y atención automatizada. */
export type AiService = {
  name: string;
  setup: string;
  monthly?: string;
  tag?: "Más solicitado" | "Recomendado";
  description: string;
};

export const AI_SERVICES: AiService[] = [
  {
    name: "Chat IA informativo para página web",
    setup: "Desde $399.990 + IVA",
    monthly: "Desde $49.990 + IVA / mes",
    description:
      "Asistente que responde preguntas frecuentes con la información del negocio, captura datos de contacto y deriva a WhatsApp o formulario.",
  },
  {
    name: "Asistente IA de ventas y atención al cliente",
    setup: "Desde $899.990 + IVA",
    monthly: "Desde $99.990 + IVA / mes",
    tag: "Más solicitado",
    description:
      "Atención 24/7 con respuestas comerciales, calificación de clientes, registro de oportunidades, panel de prospectos y derivación a ejecutivo.",
  },
  {
    name: "Asistente IA para generar cotizaciones o pedidos",
    setup: "Desde $1.290.000 + IVA",
    monthly: "Desde $149.990 + IVA / mes",
    tag: "Recomendado",
    description:
      "Conversa, selecciona productos o servicios, calcula un preliminar, genera la solicitud de cotización en PDF y la registra en el panel.",
  },
  {
    name: "Asistente IA omnicanal Web y WhatsApp",
    setup: "Desde $1.690.000 + IVA",
    monthly: "Desde $199.990 + IVA / mes",
    description:
      "Atención desde web y WhatsApp con historial centralizado, base de conocimiento compartida, flujos automatizados y estadísticas.",
  },
];

/** Mantención mensual. */
export const MAINTENANCE: PricedItem[] = [
  { name: "Mantención web básica", price: "Desde $39.990 + IVA / mes" },
  { name: "Mantención web profesional", price: "Desde $79.990 + IVA / mes" },
  { name: "Mantención ecommerce", price: "Desde $129.990 + IVA / mes" },
  { name: "Mantención de sistema o IA", price: "Desde $199.990 + IVA / mes" },
];
