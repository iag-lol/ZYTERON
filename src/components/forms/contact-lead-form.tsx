"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  trackAnalyticsEvent,
  trackContactFormSubmit,
  trackQuoteRequestConversion,
} from "@/lib/analytics/google-ads";
import {
  PROJECT_TYPES,
  resolveRequestContext,
  serviceLineFor,
  solutionFamilyFor,
} from "@/lib/commercial/request-context";
import { finishSubmission, submissionIdFor } from "@/lib/commercial/submission-id";

const contactLeadSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre completo").max(120, "Nombre demasiado largo"),
  company: z.string().trim().max(140, "Empresa demasiado larga").optional(),
  email: z.string().trim().email("Ingresa un email válido").max(160, "Email demasiado largo"),
  phone: z
    .string()
    .trim()
    .min(8, "Ingresa un WhatsApp o teléfono válido")
    .max(32, "Teléfono demasiado largo"),
  projectType: z
    .string()
    .trim()
    .min(2, "Selecciona el tipo de proyecto")
    .max(120, "Tipo de proyecto inválido"),
  budget: z.string().trim().max(80, "Presupuesto demasiado largo").optional(),
  message: z
    .string()
    .trim()
    .min(10, "Describe brevemente tu requerimiento")
    .max(4000, "Mensaje demasiado largo"),
  website: z.string().max(0).optional(),
  users: z.string().max(80).optional(),
  priority: z.string().max(180).optional(),
});

type ContactLeadFormData = z.infer<typeof contactLeadSchema>;

type SubmitState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | { status: "error"; message: string };

function readMarketingSource() {
  const params = new URLSearchParams(window.location.search);
  return [
    "servicio",
    "tipo",
    "plan",
    "origen",
    "rubro",
    "item",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "gclid",
  ]
    .map((key) => {
      const value = params.get(key)?.trim();
      return value ? `${key}=${value}` : "";
    })
    .filter(Boolean)
    .join(" | ")
    .slice(0, 600);
}

export function ContactLeadForm() {
  const sending = useRef(false);
  const started = useRef(false);
  const progressed = useRef(new Set<string>());
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
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
      users: "",
      priority: "",
    },
    mode: "onTouched",
  });

  const projectType = useWatch({ control, name: "projectType" });
  const serviceLine = serviceLineFor(projectType);
  const solutionFamily = solutionFamilyFor(projectType);
  const isSystems = serviceLine === "sistemas_automatizacion";

  useEffect(() => {
    const context = resolveRequestContext(new URLSearchParams(window.location.search));
    if (context.projectType) setValue("projectType", context.projectType);
    if (context.estimate)
      setValue(
        "budget",
        `$${context.estimate.toLocaleString("es-CL")} + IVA (estimación de calculadora)`,
      );
  }, [setValue]);

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) =>
    handleSubmit(
      async (values) => {
        if (sending.current) return;
        sending.current = true;
        setSubmitState({ status: "idle" });
        try {
          const requestData = {
            ...values,
            service: values.projectType,
            marketingSource: readMarketingSource(),
            message: [
              values.message,
              values.users && `Usuarios aproximados: ${values.users}`,
              values.priority && `Prioridad: ${values.priority}`,
            ]
              .filter(Boolean)
              .join("\n"),
          };
          const response = await fetch("/api/contacto", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...requestData,
              clientSubmissionId: await submissionIdFor("contact", requestData),
            }),
          });
          const payload = (await response.json().catch(() => ({}))) as {
            ok?: boolean;
            error?: string;
            reference?: string;
            leadId?: string;
          };
          if (response.status === 409) finishSubmission("contact");
          if (!response.ok || !payload.ok || !payload.leadId || !payload.reference) {
            throw new Error(
              response.status === 429
                ? "Has enviado varias solicitudes. Espera un minuto y vuelve a intentar; tus datos siguen aquí."
                : "No pudimos confirmar la recepción. Tus datos siguen aquí para reintentar.",
            );
          }
          const eventParams = {
            page_path: window.location.pathname,
            service_line: serviceLineFor(values.projectType),
            solution_family: solutionFamilyFor(values.projectType),
            lead_id: payload.leadId,
          };
          trackContactFormSubmit(eventParams);
          trackQuoteRequestConversion(eventParams);
          finishSubmission("contact");
          setSubmitState({ status: "success", reference: payload.reference });
        } catch (error) {
          trackAnalyticsEvent("form_error", {
            form_type: "contact",
            service_line: serviceLine,
            solution_family: solutionFamily,
            error_type: "delivery",
          });
          setSubmitState({
            status: "error",
            message:
              error instanceof Error && error.message.startsWith("Has enviado")
                ? error.message
                : "No pudimos confirmar la recepción. Tus datos siguen aquí; revisa tu conexión y vuelve a intentar. También puedes contactarnos por WhatsApp.",
          });
        } finally {
          sending.current = false;
        }
      },
      () => {
        trackAnalyticsEvent("form_error", {
          form_type: "contact",
          service_line: serviceLine,
          solution_family: solutionFamily,
          error_type: "validation",
        });
      },
    )(event);

  if (submitState.status === "success")
    return (
      <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-7">
        <h2 className="text-xl font-bold text-emerald-950">Solicitud recibida</h2>
        <p className="mt-3 text-sm text-emerald-900">
          Tu referencia es <strong>{submitState.reference}</strong>. Revisaremos el contexto y te
          contactaremos por correo o WhatsApp durante nuestro horario de atención: lunes a viernes,
          de 09:00 a 18:00.
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => {
            reset();
            started.current = false;
            progressed.current.clear();
            setSubmitState({ status: "idle" });
          }}
        >
          Enviar otra solicitud
        </Button>
      </div>
    );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-100/80">
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-700" />
          <h2 className="text-lg font-bold text-slate-900">
            {isSystems ? "Conversemos sobre tu proceso" : "Cuéntanos qué necesitas"}
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Cuéntanos lo esencial. Revisaremos tu necesidad y te contactaremos para definir el
          siguiente paso.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-4"
        noValidate
        onBlurCapture={(event) => {
          const field: EventTarget = event.target;
          if (
            !(
              field instanceof HTMLInputElement ||
              field instanceof HTMLSelectElement ||
              field instanceof HTMLTextAreaElement
            )
          )
            return;
          const name = field.name;
          const step = name === "projectType" ? 1 : name === "message" ? 2 : 0;
          if (!step || progressed.current.has(name) || !field.value.trim()) return;
          progressed.current.add(name);
          trackAnalyticsEvent("form_progress", {
            form_type: "contact",
            step,
            service_line: serviceLine,
            solution_family: solutionFamily,
          });
        }}
        onFocusCapture={() => {
          if (started.current) return;
          started.current = true;
          trackAnalyticsEvent("form_start", {
            form_type: "contact",
            service_line: serviceLine,
            solution_family: solutionFamily,
          });
        }}
      >
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
            <Label
              htmlFor="name"
              className="text-xs font-bold tracking-wide text-slate-500 uppercase"
            >
              Nombre
            </Label>
            <Input
              id="name"
              autoComplete="name"
              placeholder="Tu nombre completo"
              className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              {...register("name")}
            />
            {errors.name ? (
              <p id="name-error" role="alert" className="text-xs text-rose-600">
                {errors.name.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="company"
              className="text-xs font-bold tracking-wide text-slate-500 uppercase"
            >
              Empresa (opcional)
            </Label>
            <Input
              id="company"
              autoComplete="organization"
              placeholder="Nombre de tu empresa"
              className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
              aria-invalid={Boolean(errors.company)}
              aria-describedby={errors.company ? "company-error" : undefined}
              {...register("company")}
            />
            {errors.company ? (
              <p id="company-error" role="alert" className="text-xs text-rose-600">
                {errors.company.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-xs font-bold tracking-wide text-slate-500 uppercase"
            >
              Correo
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="correo@empresa.cl"
              className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email ? (
              <p id="email-error" role="alert" className="text-xs text-rose-600">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="phone"
              className="text-xs font-bold tracking-wide text-slate-500 uppercase"
            >
              WhatsApp
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+56939526626"
              className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              {...register("phone")}
            />
            {errors.phone ? (
              <p id="phone-error" role="alert" className="text-xs text-rose-600">
                {errors.phone.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="projectType"
              className="text-xs font-bold tracking-wide text-slate-500 uppercase"
            >
              ¿Qué necesitas?
            </Label>
            <select
              id="projectType"
              className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-blue-400 focus:bg-white focus:outline-none"
              aria-invalid={Boolean(errors.projectType)}
              aria-describedby={errors.projectType ? "projectType-error" : undefined}
              {...register("projectType")}
            >
              <option value="">Selecciona una opción</option>
              {PROJECT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.projectType ? (
              <p id="projectType-error" role="alert" className="text-xs text-rose-600">
                {errors.projectType.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="budget"
              className="text-xs font-bold tracking-wide text-slate-500 uppercase"
            >
              Presupuesto estimado (opcional)
            </Label>
            <Input
              id="budget"
              placeholder="Si ya tienes un presupuesto, indícalo"
              className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
              aria-invalid={Boolean(errors.budget)}
              aria-describedby={errors.budget ? "budget-error" : undefined}
              {...register("budget")}
            />
            {errors.budget ? (
              <p id="budget-error" role="alert" className="text-xs text-rose-600">
                {errors.budget.message}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="message"
            className="text-xs font-bold tracking-wide text-slate-500 uppercase"
          >
            {isSystems ? "Proceso o tarea que necesitas mejorar" : "Descripción del requerimiento"}
          </Label>
          <Textarea
            id="message"
            rows={4}
            placeholder={
              isSystems
                ? "Cuéntanos qué proceso necesitas ordenar y cómo lo resuelves hoy."
                : "Qué quieres presentar, comercializar o mejorar. Una descripción breve es suficiente."
            }
            className="resize-none border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
            aria-invalid={Boolean(errors.message)}
            aria-describedby={errors.message ? "message-error" : undefined}
            {...register("message")}
          />
          {errors.message ? (
            <p id="message-error" role="alert" className="text-xs text-rose-600">
              {errors.message.message}
            </p>
          ) : null}
        </div>

        {isSystems && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="users">Usuarios aproximados (opcional)</Label>
              <Input
                id="users"
                placeholder="Ej: 5 a 10 personas"
                aria-invalid={Boolean(errors.users)}
                aria-describedby={errors.users ? "users-error" : undefined}
                {...register("users")}
              />
              {errors.users && (
                <p id="users-error" role="alert" className="text-xs text-rose-700">
                  {errors.users.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priority">Necesidad prioritaria (opcional)</Label>
              <Input
                id="priority"
                placeholder="Ej: aprobar documentos"
                aria-invalid={Boolean(errors.priority)}
                aria-describedby={errors.priority ? "priority-error" : undefined}
                {...register("priority")}
              />
              {errors.priority && (
                <p id="priority-error" role="alert" className="text-xs text-rose-700">
                  {errors.priority.message}
                </p>
              )}
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary-glow w-full gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando solicitud...
            </>
          ) : (
            <>
              {isSystems ? "Solicitar diagnóstico" : "Enviar solicitud breve"}{" "}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        {submitState.status === "error" ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {submitState.message}
          </div>
        ) : null}

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Te respondemos dentro del horario laboral con una propuesta clara: sabrás exactamente qué
          incluye tu proyecto antes de comenzar.
        </div>

        <p className="text-center text-xs text-slate-600">
          Al enviar, aceptas que procesemos tus datos para contacto comercial y preparación de
          cotización.
        </p>
      </form>
    </div>
  );
}
