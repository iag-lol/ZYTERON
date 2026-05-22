"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SubmitState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | { status: "error"; message: string };

type BudgetRange =
  | "menos-100"
  | "100-250"
  | "250-500"
  | "500-1000"
  | "mas-1000"
  | "sin-definir";

type Recommendation = {
  planName: string;
  fromPrice: number;
  rangeLabel: string;
  note: string;
  requiresReview: boolean;
};

const advancedFeatureKeys = new Set([
  "pasarela-pago",
  "login-usuarios",
  "panel-admin",
  "reportes",
  "dashboard",
  "pdf",
  "excel",
  "automatizaciones",
  "integracion-whatsapp",
  "soporte-mensual",
]);

const complexNeedKeys = new Set([
  "sistema-web",
  "panel-administrativo",
  "cotizador-pdf",
  "sistema-reservas",
  "gestion-clientes",
  "gestion-productos",
  "sistema-inventario",
  "control-registros",
  "reportes-dashboard",
  "automatizacion-procesos",
  // Compatibilidad con datos históricos del cotizador.
  "control-flota",
  "control-combustible",
  "proyecto-personalizado",
]);

const planGuidance = [
  "Si solo necesitas presencia online y contacto por WhatsApp: Plan Emprendedor.",
  "Si tienes un negocio y necesitas mostrar servicios, generar confianza y recibir consultas: Plan Pyme.",
  "Si representas una empresa, colegio o institución y necesitas una web más estructurada: Plan Empresa.",
  "Si vendes productos o necesitas mostrar un catálogo: Catálogo / Tienda Online.",
  "Si necesitas administrar información, usuarios, registros, reservas o reportes: Sistema Web.",
  "Si necesitas integraciones, automatizaciones o módulos personalizados: Desarrollo a medida.",
];

const needTypeGroups = [
  {
    title: "Presencia digital",
    options: [
      ["landing-page", "Landing page"],
      ["pagina-corporativa", "Página web corporativa"],
      ["catalogo-productos", "Catálogo de productos"],
      ["tienda-online", "Tienda online"],
    ],
  },
  {
    title: "Sistemas y gestión",
    options: [
      ["sistema-web", "Sistema web"],
      ["panel-administrativo", "Panel administrativo"],
      ["sistema-reservas", "Sistema de reservas"],
      ["cotizador-pdf", "Cotizador con PDF"],
      ["gestion-clientes", "Gestión de clientes"],
      ["gestion-productos", "Gestión de productos"],
      ["sistema-inventario", "Sistema de inventario"],
      ["control-registros", "Control de registros"],
      ["reportes-dashboard", "Reportes y dashboard"],
      ["automatizacion-procesos", "Automatización de procesos"],
    ],
  },
  {
    title: "Servicios técnicos",
    options: [
      ["soporte-ti", "Soporte TI"],
      ["proyecto-personalizado", "Proyecto personalizado"],
    ],
  },
] as const;

function computeRecommendation(input: {
  projectFor: string;
  needType: string;
  features: string[];
  pageCount: string;
  budgetRange: BudgetRange;
}) {
  const isInstitution = ["empresa", "colegio-institucion", "institucion", "organizacion"].includes(
    input.projectFor,
  );
  const hasComplexNeed = complexNeedKeys.has(input.needType);
  const advancedCount = input.features.filter((item) => advancedFeatureKeys.has(item)).length;
  const hugePageCount = input.pageCount === "mas-10";
  const highBudget = input.budgetRange === "500-1000" || input.budgetRange === "mas-1000";

  if (hasComplexNeed || advancedCount >= 3 || (advancedCount >= 2 && hugePageCount)) {
    if (advancedCount >= 5 || (highBudget && advancedCount >= 3)) {
      return {
        planName: "Sistema Avanzado / Desarrollo a medida",
        fromPrice: 749990,
        rangeLabel: "$749.990 a $1.800.000+",
        note: "Se recomienda agendar diagnóstico para definir módulos, integraciones y etapas.",
        requiresReview: true,
      } satisfies Recommendation;
    }

    return {
      planName: "Sistema Web / Panel Administrativo",
      fromPrice: 399990,
      rangeLabel: "$399.990 a $990.000",
      note: "Este proyecto requiere evaluación y cotización formal según alcance.",
      requiresReview: true,
    } satisfies Recommendation;
  }

  if (input.needType === "tienda-online") {
    return {
      planName: "Catálogo / Tienda Online",
      fromPrice: 299990,
      rangeLabel: "$299.990 a $699.990",
      note: "Pasarela de pago, panel y automatizaciones se evalúan por separado según requerimiento.",
      requiresReview: true,
    } satisfies Recommendation;
  }

  if (input.needType === "catalogo-productos") {
    return {
      planName: "Catálogo simple",
      fromPrice: 99990,
      rangeLabel: "$99.990 a $249.990",
      note: "Ideal para mostrar productos sin integrar procesos complejos en una primera etapa.",
      requiresReview: false,
    } satisfies Recommendation;
  }

  if (input.needType === "soporte-ti") {
    return {
      planName: "Soporte TI",
      fromPrice: 49990,
      rangeLabel: "$49.990 a $180.000",
      note: "Recomendado para soporte técnico y mejoras operativas puntuales.",
      requiresReview: false,
    } satisfies Recommendation;
  }

  if (isInstitution || input.needType === "pagina-corporativa") {
    return {
      planName: "Plan Empresa",
      fromPrice: 249990,
      rangeLabel: "$249.990 a $549.990",
      note: "Recomendado para webs corporativas estructuradas y requerimientos institucionales.",
      requiresReview: false,
    } satisfies Recommendation;
  }

  if (input.needType === "landing-page") {
    return {
      planName: "Plan Emprendedor",
      fromPrice: 59990,
      rangeLabel: "$59.990 a $129.990",
      note: "Ideal para presencia inicial y captación simple de contactos.",
      requiresReview: false,
    } satisfies Recommendation;
  }

  return {
    planName: "Plan Pyme",
    fromPrice: 129990,
    rangeLabel: "$129.990 a $269.990",
    note: "Para negocios que necesitan una web comercial más completa y profesional.",
    requiresReview: false,
  } satisfies Recommendation;
}

function formatCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

export function CommercialQuoteBuilder() {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    projectFor: "",
    needType: "",
    pageCount: "",
    contentReady: "",
    domainHosting: "",
    taxDocument: "",
    budgetRange: "sin-definir" as BudgetRange,
    features: [] as string[],
    name: "",
    project: "",
    email: "",
    whatsapp: "",
    message: "",
  });

  const recommendation = useMemo(
    () =>
      computeRecommendation({
        projectFor: form.projectFor,
        needType: form.needType,
        features: form.features,
        pageCount: form.pageCount,
        budgetRange: form.budgetRange,
      }),
    [form.budgetRange, form.features, form.needType, form.pageCount, form.projectFor],
  );

  const canSubmit =
    Boolean(form.projectFor) &&
    Boolean(form.needType) &&
    Boolean(form.pageCount) &&
    Boolean(form.contentReady) &&
    Boolean(form.domainHosting) &&
    Boolean(form.taxDocument) &&
    Boolean(form.name.trim()) &&
    Boolean(form.project.trim()) &&
    Boolean(form.email.trim()) &&
    Boolean(form.whatsapp.trim());

  function toggleFeature(feature: string) {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((item) => item !== feature)
        : [...prev.features, feature],
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      setSubmitState({
        status: "error",
        message: "Completa los campos obligatorios para enviar tu solicitud.",
      });
      return;
    }

    setSubmitting(true);
    setSubmitState({ status: "idle" });

    const response = await fetch("/api/cotizador", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.whatsapp.trim(),
        company: form.project.trim(),
        service: form.needType,
        message: form.message.trim(),
        planName: recommendation.planName,
        planPrice: recommendation.fromPrice,
        extras: [],
        subtotal: recommendation.fromPrice,
        discountTotal: 0,
        iva: Math.round(recommendation.fromPrice * 0.19),
        total: recommendation.fromPrice + Math.round(recommendation.fromPrice * 0.19),
        projectFor: form.projectFor,
        needType: form.needType,
        features: form.features,
        pageCount: form.pageCount,
        contentReady: form.contentReady,
        domainHosting: form.domainHosting,
        taxDocument: form.taxDocument,
        budgetRange: form.budgetRange,
        recommendedPlan: recommendation.planName,
        estimatedFrom: recommendation.fromPrice,
        estimatedRange: recommendation.rangeLabel,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      reference?: string;
    };

    if (!response.ok || !payload.ok) {
      setSubmitState({
        status: "error",
        message: payload.error || "No se pudo enviar la solicitud. Intenta nuevamente.",
      });
      setSubmitting(false);
      return;
    }

    setSubmitState({ status: "success", reference: payload.reference || "RECIBIDO" });
    setSubmitting(false);
  }

  return (
    <div className="space-y-8">
      <section className="card-premium p-6">
        <h2 className="text-2xl font-extrabold text-slate-900">Cotizador inteligente ZYTERON</h2>
        <p className="mt-2 text-sm text-slate-600">
          Este cotizador entrega una referencia comercial inicial. El valor final siempre se define por alcance real.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {planGuidance.map((line) => (
            <div key={line} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {line}
            </div>
          ))}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card-premium p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">A) ¿Para quién es el proyecto?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["persona-natural", "Persona natural"],
              ["emprendedor", "Emprendedor"],
              ["pyme", "Pyme"],
              ["empresa", "Empresa"],
              ["colegio-institucion", "Colegio / institución"],
              ["local-comercial", "Local comercial"],
              ["profesional-independiente", "Profesional independiente"],
              ["organizacion", "Organización"],
              ["otro", "Otro"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <input
                  type="radio"
                  name="project-for"
                  checked={form.projectFor === value}
                  onChange={() => setForm((prev) => ({ ...prev, projectFor: value }))}
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section className="card-premium p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">B) ¿Qué necesitas?</p>
          <div className="mt-4 space-y-4">
            {needTypeGroups.map((group) => (
              <div key={group.title} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-600">{group.title}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.options.map(([value, label]) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <input
                        type="radio"
                        name="need-type"
                        checked={form.needType === value}
                        onChange={() => setForm((prev) => ({ ...prev, needType: value }))}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            También desarrollamos sistemas personalizados para control operativo, flota, combustible, asistencia,
            inventario, reservas, reportes u otros procesos internos.
          </p>
        </section>

        <section className="card-premium p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">C) ¿Qué funcionalidades necesitas?</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["boton-whatsapp", "Botón WhatsApp"],
              ["formulario-contacto", "Formulario de contacto"],
              ["galeria", "Galería de imágenes"],
              ["blog", "Blog"],
              ["catalogo", "Catálogo"],
              ["tienda-online", "Tienda online"],
              ["pasarela-pago", "Pasarela de pago"],
              ["login-usuarios", "Login de usuarios"],
              ["panel-admin", "Panel administrativo"],
              ["gestion-productos", "Gestión de productos"],
              ["gestion-reservas", "Gestión de reservas"],
              ["reportes", "Reportes"],
              ["dashboard", "Dashboard"],
              ["pdf", "Generación de PDF"],
              ["excel", "Exportación Excel"],
              ["automatizaciones", "Automatizaciones"],
              ["integracion-whatsapp", "Integración con WhatsApp"],
              ["correos-corporativos", "Correos corporativos"],
              ["seo-avanzado", "SEO avanzado"],
              ["soporte-mensual", "Soporte mensual"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.features.includes(value)}
                  onChange={() => toggleFeature(value)}
                />
                {label}
              </label>
            ))}
          </div>
        </section>

        <section className="card-premium p-6">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <Label htmlFor="page-count" className="text-xs font-bold uppercase tracking-widest text-blue-600">
                D) ¿Cuántas secciones o páginas necesitas?
              </Label>
              <select
                id="page-count"
                className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={form.pageCount}
                onChange={(event) => setForm((prev) => ({ ...prev, pageCount: event.target.value }))}
              >
                <option value="">Selecciona</option>
                <option value="1">1 página</option>
                <option value="2-5">2 a 5 páginas</option>
                <option value="6-10">6 a 10 páginas</option>
                <option value="mas-10">Más de 10 páginas</option>
                <option value="no-se">No estoy seguro</option>
              </select>
            </div>

            <div>
              <Label htmlFor="content-ready" className="text-xs font-bold uppercase tracking-widest text-blue-600">
                E) ¿Tienes contenido listo?
              </Label>
              <select
                id="content-ready"
                className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={form.contentReady}
                onChange={(event) => setForm((prev) => ({ ...prev, contentReady: event.target.value }))}
              >
                <option value="">Selecciona</option>
                <option value="si">Sí, tengo textos e imágenes</option>
                <option value="parcial">Tengo parte del contenido</option>
                <option value="ayuda-textos">Necesito ayuda con textos</option>
                <option value="ayuda-imagenes">Necesito ayuda con imágenes</option>
                <option value="sin-contenido">No tengo nada listo</option>
              </select>
            </div>

            <div>
              <Label htmlFor="domain-hosting" className="text-xs font-bold uppercase tracking-widest text-blue-600">
                F) ¿Necesitas dominio y hosting?
              </Label>
              <select
                id="domain-hosting"
                className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={form.domainHosting}
                onChange={(event) => setForm((prev) => ({ ...prev, domainHosting: event.target.value }))}
              >
                <option value="">Selecciona</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
                <option value="ya-tengo">Ya tengo</option>
                <option value="no-se">No estoy seguro</option>
              </select>
            </div>

            <div>
              <Label htmlFor="tax-document" className="text-xs font-bold uppercase tracking-widest text-blue-600">
                G) ¿Necesitas documento tributario?
              </Label>
              <select
                id="tax-document"
                className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={form.taxDocument}
                onChange={(event) => setForm((prev) => ({ ...prev, taxDocument: event.target.value }))}
              >
                <option value="">Selecciona</option>
                <option value="boleta">Boleta</option>
                <option value="factura">Factura</option>
                <option value="no-se">No estoy seguro</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="budget-range" className="text-xs font-bold uppercase tracking-widest text-blue-600">
                H) Presupuesto estimado
              </Label>
              <select
                id="budget-range"
                className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                value={form.budgetRange}
                onChange={(event) => setForm((prev) => ({ ...prev, budgetRange: event.target.value as BudgetRange }))}
              >
                <option value="menos-100">Menos de $80.000</option>
                <option value="100-250">$80.000 a $180.000</option>
                <option value="250-500">$180.000 a $350.000</option>
                <option value="500-1000">$350.000 a $750.000</option>
                <option value="mas-1000">Más de $750.000</option>
                <option value="sin-definir">No tengo presupuesto definido</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card-premium p-6">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">I) Datos de contacto</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Nombre</Label>
              <Input
                id="contact-name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Tu nombre"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-project">Empresa o proyecto</Label>
              <Input
                id="contact-project"
                value={form.project}
                onChange={(event) => setForm((prev) => ({ ...prev, project: event.target.value }))}
                placeholder="Nombre empresa o proyecto"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Correo</Label>
              <Input
                id="contact-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="correo@empresa.cl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-whatsapp">WhatsApp</Label>
              <Input
                id="contact-whatsapp"
                value={form.whatsapp}
                onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
                placeholder="+56 9..."
              />
            </div>
          </div>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="contact-message">Mensaje adicional</Label>
            <Textarea
              id="contact-message"
              rows={4}
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              placeholder="Agrega contexto adicional para la cotización..."
            />
          </div>
        </section>

        <section className="card-premium border-blue-200 bg-blue-50 p-6">
          <h3 className="text-lg font-extrabold text-slate-900">Recomendación automática</h3>
          <p className="mt-2 text-sm text-slate-700">
            Proyecto recomendado: <strong>{recommendation.planName}</strong>
          </p>
          {recommendation.requiresReview ? (
            <p className="mt-1 text-sm font-semibold text-blue-900">
              Este proyecto requiere evaluación y cotización formal según alcance.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-700">
                Valor estimado desde: <strong>{formatCLP(recommendation.fromPrice)}</strong>
              </p>
              <p className="mt-1 text-sm text-slate-700">
                Rango aproximado: <strong>{recommendation.rangeLabel}</strong>
              </p>
            </>
          )}
          <p className="mt-2 text-sm text-slate-600">{recommendation.note}</p>
          <div className="mt-3 space-y-1 text-xs text-slate-600">
            <p>Valor referencial sujeto al alcance.</p>
            <p>Revisaremos tu solicitud antes de confirmar el valor final.</p>
            <p>Podrás pagar un abono inicial una vez aprobada la cotización.</p>
          </div>
        </section>

        <Button
          type="submit"
          disabled={!canSubmit || submitting}
          className="w-full gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando solicitud...
            </>
          ) : (
            <>
              Cotizar ahora <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          Cotización formal según requerimiento. Valores base sujetos a evaluación. No pagas por funciones que no necesitas.
        </div>

        {submitState.status === "success" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <p className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" /> Tu solicitud fue recibida correctamente.
            </p>
            <p className="mt-1">
              Según la información entregada, prepararemos una cotización formal o recomendación de servicio.
            </p>
            <p className="mt-1">
              Si tu proyecto requiere panel administrativo, pagos, usuarios, reportes, automatizaciones o integraciones,
              el valor final será revisado según alcance.
            </p>
            <p className="mt-1">
              Podrás pagar el abono inicial una vez aprobada la cotización. Código: <strong>{submitState.reference}</strong>.
            </p>
          </div>
        ) : null}

        {submitState.status === "error" ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitState.message}
          </div>
        ) : null}
      </form>
    </div>
  );
}
