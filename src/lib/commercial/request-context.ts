import { isExcludedWebVisitPath } from "@/lib/analytics/visit-privacy";
import { PLAN_CATALOG, type PlanId } from "@/config/pricing";

export type ServiceLine = "web_ecommerce" | "sistemas_automatizacion" | "soporte" | "sin_definir";

export const PROJECT_TYPES = [
  "Sitio de presentación empresarial o profesional",
  "Ecommerce con carrito y pagos",
  "Catálogo de productos",
  "Sistema empresarial",
  "Gestión de personas o recursos humanos",
  "Control de flota u operaciones",
  "Automatización o integración",
  "Orientación para definir la solución",
  "SEO y posicionamiento",
  "Soporte TI",
] as const;

export type SolutionFamily =
  | "software"
  | "personas_operaciones"
  | "comercio_digital"
  | "sitios_web"
  | "automatizacion"
  | "soporte"
  | "sin_definir";
export function solutionFamilyFor(value: string): SolutionFamily {
  const text = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (
    /gestion-personas|gestion de personas|recursos humanos|rrhh|flota|operaci|personal/.test(text)
  )
    return "personas_operaciones";
  if (/automatiza|integracion/.test(text)) return "automatizacion";
  if (
    /sistema|software|intranet|documental|panel|desarrollo-web-santiago|cotizador-web-pdf|denurvia|centro-de-caja|eliana/.test(
      text,
    )
  )
    return "software";
  if (/tienda|ecommerce|catalogo|comercio-digital|catalogos-digitales/.test(text))
    return "comercio_digital";
  if (/soporte|mantencion/.test(text)) return "soporte";
  if (/web|presentacion|landing|pyme|fenice|seo/.test(text)) return "sitios_web";
  return "sin_definir";
}

const aliases: Record<string, (typeof PROJECT_TYPES)[number]> = {
  web: "Sitio de presentación empresarial o profesional",
  "web-profesional": "Sitio de presentación empresarial o profesional",
  "desarrollo-web": "Sitio de presentación empresarial o profesional",
  "web-basica": "Sitio de presentación empresarial o profesional",
  "landing-pages-para-empresas": "Sitio de presentación empresarial o profesional",
  "paginas-web-santiago": "Sitio de presentación empresarial o profesional",
  "paginas-web-para-pymes": "Sitio de presentación empresarial o profesional",
  "paginas-web-para-empresas": "Sitio de presentación empresarial o profesional",
  catalogo: "Catálogo de productos",
  ecommerce: "Ecommerce con carrito y pagos",
  "tienda-online": "Ecommerce con carrito y pagos",
  "tiendas-online": "Ecommerce con carrito y pagos",
  sistema: "Sistema empresarial",
  "sistema-web": "Sistema empresarial",
  "sistemas-web": "Sistema empresarial",
  "desarrollo-web-santiago": "Sistema empresarial",
  "cotizador-web-pdf": "Sistema empresarial",
  "gestion-documental": "Sistema empresarial",
  "control-de-flota": "Control de flota u operaciones",
  "control-flota": "Control de flota u operaciones",
  operaciones: "Control de flota u operaciones",
  "gestion-personas": "Gestión de personas o recursos humanos",
  rrhh: "Gestión de personas o recursos humanos",
  "catalogos-digitales": "Catálogo de productos",
  orientacion: "Orientación para definir la solución",
  "no-seguro": "Orientación para definir la solución",
  "intranet-corporativa": "Sistema empresarial",
  automatizacion: "Automatización o integración",
  "automatizacion-whatsapp-empresas": "Automatización o integración",
  "soporte-ti": "Soporte TI",
  "soporte-ti-pymes-santiago": "Soporte TI",
  "mantencion-web-chile": "Soporte TI",
  "seo-para-empresas-chile": "SEO y posicionamiento",
};

export function serviceLineFor(value: string): ServiceLine {
  const text = value.toLowerCase();
  if (
    /sistema|automatiza|intranet|documental|flota|panel|integraci[oó]n|recursos humanos|personas|operaciones|gestion-personas|desarrollo-web-santiago|cotizador-web-pdf/.test(
      text,
    )
  )
    return "sistemas_automatizacion";
  if (/soporte|mantencion/.test(text)) return "soporte";
  if (
    /web|presentación|tienda|ecommerce|catálogo|catalogo|landing|pyme|empresa|emprendedor|seo/.test(
      text,
    )
  )
    return "web_ecommerce";
  return "sin_definir";
}

export function resolveRequestContext(params: URLSearchParams) {
  const plan = PLAN_CATALOG.find((item) => item.id === params.get("plan"));
  const source = params.get("servicio") || params.get("tipo") || "";
  const contextualType = [params.get("servicio"), params.get("tipo")]
    .filter(Boolean)
    .map((value) => {
      const key = value!;
      return (
        aliases[key] ||
        aliases[key.split("/").at(-1) || ""] ||
        (key.startsWith("paginas-web/") ? aliases.web : undefined)
      );
    })
    .find(Boolean);
  const projectType =
    contextualType ||
    (plan
      ? plan.block === "sistemas" || plan.block === "corporativo"
        ? "Sistema empresarial"
        : plan.block === "ecommerce"
          ? plan.id === "catalogo"
            ? "Catálogo de productos"
            : "Ecommerce con carrito y pagos"
          : "Sitio de presentación empresarial o profesional"
      : "");
  const amount = Number(params.get("estimado"));
  return {
    projectType,
    serviceLine: serviceLineFor(projectType),
    solutionFamily: solutionFamilyFor(projectType),
    planId: plan?.id,
    estimate:
      Number.isFinite(amount) && amount > 0 && amount <= 100_000_000
        ? Math.round(amount)
        : undefined,
    source: /^[a-z0-9/_-]{1,120}$/.test(source) ? source : undefined,
  };
}

export function planContactHref(id: PlanId, source: string) {
  const plan = PLAN_CATALOG.find((item) => item.id === id);
  const params = new URLSearchParams({
    plan: id,
    tipo: plan?.requiresDiscovery ? "sistema" : id,
    origen: source,
  });
  return `/contacto?${params}`;
}

export function publicPath(value: string) {
  try {
    const route = new URL(value, "https://www.zyteron.cl").pathname;
    if (isExcludedWebVisitPath(route) || !/^\/[a-z0-9/_-]*$/.test(route)) return "";
    return route;
  } catch {
    return "";
  }
}
