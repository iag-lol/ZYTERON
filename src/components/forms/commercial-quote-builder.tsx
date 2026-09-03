"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  CircleHelp,
  Compass,
  Clock3,
  Globe,
  LayoutDashboard,
  Loader2,
  MessageCircle,
  MonitorSmartphone,
  PanelsTopLeft,
  Send,
  ShoppingCart,
  ShieldCheck,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  ADDON_CATALOG,
  FLEET_PLANS,
  ADDON_PRICE_AMOUNTS,
  AI_SERVICES,
  CORPORATE_SCOPE_NOTE,
  PLAN_CATALOG,
  PLAN_PRICE_AMOUNTS,
  PRICING_NOTE,
  SERVICE_PRICE_AMOUNTS,
  clp,
  fromPrice,
  monthlyPrice,
  type AddonId,
} from "@/config/pricing";
import { siteConfig } from "@/config/site";
import { trackQuoteRequestConversion, trackQuoteRequestSubmit } from "@/lib/analytics/google-ads";

type SubmitState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | { status: "error"; message: string; whatsappUrl?: string };

export type ProjectTypeValue =
  | "web-basica"
  | "web-profesional"
  | "tienda-online"
  | "sistema-web"
  | "automatizacion"
  | "soporte-ti"
  | "no-seguro";

type BinaryChoice = "si" | "no" | "no-se";
/** Debe mantenerse alineado con `BudgetRangeValue` de `@/lib/quote-requests`. */
type BudgetRangeValue =
  | "menos-50000"
  | "50000-100000"
  | "100000-300000"
  | "300000-700000"
  | "mas-700000"
  | "700000-2000000"
  | "2000000-5000000"
  | "mas-5000000"
  | "no-claro";
type DeadlineValue = "urgente" | "esta-semana" | "este-mes" | "sin-apuro" | "no-claro";
type UrgencyValue = "bajo" | "medio" | "alto";

type Option = {
  value: string;
  label: string;
  description?: string;
  priceHint?: string;
};

type ProjectCard = Option & {
  icon: LucideIcon;
  value: ProjectTypeValue;
};

type DetailField =
  | {
      key: string;
      label: string;
      type: "single";
      options: Option[];
    }
  | {
      key: string;
      label: string;
      type: "multi";
      options: Option[];
    }
  | {
      key: string;
      label: string;
      type: "text";
      placeholder: string;
    };

type FormState = {
  projectType: ProjectTypeValue | "";
  businessName: string;
  businessRubro: string;
  businessCity: string;
  hasWebsite: BinaryChoice | "";
  hasLogo: BinaryChoice | "";
  hasDomain: BinaryChoice | "";
  hasContent: BinaryChoice | "";
  detailValues: Record<string, string | string[]>;
  /** Necesidades de proyecto seleccionadas por grupo de alcance. */
  scopeValues: Record<string, string[]>;
  projectComment: string;
  budgetRange: BudgetRangeValue | "";
  deadline: DeadlineValue | "";
  urgency: UrgencyValue;
  contactName: string;
  contactWhatsapp: string;
  contactEmail: string;
  contactCompany: string;
  currentWebsite: string;
  additionalMessage: string;
  honeypot: string;
};

const TOTAL_STEPS = 7;
const DIRECT_WHATSAPP_URL = siteConfig.social.whatsapp;
const CHILE_WHATSAPP_REGEX = /^(?:\+?56)?(?:\s?9)?(?:[\s-]?\d){8}$/;

/**
 * Tope corporativo: sobre este monto el cotizador no entrega una cifra automática y
 * la solicitud pasa a levantamiento. Debe coincidir con `CORPORATE_QUOTE_THRESHOLD`
 * de `@/lib/quote-requests`, que no se importa aquí porque es un módulo de servidor.
 */
const CORPORATE_ESTIMATE_THRESHOLD = 5_000_000;
const CORPORATE_ESTIMATE_MESSAGE = "Proyecto sujeto a levantamiento técnico y comercial.";

/** Límites del backend (`quoteRequestSchema`) que este formulario debe respetar. */
const MAX_PROJECT_ANSWERS = 20;
const MAX_ANSWER_VALUE_LENGTH = 600;

const ALLOWED_PROJECT_TYPES = new Set<ProjectTypeValue>([
  "web-basica",
  "web-profesional",
  "tienda-online",
  "sistema-web",
  "automatizacion",
  "soporte-ti",
  "no-seguro",
]);

/**
 * Etiquetas del parámetro `?plan=`. Se generan desde la escalera publicada y se
 * conservan los slugs antiguos para no romper enlaces ya publicados.
 */
const PLAN_LABELS: Record<string, string> = {
  "web-basica-presentacion": "Web Básica de Presentación",
  "plan-emprendedor": "Plan Emprendedor",
  "plan-pyme": "Plan Pyme",
  "plan-empresa": "Plan Empresa",
  "catalogo-tienda-online": "Catálogo / Tienda Online",
  "sistema-web-panel-administrativo": "Sistema Web / Panel Administrativo",
  "sistema-avanzado": "Sistema Avanzado / Desarrollo a medida",
  ...Object.fromEntries(PLAN_CATALOG.map((plan) => [plan.id, plan.name])),
  // Las plataformas de flota viven en su propio catálogo, fuera de la escalera
  // principal, así que se agregan aquí para que el formulario reconozca el plan
  // con el que llegó el cliente.
  ...Object.fromEntries(FLEET_PLANS.map((plan) => [plan.id, plan.name])),
};

const ADDON_BY_ID = new Map(ADDON_CATALOG.map((item) => [item.id, item]));

function addonLabel(id: AddonId) {
  return ADDON_BY_ID.get(id)?.name ?? id;
}

function addonMonthlyAmount(id: AddonId) {
  return ADDON_BY_ID.get(id)?.monthlyAmount ?? 0;
}

function normalizeProjectType(value: string | null) {
  return value && ALLOWED_PROJECT_TYPES.has(value as ProjectTypeValue)
    ? (value as ProjectTypeValue)
    : undefined;
}

function subscribeToLocation(onStoreChange: () => void) {
  window.addEventListener("popstate", onStoreChange);
  return () => window.removeEventListener("popstate", onStoreChange);
}

function getLocationSearch() {
  return window.location.search;
}

function getServerSearch() {
  return "";
}

/**
 * Precio base de referencia de cada tarjeta. Es también la base del estimador del
 * cotizador, por eso sale siempre de la escalera publicada.
 */
const PROJECT_BASE_AMOUNTS: Record<ProjectTypeValue, number> = {
  "web-basica": PLAN_PRICE_AMOUNTS["web-basica"],
  "web-profesional": PLAN_PRICE_AMOUNTS.pyme,
  "tienda-online": PLAN_PRICE_AMOUNTS.ecommerce,
  "sistema-web": PLAN_PRICE_AMOUNTS.sistema,
  automatizacion: SERVICE_PRICE_AMOUNTS.automationWhatsapp,
  "soporte-ti": 0,
  "no-seguro": 0,
};

const projectCards: ProjectCard[] = [
  {
    value: "web-basica",
    label: "Web básica de presentación",
    description: "Una página simple para mostrar tu negocio y recibir contactos.",
    icon: MonitorSmartphone,
    priceHint: fromPrice(PROJECT_BASE_AMOUNTS["web-basica"]),
  },
  {
    value: "web-profesional",
    label: "Página web profesional",
    description: "Sitio más completo para empresas, servicios o pymes.",
    icon: PanelsTopLeft,
    priceHint: fromPrice(PROJECT_BASE_AMOUNTS["web-profesional"]),
  },
  {
    value: "tienda-online",
    label: "Tienda online",
    description: "Catálogo, productos, carrito o ventas por WhatsApp.",
    icon: ShoppingCart,
    priceHint: fromPrice(PROJECT_BASE_AMOUNTS["tienda-online"]),
  },
  {
    value: "sistema-web",
    label: "Sistema web interno",
    description: "Paneles, registros, reportes, usuarios o control de procesos.",
    icon: LayoutDashboard,
    priceHint: fromPrice(PROJECT_BASE_AMOUNTS["sistema-web"]),
  },
  {
    value: "automatizacion",
    label: "Automatización",
    description: "Formularios, correos, WhatsApp, reportes o flujos automáticos.",
    icon: Bot,
    priceHint: fromPrice(PROJECT_BASE_AMOUNTS.automatizacion),
  },
  {
    value: "soporte-ti",
    label: "Soporte TI",
    description: "Ayuda técnica, configuración, correos, dominios o herramientas.",
    icon: Wrench,
    priceHint: fromPrice(SERVICE_PRICE_AMOUNTS.supportTi),
  },
  {
    value: "no-seguro",
    label: "No estoy seguro",
    description: "Quiero que me orienten.",
    icon: Compass,
  },
];

const binaryOptions: Option[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "no-se", label: "No sé" },
];

const websiteOptions: Option[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "no-se", label: "Tengo una pero quiero mejorarla" },
];

const logoOptions: Option[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "no-se", label: "En proceso" },
];

const domainOptions: Option[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "no-se", label: "No sé qué es eso" },
];

const contentOptions: Option[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "no-se", label: "Necesito ayuda" },
];

/**
 * Tramos de presupuesto. Los tramos altos se anclan a la escalera publicada para
 * que el cliente se ubique en el mismo mapa de precios que ve en /planes.
 */
const budgetOptions: Option[] = [
  { value: "menos-50000", label: "Menos de $50.000" },
  { value: "50000-100000", label: "$50.000 a $100.000" },
  { value: "100000-300000", label: "$100.000 a $300.000" },
  { value: "300000-700000", label: "$300.000 a $700.000" },
  {
    value: "700000-2000000",
    label: `${clp(PLAN_PRICE_AMOUNTS.ecommerce)} a ${clp(PLAN_PRICE_AMOUNTS.sistema)}`,
  },
  {
    value: "2000000-5000000",
    label: `${clp(PLAN_PRICE_AMOUNTS.sistema)} a ${clp(CORPORATE_ESTIMATE_THRESHOLD)}`,
  },
  { value: "mas-5000000", label: `Más de ${clp(CORPORATE_ESTIMATE_THRESHOLD)}` },
  { value: "no-claro", label: "No tengo claro" },
];

const deadlineOptions: Option[] = [
  { value: "urgente", label: "Lo antes posible" },
  { value: "esta-semana", label: "Esta semana" },
  { value: "este-mes", label: "Este mes" },
  { value: "sin-apuro", label: "Sin apuro" },
  { value: "no-claro", label: "No tengo claro" },
];

const urgencyOptions: Option[] = [
  { value: "bajo", label: "Bajo" },
  { value: "medio", label: "Medio" },
  { value: "alto", label: "Alto" },
];

const projectTypeLabels: Record<ProjectTypeValue, string> = {
  "web-basica": "Web básica de presentación",
  "web-profesional": "Página web profesional",
  "tienda-online": "Tienda online",
  "sistema-web": "Sistema web interno",
  automatizacion: "Automatización",
  "soporte-ti": "Soporte TI",
  "no-seguro": "No estoy seguro",
};

const detailConfigs: Record<ProjectTypeValue, DetailField[]> = {
  "web-basica": [
    {
      key: "sections",
      label: "¿Qué secciones necesitas?",
      type: "multi",
      options: [
        { value: "Inicio", label: "Inicio" },
        { value: "Servicios", label: "Servicios" },
        { value: "Galería", label: "Galería" },
        { value: "Sobre el negocio", label: "Sobre el negocio" },
        { value: "Contacto", label: "Contacto" },
        { value: "Preguntas frecuentes", label: "Preguntas frecuentes" },
        { value: "Redes sociales", label: "Redes sociales" },
      ],
    },
    {
      key: "whatsappButton",
      label: "¿Quieres botón directo a WhatsApp?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "contactForm",
      label: "¿Quieres formulario de contacto?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "socialLinks",
      label: "¿Quieres enlaces a redes sociales?",
      type: "single",
      options: binaryOptions,
    },
  ],
  "web-profesional": [
    {
      key: "sectionsCount",
      label: "Cantidad aproximada de secciones",
      type: "single",
      options: [
        { value: "1 a 3", label: "1 a 3" },
        { value: "4 a 6", label: "4 a 6" },
        { value: "7 o más", label: "7 o más" },
        { value: "No sé", label: "No sé" },
      ],
    },
    {
      key: "blog",
      label: "¿Necesitas blog?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "seo",
      label: "¿Necesitas SEO inicial?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "forms",
      label: "¿Necesitas formularios?",
      type: "single",
      options: [
        { value: "si", label: "Sí" },
        { value: "no", label: "No" },
      ],
    },
    {
      key: "whatsappConnection",
      label: "¿Quieres conexión con WhatsApp?",
      type: "single",
      options: [
        { value: "si", label: "Sí" },
        { value: "no", label: "No" },
      ],
    },
  ],
  "tienda-online": [
    {
      key: "productsCount",
      label: "Cantidad aproximada de productos",
      type: "single",
      options: [
        { value: "1 a 10", label: "1 a 10" },
        { value: "11 a 50", label: "11 a 50" },
        { value: "51 a 100", label: "51 a 100" },
        { value: "Más de 100", label: "Más de 100" },
        { value: "No sé", label: "No sé" },
      ],
    },
    {
      key: "cart",
      label: "¿Quieres carrito de compras?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "payments",
      label: "¿Quieres pagos online?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "sellByWhatsapp",
      label: "¿Quieres vender por WhatsApp?",
      type: "single",
      options: [
        { value: "si", label: "Sí" },
        { value: "no", label: "No" },
      ],
    },
    {
      key: "initialLoad",
      label: "¿Necesitas carga inicial de productos?",
      type: "single",
      options: binaryOptions,
    },
  ],
  "sistema-web": [
    {
      key: "process",
      label: "¿Qué proceso quieres ordenar?",
      type: "text",
      placeholder: "Ej: solicitudes, inventario, clientes, registros o reportes.",
    },
    {
      key: "users",
      label: "¿Necesitas usuarios?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "adminPanel",
      label: "¿Necesitas panel administrador?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "reports",
      label: "¿Necesitas reportes?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "exports",
      label: "¿Necesitas exportar PDF o Excel?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "database",
      label: "¿Necesitas guardar información en base de datos?",
      type: "single",
      options: binaryOptions,
    },
  ],
  automatizacion: [
    {
      key: "automationGoal",
      label: "¿Qué quieres automatizar?",
      type: "text",
      placeholder: "Ej: formularios, correos, seguimiento de leads, reportes o WhatsApp.",
    },
    {
      key: "emailAutomation",
      label: "¿La automatización debe usar correo?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "whatsappAutomation",
      label: "¿Debe usar WhatsApp?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "reportsAutomation",
      label: "¿Debe generar reportes?",
      type: "single",
      options: binaryOptions,
    },
    {
      key: "webConnection",
      label: "¿Debe conectarse con una web o formulario?",
      type: "single",
      options: binaryOptions,
    },
  ],
  "soporte-ti": [
    {
      key: "supportType",
      label: "¿Qué necesitas resolver?",
      type: "multi",
      options: [
        { value: "Correos", label: "Correos" },
        { value: "Dominio", label: "Dominio" },
        { value: "Página web", label: "Página web" },
        { value: "Computadores", label: "Computadores" },
        { value: "Configuración", label: "Configuración" },
        { value: "Seguridad", label: "Seguridad" },
        { value: "Otro", label: "Otro" },
      ],
    },
    {
      key: "supportUrgency",
      label: "Nivel de urgencia",
      type: "single",
      options: urgencyOptions,
    },
  ],
  "no-seguro": [
    {
      key: "goal",
      label: "Cuéntanos brevemente qué quieres lograr",
      type: "text",
      placeholder: "Ej: vender más, mostrar mis servicios, ordenar solicitudes o recibir contactos.",
    },
    {
      key: "mainObjective",
      label: "¿Tu objetivo principal es vender, mostrar información, ordenar procesos o recibir contactos?",
      type: "single",
      options: [
        { value: "Vender", label: "Vender" },
        { value: "Mostrar mi negocio", label: "Mostrar mi negocio" },
        { value: "Recibir contactos", label: "Recibir contactos" },
        { value: "Ordenar procesos", label: "Ordenar procesos" },
        { value: "No sé", label: "No sé" },
      ],
    },
    {
      key: "guidance",
      label: "¿Quieres que te orientemos?",
      type: "single",
      options: [{ value: "Sí", label: "Sí" }],
    },
  ],
};

type ScopeItem = {
  value: string;
  label: string;
  amount: number;
  monthlyAmount?: number;
  note?: string;
};

type ScopeGroup = {
  key: string;
  label: string;
  description: string;
  items: ScopeItem[];
};

const scopeAddon = (id: AddonId): ScopeItem => ({
  value: id,
  label: addonLabel(id),
  amount: ADDON_PRICE_AMOUNTS[id],
  monthlyAmount: addonMonthlyAmount(id) || undefined,
  note: ADDON_BY_ID.get(id)?.note,
});

/**
 * Necesidades de proyecto. Cada opción es un servicio real del catálogo publicado:
 * nombre y precio salen de `@/config/pricing`, nunca de valores escritos a mano.
 */
const SCOPE_GROUPS: ScopeGroup[] = [
  {
    key: "modules",
    label: "Módulos y funcionalidades",
    description: "Qué debe poder hacer la plataforma.",
    items: [
      scopeAddon("miniAdminPanel"),
      scopeAddon("fullAdminPanel"),
      scopeAddon("booking"),
      scopeAddon("advancedSearch"),
      scopeAddon("multiStepForm"),
      scopeAddon("blog"),
      scopeAddon("multiLanguage"),
    ],
  },
  {
    key: "users",
    label: "Usuarios y accesos",
    description: "Quién entra y con qué credenciales.",
    items: [scopeAddon("userLogin"), scopeAddon("clientArea"), scopeAddon("sso")],
  },
  {
    key: "roles",
    label: "Roles y permisos",
    description: "Qué puede ver y hacer cada perfil.",
    items: [scopeAddon("roles"), scopeAddon("auditLog")],
  },
  {
    key: "branches",
    label: "Sucursales y multiempresa",
    description: "Si la operación se divide en varias unidades.",
    items: [scopeAddon("multiBranch")],
  },
  {
    key: "operations",
    label: "Operaciones y flujos de trabajo",
    description: "Solicitudes internas y aprobaciones.",
    items: [scopeAddon("approvals"), scopeAddon("advancedForm")],
  },
  {
    key: "documents",
    label: "Documentos",
    description: "Generación, archivo y control documental.",
    items: [scopeAddon("docManagement"), scopeAddon("pdfGenerator"), scopeAddon("excelExport")],
  },
  {
    key: "dashboards",
    label: "Dashboards, reportes y SEO",
    description: "Cómo mides la operación y la visibilidad.",
    items: [
      scopeAddon("dashboardReports"),
      scopeAddon("advancedAnalytics"),
      scopeAddon("advancedSeo"),
      scopeAddon("technicalSeo"),
      scopeAddon("seoMonthly"),
    ],
  },
  {
    key: "integrations",
    label: "Integraciones",
    description: "Con qué sistemas debe conversar.",
    items: [
      scopeAddon("crm"),
      scopeAddon("erp"),
      scopeAddon("workspace"),
      scopeAddon("payments"),
    ],
  },
  {
    key: "api",
    label: "API y conexiones",
    description: "Cuando el desarrollo debe exponer o consumir datos.",
    items: [scopeAddon("customApi"), scopeAddon("webhooks")],
  },
  {
    key: "automations",
    label: "Automatizaciones",
    description: "Lo que debería ocurrir sin que nadie lo haga a mano.",
    items: [
      scopeAddon("whatsappButton"),
      scopeAddon("whatsappForm"),
      scopeAddon("whatsappAutomation"),
      scopeAddon("whatsappNotifications"),
      scopeAddon("whatsappChatbot"),
      scopeAddon("followupAutomation"),
      scopeAddon("cartRecovery"),
    ],
  },
  {
    key: "ecommerce",
    label: "Ecommerce",
    description: "Catálogo, ventas y despacho.",
    items: [
      scopeAddon("manageableCatalog"),
      scopeAddon("products20"),
      scopeAddon("products50"),
      scopeAddon("products100"),
      scopeAddon("stock"),
      scopeAddon("coupons"),
      scopeAddon("logistics"),
    ],
  },
  {
    key: "ai",
    label: "Inteligencia artificial",
    description: "Atención y procesos asistidos por IA.",
    items: AI_SERVICES.map((service, index) => ({
      value: `ia-${index}`,
      label: service.name,
      amount: service.setupAmount,
      monthlyAmount: service.monthlyAmount,
      note: "el consumo de modelos de IA se cobra por separado",
    })),
  },
];

const SCOPE_ITEM_BY_VALUE = new Map(
  SCOPE_GROUPS.flatMap((group) => group.items.map((item) => [item.value, item] as const)),
);

const initialFormState: FormState = {
  projectType: "",
  businessName: "",
  businessRubro: "",
  businessCity: "",
  hasWebsite: "",
  hasLogo: "",
  hasDomain: "",
  hasContent: "",
  detailValues: {},
  scopeValues: {},
  projectComment: "",
  budgetRange: "",
  deadline: "",
  urgency: "medio",
  contactName: "",
  contactWhatsapp: "",
  contactEmail: "",
  contactCompany: "",
  currentWebsite: "",
  additionalMessage: "",
  honeypot: "",
};

function buildInitialFormState(initialProjectType?: ProjectTypeValue): FormState {
  return {
    ...initialFormState,
    projectType: initialProjectType || "",
  };
}

function createSubmissionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function optionLabel(options: Option[], value?: string) {
  if (!value) return "";
  return options.find((option) => option.value === value)?.label || value;
}

function buildProjectAnswers(projectType: ProjectTypeValue | "", detailValues: Record<string, string | string[]>) {
  if (!projectType) return [];
  const fields = detailConfigs[projectType] || [];

  return fields
    .map((field) => {
      const rawValue = detailValues[field.key];
      if (field.type === "text") {
        const value = typeof rawValue === "string" ? rawValue.trim() : "";
        return value ? { key: field.key, label: field.label, value } : null;
      }

      if (field.type === "multi") {
        const value = Array.isArray(rawValue) ? rawValue : [];
        return value.length ? { key: field.key, label: field.label, value: value.join(", ") } : null;
      }

      const value = typeof rawValue === "string" ? optionLabel(field.options, rawValue) : "";
      return value ? { key: field.key, label: field.label, value } : null;
    })
    .filter((item): item is { key: string; label: string; value: string } => Boolean(item));
}

type QuoteAnswer = { key: string; label: string; value: string };

function selectedScopeGroups(scopeValues: Record<string, string[]>) {
  return SCOPE_GROUPS.map((group) => ({
    group,
    items: group.items.filter((item) => (scopeValues[group.key] || []).includes(item.value)),
  })).filter((entry) => entry.items.length > 0);
}

function selectedScopeItems(scopeValues: Record<string, string[]>) {
  return Object.entries(scopeValues).flatMap(([, values]) =>
    values.map((value) => SCOPE_ITEM_BY_VALUE.get(value)).filter((item): item is ScopeItem => Boolean(item)),
  );
}

function buildScopeAnswers(scopeValues: Record<string, string[]>): QuoteAnswer[] {
  return selectedScopeGroups(scopeValues).map(({ group, items }) => ({
    key: `alcance-${group.key}`,
    label: group.label,
    value: items.map((item) => item.label).join(", ").slice(0, MAX_ANSWER_VALUE_LENGTH),
  }));
}

/**
 * Estimación referencial: base del tipo de proyecto más las necesidades marcadas.
 * Sobre el tope corporativo deja de entregarse una cifra automática.
 */
function computeEstimate(projectType: ProjectTypeValue | "", scopeValues: Record<string, string[]>) {
  const base = projectType ? PROJECT_BASE_AMOUNTS[projectType] : 0;
  const items = selectedScopeItems(scopeValues);
  const setupTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const monthlyTotal = items.reduce((sum, item) => sum + (item.monthlyAmount || 0), 0);
  const oneTimeTotal = base + setupTotal;

  return {
    base,
    setupTotal,
    monthlyTotal,
    oneTimeTotal,
    selectedCount: items.length,
    hasEstimate: oneTimeTotal > 0,
    requiresDiscovery: oneTimeTotal > CORPORATE_ESTIMATE_THRESHOLD,
  };
}

/** El backend acepta hasta 20 respuestas: las que sobran se condensan en una sola. */
function packProjectAnswers(answers: QuoteAnswer[]): QuoteAnswer[] {
  if (answers.length <= MAX_PROJECT_ANSWERS) return answers;
  const head = answers.slice(0, MAX_PROJECT_ANSWERS - 1);
  const rest = answers.slice(MAX_PROJECT_ANSWERS - 1);
  head.push({
    key: "alcance-adicional",
    label: "Alcance adicional",
    value: rest
      .map((item) => `${item.label}: ${item.value}`)
      .join(" | ")
      .slice(0, MAX_ANSWER_VALUE_LENGTH),
  });
  return head;
}

function readSummary(form: FormState, initialPlanLabel?: string) {
  const answers = buildProjectAnswers(form.projectType, form.detailValues);
  const topAnswer = answers[0]?.value || "";
  const estimate = computeEstimate(form.projectType, form.scopeValues);
  const estimateLabel = estimate.requiresDiscovery
    ? "Requiere levantamiento"
    : estimate.hasEstimate
      ? fromPrice(estimate.oneTimeTotal)
      : "";

  return [
    initialPlanLabel ? `Plan sugerido: ${initialPlanLabel}` : "",
    projectTypeLabels[form.projectType as ProjectTypeValue] || "",
    topAnswer,
    estimateLabel,
    form.projectComment.trim(),
  ]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 220);
}

function validateEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function infoLine(label: string, value?: string) {
  return { label, value: value?.trim() || "No indicado" };
}

function choiceLabel(value: string, options: Option[]) {
  return optionLabel(options, value) || "No indicado";
}

function StepHeader({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="space-y-3">
      <div className="badge-blue w-fit">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
        Paso {step} de {TOTAL_STEPS}
      </div>
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">{description}</p>
      </div>
    </div>
  );
}

function ChoiceGroup({
  name,
  value,
  options,
  onChange,
  error,
}: {
  name: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={`${name}-${option.value}`}
              type="button"
              onClick={() => onChange(option.value)}
              className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                active
                  ? "border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-600/15"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

function MultiChoiceGroup({
  name,
  values,
  options,
  onToggle,
  error,
}: {
  name: string;
  values: string[];
  options: Option[];
  onToggle: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const active = values.includes(option.value);
          return (
            <button
              key={`${name}-${option.value}`}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all ${
                active
                  ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

const stepMeta = [
  { label: "Proyecto", shortLabel: "Proyecto", icon: Globe },
  { label: "Negocio", shortLabel: "Negocio", icon: BriefcaseBusiness },
  { label: "Detalles", shortLabel: "Detalles", icon: LayoutDashboard },
  { label: "Alcance", shortLabel: "Alcance", icon: Sparkles },
  { label: "Presupuesto", shortLabel: "Presupuesto", icon: Clock3 },
  { label: "Contacto", shortLabel: "Contacto", icon: MessageCircle },
  { label: "Resumen", shortLabel: "Resumen", icon: CheckCircle2 },
] as const;

function StepIndicator({ step }: { step: number }) {
  const activeStep = stepMeta[step - 1];

  return (
    <div className="space-y-4">
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Paso actual</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-600 text-white">
                <activeStep.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-900">{activeStep.label}</p>
                <p className="text-xs font-medium text-slate-500">
                  Paso {step} de {TOTAL_STEPS}
                </p>
              </div>
            </div>
          </div>

          <div className="flex max-w-[8.5rem] flex-wrap items-center justify-end gap-1.5">
            {stepMeta.map((item, index) => {
              const current = index + 1;
              const active = current === step;
              const completed = current < step;
              return (
                <span
                  key={item.label}
                  className={`flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${
                    completed
                      ? "border-blue-600 bg-blue-600 text-white"
                      : active
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {current}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="hidden items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-400 sm:flex">
        {stepMeta.map((item, index) => {
          const current = index + 1;
          const active = current === step;
          const completed = current < step;
          return (
            <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border text-[12px] ${
                  completed
                    ? "border-blue-600 bg-blue-600 text-white"
                    : active
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-400"
                }`}
              >
                {current}
              </span>
              <span className={active ? "text-blue-700" : completed ? "text-slate-600" : "text-slate-400"}>
                {item.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CommercialQuoteBuilder() {
  const search = useSyncExternalStore(subscribeToLocation, getLocationSearch, getServerSearch);
  return <CommercialQuoteBuilderFlow key={search} search={search} />;
}

function CommercialQuoteBuilderFlow({ search }: { search: string }) {
  const searchParams = new URLSearchParams(search);
  const initialProjectType = normalizeProjectType(searchParams.get("tipo"));
  const planParam = searchParams.get("plan")?.trim();
  const initialPlanLabel = planParam ? PLAN_LABELS[planParam] : undefined;
  // La calculadora puede llegar con una estimación previa o marcando el proyecto
  // como corporativo. Se conserva como contexto comercial de la solicitud.
  const previousEstimateRaw = Number(searchParams.get("estimado"));
  const previousEstimate =
    Number.isFinite(previousEstimateRaw) && previousEstimateRaw > 0
      ? Math.round(previousEstimateRaw)
      : 0;
  const arrivesAsCorporate = searchParams.get("alcance") === "corporativo";
  const hasPreset = Boolean(initialProjectType);
  const [started, setStarted] = useState(hasPreset);
  const [step, setStep] = useState(hasPreset ? 2 : 1);
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [submissionId, setSubmissionId] = useState(createSubmissionId);
  const [form, setForm] = useState<FormState>(() => buildInitialFormState(initialProjectType));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const detailFields = useMemo(
    () => (form.projectType ? detailConfigs[form.projectType] || [] : []),
    [form.projectType],
  );

  const detailAnswers = useMemo(
    () => buildProjectAnswers(form.projectType, form.detailValues),
    [form.detailValues, form.projectType],
  );

  const scopeAnswers = useMemo(() => buildScopeAnswers(form.scopeValues), [form.scopeValues]);

  const estimate = useMemo(
    () => computeEstimate(form.projectType, form.scopeValues),
    [form.projectType, form.scopeValues],
  );

  // El proyecto entra a levantamiento si su estimación supera el tope corporativo
  // o si el cliente ya declara un presupuesto de ese orden.
  const requiresDiscovery =
    estimate.requiresDiscovery || arrivesAsCorporate || form.budgetRange === "mas-5000000";

  const estimateLabel = requiresDiscovery
    ? CORPORATE_ESTIMATE_MESSAGE
    : estimate.hasEstimate
      ? fromPrice(estimate.oneTimeTotal)
      : "Se define con tu selección";

  const estimateAnswers = useMemo<QuoteAnswer[]>(() => {
    const answers: QuoteAnswer[] = [
      {
        key: "estimacion",
        label: "Estimación referencial",
        value: requiresDiscovery
          ? CORPORATE_ESTIMATE_MESSAGE
          : estimate.hasEstimate
            ? fromPrice(estimate.oneTimeTotal)
            : "Por definir con el cliente",
      },
    ];

    if (estimate.monthlyTotal > 0) {
      answers.push({
        key: "estimacion-mensual",
        label: "Servicios recurrentes estimados",
        value: monthlyPrice(estimate.monthlyTotal),
      });
    }

    if (previousEstimate > 0) {
      answers.push({
        key: "estimacion-calculadora",
        label: "Estimación previa de la calculadora",
        value: fromPrice(previousEstimate),
      });
    }

    if (requiresDiscovery) {
      answers.push({
        key: "modalidad",
        label: "Modalidad",
        value: CORPORATE_SCOPE_NOTE.slice(0, MAX_ANSWER_VALUE_LENGTH),
      });
    }

    return answers;
  }, [estimate.hasEstimate, estimate.monthlyTotal, estimate.oneTimeTotal, previousEstimate, requiresDiscovery]);

  const summaryAnswers = useMemo(
    () => packProjectAnswers([...detailAnswers, ...estimateAnswers, ...scopeAnswers]),
    [detailAnswers, estimateAnswers, scopeAnswers],
  );

  const summaryItems = useMemo(
    () => [
      ...(initialPlanLabel ? [infoLine("Plan de referencia", initialPlanLabel)] : []),
      infoLine("Tipo de proyecto", form.projectType ? projectTypeLabels[form.projectType] : ""),
      infoLine("Estimación referencial", estimateLabel),
      infoLine("Negocio", form.businessName),
      infoLine("Rubro", form.businessRubro),
      infoLine("Ciudad o región", form.businessCity),
      infoLine("Tiene web", choiceLabel(form.hasWebsite, websiteOptions)),
      infoLine("Tiene logo", choiceLabel(form.hasLogo, logoOptions)),
      infoLine("Tiene dominio", choiceLabel(form.hasDomain, domainOptions)),
      infoLine("Tiene textos e imágenes", choiceLabel(form.hasContent, contentOptions)),
      infoLine("Presupuesto", choiceLabel(form.budgetRange, budgetOptions)),
      infoLine("Plazo", choiceLabel(form.deadline, deadlineOptions)),
      infoLine("Urgencia", choiceLabel(form.urgency, urgencyOptions)),
      infoLine("Contacto", form.contactName),
      infoLine("WhatsApp", form.contactWhatsapp),
      infoLine("Email", form.contactEmail),
    ],
    [form, initialPlanLabel, estimateLabel],
  );

  function clearFieldError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFieldError(String(key));
  }

  function updateDetailValue(key: string, value: string | string[]) {
    setForm((prev) => ({
      ...prev,
      detailValues: {
        ...prev.detailValues,
        [key]: value,
      },
    }));
    clearFieldError(key);
  }

  function toggleDetailValue(key: string, value: string) {
    const current = Array.isArray(form.detailValues[key]) ? (form.detailValues[key] as string[]) : [];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    updateDetailValue(key, next);
  }

  function toggleScopeValue(groupKey: string, value: string) {
    setForm((prev) => {
      const current = prev.scopeValues[groupKey] || [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return {
        ...prev,
        scopeValues: { ...prev.scopeValues, [groupKey]: next },
      };
    });
  }

  function clearScope() {
    setForm((prev) => ({ ...prev, scopeValues: {} }));
  }

  function resetFlow() {
    setForm(buildInitialFormState(initialProjectType));
    setErrors({});
    setStep(initialProjectType ? 2 : 1);
    setStarted(Boolean(initialProjectType));
    setSubmissionId(createSubmissionId());
    setSubmitState({ status: "idle" });
  }

  function validateCurrentStep() {
    const nextErrors: Record<string, string> = {};

    if (step === 1 && !form.projectType) {
      nextErrors.projectType = "Selecciona lo que necesitas para continuar.";
    }

    if (step === 2) {
      if (!form.businessName.trim()) {
        nextErrors.businessName = "Cuéntanos el nombre de tu negocio para orientarte mejor.";
      }
      if (!form.hasWebsite) nextErrors.hasWebsite = "Selecciona una opción.";
      if (!form.hasLogo) nextErrors.hasLogo = "Selecciona una opción.";
      if (!form.hasDomain) nextErrors.hasDomain = "Selecciona una opción.";
      if (!form.hasContent) nextErrors.hasContent = "Selecciona una opción.";
    }

    if (step === 3) {
      for (const field of detailFields) {
        const rawValue = form.detailValues[field.key];
        if (field.type === "text") {
          const value = typeof rawValue === "string" ? rawValue.trim() : "";
          if (!value) nextErrors[field.key] = "Cuéntanos un poco más para orientarte bien.";
        } else if (field.type === "multi") {
          const values = Array.isArray(rawValue) ? rawValue : [];
          if (values.length === 0) nextErrors[field.key] = "Selecciona al menos una opción.";
        } else {
          const value = typeof rawValue === "string" ? rawValue : "";
          if (!value) nextErrors[field.key] = "Selecciona una opción.";
        }
      }
    }

    // El paso 4 (alcance) es opcional a propósito: suma contexto comercial sin
    // bloquear el envío de quien todavía no sabe qué módulos necesita.

    if (step === 5) {
      if (!form.budgetRange) nextErrors.budgetRange = "Selecciona un presupuesto aproximado.";
      if (!form.deadline) nextErrors.deadline = "Selecciona un plazo ideal.";
      if (!form.urgency) nextErrors.urgency = "Selecciona un nivel de urgencia.";
    }

    if (step === 6) {
      if (!form.contactName.trim()) {
        nextErrors.contactName = "Ingresa tu nombre para poder contactarte.";
      }
      if (!validateEmail(form.contactEmail)) {
        nextErrors.contactEmail = "Revisa el correo, parece que tiene un error.";
      }
      if (!CHILE_WHATSAPP_REGEX.test(form.contactWhatsapp.trim())) {
        nextErrors.contactWhatsapp = "Ingresa un WhatsApp válido para responderte.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  }

  /**
   * El detalle de alcance viaja dentro de `projectAnswers`, que el backend ya
   * acepta. Así se enriquece el lead sin cambiar el contrato del formulario.
   */

  async function handleSubmit() {
    if (submitting) return;

    setSubmitting(true);
    setSubmitState({ status: "idle" });

    const payload = {
      clientSubmissionId: submissionId,
      projectType: form.projectType,
      businessName: form.businessName.trim(),
      businessRubro: form.businessRubro.trim(),
      businessCity: form.businessCity.trim(),
      hasWebsite: form.hasWebsite,
      hasLogo: form.hasLogo,
      hasDomain: form.hasDomain,
      hasContent: form.hasContent,
      projectSummary: (requiresDiscovery
        ? `${CORPORATE_ESTIMATE_MESSAGE} ${readSummary(form, initialPlanLabel)}`
        : readSummary(form, initialPlanLabel)
      ).slice(0, 240),
      projectAnswers: summaryAnswers,
      projectComment: form.projectComment.trim(),
      budgetRange: form.budgetRange,
      deadline: form.deadline,
      urgency: form.urgency,
      contactName: form.contactName.trim(),
      contactWhatsapp: form.contactWhatsapp.trim(),
      contactEmail: form.contactEmail.trim(),
      contactCompany: form.contactCompany.trim(),
      currentWebsite: form.currentWebsite.trim(),
      additionalMessage: form.additionalMessage.trim(),
      honeypot: form.honeypot,
    };

    try {
      const response = await fetch("/api/cotizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        reference?: string;
        error?: string;
        whatsappUrl?: string;
      };

      if (!response.ok || !result.ok || !result.reference) {
        setSubmitState({
          status: "error",
          message: result.error || "No pudimos registrar tu solicitud. Intenta nuevamente o escríbenos por WhatsApp.",
          whatsappUrl: result.whatsappUrl || DIRECT_WHATSAPP_URL,
        });
        setSubmitting(false);
        return;
      }

      const eventParams = {
        page_path: window.location.pathname,
        project_type: form.projectType ? projectTypeLabels[form.projectType] : "Cotización comercial",
      };
      trackQuoteRequestSubmit(eventParams);
      trackQuoteRequestConversion(eventParams);
      setSubmitState({
        status: "success",
        reference: result.reference,
      });
      setSubmitting(false);
      setSubmissionId(createSubmissionId());
    } catch (error) {
      setSubmitState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No pudimos registrar tu solicitud. Intenta nuevamente o escríbenos por WhatsApp.",
        whatsappUrl: DIRECT_WHATSAPP_URL,
      });
      setSubmitting(false);
    }
  }

  if (!started) {
    return (
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative overflow-hidden px-6 py-8 sm:px-10 sm:py-10">
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-r from-blue-50 via-white to-slate-50" />
            <div className="relative space-y-6">
              <div className="badge-blue w-fit">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                Cotiza tu proyecto
              </div>
              <div className="space-y-3">
                <h2 className="max-w-2xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
                  Cotiza tu proyecto
                </h2>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Responde unas preguntas rápidas y te ayudaremos a elegir la mejor solución para tu negocio.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: CircleHelp, text: "No necesitas saber detalles técnicos." },
                  { icon: Sparkles, text: "El equipo revisa tu caso y te orienta." },
                  { icon: ShieldCheck, text: "Tus datos se usarán solo para responder tu solicitud." },
                ].map((item) => (
                  <div key={item.text} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <item.icon className="h-5 w-5 text-blue-600" />
                    <p className="mt-3 text-sm font-medium leading-6 text-slate-700">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setStarted(true)}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 sm:w-auto"
                >
                  Comenzar cotización
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href={DIRECT_WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
                >
                  Hablar por WhatsApp
                </a>
              </div>
              <p className="text-sm text-slate-500">
                Sin compromiso. Atención online para empresas, pymes y emprendedores en Chile.
              </p>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-50 px-6 py-8 sm:px-10 lg:border-l lg:border-t-0">
            <div className="space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Qué te vamos a pedir</p>
              <div className="space-y-3">
                {[
                  "Qué necesitas crear",
                  "Datos de tu negocio",
                  "Detalles del proyecto según tu caso",
                  "Necesidades: módulos, usuarios, integraciones e IA",
                  "Presupuesto, plazo y contacto",
                ].map((item, index) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">Te tomará solo unos minutos y no necesitas lenguaje técnico.</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (submitState.status === "success") {
    return (
      <section className="rounded-[2rem] border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-600">Solicitud recibida</p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">Solicitud recibida</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            Gracias, recibimos tu solicitud. Revisaremos la información y te contactaremos por WhatsApp o correo para orientarte con la mejor opción.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Código de solicitud</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{submitState.reference}</p>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={DIRECT_WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700"
            >
              Hablar por WhatsApp
              <MessageCircle className="h-4 w-4" />
            </a>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Volver al inicio
            </Link>
            <button
              type="button"
              onClick={resetFlow}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Enviar otra solicitud
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
      <div className="space-y-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Cotiza tu proyecto</p>
              {initialPlanLabel ? (
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  Plan preseleccionado: {initialPlanLabel}
                </div>
              ) : null}
                <h2 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-4xl">Cuéntanos qué necesitas y prepararemos una propuesta clara para tu negocio.</h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Responde unas preguntas rápidas. No necesitas saber detalles técnicos, el equipo te orienta.
              </p>
            </div>
            <StepIndicator step={step} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {step === 1 ? (
            <div className="space-y-6">
              <StepHeader
                step={1}
                title="¿Qué necesitas crear?"
                description="Elige la opción que más se acerque a lo que buscas. Si aún no tienes claro el tipo de solución, puedes pedir orientación."
              />

              <div className="grid gap-4 md:grid-cols-2">
                {projectCards.map((card) => {
                  const active = form.projectType === card.value;
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.value}
                      type="button"
                      onClick={() => {
                        updateField("projectType", card.value);
                        setForm((prev) => ({ ...prev, detailValues: {}, projectComment: "" }));
                      }}
                      className={`group relative overflow-hidden rounded-[1.75rem] border p-5 text-left transition-all ${
                        active
                          ? "border-blue-400 bg-gradient-to-br from-blue-600 via-blue-600 to-sky-500 text-white shadow-2xl shadow-blue-700/20 ring-4 ring-blue-100"
                          : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 hover:shadow-lg"
                      }`}
                    >
                      <div className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity ${active ? "opacity-100" : "group-hover:opacity-100"}`}>
                        <div className={`absolute right-0 top-0 h-24 w-24 rounded-full blur-3xl ${active ? "bg-white/20" : "bg-blue-100"}`} />
                      </div>

                      <div className="relative space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-3">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                                active
                                  ? "border-white/20 bg-white/10 text-white"
                                  : "border-blue-100 bg-blue-50 text-blue-700"
                              }`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <h3 className={`text-lg font-extrabold ${active ? "text-white" : "text-slate-900"}`}>{card.label}</h3>
                            <p className={`mt-2 text-sm leading-6 ${active ? "text-blue-100" : "text-slate-600"}`}>{card.description}</p>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
                              active ? "bg-white/15 text-white" : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                            {active ? "Seleccionado" : "Elegir"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {card.priceHint ? (
                            <p className={`rounded-full px-3 py-1 text-sm font-bold ${active ? "bg-white/10 text-white" : "bg-slate-100 text-blue-700"}`}>{card.priceHint}</p>
                          ) : null}
                          <p className={`text-xs font-medium ${active ? "text-blue-100" : "text-slate-500"}`}>
                            Selección rápida para orientarte sin lenguaje técnico.
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {errors.projectType ? <p className="text-sm font-medium text-rose-600">{errors.projectType}</p> : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <StepHeader
                step={2}
                title="Datos del negocio"
                description="Con esta base podemos entender mejor tu contexto y proponerte una solución más adecuada."
              />

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">Nombre o empresa</label>
                  <input
                    value={form.businessName}
                    onChange={(event) => updateField("businessName", event.target.value)}
                    placeholder="Ej: Comercial Andina"
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                  {errors.businessName ? <p className="text-sm font-medium text-rose-600">{errors.businessName}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">Rubro</label>
                  <input
                    value={form.businessRubro}
                    onChange={(event) => updateField("businessRubro", event.target.value)}
                    placeholder="Ej: servicios, retail, educación o salud"
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-800">Ciudad o región</label>
                  <input
                    value={form.businessCity}
                    onChange={(event) => updateField("businessCity", event.target.value)}
                    placeholder="Ej: Santiago, Valparaíso o Región Metropolitana"
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-800">¿Ya tienes página web?</p>
                  <ChoiceGroup name="hasWebsite" value={form.hasWebsite} options={websiteOptions} onChange={(value) => updateField("hasWebsite", value as BinaryChoice)} error={errors.hasWebsite} />
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-800">¿Tienes logo?</p>
                  <ChoiceGroup name="hasLogo" value={form.hasLogo} options={logoOptions} onChange={(value) => updateField("hasLogo", value as BinaryChoice)} error={errors.hasLogo} />
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-800">¿Tienes dominio?</p>
                  <ChoiceGroup name="hasDomain" value={form.hasDomain} options={domainOptions} onChange={(value) => updateField("hasDomain", value as BinaryChoice)} error={errors.hasDomain} />
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-800">¿Tienes textos e imágenes?</p>
                  <ChoiceGroup name="hasContent" value={form.hasContent} options={contentOptions} onChange={(value) => updateField("hasContent", value as BinaryChoice)} error={errors.hasContent} />
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6">
              <StepHeader
                step={3}
                title={`Detalles de ${form.projectType ? projectTypeLabels[form.projectType] : "tu proyecto"}`}
                description="Este paso cambia según lo que elegiste. Queremos entender el alcance principal sin hacerte llenar un formulario eterno."
              />

              <div className="space-y-6">
                {detailFields.map((field) => (
                  <div key={field.key} className="space-y-3">
                    <p className="text-sm font-semibold text-slate-800">{field.label}</p>
                    {field.type === "text" ? (
                      <div>
                        <textarea
                          value={typeof form.detailValues[field.key] === "string" ? (form.detailValues[field.key] as string) : ""}
                          onChange={(event) => updateDetailValue(field.key, event.target.value)}
                          placeholder={field.placeholder}
                          rows={4}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                        {errors[field.key] ? <p className="mt-2 text-sm font-medium text-rose-600">{errors[field.key]}</p> : null}
                      </div>
                    ) : null}

                    {field.type === "single" ? (
                      <ChoiceGroup
                        name={field.key}
                        value={typeof form.detailValues[field.key] === "string" ? (form.detailValues[field.key] as string) : ""}
                        options={field.options}
                        onChange={(value) => updateDetailValue(field.key, value)}
                        error={errors[field.key]}
                      />
                    ) : null}

                    {field.type === "multi" ? (
                      <MultiChoiceGroup
                        name={field.key}
                        values={Array.isArray(form.detailValues[field.key]) ? (form.detailValues[field.key] as string[]) : []}
                        options={field.options}
                        onToggle={(value) => toggleDetailValue(field.key, value)}
                        error={errors[field.key]}
                      />
                    ) : null}
                  </div>
                ))}

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">Comentario breve</label>
                  <textarea
                    value={form.projectComment}
                    onChange={(event) => updateField("projectComment", event.target.value)}
                    placeholder="Si quieres, agrega contexto adicional sobre lo que necesitas."
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-6">
              <StepHeader
                step={4}
                title="Necesidades del proyecto"
                description="Marca lo que tu operación necesita. Con esto armamos una propuesta con módulos concretos en vez de una descripción general. Si no lo tienes claro, puedes continuar sin marcar nada."
              />

              <div className="space-y-6">
                {SCOPE_GROUPS.map((group) => {
                  const values = form.scopeValues[group.key] || [];
                  return (
                    <div key={group.key} className="space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{group.label}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">{group.description}</p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {group.items.map((item) => {
                          const active = values.includes(item.value);
                          return (
                            <button
                              key={item.value}
                              type="button"
                              onClick={() => toggleScopeValue(group.key, item.value)}
                              aria-pressed={active}
                              className={`flex min-h-12 items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                                active
                                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50"
                              }`}
                            >
                              <span
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  active
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {active ? <CheckCircle2 className="h-3 w-3" /> : null}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-slate-900">
                                  {item.label}
                                </span>
                                <span className="mt-1 block text-xs font-semibold text-slate-500">
                                  {fromPrice(item.amount)}
                                  {item.monthlyAmount
                                    ? ` · ${clp(item.monthlyAmount)} + IVA / mes`
                                    : ""}
                                </span>
                                {item.note ? (
                                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                                    {item.note}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-600">
                  {estimate.selectedCount > 0
                    ? `${estimate.selectedCount} ${estimate.selectedCount === 1 ? "necesidad marcada" : "necesidades marcadas"}.`
                    : "Aún no marcas necesidades. También puedes describirlas en el comentario del paso anterior."}
                </p>
                {estimate.selectedCount > 0 ? (
                  <button
                    type="button"
                    onClick={clearScope}
                    className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white sm:min-h-0"
                  >
                    Limpiar selección
                  </button>
                ) : null}
              </div>

              <p className="text-xs leading-6 text-slate-500">{PRICING_NOTE}</p>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-6">
              <StepHeader
                step={5}
                title="Presupuesto y plazo"
                description="Esto nos ayuda a recomendarte una opción adecuada."
              />

              <div className="space-y-5">
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-800">Presupuesto aproximado</p>
                  <ChoiceGroup name="budgetRange" value={form.budgetRange} options={budgetOptions} onChange={(value) => updateField("budgetRange", value as BudgetRangeValue)} error={errors.budgetRange} />
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-800">Plazo ideal</p>
                  <ChoiceGroup name="deadline" value={form.deadline} options={deadlineOptions} onChange={(value) => updateField("deadline", value as DeadlineValue)} error={errors.deadline} />
                </div>
                <div>
                  <p className="mb-3 text-sm font-semibold text-slate-800">Nivel de urgencia</p>
                  <ChoiceGroup name="urgency" value={form.urgency} options={urgencyOptions} onChange={(value) => updateField("urgency", value as UrgencyValue)} error={errors.urgency} />
                </div>
              </div>
            </div>
          ) : null}

          {step === 6 ? (
            <div className="space-y-6">
              <StepHeader
                step={6}
                title="Datos de contacto"
                description="Con esto podremos responderte por el canal que te resulte más cómodo."
              />

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">Nombre</label>
                  <input
                    value={form.contactName}
                    onChange={(event) => updateField("contactName", event.target.value)}
                    placeholder="Tu nombre"
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                  {errors.contactName ? <p className="text-sm font-medium text-rose-600">{errors.contactName}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">WhatsApp</label>
                  <input
                    value={form.contactWhatsapp}
                    onChange={(event) => updateField("contactWhatsapp", event.target.value)}
                    placeholder="+56939526626"
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                  {errors.contactWhatsapp ? <p className="text-sm font-medium text-rose-600">{errors.contactWhatsapp}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">Email</label>
                  <input
                    value={form.contactEmail}
                    onChange={(event) => updateField("contactEmail", event.target.value)}
                    placeholder="nombre@empresa.cl"
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                  {errors.contactEmail ? <p className="text-sm font-medium text-rose-600">{errors.contactEmail}</p> : null}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">Empresa</label>
                  <input
                    value={form.contactCompany}
                    onChange={(event) => updateField("contactCompany", event.target.value)}
                    placeholder="Opcional"
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-800">Sitio web actual</label>
                  <input
                    value={form.currentWebsite}
                    onChange={(event) => updateField("currentWebsite", event.target.value)}
                    placeholder="Opcional"
                    className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-semibold text-slate-800">Comentario adicional</label>
                  <textarea
                    value={form.additionalMessage}
                    onChange={(event) => updateField("additionalMessage", event.target.value)}
                    placeholder="Opcional"
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="hidden">
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.honeypot}
                  onChange={(event) => updateField("honeypot", event.target.value)}
                  aria-hidden="true"
                />
              </div>
            </div>
          ) : null}

          {step === 7 ? (
            <div className="space-y-6">
              <StepHeader
                step={7}
                title="Resumen antes de enviar"
                description={
                  requiresDiscovery
                    ? "Por el alcance que marcaste, tu solicitud entra como proyecto corporativo: la revisamos con el equipo técnico y comercial antes de proponerte un valor."
                    : "Revisaremos tu solicitud y te responderemos con una propuesta clara según lo que necesitas."
                }
              />

              <div
                className={`rounded-[1.5rem] border p-5 ${
                  requiresDiscovery ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  {requiresDiscovery ? "Proyecto corporativo" : "Estimación referencial"}
                </p>
                <p className="mt-2 text-2xl font-extrabold leading-snug text-slate-900">
                  {estimateLabel}
                </p>
                {estimate.monthlyTotal > 0 ? (
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    Más {monthlyPrice(estimate.monthlyTotal)} en servicios recurrentes.
                  </p>
                ) : null}
                <p className="mt-3 text-xs leading-6 text-slate-500">
                  {requiresDiscovery ? CORPORATE_SCOPE_NOTE : PRICING_NOTE}
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  {summaryItems.map((item) => (
                    <div key={`${item.label}-${item.value}`}>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Alcance principal</p>
                  <div className="mt-3 space-y-3">
                    {summaryAnswers.map((answer) => (
                      <div key={answer.key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">{answer.label}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{answer.value}</p>
                      </div>
                    ))}
                    {form.projectComment.trim() ? (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">Comentario breve</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{form.projectComment.trim()}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {submitState.status === "error" ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <p className="font-semibold">{submitState.message}</p>
              {submitState.whatsappUrl ? (
                <a
                  href={submitState.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-semibold text-rose-700 ring-1 ring-rose-200"
                >
                  Escribir por WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => {
                if (step === 1) {
                  setStarted(false);
                  return;
                }
                setStep((prev) => Math.max(1, prev - 1));
              }}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              {step === 1 ? "Volver" : step === TOTAL_STEPS ? "Volver y editar" : "Anterior"}
            </button>

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 sm:w-auto"
              >
                Siguiente
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    {requiresDiscovery ? "Solicitar levantamiento" : "Enviar cotización"}
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div
          className={`rounded-[2rem] border p-5 shadow-sm lg:hidden ${
            requiresDiscovery ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
          }`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {requiresDiscovery ? "Proyecto corporativo" : "Estimación referencial"}
          </p>
          <p className="mt-2 text-lg font-extrabold leading-snug text-slate-900">{estimateLabel}</p>
          {estimate.monthlyTotal > 0 ? (
            <p className="mt-2 text-sm font-semibold text-slate-700">
              Más {monthlyPrice(estimate.monthlyTotal)} en servicios recurrentes.
            </p>
          ) : null}
          <p className="mt-3 text-xs leading-6 text-slate-500">
            {requiresDiscovery ? CORPORATE_SCOPE_NOTE : PRICING_NOTE}
          </p>
        </div>

        <details className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm lg:hidden">
          <summary className="cursor-pointer list-none text-sm font-bold text-slate-900">Ver resumen de la solicitud</summary>
          <div className="mt-4 space-y-4">
            {summaryItems.map((item) => (
              <div key={`${item.label}-${item.value}`}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </details>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-5">
          <div
            className={`rounded-[2rem] border p-6 shadow-sm ${
              requiresDiscovery ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"
            }`}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {requiresDiscovery ? "Proyecto corporativo" : "Estimación referencial"}
            </p>
            <p className="mt-2 text-xl font-extrabold leading-snug text-slate-900">{estimateLabel}</p>
            {estimate.monthlyTotal > 0 ? (
              <p className="mt-2 text-sm font-semibold text-slate-700">
                Más {monthlyPrice(estimate.monthlyTotal)} en servicios recurrentes.
              </p>
            ) : null}
            {estimate.selectedCount > 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                {estimate.selectedCount}{" "}
                {estimate.selectedCount === 1 ? "necesidad marcada" : "necesidades marcadas"}.
              </p>
            ) : null}
            <p className="mt-3 text-xs leading-6 text-slate-500">
              {requiresDiscovery ? CORPORATE_SCOPE_NOTE : PRICING_NOTE}
            </p>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <BriefcaseBusiness className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Resumen parcial</p>
                <h3 className="mt-1 text-lg font-extrabold text-slate-900">
                  {form.projectType ? projectTypeLabels[form.projectType] : "Tu solicitud"}
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {readSummary(form, initialPlanLabel) || "A medida que avances, aquí verás un resumen claro de tu solicitud."}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {summaryItems.map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Confianza</p>
            <div className="mt-4 space-y-4">
              {[
                { icon: ShieldCheck, title: "Solicitud segura", text: "Tus datos se usan solo para responderte y no se envían desde el navegador a servicios externos." },
                { icon: Clock3, title: "Proceso claro", text: "Guardamos tu solicitud aunque falle el correo o WhatsApp, para no perder tu caso." },
                { icon: MessageCircle, title: "Atención humana", text: "Si prefieres, también puedes hablar con Zyteron por WhatsApp en cualquier momento." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <item.icon className="h-5 w-5 text-blue-600" />
                  <p className="mt-3 text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </section>
  );
}
