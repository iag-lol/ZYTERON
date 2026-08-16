"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Info, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ADDON_PRICE_AMOUNTS,
  MAINTENANCE_PRICE_AMOUNTS,
  PLAN_PRICE_AMOUNTS,
  PRICING_NOTE,
} from "@/config/pricing";
import { trackAnalyticsEvent } from "@/lib/analytics/google-ads";

type ProjectType = "web-basica" | "pyme" | "empresa" | "ecommerce" | "sistema";

type Feature = {
  id: string;
  label: string;
  description: string;
  amount: number;
  /** Tipos de proyecto donde la función ya viene incluida en el precio base. */
  includedIn?: ProjectType[];
};

const PROJECT_TYPES: Array<{
  id: ProjectType;
  label: string;
  description: string;
  base: number;
  pages: number;
  planHref: string;
}> = [
  {
    id: "web-basica",
    label: "Web básica",
    description: "Presencia inicial de una sola página con contacto directo.",
    base: PLAN_PRICE_AMOUNTS["web-basica"],
    pages: 1,
    planHref: "/planes",
  },
  {
    id: "pyme",
    label: "Página web para pyme",
    description: "Sitio profesional con servicios, confianza y formularios.",
    base: PLAN_PRICE_AMOUNTS.pyme,
    pages: 5,
    planHref: "/paginas-web-para-pymes",
  },
  {
    id: "empresa",
    label: "Página web para empresa",
    description: "Sitio corporativo con estructura comercial y base SEO.",
    base: PLAN_PRICE_AMOUNTS.empresa,
    pages: 8,
    planHref: "/paginas-web-para-empresas",
  },
  {
    id: "ecommerce",
    label: "Tienda online",
    description: "Catálogo, carrito y pagos online para vender por internet.",
    base: PLAN_PRICE_AMOUNTS.ecommerce,
    pages: 8,
    planHref: "/tiendas-online",
  },
  {
    id: "sistema",
    label: "Sistema web a medida",
    description: "Plataforma interna con módulos, usuarios y reportes.",
    base: PLAN_PRICE_AMOUNTS.sistema,
    pages: 10,
    planHref: "/sistemas-web",
  },
];

const FEATURES: Feature[] = [
  {
    id: "payments",
    label: "Pagos online",
    description: "Webpay, Flow o Mercado Pago.",
    amount: ADDON_PRICE_AMOUNTS.payments,
    includedIn: ["ecommerce"],
  },
  {
    id: "manageableCatalog",
    label: "Catálogo administrable",
    description: "Productos y categorías que edita tu equipo.",
    amount: ADDON_PRICE_AMOUNTS.manageableCatalog,
    includedIn: ["ecommerce"],
  },
  {
    id: "userLogin",
    label: "Login de usuarios",
    description: "Acceso con cuenta para clientes o equipo.",
    amount: ADDON_PRICE_AMOUNTS.userLogin,
    includedIn: ["sistema"],
  },
  {
    id: "clientArea",
    label: "Área privada de clientes",
    description: "Portal con documentos, estados o solicitudes.",
    amount: ADDON_PRICE_AMOUNTS.clientArea,
  },
  {
    id: "miniAdminPanel",
    label: "Panel administrativo",
    description: "Administra contenidos, registros y estados.",
    amount: ADDON_PRICE_AMOUNTS.miniAdminPanel,
    includedIn: ["sistema"],
  },
  {
    id: "dashboardReports",
    label: "Dashboard y reportes",
    description: "Métricas y exportación de información.",
    amount: ADDON_PRICE_AMOUNTS.dashboardReports,
  },
  {
    id: "booking",
    label: "Sistema de reservas",
    description: "Agenda con horarios y confirmaciones.",
    amount: ADDON_PRICE_AMOUNTS.booking,
  },
  {
    id: "blog",
    label: "Blog administrable",
    description: "Publica artículos para posicionar en Google.",
    amount: ADDON_PRICE_AMOUNTS.blog,
  },
  {
    id: "multiStepForm",
    label: "Formulario multipaso / cotizador",
    description: "Captura requerimientos por etapas.",
    amount: ADDON_PRICE_AMOUNTS.multiStepForm,
  },
  {
    id: "pdfGenerator",
    label: "Generación de PDF",
    description: "Cotizaciones o documentos automáticos.",
    amount: ADDON_PRICE_AMOUNTS.pdfGenerator,
  },
  {
    id: "whatsappAutomation",
    label: "Automatización de WhatsApp",
    description: "Respuestas y derivaciones automáticas.",
    amount: ADDON_PRICE_AMOUNTS.whatsappAutomation,
  },
  {
    id: "customApi",
    label: "Integración con otro sistema",
    description: "ERP, CRM o API externa.",
    amount: ADDON_PRICE_AMOUNTS.customApi,
  },
  {
    id: "advancedSeo",
    label: "SEO inicial avanzado",
    description: "Investigación de keywords y contenido optimizado.",
    amount: ADDON_PRICE_AMOUNTS.advancedSeo,
  },
  {
    id: "multiLanguage",
    label: "Sitio en dos idiomas",
    description: "Versión en español e inglés.",
    amount: ADDON_PRICE_AMOUNTS.multiLanguage,
  },
];

const MAINTENANCE_OPTIONS: Array<{ id: string; label: string; amount: number }> = [
  { id: "none", label: "Sin mantención por ahora", amount: 0 },
  { id: "basic", label: "Mantención básica", amount: MAINTENANCE_PRICE_AMOUNTS.basic },
  { id: "professional", label: "Mantención profesional", amount: MAINTENANCE_PRICE_AMOUNTS.professional },
  { id: "ecommerce", label: "Mantención ecommerce", amount: MAINTENANCE_PRICE_AMOUNTS.ecommerce },
  { id: "system", label: "Mantención de sistema", amount: MAINTENANCE_PRICE_AMOUNTS.system },
];

function formatCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function PriceCalculator() {
  const [projectType, setProjectType] = useState<ProjectType>("empresa");
  const [extraPages, setExtraPages] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [maintenance, setMaintenance] = useState("none");
  const [tracked, setTracked] = useState(false);

  const project = PROJECT_TYPES.find((item) => item.id === projectType) ?? PROJECT_TYPES[2];

  function markInteraction() {
    if (tracked) return;
    setTracked(true);
    trackAnalyticsEvent("calculator_start", { page_path: "/calculadora-precio-pagina-web" });
  }

  function toggleFeature(id: string) {
    markInteraction();
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  const { oneTimeTotal, monthlyTotal, activeFeatures } = useMemo(() => {
    const activeFeatures = FEATURES.filter(
      (feature) => selected.includes(feature.id) && !feature.includedIn?.includes(projectType),
    );
    const featuresTotal = activeFeatures.reduce((sum, feature) => sum + feature.amount, 0);
    const pagesTotal = extraPages * ADDON_PRICE_AMOUNTS.extraPage;
    const monthly = MAINTENANCE_OPTIONS.find((item) => item.id === maintenance)?.amount ?? 0;

    return {
      oneTimeTotal: project.base + featuresTotal + pagesTotal,
      monthlyTotal: monthly,
      activeFeatures,
    };
  }, [projectType, extraPages, selected, maintenance, project.base]);

  // Rango realista: el estimador entrega un piso "desde" y un techo con holgura
  // por alcance no definido, para no prometer un precio cerrado sin levantamiento.
  const rangeHigh = Math.round((oneTimeTotal * 1.35) / 10000) * 10000;

  const quoteHref = `/cotizador?tipo=${encodeURIComponent(projectType)}&estimado=${oneTimeTotal}`;

  function reset() {
    setProjectType("empresa");
    setExtraPages(0);
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
                    Desde {formatCLP(item.base)} + IVA
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="card-premium p-5 sm:p-6">
          <legend className="px-1 text-sm font-extrabold text-slate-900">
            2. ¿Cuántas secciones o páginas adicionales?
          </legend>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {project.label} incluye aproximadamente {project.pages}{" "}
            {project.pages === 1 ? "página" : "páginas"}. Suma aquí las que necesites por sobre esa base.
          </p>
          <div className="mt-4 flex items-center gap-3">
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
        </fieldset>

        <fieldset className="card-premium p-5 sm:p-6">
          <legend className="px-1 text-sm font-extrabold text-slate-900">
            3. ¿Qué funcionalidades necesitas?
          </legend>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const included = feature.includedIn?.includes(projectType);
              const active = selected.includes(feature.id);
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
                    <span className="block text-sm font-semibold text-slate-900">{feature.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
                      {included ? "Ya incluido en este tipo de proyecto." : feature.description}
                    </span>
                    {!included ? (
                      <span className="mt-1 block text-xs font-semibold text-slate-500">
                        + {formatCLP(feature.amount)}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
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
                      {formatCLP(option.amount)} + IVA / mes
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
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200">
              Estimación referencial
            </p>
            <p className="mt-2 text-3xl font-extrabold leading-tight">
              {formatCLP(oneTimeTotal)}
            </p>
            <p className="text-sm text-blue-100">
              a {formatCLP(rangeHigh)} + IVA
            </p>
            <p className="mt-3 text-xs leading-relaxed text-blue-100">
              Pago único por el desarrollo de {project.label.toLowerCase()}.
            </p>
            {monthlyTotal > 0 ? (
              <p className="mt-3 rounded-lg bg-white/10 p-2.5 text-xs font-semibold text-white">
                + {formatCLP(monthlyTotal)} + IVA mensual por mantención
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
              {activeFeatures.map((feature) => (
                <li key={feature.id} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                  {feature.label}
                </li>
              ))}
            </ul>

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
                  Cotizar con esta configuración <ArrowRight className="h-4 w-4" />
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
              {PRICING_NOTE}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
