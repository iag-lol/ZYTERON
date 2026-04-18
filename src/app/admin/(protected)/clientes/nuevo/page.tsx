"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, Building2, Mail, MapPin, Save, User, Users2 } from "lucide-react";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        {label}
        {required && <span className="ml-1 text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
        props.className || ""
      }`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
        props.className || ""
      }`}
    />
  );
}

export default function NuevoClientePage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    contactName: "",
    phone: "",
    rut: "",
    address: "",
    city: "Santiago",
    industry: "",
    tier: "Basic",
    notes: "",
  });

  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/admin/clientes/nuevo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data?.error || "No se pudo registrar el cliente.");
        return;
      }

      const data = await response.json();
      router.push(`/admin/clientes/${data.id}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link
          href="/admin/clientes"
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">CRM</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Agregar cliente nuevo</h1>
          <p className="mt-1 text-sm text-slate-500">Se crea el registro comercial y queda disponible para cotizaciones, visitas, proyectos y documentos.</p>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users2 className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Perfil principal</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre del cliente" required>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Nombre del cliente o empresa" />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required placeholder="contacto@empresa.cl" />
              </Field>
              <Field label="Empresa / Razón social">
                <Input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Empresa SpA" />
              </Field>
              <Field label="Contacto principal">
                <Input value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Encargado comercial / TI" />
              </Field>
              <Field label="Teléfono">
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+56 9 1234 5678" />
              </Field>
              <Field label="RUT">
                <Input value={form.rut} onChange={(e) => set("rut", e.target.value)} placeholder="12.345.678-9" />
              </Field>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Ubicación y perfil comercial</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Dirección">
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Dirección comercial o de soporte" />
              </Field>
              <Field label="Ciudad">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Santiago" />
              </Field>
              <Field label="Industria">
                <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Retail, salud, construcción, servicios..." />
              </Field>
              <Field label="Tier">
                <select
                  value={form.tier}
                  onChange={(e) => set("tier", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option>Basic</option>
                  <option>Pro</option>
                  <option>Enterprise</option>
                </select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Notas internas">
                  <Textarea
                    rows={5}
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                    placeholder="Notas de onboarding, prioridades del cliente, requerimientos especiales, acuerdos comerciales..."
                  />
                </Field>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <h2 className="text-base font-bold">Ficha que se crea</h2>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <p className="flex items-center gap-2"><User className="h-4 w-4 text-blue-300" /> Cliente visible en CRM</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-blue-300" /> Utilizable en cotizaciones y ventas</p>
              <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-300" /> Preparado para proyectos y solicitudes</p>
            </div>
          </section>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {pending ? "Guardando..." : "Guardar cliente"}
          </button>
        </aside>
      </form>
    </div>
  );
}
