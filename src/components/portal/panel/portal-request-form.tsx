"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const TYPE_OPTIONS = [
  { value: "NUEVA_WEB", label: "Nueva web" },
  { value: "REDISENO", label: "Rediseño" },
  { value: "SOPORTE", label: "Soporte" },
  { value: "INTEGRACION", label: "Integración" },
  { value: "CAMBIOS", label: "Cambios" },
  { value: "COTIZACION", label: "Cotización" },
];

export function PortalRequestForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    type: "NUEVA_WEB",
    title: "",
    details: "",
    attachmentUrl: "",
    attachmentName: "",
  });

  async function submit() {
    setError("");
    setMessage("");
    const response = await fetch("/api/portal/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || "No se pudo crear la solicitud.");
      return;
    }
    setMessage("Solicitud enviada correctamente. Nuestro equipo la revisará.");
    setForm({
      type: "NUEVA_WEB",
      title: "",
      details: "",
      attachmentUrl: "",
      attachmentName: "",
    });
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(submit);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="type">Tipo de solicitud</Label>
          <select
            id="type"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Ej: Nueva landing para campaña"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="details">Detalle de requerimiento</Label>
        <Textarea
          id="details"
          rows={6}
          value={form.details}
          onChange={(event) => setForm((prev) => ({ ...prev, details: event.target.value }))}
          placeholder="Incluye objetivos, alcances, plazos y antecedentes."
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="attachmentUrl">URL de antecedente (opcional)</Label>
          <Input
            id="attachmentUrl"
            value={form.attachmentUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, attachmentUrl: event.target.value }))}
            placeholder="https://..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="attachmentName">Nombre adjunto (opcional)</Label>
          <Input
            id="attachmentName"
            value={form.attachmentName}
            onChange={(event) => setForm((prev) => ({ ...prev, attachmentName: event.target.value }))}
            placeholder="brief-proyecto.pdf"
          />
        </div>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}

      <Button type="submit" className="h-10 bg-blue-700 hover:bg-blue-800" disabled={pending}>
        {pending ? "Enviando..." : "Enviar solicitud"}
      </Button>
    </form>
  );
}

