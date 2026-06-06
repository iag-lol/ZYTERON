"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
type BudgetRangeValue =
  | "menos-50000"
  | "50000-100000"
  | "100000-300000"
  | "300000-700000"
  | "mas-700000"
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

const TOTAL_STEPS = 6;
const DIRECT_WHATSAPP_URL = "https://wa.me/56939526626";
const CHILE_WHATSAPP_REGEX = /^(?:\+?56)?(?:\s?9)?(?:[\s-]?\d){8}$/;

const projectCards: ProjectCard[] = [
  {
    value: "web-basica",
    label: "Web básica de presentación",
    description: "Una página simple para mostrar tu negocio y recibir contactos.",
    icon: MonitorSmartphone,
    priceHint: "Desde $35.990",
  },
  {
    value: "web-profesional",
    label: "Página web profesional",
    description: "Sitio más completo para empresas, servicios o pymes.",
    icon: PanelsTopLeft,
  },
  {
    value: "tienda-online",
    label: "Tienda online",
    description: "Catálogo, productos, carrito o ventas por WhatsApp.",
    icon: ShoppingCart,
  },
  {
    value: "sistema-web",
    label: "Sistema web interno",
    description: "Paneles, registros, reportes, usuarios o control de procesos.",
    icon: LayoutDashboard,
  },
  {
    value: "automatizacion",
    label: "Automatización",
    description: "Formularios, correos, WhatsApp, reportes o flujos automáticos.",
    icon: Bot,
  },
  {
    value: "soporte-ti",
    label: "Soporte TI",
    description: "Ayuda técnica, configuración, correos, dominios o herramientas.",
    icon: Wrench,
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

const budgetOptions: Option[] = [
  { value: "menos-50000", label: "Menos de $50.000" },
  { value: "50000-100000", label: "$50.000 a $100.000" },
  { value: "100000-300000", label: "$100.000 a $300.000" },
  { value: "300000-700000", label: "$300.000 a $700.000" },
  { value: "mas-700000", label: "Más de $700.000" },
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

function readSummary(form: FormState, initialPlanLabel?: string) {
  const answers = buildProjectAnswers(form.projectType, form.detailValues);
  const topAnswer = answers[0]?.value || "";
  return [initialPlanLabel ? `Plan sugerido: ${initialPlanLabel}` : "", projectTypeLabels[form.projectType as ProjectTypeValue] || "", topAnswer, form.projectComment.trim()]
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

          <div className="flex items-center gap-1.5">
            {stepMeta.map((item, index) => {
              const current = index + 1;
              const active = current === step;
              const completed = current < step;
              return (
                <span
                  key={item.label}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-bold ${
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

type CommercialQuoteBuilderProps = {
  initialPlanLabel?: string;
  initialProjectType?: ProjectTypeValue;
};

export function CommercialQuoteBuilder({ initialPlanLabel, initialProjectType }: CommercialQuoteBuilderProps) {
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

  const summaryAnswers = useMemo(
    () => buildProjectAnswers(form.projectType, form.detailValues),
    [form.detailValues, form.projectType],
  );

  const summaryItems = useMemo(
    () => [
      ...(initialPlanLabel ? [infoLine("Plan de referencia", initialPlanLabel)] : []),
      infoLine("Tipo de proyecto", form.projectType ? projectTypeLabels[form.projectType] : ""),
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
    [form, initialPlanLabel],
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

    if (step === 4) {
      if (!form.budgetRange) nextErrors.budgetRange = "Selecciona un presupuesto aproximado.";
      if (!form.deadline) nextErrors.deadline = "Selecciona un plazo ideal.";
      if (!form.urgency) nextErrors.urgency = "Selecciona un nivel de urgencia.";
    }

    if (step === 5) {
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
      projectSummary: readSummary(form, initialPlanLabel),
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
                <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
                  Cotiza tu proyecto
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                  Responde unas preguntas rápidas y te ayudaremos a elegir la mejor solución para tu negocio.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { icon: CircleHelp, text: "No necesitas saber detalles técnicos." },
                  { icon: Sparkles, text: "Nosotros revisamos tu caso y te orientamos." },
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
                <h1 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-4xl">Cuéntanos qué necesitas y prepararemos una propuesta clara para tu negocio.</h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Responde unas preguntas rápidas. No necesitas saber detalles técnicos, nosotros te orientamos.
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

          {step === 5 ? (
            <div className="space-y-6">
              <StepHeader
                step={5}
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
                    placeholder="+56 9 1234 5678"
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

          {step === 6 ? (
            <div className="space-y-6">
              <StepHeader
                step={6}
                title="Resumen antes de enviar"
                description="Revisaremos tu solicitud y te responderemos con una propuesta clara según lo que necesitas."
              />

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
              {step === 1 ? "Volver" : step === 6 ? "Volver y editar" : "Anterior"}
            </button>

            {step < 6 ? (
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
                    Enviar cotización
                    <Send className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
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
                { icon: MessageCircle, title: "Atención humana", text: "Si prefieres, también puedes hablar con nosotros por WhatsApp en cualquier momento." },
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
