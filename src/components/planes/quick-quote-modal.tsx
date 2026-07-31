"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, ShieldCheck, X } from "lucide-react";

/**
 * Cotización rápida: tres campos y listo.
 *
 * La página de planes tenía formularios largos que la gente abandonaba. Aquí
 * solo se pide lo indispensable para poder llamar de vuelta; el resto se
 * conversa por WhatsApp.
 */

const BUSINESS_TYPES = [
  "Emprendimiento o profesional independiente",
  "Pyme o negocio establecido",
  "Empresa mediana o grande",
  "Tienda o ecommerce",
  "Restaurante, café o local",
  "Servicios profesionales",
  "Salud o bienestar",
  "Construcción o inmobiliaria",
  "Educación o capacitación",
  "Otro",
];

export function QuickQuoteModal({
  open,
  planName,
  onClose,
}: {
  open: boolean;
  planName?: string | null;
  onClose: () => void;
}) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Al abrirse: foco en el primer campo y cierre con Escape.
  useEffect(() => {
    if (!open) return;
    setSent(false);
    setError("");
    const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 80);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/planes/cotizacion-rapida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, plan: planName ?? "" }),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo enviar la solicitud.");
      setSent(true);
      form.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo enviar la solicitud.");
    } finally {
      setSending(false);
    }
  }

  const field =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-[15px] text-slate-800 outline-none transition-colors placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cotizacion-rapida-titulo"
    >
      <button className="absolute inset-0 -z-10 cursor-default" onClick={onClose} aria-label="Cerrar" />

      <div className="max-h-[92vh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="cotizacion-rapida-titulo" className="text-[18px] font-extrabold tracking-tight text-slate-900">
              Cotiza en 30 segundos
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {planName ? `Plan de interés: ${planName}` : "Te respondemos por WhatsApp."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="-mr-1 shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {sent ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <p className="mt-4 text-[17px] font-extrabold text-slate-900">Solicitud enviada</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[14px] leading-6 text-slate-500">
              Te escribimos por WhatsApp dentro del horario hábil con una propuesta según lo que necesitas.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-slate-800"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 px-5 py-5 sm:px-6">
            {/* Campo trampa invisible para bots. */}
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute h-0 w-0 opacity-0"
            />

            <label className="block">
              <span className="text-[13px] font-bold text-slate-700">Nombre</span>
              <input
                ref={firstFieldRef}
                name="name"
                required
                minLength={2}
                maxLength={120}
                autoComplete="name"
                placeholder="Tu nombre"
                className={field}
              />
            </label>

            <label className="block">
              <span className="text-[13px] font-bold text-slate-700">WhatsApp</span>
              <input
                name="whatsapp"
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="+56 9 1234 5678"
                pattern="[\d\s+()-]{8,24}"
                className={field}
              />
            </label>

            <label className="block">
              <span className="text-[13px] font-bold text-slate-700">Tipo de negocio</span>
              <select name="businessType" required defaultValue="" className={field}>
                <option value="" disabled>
                  Selecciona una opción
                </option>
                {BUSINESS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            {error && (
              <p role="alert" className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[13px] font-semibold text-rose-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-[15px] font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              {sending ? "Enviando" : "Solicitar cotización"}
            </button>

            <p className="flex items-center justify-center gap-1.5 text-[11.5px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Solo usamos tus datos para contactarte
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
