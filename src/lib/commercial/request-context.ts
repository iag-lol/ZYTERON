import { isExcludedWebVisitPath } from "@/lib/analytics/visit-privacy";
import { PLAN_CATALOG, type PlanId } from "@/config/pricing";

export type ServiceLine = "web_ecommerce" | "sistemas_automatizacion" | "soporte" | "sin_definir";

export const PROJECT_TYPES = [
  "Página web corporativa",
  "Landing page comercial",
  "Catálogo WhatsApp",
  "Tienda online",
  "Sistema interno",
  "Panel administrativo",
  "Automatización de procesos",
  "SEO y posicionamiento",
  "Soporte TI",
  "Otro",
] as const;

const aliases: Record<string, (typeof PROJECT_TYPES)[number]> = {
  web: "Página web corporativa",
  "web-profesional": "Página web corporativa",
  "desarrollo-web": "Página web corporativa",
  "web-basica": "Landing page comercial",
  "landing-pages-para-empresas": "Landing page comercial",
  "paginas-web-santiago": "Página web corporativa",
  "paginas-web-para-pymes": "Página web corporativa",
  "paginas-web-para-empresas": "Página web corporativa",
  catalogo: "Catálogo WhatsApp",
  ecommerce: "Tienda online",
  "tienda-online": "Tienda online",
  "tiendas-online": "Tienda online",
  sistema: "Sistema interno",
  "sistema-web": "Sistema interno",
  "sistemas-web": "Sistema interno",
  "desarrollo-web-santiago": "Sistema interno",
  "cotizador-web-pdf": "Sistema interno",
  "gestion-documental": "Sistema interno",
  "control-de-flota": "Sistema interno",
  "control-flota": "Sistema interno",
  "intranet-corporativa": "Sistema interno",
  automatizacion: "Automatización de procesos",
  "automatizacion-whatsapp-empresas": "Automatización de procesos",
  "soporte-ti": "Soporte TI",
  "soporte-ti-pymes-santiago": "Soporte TI",
  "mantencion-web-chile": "Soporte TI",
  "seo-para-empresas-chile": "SEO y posicionamiento",
};

export function serviceLineFor(value: string): ServiceLine {
  const text = value.toLowerCase();
  if (
    /sistema|automatiza|intranet|documental|flota|panel|integracion|desarrollo-web-santiago|cotizador-web-pdf/.test(
      text,
    )
  )
    return "sistemas_automatizacion";
  if (/soporte|mantencion/.test(text)) return "soporte";
  if (/web|tienda|ecommerce|catálogo|catalogo|landing|pyme|empresa|emprendedor|seo/.test(text))
    return "web_ecommerce";
  return "sin_definir";
}

export function resolveRequestContext(params: URLSearchParams) {
  const plan = PLAN_CATALOG.find((item) => item.id === params.get("plan"));
  const source = params.get("servicio") || params.get("tipo") || "";
  const projectType =
    aliases[source] ||
    aliases[source.split("/").at(-1) || ""] ||
    (plan
      ? plan.block === "sistemas" || plan.block === "corporativo"
        ? "Sistema interno"
        : plan.block === "ecommerce"
          ? plan.id === "catalogo"
            ? "Catálogo WhatsApp"
            : "Tienda online"
          : "Página web corporativa"
      : "");
  const amount = Number(params.get("estimado"));
  return {
    projectType,
    serviceLine: serviceLineFor(projectType),
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
    if (isExcludedWebVisitPath(route) || !/^\/[a-z0-9/_-]*$/.test(route))
      return "";
    return route;
  } catch {
    return "";
  }
}
