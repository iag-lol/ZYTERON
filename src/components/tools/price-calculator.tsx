"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Info, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ADDON_CATALOG,
  ADDON_PRICE_AMOUNTS,
  CORPORATE_SCOPE_NOTE,
  MAINTENANCE_CATALOG,
  PLAN_CATALOG,
  PLAN_PRICE_AMOUNTS,
  PRICING_NOTE,
  clp,
  type AddonCategory,
  type AddonId,
  type PlanId,
} from "@/config/pricing";
import { trackAnalyticsEvent } from "@/lib/analytics/google-ads";

/**
 * Tope corporativo: sobre este monto no se entrega una cifra automática.
 * Debe coincidir con `CORPORATE_QUOTE_THRESHOLD` de `@/lib/quote-requests`, que no
 * se importa aquí porque ese módulo es de servidor.
 */
const CORPORATE_ESTIMATE_THRESHOLD = 5_000_000;
const CORPORATE_ESTIMATE_MESSAGE = "Proyecto sujeto a levantamiento técnico y comercial.";

/** Tipos de proyecto del estimador, siempre anclados a un plan de la escalera. */
type ProjectType = "web-basica" | "pyme" | "empresa" | "ecommerce" | "sistema" | "avanzado";

type Feature = {
  id: AddonId;
  description: string;
  /** Tipos de proyecto donde la función ya viene incluida en el precio base. */
  includedIn?: ProjectType[];
};

const ADDON_BY_ID = new Map(ADDON_CATALOG.map((item) => [item.id, item]));

function addonName(id: AddonId) {
  return ADDON_BY_ID.get(id)?.name ?? id;
}

function addonMonthly(id: AddonId) {
  return ADDON_BY_ID.get(id)?.monthlyAmount ?? 0;
}

/** El plan que da el precio base de cada tipo de proyecto. */
const PROJECT_TYPES: Array<{
  id: ProjectType;
  planId: PlanId;
  label: string;
  description: string;
  base: number;
  pages: number;
  planHref: string;
}> = [
  {
    id: "web-basica",
    planId: "web-basica",
    label: "Web básica",
    description: "Presencia inicial de una sola página con contacto directo.",
    base: PLAN_PRICE_AMOUNTS["web-basica"],
    pages: 1,
    planHref: "/planes",
  },
  {
    id: "pyme",
    planId: "pyme",
    label: "Página web para pyme",
    description: "Sitio profesional con servicios, confianza y formularios.",
    base: PLAN_PRICE_AMOUNTS.pyme,
    pages: 6,
    planHref: "/paginas-web-para-pymes",
  },
  {
    id: "empresa",
    planId: "empresa",
    label: "Página web para empresa",
    description: "Sitio corporativo con estructura comercial y base SEO.",
    base: PLAN_PRICE_AMOUNTS.empresa,
    pages: 8,
    planHref: "/paginas-web-para-empresas",
  },
  {
    id: "ecommerce",
    planId: "ecommerce",
    label: "Tienda online",
    description: "Catálogo, carrito y pagos online para vender por internet.",
    base: PLAN_PRICE_AMOUNTS.ecommerce,
    pages: 8,
    planHref: "/tiendas-online",
  },
  {
    id: "sistema",
    planId: "sistema",
    label: "Sistema web a medida",
    description: "Plataforma interna con módulos, usuarios y reportes.",
    base: PLAN_PRICE_AMOUNTS.sistema,
    pages: 10,
    planHref: "/sistemas-web",
  },
  {
    id: "avanzado",
    planId: "avanzado",
    label: "Sistema avanzado",
    description: "Multimódulo con permisos, automatizaciones e integraciones.",
    base: PLAN_PRICE_AMOUNTS.avanzado,
    pages: 14,
    planHref: "/sistemas-web",
  },
];

/** Qué tipo de proyecto de la calculadora entra en cada tarjeta del cotizador. */
const QUOTE_PROJECT_TYPE: Record<ProjectType, string> = {
  "web-basica": "web-basica",
  pyme: "web-profesional",
  empresa: "web-profesional",
  ecommerce: "tienda-online",
  sistema: "sistema-web",
  avanzado: "sistema-web",
};

/**
 * Funcionalidades ofrecidas, agrupadas por la misma categoría que usa el catálogo
 * de adicionales. El nombre y el monto salen siempre de `@/config/pricing`.
 */
const FEATURE_GROUPS: Array<{ category: AddonCategory; features: Feature[] }> = [
  {
    category: "Funcionalidades web",
    features: [
      { id: "advancedForm", description: "Campos condicionales, archivos y validaciones." },
      { id: "multiStepForm", description: "Captura requerimientos por etapas." },
      {
        id: "userLogin",
        description: "Acceso con cuenta para clientes o equipo.",
        includedIn: ["sistema", "avanzado"],
      },
      { id: "clientArea", description: "Portal con documentos, estados o solicitudes." },
      { id: "blog", description: "Publica artículos para posicionar en Google." },
      { id: "advancedSearch", description: "Búsqueda con filtros sobre tu contenido." },
      { id: "multiLanguage", description: "Versión en español e inglés." },
    ],
  },
  {
    category: "WhatsApp y comunicación",
    features: [
      {
        id: "whatsappButton",
        description: "Contacto directo desde cualquier sección.",
        includedIn: ["web-basica", "pyme", "empresa"],
      },
      { id: "whatsappForm", description: "El formulario llega directo al WhatsApp del equipo." },
      { id: "whatsappNotifications", description: "Avisos automáticos de pedidos o solicitudes." },
      { id: "whatsappChatbot", description: "Responde consultas frecuentes las 24 horas." },
      { id: "followupAutomation", description: "Recordatorios y seguimiento comercial automático." },
    ],
  },
  {
    category: "Ecommerce",
    features: [
      {
        id: "manageableCatalog",
        description: "Productos y categorías que edita tu equipo.",
        includedIn: ["ecommerce"],
      },
      {
        id: "payments",
        description: "Webpay, Flow o Mercado Pago.",
        includedIn: ["ecommerce"],
      },
      { id: "products50", description: "Cargamos nosotros el catálogo inicial." },
      { id: "stock", description: "Control de inventario por producto.", includedIn: ["ecommerce"] },
      { id: "coupons", description: "Códigos de descuento y campañas." },
      { id: "logistics", description: "Cálculo de despacho y seguimiento." },
      { id: "cartRecovery", description: "Recupera compras que quedaron a medias." },
    ],
  },
  {
    category: "Paneles y sistemas",
    features: [
      {
        id: "miniAdminPanel",
        description: "Administra contenidos, registros y estados.",
        includedIn: ["ecommerce", "sistema", "avanzado"],
      },
      {
        id: "fullAdminPanel",
        description: "Gestión completa de la operación interna.",
        includedIn: ["avanzado"],
      },
      {
        id: "dashboardReports",
        description: "Métricas y exportación de información.",
        includedIn: ["sistema", "avanzado"],
      },
      { id: "booking", description: "Agenda con horarios y confirmaciones." },
      {
        id: "roles",
        description: "Cada perfil ve solo lo que le corresponde.",
        includedIn: ["sistema", "avanzado"],
      },
      { id: "auditLog", description: "Quién hizo qué y cuándo.", includedIn: ["avanzado"] },
      { id: "approvals", description: "Solicitudes con visto bueno por etapa.", includedIn: ["avanzado"] },
      { id: "docManagement", description: "Documentos, versiones y permisos.", includedIn: ["avanzado"] },
      { id: "multiBranch", description: "Operación separada por sucursal o empresa." },
    ],
  },
  {
    category: "Integraciones",
    features: [
      { id: "customApi", description: "Conexión a medida con otro sistema.", includedIn: ["avanzado"] },
      { id: "crm", description: "Los contactos llegan directo a tu CRM." },
      { id: "erp", description: "Sincroniza productos, stock o facturación." },
      { id: "workspace", description: "Microsoft 365 o Google Workspace." },
      { id: "sso", description: "Ingreso con la cuenta corporativa." },
      { id: "webhooks", description: "Envía eventos a otras plataformas." },
      { id: "whatsappAutomation", description: "Respuestas y derivaciones automáticas." },
    ],
  },
  {
    category: "SEO, analítica y reportería",
    features: [
      { id: "advancedSeo", description: "Investigación de keywords y contenido optimizado." },
      { id: "technicalSeo", description: "Rendimiento, datos estructurados y arquitectura." },
      { id: "advancedAnalytics", description: "Eventos, embudos y objetivos medibles." },
      { id: "pdfGenerator", description: "Cotizaciones o documentos automáticos." },
      {
        id: "excelExport",
        description: "Descarga tus registros en Excel y PDF.",
        includedIn: ["sistema", "avanzado"],
      },
    ],
  },
];

const ALL_FEATURES: Feature[] = FEATURE_GROUPS.flatMap((group) => group.features);

/** Opciones de mantención tomadas del catálogo publicado. */
const MAINTENANCE_OPTIONS: Array<{ id: string; label: string; amount: number }> = [
  { id: "none", label: "Sin mantención por ahora", amount: 0 },
  ...MAINTENANCE_CATALOG.map((item) => ({ id: item.name, label: item.name, amount: item.amount })),
];

export function PriceCalculator() {
  const [projectType, setProjectType] = useState<ProjectType>("empresa");
  const [extraPages, setExtraPages] = useState(0);
  const [extraSections, setExtraSections] = useState(0);
  const [selected, setSelected] = useState<AddonId[]>([]);
  const [maintenance, setMaintenance] = useState("none");
  const [tracked, setTracked] = useState(false);

  const project = PROJECT_TYPES.find((item) => item.id === projectType) ?? PROJECT_TYPES[2];
  const plan = PLAN_CATALOG.find((item) => item.id === project.planId);

  function markInteraction() {
    if (tracked) return;
    setTracked(true);
    trackAnalyticsEvent("calculator_start", { page_path: "/calculadora-precio-pagina-web" });
  }

  function toggleFeature(id: AddonId) {
    markInteraction();
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  const { oneTimeTotal, monthlyTotal, activeFeatures } = useMemo(() => {
    const active = ALL_FEATURES.filter(
      (feature) => selected.includes(feature.id) && !feature.includedIn?.includes(projectType),
    );
    const featuresTotal = active.reduce((sum, feature) => sum + ADDON_PRICE_AMOUNTS[feature.id], 0);
    const featuresMonthly = active.reduce((sum, feature) => sum + addonMonthly(feature.id), 0);
    const pagesTotal = extraPages * ADDON_PRICE_AMOUNTS.extraPage;
    const sectionsTotal = extraSections * ADDON_PRICE_AMOUNTS.extraSection;
    const maintenanceMonthly = MAINTENANCE_OPTIONS.find((item) => item.id === maintenance)?.amount ?? 0;

    return {
      oneTimeTotal: project.base + featuresTotal + pagesTotal + sectionsTotal,
      monthlyTotal: maintenanceMonthly + featuresMonthly,
      activeFeatures: active,
    };
  }, [projectType, extraPages, extraSections, selected, maintenance, project.base]);

  // Sobre el tope corporativo no se entrega una cifra automática: el alcance real
  // se define en un levantamiento, igual que en /planes.
  const needsDiscovery = oneTimeTotal > CORPORATE_ESTIMATE_THRESHOLD;

  // Rango realista: el estimador entrega un piso "desde" y un techo con holgura
  // por alcance no definido, para no prometer un precio cerrado sin levantamiento.
  const rangeHigh = Math.round((oneTimeTotal * 1.35) / 10000) * 10000;

  const quoteHref = needsDiscovery
    ? `/cotizador?tipo=${encodeURIComponent(QUOTE_PROJECT_TYPE[projectType])}&plan=${encodeURIComponent(
        project.planId,
      )}&alcance=corporativo`
    : `/cotizador?tipo=${encodeURIComponent(QUOTE_PROJECT_TYPE[projectType])}&plan=${encodeURIComponent(
        project.planId,
      )}&estimado=${oneTimeTotal}`;

  function reset() {
    setProjectType("empresa");
    setExtraPages(0);
    setExtraSections(0);
    setSelected([]);
    setMaintenance("none");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
      <div className="space-y-6">
        <fieldset className="card-premium p-5 sm:p-6">
          <legend className="px-1 text-sm font-extrabold text-slate-900">
            1. ¿Qué tipo de proyecto necesitas?
          </legend>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PROJECT_TYPES.map((item) => {
              const active = item.id === projectType;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    markInteraction();
                    setProjectType(item.id);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-colors",
                    active
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-900">{item.label}</span>
                    {active ? <Check className="h-4 w-4 shrink-0 text-blue-600" /> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                    {item.description}
                  </span>
                  <span className="mt-2 block text-xs font-semibold text-blue-700">
                    Desde {clp(item.base)} + IVA
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="card-premium p-5 sm:p-6">
          <legend className="px-1 text-sm font-extrabold text-slate-900">
            2. ¿Cuántas páginas o secciones adicionales?
          </legend>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {project.label} incluye aproximadamente {project.pages}{" "}
            {project.pages === 1 ? "página" : "páginas"}. Suma aquí lo que necesites por sobre esa base.
          </p>

          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="extra-pages" className="text-xs font-semibold text-slate-700">
                Páginas adicionales · {clp(ADDON_PRICE_AMOUNTS.extraPage)} + IVA cada una
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="extra-pages"
                  type="range"
                  min={0}
                  max={15}
                  value={extraPages}
                  onChange={(event) => {
                    markInteraction();
                    setExtraPages(Number(event.target.value));
                  }}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-700"
                />
                <output
                  htmlFor="extra-pages"
                  className="w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-50 py-1 text-center text-sm font-bold text-slate-900"
                >
                  +{extraPages}
                </output>
              </div>
            </div>

            <div>
              <label htmlFor="extra-sections" className="text-xs font-semibold text-slate-700">
                Secciones adicionales · {clp(ADDON_PRICE_AMOUNTS.extraSection)} + IVA cada una
              </label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="extra-sections"
                  type="range"
                  min={0}
                  max={15}
                  value={extraSections}
                  onChange={(event) => {
                    markInteraction();
                    setExtraSections(Number(event.target.value));
                  }}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-700"
                />
                <output
                  htmlFor="extra-sections"
                  className="w-16 shrink-0 rounded-lg border border-slate-200 bg-slate-50 py-1 text-center text-sm font-bold text-slate-900"
                >
                  +{extraSections}
                </output>
              </div>
            </div>
          </div>
        </fieldset>

        <fieldset className="card-premium p-5 sm:p-6">
          <legend className="px-1 text-sm font-extrabold text-slate-900">
            3. ¿Qué funcionalidades necesitas?
          </legend>
          <div className="mt-4 space-y-6">
            {FEATURE_GROUPS.map((group) => (
              <div key={group.category}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {group.category}
                </p>
                <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                  {group.features.map((feature) => {
                    const included = feature.includedIn?.includes(projectType);
                    const active = selected.includes(feature.id);
                    const monthly = addonMonthly(feature.id);
                    return (
                      <button
                        key={feature.id}
                        type="button"
                        onClick={() => toggleFeature(feature.id)}
                        disabled={included}
                        aria-pressed={active && !included}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                          included
                            ? "cursor-not-allowed border-emerald-200 bg-emerald-50/60"
                            : active
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            included
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : active
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-300 bg-white",
                          )}
                        >
                          {included || active ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-slate-900">
                            {addonName(feature.id)}
                          </span>
                          <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
                            {included ? "Ya incluido en este tipo de proyecto." : feature.description}
                          </span>
                          {!included ? (
                            <span className="mt-1 block text-xs font-semibold text-slate-500">
                              + {clp(ADDON_PRICE_AMOUNTS[feature.id])} + IVA
                              {monthly > 0 ? ` · ${clp(monthly)} + IVA / mes` : ""}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="card-premium p-5 sm:p-6">
          <legend className="px-1 text-sm font-extrabold text-slate-900">
            4. ¿Necesitas mantención mensual?
          </legend>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {MAINTENANCE_OPTIONS.map((option) => {
              const active = option.id === maintenance;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    markInteraction();
                    setMaintenance(option.id);
                  }}
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl border p-3 text-left text-sm transition-colors",
                    active
                      ? "border-blue-500 bg-blue-50 font-bold text-slate-900"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50",
                  )}
                >
                  {option.label}
                  {option.amount > 0 ? (
                    <span className="mt-0.5 block text-xs font-semibold text-slate-500">
                      Desde {clp(option.amount)} + IVA / mes
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-28">
        <div className="card-premium overflow-hidden">
          <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-6 text-white">
            {needsDiscovery ? (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
                  Proyecto corporativo
                </p>
                <p className="mt-2 text-xl font-extrabold leading-snug">
                  {CORPORATE_ESTIMATE_MESSAGE}
                </p>
                <p className="mt-3 text-xs leading-relaxed text-blue-100">
                  Con este alcance el valor se define después de analizar procesos, módulos, perfiles de
                  usuario, integraciones y volumen de operación.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
                  Estimación referencial
                </p>
                <p className="mt-2 text-3xl font-extrabold leading-tight">{clp(oneTimeTotal)}</p>
                <p className="text-sm text-blue-100">a {clp(rangeHigh)} + IVA</p>
                <p className="mt-3 text-xs leading-relaxed text-blue-100">
                  Pago único por el desarrollo de {project.label.toLowerCase()}.
                </p>
              </>
            )}
            {monthlyTotal > 0 ? (
              <p className="mt-3 rounded-lg bg-white/10 p-2.5 text-xs font-semibold text-white">
                + {clp(monthlyTotal)} + IVA mensual por servicios recurrentes
              </p>
            ) : null}
          </div>

          <div className="space-y-3 p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Incluye en tu estimación
            </p>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                {project.label} ({project.pages} {project.pages === 1 ? "página" : "páginas"} base)
              </li>
              {extraPages > 0 ? (
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                  {extraPages} {extraPages === 1 ? "página adicional" : "páginas adicionales"}
                </li>
              ) : null}
              {extraSections > 0 ? (
                <li className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                  {extraSections} {extraSections === 1 ? "sección adicional" : "secciones adicionales"}
                </li>
              ) : null}
              {activeFeatures.map((feature) => (
                <li key={feature.id} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                  {addonName(feature.id)}
                </li>
              ))}
            </ul>

            {plan ? (
              <p className="rounded-lg bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-600">
                Base: {plan.name} · {plan.price} · {plan.deadline}
              </p>
            ) : null}

            <div className="space-y-2 pt-2">
              <Button
                asChild
                className="btn-primary-glow w-full gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800"
              >
                <Link
                  href={quoteHref}
                  onClick={() =>
                    trackAnalyticsEvent("calculator_to_quote", {
                      page_path: "/calculadora-precio-pagina-web",
                      project_type: projectType,
                    })
                  }
                >
                  {needsDiscovery ? "Solicitar levantamiento" : "Cotizar con esta configuración"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-slate-300 font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Link href={project.planHref}>Ver qué incluye este servicio</Link>
              </Button>
              <button
                type="button"
                onClick={reset}
                className="flex w-full items-center justify-center gap-1.5 py-1 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-800"
              >
                <RotateCcw className="h-3 w-3" /> Reiniciar
              </button>
            </div>

            <p className="flex items-start gap-2 border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {needsDiscovery ? CORPORATE_SCOPE_NOTE : PRICING_NOTE}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
