"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  CalendarClock,
  User,
  MapPin,
  FileText,
  Clock,
  Hash,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors ${className}`}
      {...props}
    />
  );
}

function Field({
  label,
  icon: Icon,
  required,
  children,
}: {
  label: string;
  icon?: React.ElementType;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
        {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "Programada", label: "Programada", emoji: "📅" },
  { value: "Hecha", label: "Completada", emoji: "✅" },
  { value: "Reagendada", label: "Reagendada", emoji: "🔄" },
  { value: "Cancelada", label: "Cancelada", emoji: "❌" },
];

const VISIT_TYPES = [
  "Visita técnica",
  "Visita comercial",
  "Instalación de equipos",
  "Capacitación",
  "Diagnóstico de red",
  "Soporte en sitio",
  "Auditoría de seguridad",
  "Entrega de equipos",
];

export default function NuevaVisita() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    visitType: "Visita técnica",
    address: "",
    city: "",
    date: "",
    duration: "60",
    status: "Programada",
    notes: "",
    assignedTo: "",
    priority: "Normal",
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const fullNotes = [
    form.visitType,
    form.address && `Dirección: ${form.address}`,
    form.city && `Ciudad: ${form.city}`,
    form.duration && `Duración estimada: ${form.duration} min`,
    form.assignedTo && `Técnico: ${form.assignedTo}`,
    form.priority !== "Normal" && `Prioridad: ${form.priority}`,
    form.notes,
  ]
    .filter(Boolean)
    .join(" · ");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) {
      setError("La fecha y hora son obligatorias.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/admin/visitas/nueva/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId || null,
          date: form.date,
          notes: fullNotes || form.visitType,
          status: form.status,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/admin/visitas"), 1200);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "No se pudo agendar la visita.");
      }
    });
  };

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <CalendarClock className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">¡Visita agendada!</h2>
          <p className="mt-1 text-sm text-slate-500">Redirigiendo al calendario...</p>
        </div>
      </div>
    );
  }

  const visitDate = form.date ? new Date(form.date) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/visitas"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Agenda
          </p>
          <h1 className="text-xl font-extrabold text-slate-900">Agendar nueva visita</h1>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Main form */}
        <div className="space-y-6">
          {/* Client + type */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              <User className="h-3.5 w-3.5" />
              Cliente y tipo de visita
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre del cliente" icon={User}>
                <Input
                  value={form.clientName}
                  onChange={(e) => set("clientName", e.target.value)}
                  placeholder="Juan Pérez / Empresa SpA"
                />
              </Field>
              <Field label="ID Cliente (Supabase)" icon={Hash}>
                <Input
                  value={form.clientId}
                  onChange={(e) => set("clientId", e.target.value)}
                  placeholder="UUID del cliente (opcional)"
                  className="font-mono"
                />
              </Field>
              <Field label="Tipo de visita" required>
                <div className="relative">
                  <select
                    value={form.visitType}
                    onChange={(e) => set("visitType", e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                  >
                    {VISIT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </Field>
              <Field label="Prioridad">
                <div className="relative">
                  <select
                    value={form.priority}
                    onChange={(e) => set("priority", e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                  >
                    <option>Normal</option>
                    <option>Alta</option>
                    <option>Urgente</option>
                    <option>Baja</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </Field>
            </div>
          </div>

          {/* Date + location */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              Fecha, hora y ubicación
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha y hora" icon={Clock} required>
                <Input
                  type="datetime-local"
                  required
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </Field>
              <Field label="Duración estimada (min)" icon={Clock}>
                <div className="relative">
                  <select
                    value={form.duration}
                    onChange={(e) => set("duration", e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                  >
                    <option value="30">30 minutos</option>
                    <option value="60">1 hora</option>
                    <option value="90">1.5 horas</option>
                    <option value="120">2 horas</option>
                    <option value="180">3 horas</option>
                    <option value="240">4 horas</option>
                    <option value="480">Día completo</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </Field>
              <Field label="Dirección" icon={MapPin}>
                <Input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Calle y número"
                />
              </Field>
              <Field label="Ciudad / Sector">
                <Input
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  placeholder="Santiago, Providencia..."
                />
              </Field>
            </div>
          </div>

          {/* Technical details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              Detalles técnicos
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Estado inicial">
                <div className="relative">
                  <select
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                    className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-8 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.emoji} {s.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </Field>
              <Field label="Técnico asignado" icon={User}>
                <Input
                  value={form.assignedTo}
                  onChange={(e) => set("assignedTo", e.target.value)}
                  placeholder="Nombre del técnico"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notas / Objetivo" icon={FileText}>
                  <textarea
                    rows={4}
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Objetivo de la visita, materiales necesarios, historial del cliente, etc."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors resize-none"
                  />
                </Field>
              </div>
            </div>
          </div>
        </div>

        {/* Summary sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Resumen de visita
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tipo</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{form.visitType}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Cliente</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {form.clientName || "Sin asignar"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Fecha y hora</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                  {visitDate
                    ? visitDate.toLocaleString("es-CL", {
                        weekday: "long",
                        day: "2-digit",
                        month: "long",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Sin fecha"}
                </p>
              </div>
              {form.address && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Dirección</p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {form.address}
                    {form.city && `, ${form.city}`}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Estado</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">{form.status}</p>
              </div>
              {form.priority !== "Normal" && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Prioridad</p>
                  <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    form.priority === "Urgente"
                      ? "bg-rose-50 text-rose-700"
                      : "bg-amber-50 text-amber-700"
                  }`}>
                    {form.priority}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={pending || !form.date}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {pending ? "Guardando..." : "Agendar visita"}
          </button>

          <Link
            href="/admin/visitas"
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
