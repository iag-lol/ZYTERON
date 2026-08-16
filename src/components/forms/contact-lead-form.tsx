"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trackContactFormSubmit, trackQuoteRequestConversion } from "@/lib/analytics/google-ads";

const contactLeadSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre completo").max(120, "Nombre demasiado largo"),
  company: z.string().trim().max(140, "Empresa demasiado larga").optional(),
  email: z.string().trim().email("Ingresa un email válido").max(160, "Email demasiado largo"),
  phone: z.string().trim().min(8, "Ingresa un WhatsApp o teléfono válido").max(32, "Teléfono demasiado largo"),
  projectType: z.string().trim().min(2, "Selecciona el tipo de proyecto").max(120, "Tipo de proyecto inválido"),
  budget: z.string().trim().max(80, "Presupuesto demasiado largo").optional(),
  message: z.string().trim().min(10, "Describe brevemente tu requerimiento").max(4000, "Mensaje demasiado largo"),
  website: z.string().max(0).optional(),
});

type ContactLeadFormData = z.infer<typeof contactLeadSchema>;

type SubmitState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | { status: "error"; message: string };

const PROJECT_TYPE_BY_SOURCE: Record<string, string> = {
  "desarrollo-web": "Página web corporativa",
  "desarrollo-web-santiago": "Página web corporativa",
  "paginas-web-para-pymes": "Página web corporativa",
  "paginas-web-para-empresas": "Página web corporativa",
  "tiendas-online": "Tienda online",
  "sistemas-web": "Sistema interno",
  automatizacion: "Automatización de procesos",
  "automatizacion-whatsapp-empresas": "Automatización de procesos",
  "soporte-ti": "Soporte TI",
  "soporte-ti-pymes-santiago": "Soporte TI",
  "seo-para-empresas-chile": "SEO y posicionamiento",
  "landing-pages-para-empresas": "Landing page comercial",
  "mantencion-web-chile": "Soporte TI",
  "cotizador-web-pdf": "Sistema interno",
};

function readMarketingSource() {
  const params = new URLSearchParams(window.location.search);
  return ["servicio", "tipo", "plan", "origen", "item", "utm_source", "utm_medium", "utm_campaign", "gclid"]
    .map((key) => {
      const value = params.get(key)?.trim();
      return value ? `${key}=${value}` : "";
    })
    .filter(Boolean)
    .join(" | ")
    .slice(0, 600);
}

export function ContactLeadForm() {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactLeadFormData>({
    resolver: zodResolver(contactLeadSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      projectType: "",
      budget: "",
      message: "",
      website: "",
    },
    mode: "onTouched",
  });

  useEffect(() => {
    const source = new URLSearchParams(window.location.search).get("servicio")?.trim();
    const projectType = source ? PROJECT_TYPE_BY_SOURCE[source] : undefined;
    if (projectType) {
      setValue("projectType", projectType, { shouldValidate: true });
    }
  }, [setValue]);

  const onSubmit = handleSubmit(async (values) => {
    setSubmitState({ status: "idle" });

    const response = await fetch("/api/contacto", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...values,
        service: values.projectType,
        expectedDate: "",
        needDomain: "no-se",
        needHosting: "no-se",
        needPayments: "no-se",
        needAdminPanel: "no-se",
        needCustomSystem: "no-se",
        needTaxDocument: "no-se",
        marketingSource: readMarketingSource(),
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
        message: payload.error || "No se pudo enviar tu solicitud. Intenta nuevamente.",
      });
      return;
    }

    const eventParams = {
      page_path: window.location.pathname,
      project_type: values.projectType,
    };
    trackContactFormSubmit(eventParams);
    trackQuoteRequestConversion(eventParams);
    reset();
    setSubmitState({ status: "success", reference: payload.reference || "RECIBIDO" });
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-100/80">
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-700" />
          <h2 className="text-lg font-bold text-slate-900">Solicita una orientación inicial</h2>
        </div>
        <p className="text-xs text-slate-500">
          Cuéntanos lo esencial. Revisaremos tu necesidad y te contactaremos para definir el siguiente paso.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <input
          type="text"
          autoComplete="off"
          tabIndex={-1}
          aria-hidden="true"
          className="hidden"
          {...register("website")}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Nombre
            </Label>
            <Input id="name" autoComplete="name" placeholder="Tu nombre completo" className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white" {...register("name")} />
            {errors.name ? <p className="text-xs text-rose-600">{errors.name.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Empresa (opcional)
            </Label>
            <Input id="company" autoComplete="organization" placeholder="Nombre de tu empresa" className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white" {...register("company")} />
            {errors.company ? <p className="text-xs text-rose-600">{errors.company.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Correo
            </Label>
            <Input id="email" type="email" autoComplete="email" placeholder="correo@empresa.cl" className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white" {...register("email")} />
            {errors.email ? <p className="text-xs text-rose-600">{errors.email.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              WhatsApp
            </Label>
            <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+56939526626" className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white" {...register("phone")} />
            {errors.phone ? <p className="text-xs text-rose-600">{errors.phone.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="projectType" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Tipo de proyecto
            </Label>
            <select id="projectType" className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:bg-white focus:outline-none" {...register("projectType")}>
              <option value="">Selecciona una opción</option>
              <option value="Página web corporativa">Página web corporativa</option>
              <option value="Landing page comercial">Landing page comercial</option>
              <option value="Tienda online">Tienda online</option>
              <option value="Sistema interno">Sistema interno</option>
              <option value="Panel administrativo">Panel administrativo</option>
              <option value="Automatización de procesos">Automatización de procesos</option>
              <option value="SEO y posicionamiento">SEO y posicionamiento</option>
              <option value="Soporte TI">Soporte TI</option>
              <option value="Otro">Otro</option>
            </select>
            {errors.projectType ? <p className="text-xs text-rose-600">{errors.projectType.message}</p> : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Presupuesto estimado (opcional)
            </Label>
            <Input id="budget" placeholder="Ej: $180.000 - $350.000" className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white" {...register("budget")} />
            {errors.budget ? <p className="text-xs text-rose-600">{errors.budget.message}</p> : null}
          </div>

        </div>

        <div className="space-y-1.5">
          <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Descripción del requerimiento
          </Label>
          <Textarea
            id="message"
            rows={5}
            placeholder="Ej: necesito una web para mostrar mis servicios y recibir consultas por WhatsApp."
            className="resize-none border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
            {...register("message")}
          />
          {errors.message ? <p className="text-xs text-rose-600">{errors.message.message}</p> : null}
        </div>

        <Button type="submit" disabled={isSubmitting} className="btn-primary-glow w-full gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando solicitud...
            </>
          ) : (
            <>
              Quiero orientación para mi proyecto <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        {submitState.status === "success" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Gracias. Recibimos tu solicitud. Revisaremos los antecedentes y te contactaremos para preparar una cotización formal.
            Código: <strong>{submitState.reference}</strong>.
          </div>
        ) : null}

        {submitState.status === "error" ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitState.message}
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Te respondemos dentro del horario laboral con una propuesta clara: sabrás exactamente qué incluye tu proyecto antes de comenzar.
        </div>

        <p className="text-center text-xs text-slate-400">
          Al enviar, aceptas que procesemos tus datos para contacto comercial y preparación de cotización.
        </p>
      </form>
    </div>
  );
}
