"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Save } from "lucide-react";

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${props.className || ""}`} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${props.className || ""}`} />;
}

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: "",
    projectId: "",
    subject: "",
    channel: "Email",
    priority: "Normal",
    status: "Abierta",
    dueDate: "",
    description: "",
  });

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const response = await fetch("/admin/solicitudes/nuevo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data?.error || "No se pudo guardar la solicitud.");
        return;
      }
      router.push("/admin/solicitudes");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/admin/solicitudes" className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">CRM</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Registrar solicitud</h1>
          <p className="mt-1 text-sm text-slate-500">Ticket o requerimiento asociado a cliente y proyecto.</p>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <form onSubmit={onSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">ID cliente</label><Input value={form.clientId} onChange={(e) => set("clientId", e.target.value)} placeholder="UUID del cliente" /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">ID proyecto</label><Input value={form.projectId} onChange={(e) => set("projectId", e.target.value)} placeholder="UUID del proyecto" /></div>
          <div className="md:col-span-2"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Asunto</label><Input required value={form.subject} onChange={(e) => set("subject", e.target.value)} placeholder="Solicitud de soporte, cambio de contenido, nueva funcionalidad..." /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Canal</label><select value={form.channel} onChange={(e) => set("channel", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option>Email</option><option>WhatsApp</option><option>Llamada</option><option>Portal cliente</option><option>Presencial</option></select></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Prioridad</label><select value={form.priority} onChange={(e) => set("priority", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option>Normal</option><option>Alta</option><option>Urgente</option><option>Baja</option></select></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estado</label><select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option>Abierta</option><option>En proceso</option><option>Resuelta</option><option>Pausada</option></select></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fecha compromiso</label><Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
          <div className="md:col-span-2"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Descripción</label><Textarea rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Detalle del problema, alcance, archivos, responsables y contexto del cliente." /></div>
        </div>

        <div className="mt-6 flex justify-end">
          <button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"><Save className="h-4 w-4" />{pending ? "Guardando..." : "Guardar solicitud"}</button>
        </div>
      </form>
    </div>
  );
}
