import { z } from "zod";
import {
  ADDON_CATALOG,
  ADDON_PRICE_AMOUNTS,
  PLAN_CATALOG,
  type AddonId,
  type PlanId,
} from "@/config/pricing";

export const CATALOG_VERSION = "08-11-2026.1";
export const QUOTE_TERMS = {
  delivery:
    "Días hábiles de desarrollo. El plazo comienza cuando se confirma el pago y recibimos todos los textos, imágenes, accesos y decisiones de diseño. Las esperas por información o aprobación del cliente suspenden el plazo. No incluye los tiempos de aprobación de proveedores externos.",
  changes:
    "Incluye dos rondas de ajustes sobre el alcance contratado, con observaciones consolidadas por ronda. Una ronda permite corregir textos, imágenes, colores y distribución; nuevas páginas, funciones o cambios de objetivo se cotizan y aprueban por separado antes de ejecutarlos.",
  exclusions:
    "No incluye dominio, hosting, cuentas de correo, licencias, fotografías, redacción, traducciones, consumo de IA, SMS, WhatsApp API ni comisiones de pago. El cliente contrata esos servicios directamente. No se activarán cobros adicionales sin aceptación expresa.",
  handover:
    "Entrega del código desarrollado para el proyecto, accesos del cliente, guía de uso y una sesión remota de entrega de hasta 60 minutos. Las herramientas de terceros conservan sus propias licencias. Incluye 30 días corridos para corregir fallas reproducibles del alcance entregado; no incluye nuevas funciones ni mantenimiento mensual.",
  payment:
    "Pago único del 100% del desarrollo seleccionado, en pesos chilenos. El IVA se muestra por separado. Esta compra no activa suscripciones. La contratación corresponde exclusivamente a los entregables y límites del resumen aceptado.",
} as const;

type ClosedPlan = {
  id: PlanId;
  name: string;
  amount: number;
  summary: string;
  days: [number, number];
  includes: string[];
  excludes: string[];
  includedAddons: AddonId[];
};
const plan = (
  id: PlanId,
  days: [number, number],
  includes: string[],
  excludes: string[],
  includedAddons: AddonId[] = [],
): ClosedPlan => {
  const source = PLAN_CATALOG.find((p) => p.id === id)!;
  return {
    id,
    name: source.name,
    amount: source.amount,
    summary: source.audience,
    days,
    includes,
    excludes,
    includedAddons,
  };
};
const common = [
  "Diseño adaptable a móvil y computador, en español.",
  "Un formulario de contacto de hasta 5 campos y un botón de WhatsApp.",
  "SEO técnico inicial: títulos, descripciones, sitemap e indexabilidad. Conexión de una propiedad de Analytics.",
  "Publicación en un dominio y hosting aportados por el cliente; configuración de HTTPS cuando el proveedor lo soporte.",
];
export const CLOSED_PLANS: ClosedPlan[] = [
  plan(
    "web-basica",
    [5, 10],
    [
      "Una página con hasta 4 secciones: inicio, servicios, empresa y contacto.",
      "Carga de hasta 8 imágenes y 1.500 palabras aportadas por el cliente.",
      ...common,
    ],
    ["No incluye panel de edición, blog, catálogo, carrito ni cuentas de usuarios."],
    ["whatsappButton"],
  ),
  plan(
    "emprendedor",
    [10, 15],
    [
      "Hasta 4 páginas, con máximo 5 secciones por página.",
      "Galería de hasta 20 imágenes, mapa de una ubicación y hasta 3.000 palabras aportadas por el cliente.",
      ...common,
    ],
    ["No incluye panel de edición, blog, catálogo administrable ni compra online."],
    ["whatsappButton"],
  ),
  plan(
    "pyme",
    [15, 20],
    [
      "Hasta 6 páginas, con máximo 5 secciones por página; carga de hasta 30 imágenes y 5.000 palabras.",
      "Un formulario de cotización de hasta 10 campos y un destinatario.",
      "Blog básico administrable: título, texto, portada y categoría; carga inicial de 3 artículos aportados por el cliente.",
      "Conexión de Search Console y optimización inicial de imágenes.",
      ...common,
    ],
    ["No incluye tienda, integraciones con sistemas externos ni redacción de artículos."],
    ["whatsappButton", "advancedForm", "blog"],
  ),
  plan(
    "empresa",
    [20, 30],
    [
      "Hasta 10 páginas, con máximo 5 secciones por página; carga de hasta 50 imágenes y 8.000 palabras.",
      "Hasta 2 formularios de 10 campos y 2 destinatarios por formulario.",
      "Catálogo informativo de hasta 20 productos, sin administración ni pedidos online.",
      "Conexión de Search Console, mapa y enlaces a redes sociales; componentes preparados para ampliaciones.",
      ...common,
    ],
    ["No incluye panel administrativo, ERP, CRM, cuentas privadas, blog ni pasarela de pago."],
    ["whatsappButton", "advancedForm"],
  ),
  plan(
    "catalogo",
    [15, 25],
    [
      "Hasta 5 páginas y catálogo administrable con hasta 10 categorías.",
      "Carga inicial de 10 productos simples: nombre, descripción, precio y hasta 3 fotos por producto.",
      "Un administrador; gestión de productos y categorías. Selección de productos y envío del pedido a un número de WhatsApp.",
      ...common,
    ],
    ["No incluye pasarela, stock automático, variantes, ERP ni transportistas."],
    ["whatsappButton", "manageableCatalog", "miniAdminPanel"],
  ),
  plan(
    "ecommerce",
    [25, 40],
    [
      "Hasta 6 páginas y tienda administrable con hasta 10 categorías y 20 productos simples cargados.",
      "Carrito, registro de pedidos y una pasarela: Flow, Webpay o Mercado Pago, usando la cuenta aprobada del cliente.",
      "Un administrador, stock por producto y correos de pedido recibido y pago confirmado.",
      "Un origen de despacho, retiro y tarifas fijas para hasta 5 zonas; medición de compra en Analytics.",
      ...common,
    ],
    [
      "No incluye marketplace, suscripciones, facturación electrónica, variantes complejas, sincronización con ERP ni tarifas de transportistas en tiempo real.",
    ],
    ["whatsappButton", "manageableCatalog", "miniAdminPanel", "payments", "stock"],
  ),
];

type ClosedAddon = {
  id: AddonId;
  name: string;
  category: string;
  amount: number;
  days: number;
  scope: string;
  excludes: string;
  max: number;
  plans?: PlanId[];
  conflicts?: AddonId[];
};
const extra = (
  id: AddonId,
  days: number,
  scope: string,
  excludes: string,
  options: Partial<Pick<ClosedAddon, "max" | "plans" | "conflicts">> = {},
): ClosedAddon => {
  const source = ADDON_CATALOG.find((a) => a.id === id)!;
  return {
    id,
    name: source.name,
    category: source.category,
    amount: ADDON_PRICE_AMOUNTS[id],
    days,
    scope,
    excludes,
    max: 1,
    ...options,
  };
};
const shops: PlanId[] = ["catalogo", "ecommerce"];
export const CLOSED_ADDONS: ClosedAddon[] = [
  extra(
    "extraSection",
    1,
    "Una sección adicional de hasta 400 palabras, 3 imágenes y un botón en una página existente.",
    "No incluye una URL nueva ni funciones a medida.",
    { max: 8 },
  ),
  extra(
    "extraPage",
    2,
    "Una página adicional de hasta 5 secciones, 800 palabras y 5 imágenes, con la misma línea gráfica.",
    "No incluye módulos, formularios nuevos ni redacción.",
    { max: 10 },
  ),
  extra(
    "advancedForm",
    3,
    "Un formulario de hasta 10 campos, validación, protección antispam y envío a hasta 2 correos.",
    "No incluye archivos adjuntos, firma digital ni integración con CRM.",
    { conflicts: ["multiStepForm"] },
  ),
  extra(
    "multiStepForm",
    5,
    "Un formulario de hasta 5 pasos y 20 campos, con 3 condiciones de visibilidad y envío del resumen por correo.",
    "No incluye cálculo de precios, firma digital, pagos ni integraciones externas.",
    { conflicts: ["advancedForm"] },
  ),
  extra(
    "blog",
    5,
    "Blog con un administrador, categorías y editor de título, texto y portada; carga inicial de 3 artículos entregados.",
    "No incluye redacción, comentarios ni publicación recurrente.",
  ),
  extra(
    "multiLanguage",
    6,
    "Un idioma adicional, selector de idioma y adaptación de hasta 10 páginas del plan; traducciones aportadas por el cliente.",
    "No incluye traducción profesional ni traducción automática de productos o artículos.",
  ),
  extra(
    "whatsappForm",
    2,
    "Un formulario de hasta 5 campos que prepara el mensaje para abrir WhatsApp en un número.",
    "El visitante confirma el envío. No incluye API, chatbot ni envío automático.",
  ),
  extra(
    "products20",
    2,
    "Carga de hasta 20 productos simples adicionales, hasta 3 fotos por producto, desde una planilla completa del cliente.",
    "No incluye fotografía, redacción, variantes ni actualizaciones posteriores.",
    { plans: shops, conflicts: ["products50", "products100"] },
  ),
  extra(
    "products50",
    4,
    "Carga de hasta 50 productos simples adicionales, hasta 3 fotos por producto, desde una planilla completa del cliente.",
    "No incluye fotografía, redacción, variantes ni actualizaciones posteriores.",
    { plans: shops, conflicts: ["products20", "products100"] },
  ),
  extra(
    "products100",
    7,
    "Carga de hasta 100 productos simples adicionales, hasta 3 fotos por producto, desde una planilla completa del cliente.",
    "No incluye fotografía, redacción, variantes ni actualizaciones posteriores.",
    { plans: shops, conflicts: ["products20", "products50"] },
  ),
  extra(
    "manageableCatalog",
    8,
    "Catálogo con 10 categorías, 10 productos simples cargados y un administrador; edición de nombre, precio, descripción y hasta 3 fotos.",
    "No incluye carrito, pagos, control de stock ni importación automática.",
  ),
  extra(
    "coupons",
    3,
    "Cupones de descuento por monto o porcentaje, vencimiento, compra mínima y límite total de usos.",
    "No incluye puntos, fidelización, combinaciones de promociones ni convenios personalizados.",
    { plans: ["ecommerce"] },
  ),
  extra(
    "advancedSearch",
    4,
    "Buscador de productos por nombre y categoría con hasta 3 filtros basados en atributos existentes.",
    "No incluye búsqueda semántica, IA ni fuentes externas.",
    { plans: shops },
  ),
  extra(
    "payments",
    5,
    "Una pasarela de pago único (Flow, Webpay o Mercado Pago), monto fijo y confirmación de estado; cuenta del cliente previamente aprobada.",
    "No incluye carrito, suscripciones, división de pagos ni comisiones de la pasarela.",
  ),
  extra(
    "advancedSeo",
    5,
    "Revisión y optimización de títulos, metadescripciones, enlaces internos y datos estructurados en hasta 10 páginas del proyecto.",
    "No incluye artículos, backlinks, campañas ni garantía de posiciones.",
    { conflicts: ["technicalSeo"] },
  ),
  extra(
    "technicalSeo",
    7,
    "Auditoría técnica y corrección de rastreo, canonicals, sitemap, redirecciones y rendimiento en hasta 20 URLs del proyecto.",
    "No incluye migración de dominio, redacción, enlaces externos ni gestión mensual.",
    { conflicts: ["advancedSeo"] },
  ),
  extra(
    "advancedAnalytics",
    4,
    "Configuración de una propiedad GA4, un contenedor GTM y hasta 8 eventos de conversión; prueba y guía de medición.",
    "No incluye campañas, servidores de etiquetado, dashboards externos ni monitoreo mensual.",
  ),
  extra(
    "pdfGenerator",
    5,
    "Una plantilla PDF de hasta 3 páginas para comprobantes de pedidos, con logo, datos y descarga desde el panel.",
    "No incluye firma electrónica, DTE ni plantillas editables por el usuario.",
    { plans: shops },
  ),
  extra(
    "excelExport",
    3,
    "Exportación de productos y pedidos en hasta 2 planillas Excel y un listado PDF, con filtros por fecha y estado disponibles.",
    "No incluye importación, fórmulas de negocio ni integración con planillas externas.",
    { plans: shops },
  ),
];

export const selectionSchema = z
  .object({
    version: z.literal(CATALOG_VERSION, {
      error: "El catálogo cambió. Actualiza la página para revisar los precios.",
    }),
    planId: z.string(),
    addons: z
      .array(z.object({ id: z.string(), quantity: z.number().int().min(1).max(10) }).strict())
      .max(25),
  })
  .strict();
export type ManualSelection = z.infer<typeof selectionSchema>;
export function addonAvailability(planId: string, item: ClosedAddon) {
  const selected = CLOSED_PLANS.find((p) => p.id === planId);
  if (selected?.includedAddons.includes(item.id)) return "Incluido en tu plan";
  if (item.plans && !item.plans.includes(planId as PlanId))
    return "Disponible con catálogo o ecommerce compatible";
  return null;
}
export function calculateManualQuote(input: unknown) {
  const selection = selectionSchema.parse(input);
  const base = CLOSED_PLANS.find((p) => p.id === selection.planId);
  if (!base) throw new Error("Selecciona un plan disponible.");
  const seen = new Set<string>();
  const addons = selection.addons.map((row) => {
    const item = CLOSED_ADDONS.find((a) => a.id === row.id);
    if (!item || seen.has(row.id) || row.quantity > item.max)
      throw new Error("Revisa los adicionales y sus cantidades.");
    seen.add(row.id);
    if (addonAvailability(base.id, item))
      throw new Error(
        `${item.name}: no corresponde cobrar este adicional en el plan seleccionado.`,
      );
    if (item.conflicts?.some((id) => selection.addons.some((a) => a.id === id)))
      throw new Error("Selecciona solo una alternativa de carga, formulario o SEO.");
    return { ...item, quantity: row.quantity, lineTotal: item.amount * row.quantity };
  });
  const net = base.amount + addons.reduce((s, a) => s + a.lineTotal, 0);
  const tax = Math.round(net * 0.19);
  const extraDays = addons.reduce((s, a) => s + a.days * a.quantity, 0);
  return {
    version: CATALOG_VERSION,
    selection,
    base,
    addons,
    net,
    tax,
    total: net + tax,
    days: [base.days[0] + extraDays, base.days[1] + extraDays] as [number, number],
    terms: QUOTE_TERMS,
  };
}
export type ManualSnapshot = ReturnType<typeof calculateManualQuote>;

export function exclusionText(value: string) {
  return value.replace(/^No incluye\s*:?\s*/i, "");
}
