"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, BriefcaseBusiness, Clock3, Save, ShieldCheck } from "lucide-react";

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{children}</label>;
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${props.className || ""}`} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${props.className || ""}`} />;
}

export default function NuevoProyectoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const baseForm = {
    clientId: "",
    quoteId: "",
    saleId: "",
    title: "",
    serviceArea: "Desarrollo web",
    status: "Planificado",
    priority: "Normal",
    startDate: new Date().toISOString().slice(0, 10),
    startTime: "09:00",
    endDate: "",
    endTime: "",
    owner: "",
    estimatedHours: "24",
    actualHours: "0",
    hourlyRate: "35000",
    totalCharge: "0",
    description: "",
    scope: "",
  };

  const prefillForm = useMemo(() => {
    const rawPrefill = searchParams.get("prefill");
    if (!rawPrefill) return {};

    try {
      const parsed = JSON.parse(decodeURIComponent(rawPrefill)) as Partial<typeof baseForm>;
      return Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => typeof value === "string"),
      ) as Partial<typeof baseForm>;
    } catch {
      return {};
    }
  }, [searchParams]);

  const [form, setForm] = useState({
    ...baseForm,
    ...prefillForm,
  });

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const computedCharge =
    (Number(form.hourlyRate) || 0) * (Number(form.estimatedHours) || 0);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/admin/proyectos/nuevo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          hourlyRate: Number(form.hourlyRate) || 0,
          estimatedHours: Number(form.estimatedHours) || 0,
          actualHours: Number(form.actualHours) || 0,
          totalCharge: Number(form.totalCharge) || computedCharge,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data?.error || "No se pudo registrar el proyecto.");
        return;
      }

      router.push("/admin/proyectos");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/admin/proyectos" className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Operaciones</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Crear proyecto</h1>
          <p className="mt-1 text-sm text-slate-500">Registro operativo con fechas, horas, descripción, cobros y trazabilidad.</p>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><BriefcaseBusiness className="h-4 w-4 text-blue-600" /><h2 className="text-base font-bold text-slate-900">Identificación</h2></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>ID cliente</Label><Input value={form.clientId} onChange={(e) => set("clientId", e.target.value)} placeholder="UUID del cliente" /></div>
              <div><Label>ID cotización</Label><Input value={form.quoteId} onChange={(e) => set("quoteId", e.target.value)} placeholder="ID cotización asociada" /></div>
              <div><Label>ID venta</Label><Input value={form.saleId} onChange={(e) => set("saleId", e.target.value)} placeholder="ID venta asociada" /></div>
              <div><Label>Título</Label><Input required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Implementación ecommerce / soporte / proyecto TI" /></div>
              <div><Label>Área</Label><Input value={form.serviceArea} onChange={(e) => set("serviceArea", e.target.value)} /></div>
              <div><Label>Responsable</Label><Input value={form.owner} onChange={(e) => set("owner", e.target.value)} placeholder="Encargado del proyecto" /></div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><Clock3 className="h-4 w-4 text-blue-600" /><h2 className="text-base font-bold text-slate-900">Tiempos y cobros</h2></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><Label>Fecha inicio</Label><Input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></div>
              <div><Label>Hora inicio</Label><Input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} /></div>
              <div><Label>Fecha término</Label><Input type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></div>
              <div><Label>Hora término</Label><Input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} /></div>
              <div><Label>Horas estimadas</Label><Input type="number" min={0} value={form.estimatedHours} onChange={(e) => set("estimatedHours", e.target.value)} /></div>
              <div><Label>Horas reales</Label><Input type="number" min={0} value={form.actualHours} onChange={(e) => set("actualHours", e.target.value)} /></div>
              <div><Label>Tarifa hora</Label><Input type="number" min={0} value={form.hourlyRate} onChange={(e) => set("hourlyRate", e.target.value)} /></div>
              <div><Label>Cobro total</Label><Input type="number" min={0} value={form.totalCharge} onChange={(e) => set("totalCharge", e.target.value)} placeholder={String(computedCharge)} /></div>
              <div><Label>Estado</Label><select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option>Planificado</option><option>En curso</option><option>En revisión</option><option>Completado</option><option>Pausado</option></select></div>
              <div><Label>Prioridad</Label><select value={form.priority} onChange={(e) => set("priority", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option>Normal</option><option>Alta</option><option>Urgente</option><option>Baja</option></select></div>
              <div className="md:col-span-2"><Label>Descripción</Label><Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Objetivo, entregables, stack, responsables, observaciones..." /></div>
              <div className="md:col-span-2"><Label>Scope / alcance</Label><Textarea rows={4} value={form.scope} onChange={(e) => set("scope", e.target.value)} placeholder="Módulos incluidos, exclusiones, acuerdos y coberturas." /></div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-bold"><ShieldCheck className="h-4 w-4 text-blue-300" />Control de proyecto</h2>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <p>Tarifa estimada: {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(computedCharge)}</p>
              <p>Inicio: {form.startDate || "—"} {form.startTime || ""}</p>
              <p>Término: {form.endDate || "Pendiente"} {form.endTime || ""}</p>
            </div>
          </section>
          <button type="submit" disabled={pending} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"><Save className="h-4 w-4" />{pending ? "Guardando..." : "Guardar proyecto"}</button>
        </aside>
      </form>
    </div>
  );
}
