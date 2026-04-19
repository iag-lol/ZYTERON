"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const contactLeadSchema = z.object({
  name: z.string().trim().min(2, "Ingresa tu nombre completo").max(120, "Nombre demasiado largo"),
  email: z.string().trim().email("Ingresa un email válido"),
  phone: z.string().trim().max(32, "Teléfono demasiado largo").optional(),
  company: z.string().trim().max(140, "Nombre de empresa demasiado largo").optional(),
  service: z.string().trim().max(140, "Servicio demasiado largo").optional(),
  message: z.string().trim().max(3000, "Mensaje demasiado largo").optional(),
  website: z.string().max(0).optional(),
});

type ContactLeadFormData = z.infer<typeof contactLeadSchema>;

type SubmitState =
  | { status: "idle" }
  | { status: "success"; reference: string }
  | { status: "error"; message: string };

export function ContactLeadForm() {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactLeadFormData>({
    resolver: zodResolver(contactLeadSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      service: "",
      message: "",
      website: "",
    },
    mode: "onTouched",
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitState({ status: "idle" });

    const response = await fetch("/api/contacto", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
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

    reset();
    setSubmitState({ status: "success", reference: payload.reference || "RECIBIDO" });
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-100/80">
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-700" />
          <h2 className="text-lg font-bold text-slate-900">Envíanos tu consulta</h2>
        </div>
        <p className="text-xs text-slate-500">Completa el formulario y lo verás registrado en el panel admin de Contactos.</p>
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
              Nombre y apellido
            </Label>
            <Input
              id="name"
              placeholder="Tu nombre"
              className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
              {...register("name")}
            />
            {errors.name ? <p className="text-xs text-rose-600">{errors.name.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Email empresarial
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@empresa.cl"
              className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
              {...register("email")}
            />
            {errors.email ? <p className="text-xs text-rose-600">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              WhatsApp / Teléfono
            </Label>
            <Input
              id="phone"
              placeholder="+56 9 xxxx xxxx"
              className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
              {...register("phone")}
            />
            {errors.phone ? <p className="text-xs text-rose-600">{errors.phone.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company" className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Empresa
            </Label>
            <Input
              id="company"
              placeholder="Nombre de tu empresa"
              className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
              {...register("company")}
            />
            {errors.company ? <p className="text-xs text-rose-600">{errors.company.message}</p> : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="service" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Servicio de interés
          </Label>
          <Input
            id="service"
            placeholder="Ej: Sitio corporativo + SEO avanzado"
            className="border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
            {...register("service")}
          />
          {errors.service ? <p className="text-xs text-rose-600">{errors.service.message}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="message" className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Cuéntanos tu proyecto
          </Label>
          <Textarea
            id="message"
            rows={4}
            placeholder="Describe tus objetivos, plazos y presupuesto estimado..."
            className="resize-none border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white"
            {...register("message")}
          />
          {errors.message ? <p className="text-xs text-rose-600">{errors.message.message}</p> : null}
        </div>

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
              Enviar solicitud <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        {submitState.status === "success" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Solicitud enviada correctamente. Código de registro: <strong>{submitState.reference}</strong>.
          </div>
        ) : null}

        {submitState.status === "error" ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {submitState.message}
          </div>
        ) : null}

        <p className="text-center text-xs text-slate-400">
          Al enviar, aceptas que procesemos tus datos para gestionar la cotización. Sin spam.
        </p>
      </form>
    </div>
  );
}
