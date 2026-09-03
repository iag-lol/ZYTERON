import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  CircleDollarSign,
  LayoutDashboard,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { PlansShowcase, type ShowcasePlan } from "@/components/planes/plans-showcase";
import { FleetPlans } from "@/components/planes/fleet-plans";
import { siteConfig } from "@/config/site";
import {
  ADDON_CATEGORIES,
  AI_CONSUMPTION_NOTE,
  AI_SERVICES,
  CORPORATE_SCOPE_NOTE,
  FLEET_CUSTOM_NOTE,
  FLEET_HARDWARE_AMOUNTS,
  FLEET_INSTALLATION_NOTE,
  FLEET_MAINTENANCE_EXCLUSIONS,
  FLEET_MONTHLY_INCLUDES,
  FLEET_PLATFORM_MAINTENANCE,
  FLEET_SCOPE_FACTORS,
  MAINTENANCE_CATALOG,
  MAINTENANCE_EXCLUSIONS,
  PLAN_CATALOG,
  PRICING_NOTE,
  addonsByCategory,
  clp,
  getPlan,
  plansByBlock,
  type Addon,
  type Plan,
  type PlanBlock,
} from "@/config/pricing";
import {
  buildAbsoluteUrl,
  buildFaqJsonLd,
  buildWebPageJsonLd,
  createPageMetadata,
} from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Precios de páginas web y sistemas en Chile",
  description:
    "Cuánto cuesta una página web en Chile: precios de desarrollo web, ecommerce, software a medida, intranet y sistemas de gestión para empresas, por nivel.",
  path: "/planes",
});

// ---------------------------------------------------------------------------
// Enlaces y utilidades
// ---------------------------------------------------------------------------

type ProjectTypeValue =
  | "web-basica"
  | "web-profesional"
  | "tienda-online"
  | "sistema-web";

const WHATSAPP_URL =
  `${siteConfig.social.whatsapp}?text=Hola%20Zyteron%2C%20quiero%20orientaci%C3%B3n%20sobre%20sus%20planes`;

/** Ancla de la sección donde vive cada bloque de la escalera. */
const BLOCK_ANCHOR: Record<PlanBlock, string> = {
  web: "paginas-web",
  ecommerce: "ecommerce",
  sistemas: "sistemas",
  corporativo: "corporativo",
};

const BLOCK_LABEL: Record<PlanBlock, string> = {
  web: "Páginas web",
  ecommerce: "Ecommerce",
  sistemas: "Sistemas y automatización",
  corporativo: "Soluciones corporativas",
};

/** Tipo de proyecto con el que el cotizador arranca precargado. */
function quoteType(plan: Plan): ProjectTypeValue {
  if (plan.block === "ecommerce") return "tienda-online";
  if (plan.block === "sistemas" || plan.block === "corporativo") return "sistema-web";
  return plan.id === "web-basica" ? "web-basica" : "web-profesional";
}

/**
 * Destino del botón de cada plan. Los proyectos corporativos parten con una
 * conversación de levantamiento, no con un formulario de precio; el resto entra
 * al cotizador con el tipo y el plan ya seleccionados y el origen conservado.
 */
function planCtaHref(plan: Plan) {
  if (plan.block === "corporativo") {
    return `/contacto?servicio=sistemas-web&plan=${plan.id}&origen=planes`;
  }
  return `/cotizador?tipo=${quoteType(plan)}&plan=${plan.id}&origen=planes`;
}

/** El único adicional de precio cerrado se muestra sin la palabra Desde. */
function addonPrice(item: Addon) {
  return item.note === "precio cerrado" ? `${clp(item.amount)} + IVA` : item.price;
}

/** Pasa "Desde $X" a "desde $X" para componer frases corridas. */
function lowerDesde(price: string) {
  return price.replace(/^Desde/, "desde");
}

const webPlans = plansByBlock("web");
const ecommercePlans = plansByBlock("ecommerce");
const systemPlans = plansByBlock("sistemas");
const corporatePlans = plansByBlock("corporativo");

const entryPlan = getPlan("web-basica");
const pymePlan = getPlan("pyme");
const storePlan = getPlan("ecommerce");
const systemPlan = getPlan("sistema");
const intranetPlan = getPlan("intranet");
const enterprisePlan = getPlan("enterprise");

// ---------------------------------------------------------------------------
// Contenido de la página
// ---------------------------------------------------------------------------

/** Resumen de la escalera en el hero: de la presencia web a la plataforma corporativa. */
const ladderSummary = [
  {
    label: "Páginas web",
    price: clp(entryPlan.amount),
    detail: "Presencia profesional y captación de consultas",
    href: `#${BLOCK_ANCHOR.web}`,
  },
  {
    label: "Ecommerce",
    price: clp(storePlan.amount),
    detail: "Catálogo, carrito, pagos y panel de pedidos",
    href: `#${BLOCK_ANCHOR.ecommerce}`,
  },
  {
    label: "Sistemas y automatización",
    price: clp(systemPlan.amount),
    detail: "Usuarios, procesos, reportes y trazabilidad",
    href: `#${BLOCK_ANCHOR.sistemas}`,
  },
  {
    label: "Plataformas corporativas",
    price: clp(intranetPlan.amount),
    detail: "Intranet, control operacional e integración de áreas",
    href: `#${BLOCK_ANCHOR.corporativo}`,
  },
];

/** Selector por necesidad: cada objetivo lleva al bloque que lo resuelve. */
const needSelector: Array<{ need: string; detail: string; href: string }> = [
  {
    need: "Presencia web",
    detail: "Existir en Google y transmitir seriedad desde el primer contacto.",
    href: `#${BLOCK_ANCHOR.web}`,
  },
  {
    need: "Generar clientes",
    detail: "Convertir visitas en consultas y cotizaciones reales.",
    href: `#${BLOCK_ANCHOR.web}`,
  },
  {
    need: "Vender online",
    detail: "Catálogo administrable, carrito y pagos chilenos.",
    href: `#${BLOCK_ANCHOR.ecommerce}`,
  },
  {
    need: "Automatizar procesos",
    detail: "Reemplazar tareas manuales, planillas y correos sueltos.",
    href: `#${BLOCK_ANCHOR.sistemas}`,
  },
  {
    need: "Crear un sistema interno",
    detail: "Usuarios, registros, estados, reportes y panel de gestión.",
    href: `#${BLOCK_ANCHOR.sistemas}`,
  },
  {
    need: "Crear una intranet",
    detail: "Portal interno con documentos, solicitudes y aprobaciones.",
    href: `#${BLOCK_ANCHOR.corporativo}`,
  },
  {
    need: "Controlar operaciones",
    detail: "Sucursales, personal en terreno, activos, evidencias y KPI.",
    href: `#${BLOCK_ANCHOR.corporativo}`,
  },
  {
    need: "Integrar varias áreas",
    detail: "Una sola plataforma para departamentos y sistemas que hoy no conversan.",
    href: `#${BLOCK_ANCHOR.corporativo}`,
  },
];

/** Qué debe tener listo el cliente antes de vender en línea. */
const ecommerceChecklist = [
  "Fotografías, precios, categorías y descripciones de los productos",
  "Definición de stock y de quién lo administra",
  "Comunas o zonas de despacho y costo por zona",
  "Cuenta con la pasarela de pago que se va a integrar",
  "Política de cambios, devoluciones y despacho",
];

/** Cómo avanza un proyecto de sistema antes de tener precio final. */
const systemProcess = [
  {
    title: "Levantamiento funcional",
    detail: "Revisamos cómo opera hoy el proceso, quién participa y dónde se pierde tiempo.",
  },
  {
    title: "Definición de alcance",
    detail: "Se acuerdan módulos, perfiles de usuario, integraciones y volumen de operación.",
  },
  {
    title: "Cotización formal",
    detail: "Con el alcance definido se emite una propuesta con valor, etapas y plazos.",
  },
  {
    title: "Desarrollo por etapas",
    detail: "Se entrega en fases utilizables, partiendo por lo que más impacta la operación.",
  },
];

/** Qué incluye realmente un proyecto corporativo: es lo que sostiene el valor. */
const corporateScopeStages = [
  {
    title: "Levantamiento funcional",
    detail: "Entrevistas con las áreas involucradas y registro de la operación real, no la teórica.",
  },
  {
    title: "Análisis de procesos",
    detail: "Se ordenan flujos, responsables, estados, excepciones y reglas de negocio.",
  },
  {
    title: "Arquitectura de la solución",
    detail: "Definición de módulos, integraciones y crecimiento futuro de la plataforma.",
  },
  {
    title: "Modelo de base de datos",
    detail: "Estructura de datos pensada para volumen, consultas y reportería posterior.",
  },
  {
    title: "Desarrollo a medida",
    detail: "Cada módulo se construye sobre el proceso de la organización, no sobre una plantilla.",
  },
  {
    title: "Seguridad",
    detail: "Autenticación, cifrado de credenciales, respaldos y buenas prácticas de acceso.",
  },
  {
    title: "Perfiles y permisos",
    detail: "Cada rol ve y ejecuta solamente lo que le corresponde dentro de la plataforma.",
  },
  {
    title: "Pruebas",
    detail: "Validación funcional por módulo y revisión con usuarios clave antes de liberar.",
  },
  {
    title: "Implementación",
    detail: "Carga inicial de datos, configuración por área y puesta en marcha controlada.",
  },
  {
    title: "Documentación",
    detail: "Manuales de uso y documentación técnica de la plataforma entregada.",
  },
  {
    title: "Capacitación cuando corresponde",
    detail: "Sesiones con los equipos que van a operar el sistema todos los días.",
  },
  {
    title: "Despliegue",
    detail: "Publicación en el entorno definido, con monitoreo y respaldos activos.",
  },
  {
    title: "Soporte posterior",
    detail: "Continuidad operativa, corrección de incidencias y evolución por etapas.",
  },
];

/**
 * Tabla comparativa por tipo de solución. Precios y plazos vienen de
 * pricing.ts, así que un cambio de tarifa se refleja aquí solo.
 */
const solutionComparison = [
  {
    type: "Landing page",
    who: "Campañas, lanzamientos y servicios que necesitan una sola página enfocada en captar contactos.",
    price: entryPlan.price,
    deadline: entryPlan.deadline,
    href: "/servicios/landing-pages-para-empresas",
    linkLabel: "Landing pages para empresas",
  },
  {
    type: "Página web corporativa",
    who: "Empresas y pymes que necesitan presentar servicios, generar confianza y recibir cotizaciones.",
    price: pymePlan.price,
    deadline: pymePlan.deadline,
    href: "/paginas-web-para-empresas",
    linkLabel: "Páginas web para empresas",
  },
  {
    type: "Tienda online",
    who: "Negocios que venden productos y necesitan catálogo, carrito y pagos en línea.",
    price: storePlan.price,
    deadline: storePlan.deadline,
    href: "/tiendas-online",
    linkLabel: "Tiendas online",
  },
  {
    type: "Sistema web a medida",
    who: "Operaciones que necesitan usuarios, registros, reportes y control de procesos internos.",
    price: systemPlan.price,
    deadline: systemPlan.deadline,
    href: "/sistemas-web",
    linkLabel: "Sistemas web a medida",
  },
  {
    type: "Plataforma corporativa",
    who: "Organizaciones que necesitan intranet, control operacional, trazabilidad e integración entre áreas.",
    price: intranetPlan.price,
    deadline: intranetPlan.deadline,
    href: "/automatizacion",
    linkLabel: "Automatización de procesos",
  },
];

const priceFaqs = [
  {
    q: "¿Cuánto cuesta una página web en Chile?",
    a: `Los valores publicados por Zyteron parten en ${entryPlan.price} para una web de presentación, ${pymePlan.price} para un sitio corporativo orientado a captar clientes y ${getPlan("empresa").price} para una arquitectura web empresarial. Son referencias: el valor final depende de páginas, contenido, administración e integraciones.`,
  },
  {
    q: "¿Cuánto cuesta un software a medida en Chile?",
    a: `Un sistema web con usuarios, base de datos y panel de gestión parte en ${lowerDesde(systemPlan.price)}, y una plataforma corporativa integrada puede llegar a ${lowerDesde(enterprisePlan.price)} según cantidad de módulos, perfiles, integraciones y volumen de operación. El valor exacto se define después del levantamiento funcional y técnico.`,
  },
  {
    q: "¿Cuánto cuesta desarrollar una intranet empresarial?",
    a: `Una intranet corporativa parte en ${lowerDesde(intranetPlan.price)} e incluye portal interno, perfiles y permisos, documentación, formularios, solicitudes con aprobaciones, notificaciones y auditoría. El valor final depende de las áreas involucradas, la cantidad de usuarios y las integraciones con los servicios que la empresa ya utiliza.`,
  },
  {
    q: "¿Cuál es la diferencia entre una página web y un sistema web?",
    a: "Una página web comunica: presenta la empresa, sus servicios y recibe consultas. Un sistema web opera: tiene usuarios con distintos niveles de acceso, base de datos, registros, estados, reportes y trazabilidad de lo que hace cada persona. Cuando la necesidad es administrar información y procesos, corresponde un sistema.",
  },
  {
    q: "¿Pueden digitalizar un proceso que hoy vive en Excel?",
    a: "Sí, es uno de los proyectos más frecuentes. En el levantamiento revisamos las planillas actuales, los campos que se usan de verdad, quién carga la información y qué reportes se necesitan, y con eso se define el sistema, la migración de los datos históricos y las etapas de puesta en marcha.",
  },
  {
    q: "¿Pueden hacer sistemas con distintos niveles de usuario?",
    a: "Sí. Los sistemas se construyen con roles y permisos, de manera que cada perfil accede solo a los módulos, registros y acciones que le corresponden. Los perfiles concretos y sus atribuciones se definen durante el levantamiento junto con la organización.",
  },
  {
    q: "¿Pueden integrarse con el software que la empresa ya usa?",
    a: "En general sí, siempre que el sistema actual disponga de API, webhooks o exportaciones. Trabajamos integraciones con pasarelas de pago, CRM, ERP, Microsoft 365, Google Workspace, WhatsApp Business y correo. La factibilidad de cada integración se confirma revisando la documentación técnica del proveedor.",
  },
  {
    q: "¿Trabajan con empresas de múltiples sucursales?",
    a: "Sí. Las plataformas pueden operar en modo multisucursal e incluso multiempresa, con información separada por unidad, permisos por sede y reportería consolidada para la gerencia. El modelo exacto se define según la estructura real de la organización.",
  },
  {
    q: "¿Pueden crear dashboards gerenciales?",
    a: "Sí. Los sistemas incluyen paneles con indicadores, filtros por periodo y exportación a PDF o Excel. Los indicadores se definen con la empresa en el levantamiento, para que el dashboard muestre las cifras con las que efectivamente se toman decisiones.",
  },
  {
    q: "¿Los sistemas permiten auditoría y trazabilidad?",
    a: "Sí. Se pueden registrar las acciones relevantes con usuario, fecha y detalle del cambio, además del historial por registro. El nivel de auditoría se ajusta a lo que la organización necesita conservar y al volumen de operación.",
  },
  {
    q: "¿Un proyecto empresarial puede desarrollarse por etapas?",
    a: "Sí, y es la forma recomendada. Se prioriza el módulo que más impacta la operación, se pone en marcha y luego se avanza con los siguientes. Así la inversión se distribuye en el tiempo y cada etapa entrega algo utilizable.",
  },
  {
    q: "¿Hay soporte después de implementar?",
    a: `Sí. La continuidad se contrata como mantención mensual, desde ${lowerDesde(MAINTENANCE_CATALOG[0].price)} para sitios web y desde ${lowerDesde(MAINTENANCE_CATALOG[3].price)} para sistemas, con planes de soporte corporativo y enterprise para plataformas críticas. Incluye monitoreo, respaldos, corrección de incidencias y acompañamiento a los usuarios según el plan.`,
  },
  {
    q: "¿Los precios publicados son finales?",
    a: "Son valores de referencia para proyectos base. El precio final se confirma en la cotización formal, según alcance, secciones, módulos, integraciones, contenido, soporte requerido y nivel de personalización.",
  },
  {
    q: "¿La web básica incluye dominio?",
    a: "El dominio .cl o .com se contrata aparte, según disponibilidad, y queda a nombre de tu empresa. Te acompañamos en la compra y en la configuración para dejarlo apuntando al sitio.",
  },
  {
    q: "¿El Plan Emprendedor es igual a la Web Básica?",
    a: `La Web Básica es una página de presentación enfocada en existir en Google y recibir consultas. El Plan Emprendedor, ${lowerDesde(getPlan("emprendedor").price)}, entrega un sitio multipágina con más secciones, galería y estructura comercial para explicar toda la oferta.`,
  },
  {
    q: "¿La tienda online incluye pagos en línea?",
    a: "El Ecommerce Profesional contempla la integración con Flow, Webpay o Mercado Pago según el alcance acordado. La cuenta con la pasarela la contrata la empresa y las comisiones por venta las cobra el proveedor de pago.",
  },
  {
    q: "¿Un sitio web incluye panel administrativo?",
    a: "Los sitios web se entregan optimizados para su objetivo comercial. Los paneles, usuarios, bases de datos y reportes pertenecen a los planes de sistema o se agregan como adicional, según lo que necesites administrar por tu cuenta.",
  },
  {
    q: "¿Puedo partir con un plan simple y luego crecer?",
    a: "Sí. La escalera está pensada exactamente para eso: se puede comenzar con una web de presentación y avanzar hacia un sitio corporativo, una tienda online o un sistema interno reutilizando el trabajo ya realizado.",
  },
  {
    q: "¿Qué costos van por separado?",
    a: PRICING_NOTE,
  },
];

/** Los tres planes destacados de la vitrina de páginas web. */
const FEATURED_WEB_IDS = ["web-basica", "pyme", "empresa"];

/** Adapta un plan del catálogo al formato resumido de la vitrina interactiva. */
function toShowcase(plan: Plan): ShowcasePlan {
  return {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    tag: plan.tag ?? BLOCK_LABEL[plan.block],
    audience: plan.audience,
    description: plan.summary,
    includes: plan.features,
    cta: plan.cta,
    quoteHref: planCtaHref(plan),
  };
}

/**
 * OfferCatalog de la página: se construye desde PLAN_CATALOG para que los datos
 * estructurados afirmen exactamente los mismos planes y valores que están
 * visibles más abajo.
 */
const planesUrl = buildAbsoluteUrl("/planes");
const organizationRef = { "@id": `${siteConfig.url}/#organization` };

const planOfferCatalogJsonLd = {
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  "@id": `${planesUrl}#price-specifications`,
  name: "Planes y precios referenciales de Zyteron",
  url: planesUrl,
  itemListElement: PLAN_CATALOG.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    description: plan.summary,
    category: BLOCK_LABEL[plan.block],
    url: `${planesUrl}#${BLOCK_ANCHOR[plan.block]}`,
    priceCurrency: "CLP",
    availability: "https://schema.org/InStock",
    seller: organizationRef,
    itemOffered: {
      "@type": "Service",
      name: plan.name,
      description: plan.summary,
      provider: organizationRef,
    },
    priceSpecification: {
      "@type": "PriceSpecification",
      priceCurrency: "CLP",
      minPrice: plan.amount,
      valueAddedTaxIncluded: false,
    },
  })),
};

// ---------------------------------------------------------------------------
// Piezas reutilizables
// ---------------------------------------------------------------------------

function PlanFeatures({ features, columns = false }: { features: string[]; columns?: boolean }) {
  return (
    <ul className={columns ? "grid gap-2 sm:grid-cols-2" : "space-y-2"}>
      {features.map((feature) => (
        <li key={feature} className="flex gap-2 text-sm leading-6 text-slate-600">
          <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  );
}

function PlanCta({ plan }: { plan: Plan }) {
  return (
    <Button asChild className="w-full bg-blue-700 font-bold text-white hover:bg-blue-800">
      <Link href={planCtaHref(plan)}>
        {plan.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </Button>
  );
}

function AddonRows({ items }: { items: Addon[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
        >
          <span className="text-sm text-slate-700">
            {item.name}
            {item.note && item.note !== "precio cerrado" ? (
              <span className="block text-xs text-slate-500">{item.note}</span>
            ) : null}
          </span>
          <span className="text-sm font-bold text-blue-700">
            {addonPrice(item)}
            {item.monthly ? <span className="block text-xs font-semibold text-slate-500">{item.monthly}</span> : null}
            {item.note === "precio cerrado" ? (
              <span className="block text-xs font-semibold text-slate-500">precio cerrado</span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function PlanesPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="planes-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/planes",
          title: "Precios de páginas web y sistemas en Chile",
          description:
            "Valores referenciales de páginas web, ecommerce, sistemas a medida y plataformas corporativas, con alcance por nivel y cotización formal según proyecto.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Planes", path: "/planes" },
          ],
        })}
      />
      <JsonLd
        id="planes-faq-schema"
        data={buildFaqJsonLd(
          priceFaqs.map((item) => ({
            question: item.q,
            answer: item.a,
          })),
        )}
      />
      <JsonLd id="planes-price-specification-schema" data={planOfferCatalogJsonLd} />

      {/* 1. Hero ------------------------------------------------------------ */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-16 sm:py-20">
        <Container className="space-y-6 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Planes y cotización profesional
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-5xl">
            Precios de páginas web y sistemas en Chile
          </h1>
          <p className="mx-auto max-w-4xl text-base text-slate-600 sm:text-lg">
            Una escalera completa de desarrollo web en Chile: desde una página profesional para existir en Google,
            {" "}{lowerDesde(entryPlan.price)}, hasta plataformas corporativas a medida para automatizar procesos,
            controlar operaciones e integrar varias áreas de la organización.
          </p>

          <ol className="mx-auto grid max-w-5xl gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
            {ladderSummary.map((step, index) => (
              <li key={step.label}>
                <a
                  href={step.href}
                  className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white/90 p-4 transition-colors hover:border-blue-300 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                >
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">
                    Nivel {index + 1}
                  </span>
                  <span className="mt-1 text-sm font-extrabold text-slate-900">{step.label}</span>
                  <span className="mt-1 text-base font-extrabold text-blue-700">Desde {step.price} + IVA</span>
                  <span className="mt-1 text-xs leading-5 text-slate-500">{step.detail}</span>
                </a>
              </li>
            ))}
          </ol>

          <p className="mx-auto max-w-4xl rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-slate-700">
            Todos los valores se expresan desde el monto indicado y no incluyen IVA. El precio final se confirma en la
            cotización formal, según alcance, módulos, integraciones y volumen de operación.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/cotizador?origen=planes">Cotizar mi proyecto</Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Hablar por WhatsApp
              </a>
            </Button>
          </div>
        </Container>
      </section>

      {/* 2. Selector por necesidad ------------------------------------------ */}
      <section className="section-alt py-14" aria-labelledby="selector-necesidad">
        <Container className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Guía rápida</p>
            <h2 id="selector-necesidad" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              ¿Qué necesita tu empresa?
            </h2>
            <p className="max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Elige el objetivo más parecido al tuyo y te llevamos directo al nivel de solución que lo resuelve.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {needSelector.map((option) => (
              <a
                key={option.need}
                href={option.href}
                className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
              >
                <span className="text-sm font-extrabold text-slate-900">{option.need}</span>
                <span className="mt-1 text-xs leading-5 text-slate-500">{option.detail}</span>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700">
                  Ver planes <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        </Container>
      </section>

      {/* 3. Bloque A: páginas web ------------------------------------------- */}
      <section id={BLOCK_ANCHOR.web} className="scroll-mt-24 bg-white py-16" aria-labelledby="bloque-web">
        <Container className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Bloque 1 · Presencia y captación</p>
            <h2 id="bloque-web" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Páginas web para empresas y pymes
            </h2>
            <p className="max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Cuatro niveles para pasar de no existir en Google a tener un sitio corporativo que genera consultas.
              Todos incluyen diseño responsive, SEO técnico base y analítica.
            </p>
          </div>

          <PlansShowcase
            featured={webPlans.filter((plan) => FEATURED_WEB_IDS.includes(plan.id)).map(toShowcase)}
            rest={webPlans.filter((plan) => !FEATURED_WEB_IDS.includes(plan.id)).map(toShowcase)}
          />

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">
                Planes de páginas web: para quién es cada uno, precio desde, plazo referencial y cómo cotizarlo
              </caption>
              <thead>
                <tr className="bg-slate-100">
                  <th scope="col" className="px-5 py-3 text-sm font-extrabold text-slate-900">Plan</th>
                  <th scope="col" className="px-5 py-3 text-sm font-extrabold text-slate-900">Para quién es</th>
                  <th scope="col" className="px-5 py-3 text-sm font-extrabold text-slate-900">Precio</th>
                  <th scope="col" className="px-5 py-3 text-sm font-extrabold text-slate-900">Plazo referencial</th>
                  <th scope="col" className="px-5 py-3 text-sm font-extrabold text-slate-900">Cotizar</th>
                </tr>
              </thead>
              <tbody>
                {webPlans.map((plan) => (
                  <tr key={plan.id} className="border-t border-slate-100 align-top">
                    <th scope="row" className="px-5 py-4 text-sm font-extrabold text-slate-900">
                      {plan.name}
                    </th>
                    <td className="px-5 py-4 leading-relaxed text-slate-600">{plan.audience}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-bold text-blue-700">{plan.price}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{plan.deadline}</td>
                    <td className="px-5 py-4">
                      <Link
                        href={planCtaHref(plan)}
                        className="inline-flex items-center gap-1 font-bold text-blue-700 hover:text-blue-800"
                      >
                        {plan.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* 4. Bloque B: ecommerce --------------------------------------------- */}
      <section id={BLOCK_ANCHOR.ecommerce} className="scroll-mt-24 section-alt py-16" aria-labelledby="bloque-ecommerce">
        <Container className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Bloque 2 · Venta en línea</p>
            <h2 id="bloque-ecommerce" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Ecommerce con catálogo, pagos y panel de pedidos
            </h2>
            <p className="max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Para vender en línea con medios de pago chilenos y administrar productos, stock y pedidos desde un panel
              propio.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            {ecommercePlans.map((plan) => (
              <article key={plan.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">
                      <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" /> Tienda online
                    </p>
                    <h3 className="mt-2 text-xl font-extrabold text-slate-900 sm:text-2xl">{plan.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{plan.summary}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-extrabold text-slate-900">{plan.price}</p>
                    <p className="text-xs text-slate-500">{plan.deadline}</p>
                  </div>
                </div>

                <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{plan.audience}</p>

                <div className="mt-5">
                  <PlanFeatures features={plan.features} columns />
                </div>

                <div className="mt-6 sm:max-w-xs">
                  <PlanCta plan={plan} />
                </div>
              </article>
            ))}

            <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900">Qué conviene tener listo antes de vender</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Mientras más ordenada llegue la información del catálogo, más rápido queda operativa la tienda.
              </p>
              <div className="mt-4 space-y-2">
                {ecommerceChecklist.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                    <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                Las comisiones por venta las cobra la pasarela de pago y la cuenta de comercio la contrata tu empresa.
              </p>
              <Link
                href="/tiendas-online"
                className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-800"
              >
                Ver cómo trabajamos las tiendas online <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </aside>
          </div>
        </Container>
      </section>

      {/* 5. Bloque C: sistemas ---------------------------------------------- */}
      <section id={BLOCK_ANCHOR.sistemas} className="scroll-mt-24 bg-white py-16" aria-labelledby="bloque-sistemas">
        <Container className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Bloque 3 · Operación y procesos</p>
            <h2 id="bloque-sistemas" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Sistemas, automatización y plataformas empresariales
            </h2>
            <p className="max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Software a medida para operar: usuarios con permisos, base de datos propia, registros, automatizaciones,
              reportería y trazabilidad. Cada proyecto parte con un levantamiento técnico y se cierra con una cotización
              formal, porque el valor depende de los módulos y del volumen real de operación.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {systemPlans.map((plan) => (
              <article
                key={plan.id}
                className="flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
              >
                <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">
                  <LayoutDashboard className="h-3.5 w-3.5" aria-hidden="true" /> Sistema web
                </p>
                <h3 className="mt-2 text-xl font-extrabold text-slate-900">{plan.name}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{plan.summary}</p>

                <div className="mt-4 border-y border-slate-100 py-4">
                  <p className="text-2xl font-extrabold text-slate-900">{plan.price}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{plan.deadline}</p>
                </div>

                <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{plan.audience}</p>

                <div className="mt-4">
                  <PlanFeatures features={plan.features} columns />
                </div>

                {plan.requiresDiscovery ? (
                  <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                    {CORPORATE_SCOPE_NOTE}
                  </p>
                ) : null}

                <div className="flex-1" />
                <div className="mt-5">
                  <PlanCta plan={plan} />
                </div>
              </article>
            ))}
          </div>

          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:grid-cols-2 lg:grid-cols-4">
            {systemProcess.map((step, index) => (
              <article key={step.title}>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-600">Etapa {index + 1}</p>
                <h3 className="mt-1 text-sm font-extrabold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-600">{step.detail}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* 6. Bloque D: soluciones corporativas -------------------------------- */}
      <section
        id={BLOCK_ANCHOR.corporativo}
        className="scroll-mt-24 border-y-4 border-blue-800 bg-slate-50 bg-grid-light py-16"
        aria-labelledby="bloque-corporativo"
      >
        <Container className="space-y-8">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-800">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" /> Bloque 4 · Desarrollo corporativo
            </p>
            <h2 id="bloque-corporativo" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Soluciones Corporativas y Control Interno
            </h2>
            <p className="max-w-5xl text-sm leading-relaxed text-slate-700 sm:text-base">
              Plataformas desarrolladas a medida para centralizar información, automatizar procesos, controlar
              operaciones y entregar trazabilidad a organizaciones que requieren herramientas más avanzadas que un
              software estándar.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {corporatePlans.map((plan) => (
              <article
                key={plan.id}
                className="flex h-full flex-col rounded-3xl border border-blue-200 border-t-4 border-t-blue-800 bg-white p-6 shadow-md shadow-blue-100/60 sm:p-7"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-extrabold text-slate-900">{plan.name}</h3>
                  {plan.tag ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                      <Sparkles className="h-3 w-3" aria-hidden="true" /> {plan.tag}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">{plan.summary}</p>

                <div className="mt-4 border-y border-slate-100 py-4">
                  <p className="text-2xl font-extrabold text-slate-900">{plan.price}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{plan.deadline}</p>
                </div>

                <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-slate-700">{plan.audience}</p>

                <div className="mt-4">
                  <PlanFeatures features={plan.features} columns />
                </div>

                {plan.requiresDiscovery ? (
                  <p className="mt-4 flex items-start gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs leading-5 text-slate-700">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
                    <span>{CORPORATE_SCOPE_NOTE}</span>
                  </p>
                ) : null}

                <div className="flex-1" />
                <div className="mt-5">
                  <PlanCta plan={plan} />
                </div>
              </article>
            ))}
          </div>

          <article className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-lg font-extrabold text-slate-900 sm:text-xl">
              Qué implica un proyecto corporativo y por qué tiene ese valor
            </h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Una plataforma corporativa no es una web con más pantallas: es un desarrollo construido sobre la operación
              real de la organización. Estas son las etapas que se ejecutan y que sostienen la inversión.
            </p>
            <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {corporateScopeStages.map((stage, index) => (
                <li key={stage.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h4 className="mt-1 text-sm font-extrabold text-slate-900">{stage.title}</h4>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{stage.detail}</p>
                </li>
              ))}
            </ol>
            <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              Los proyectos corporativos se desarrollan por etapas utilizables, de modo que la organización empieza a
              operar con el primer módulo mientras avanza el resto de la plataforma.
            </p>
          </article>
        </Container>
      </section>

      {/* 6b. Plataformas de gestión de flota --------------------------------
          Categoría propia: es el único producto que además del desarrollo lleva
          equipamiento físico y un costo mensual por vehículo, así que no puede
          mezclarse con la escalera de páginas web ni con los planes corporativos. */}
      <section id="flotas" className="scroll-mt-24 bg-white py-16" aria-labelledby="bloque-flotas">
        <Container className="space-y-8">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-blue-800">
              <Truck className="h-3.5 w-3.5" aria-hidden="true" /> Desarrollo a medida · Flotas
            </p>
            <h2 id="bloque-flotas" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Plataformas Personalizadas de Gestión de Flotas
            </h2>
            <p className="max-w-5xl text-sm leading-relaxed text-slate-700 sm:text-base">
              Software desarrollado a medida para empresas que necesitan controlar vehículos, conductores, clientes,
              servicios y operaciones desde una sola plataforma.
            </p>
            <p className="flex max-w-4xl items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs leading-5 text-slate-700">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-800" aria-hidden="true" />
              <span>{FLEET_CUSTOM_NOTE}</span>
            </p>
          </div>

          <FleetPlans />

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-7">
              <h3 className="text-lg font-extrabold text-slate-900">Infraestructura y continuidad operacional</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                El costo mensual no es una cuota administrativa: sostiene la operación de la plataforma y la recepción
                continua de datos de los equipos. Puede considerar:
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {FLEET_MONTHLY_INCLUDES.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
                    <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <h3 className="text-lg font-extrabold text-slate-900">
                Mantención mensual de plataforma · {clp(FLEET_PLATFORM_MAINTENANCE)} + IVA
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                La mantención mantiene operativo el sistema y las funcionalidades originalmente contratadas. No incluye
                de forma automática:
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {FLEET_MAINTENANCE_EXCLUSIONS.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
                Estos desarrollos adicionales se cotizan de forma independiente.
              </p>
            </article>
          </div>

          <article className="rounded-3xl border border-blue-200 bg-white p-6 shadow-sm sm:p-8">
            <h3 className="text-lg font-extrabold text-slate-900 sm:text-xl">Cada plataforma es diferente</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Los valores corresponden a precios iniciales referenciales. Cada plataforma se desarrolla según los
              procesos y necesidades de la empresa, así que el valor final puede variar dependiendo de:
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {FLEET_SCOPE_FACTORS.map((factor) => (
                <li key={factor} className="flex gap-2 text-sm leading-6 text-slate-600">
                  <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>{factor}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <h3 className="text-lg font-extrabold text-slate-900 sm:text-xl">Equipamiento GPS</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h4 className="text-sm font-extrabold text-slate-900">GPS configurado e integrado</h4>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {clp(FLEET_HARDWARE_AMOUNTS.gps)} + IVA
                  <span className="ml-1 text-xs font-semibold text-slate-500">por unidad</span>
                </p>
                <ul className="mt-3 space-y-1.5">
                  {[
                    "Equipo GPS",
                    "Configuración",
                    "Registro",
                    "Parametrización",
                    "Conexión al servidor GPS",
                    "Integración con la plataforma del cliente",
                  ].map((item) => (
                    <li key={item} className="flex gap-2 text-xs leading-5 text-slate-600">
                      <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h4 className="text-sm font-extrabold text-slate-900">Instalación profesional</h4>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {clp(FLEET_HARDWARE_AMOUNTS.installation)} + IVA
                  <span className="ml-1 text-xs font-semibold text-slate-500">por vehículo</span>
                </p>
                <p className="mt-3 text-xs leading-5 text-slate-600">
                  Para vehículos y camiones con instalación estándar.
                </p>
                <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
                  {FLEET_INSTALLATION_NOTE}
                </p>
              </div>
            </div>
          </article>
        </Container>
      </section>

      {/* 7. Bloque E: funcionalidades adicionales ---------------------------- */}
      <section id="adicionales" className="scroll-mt-24 bg-white py-16" aria-labelledby="bloque-adicionales">
        <Container className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Bloque 5 · Adicionales</p>
            <h2 id="bloque-adicionales" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Funcionalidades adicionales
            </h2>
            <p className="max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Cualquier plan se puede ampliar con inteligencia artificial, integraciones, paneles o automatizaciones.
              Estos valores se suman al proyecto base según lo que realmente necesites.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900">Inteligencia artificial aplicada al negocio</h3>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {AI_SERVICES.map((service) => (
                <article
                  key={service.name}
                  className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900">{service.name}</h4>
                    {service.tag ? (
                      <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                        {service.tag}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{service.description}</p>
                  <div className="flex-1" />
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <p className="text-base font-extrabold text-blue-700">{service.setup}</p>
                    {service.monthly ? (
                      <p className="text-xs font-semibold text-slate-500">Operación {lowerDesde(service.monthly)}</p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {AI_CONSUMPTION_NOTE}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900">Adicionales por categoría</h3>

            {/* Escritorio: tabla completa */}
            <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">
                  Funcionalidades adicionales por categoría, con su valor referencial y su costo mensual cuando aplica
                </caption>
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Adicional</th>
                    <th scope="col">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {ADDON_CATEGORIES.map((category) => (
                    <Fragment key={category}>
                      <tr className="border-t border-slate-200 bg-slate-100 first:border-t-0">
                        <th colSpan={2} scope="colgroup" className="px-5 py-3 text-sm font-extrabold text-slate-900">
                          {category}
                        </th>
                      </tr>
                      {addonsByCategory(category).map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-5 py-3 text-slate-700">
                            {item.name}
                            {item.note && item.note !== "precio cerrado" ? (
                              <span className="block text-xs text-slate-500">{item.note}</span>
                            ) : null}
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-blue-700">
                            {addonPrice(item)}
                            {item.monthly ? (
                              <span className="block text-xs font-semibold text-slate-500">{item.monthly}</span>
                            ) : null}
                            {item.note === "precio cerrado" ? (
                              <span className="block text-xs font-semibold text-slate-500">precio cerrado</span>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Móvil: acordeones nativos */}
            <div className="grid gap-3 md:hidden">
              {ADDON_CATEGORIES.map((category) => (
                <details
                  key={category}
                  className="faq-item rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-lg text-sm font-extrabold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                    {category}
                    <ChevronDown className="faq-chevron h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </summary>
                  <div className="mt-3">
                    <AddonRows items={addonsByCategory(category)} />
                  </div>
                </details>
              ))}
            </div>

            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              {PRICING_NOTE}
            </p>
          </div>
        </Container>
      </section>

      {/* 8. Bloque F: mantención -------------------------------------------- */}
      <section id="mantencion" className="scroll-mt-24 section-alt py-16" aria-labelledby="bloque-mantencion">
        <Container className="space-y-6">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <CircleDollarSign className="h-4 w-4" aria-hidden="true" /> Bloque 6 · Continuidad
            </p>
            <h2 id="bloque-mantencion" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Mantención y continuidad operativa
            </h2>
            <p className="max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Después de la entrega, la mantención mensual mantiene el proyecto seguro, respaldado y funcionando. El
              plan se elige según el tipo de solución y su criticidad.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {MAINTENANCE_CATALOG.map((plan) => (
              <article key={plan.name} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900">{plan.name}</h3>
                <p className="mt-1 text-lg font-extrabold text-blue-700">{plan.price}</p>
                <ul className="mt-3 space-y-2">
                  {plan.includes.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-slate-600">
                      <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <article className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="text-lg font-extrabold text-slate-900">Qué es soporte y qué es desarrollo nuevo</h3>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-amber-900">
              La mantención cubre la continuidad de lo que ya está entregado. Todo lo que amplía el alcance se cotiza
              como proyecto, con su propio levantamiento y plazo:
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {MAINTENANCE_EXCLUSIONS.map((item) => (
                <li key={item} className="flex gap-2 rounded-xl bg-white/70 px-4 py-2.5 text-sm text-slate-700">
                  <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href="/cotizador?tipo=soporte-ti&origen=planes">Cotizar mantención</Link>
              </Button>
              <Button asChild variant="outline" className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Consultar por WhatsApp
                </a>
              </Button>
            </div>
          </article>
        </Container>
      </section>

      {/* 9. Comparativa de tipos de solución --------------------------------- */}
      <section className="bg-white py-16" aria-labelledby="comparativa">
        <Container className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Comparativa</p>
            <h2 id="comparativa" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Qué tipo de solución corresponde a cada necesidad
            </h2>
            <p className="max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Compara las cinco familias de proyecto con su valor de entrada y su plazo referencial, y entra al detalle
              de la que calza con tu objetivo.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[820px] text-left text-sm">
              <caption className="sr-only">
                Comparación de tipos de solución: para quién es cada una, precio desde y plazo referencial de entrega
              </caption>
              <thead>
                <tr className="bg-slate-100">
                  <th scope="col" className="px-5 py-3 text-sm font-extrabold text-slate-900">Tipo de solución</th>
                  <th scope="col" className="px-5 py-3 text-sm font-extrabold text-slate-900">Para quién es</th>
                  <th scope="col" className="px-5 py-3 text-sm font-extrabold text-slate-900">Precio desde</th>
                  <th scope="col" className="px-5 py-3 text-sm font-extrabold text-slate-900">Plazo referencial</th>
                  <th scope="col" className="px-5 py-3 text-sm font-extrabold text-slate-900">Más información</th>
                </tr>
              </thead>
              <tbody>
                {solutionComparison.map((solution) => (
                  <tr key={solution.type} className="border-t border-slate-100 align-top">
                    <th scope="row" className="px-5 py-4 text-sm font-extrabold text-slate-900">
                      {solution.type}
                    </th>
                    <td className="px-5 py-4 leading-relaxed text-slate-600">{solution.who}</td>
                    <td className="whitespace-nowrap px-5 py-4 font-bold text-blue-700">{solution.price}</td>
                    <td className="px-5 py-4 text-slate-700">{solution.deadline}</td>
                    <td className="px-5 py-4">
                      <Link href={solution.href} className="font-bold text-blue-700 hover:text-blue-800">
                        {solution.linkLabel}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* 10. Preguntas frecuentes ------------------------------------------- */}
      <section className="section-alt py-16" aria-labelledby="faq-planes">
        <Container className="space-y-5">
          <h2 id="faq-planes" className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
            Preguntas frecuentes sobre precios, sistemas y desarrollo a medida
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {priceFaqs.map((item) => (
              <details key={item.q} className="faq-item rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-lg text-sm font-extrabold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                  <h3 className="text-sm font-extrabold text-slate-900">{item.q}</h3>
                  <ChevronDown className="faq-chevron h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* 11. CTA final ------------------------------------------------------- */}
      <section className="section-blue py-16 text-white">
        <Container className="space-y-4 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Solicita una propuesta formal</h2>
          <p className="mx-auto max-w-3xl text-sm text-blue-100 sm:text-base">
            Ya sea una página web, una tienda online o una plataforma corporativa a medida, preparamos una propuesta
            con alcance, etapas y plazos alineados con tu operación real.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-white font-bold text-blue-800 hover:bg-blue-50">
              <Link href="/cotizador?origen=planes">
                Ir al cotizador <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild className="bg-blue-900/40 font-bold text-white ring-1 ring-white/40 hover:bg-blue-900/60">
              <Link href="/contacto?servicio=sistemas-web&origen=planes">Solicitar levantamiento corporativo</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Hablar por WhatsApp
              </a>
            </Button>
          </div>
          <p className="mx-auto max-w-4xl text-xs leading-5 text-blue-100/90">{PRICING_NOTE}</p>
        </Container>
      </section>
    </main>
  );
}
