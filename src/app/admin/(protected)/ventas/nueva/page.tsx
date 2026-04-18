"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  DollarSign,
  User,
  FileText,
  Calendar,
  Hash,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";

function currency(value: number) {
  if (!value) return "—";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

const PAYMENT_METHODS = [
  "Transferencia bancaria",
  "Cheque",
  "Efectivo",
  "Tarjeta de crédito",
  "Débito automático",
];

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

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors ${className}`}
      {...props}
    />
  );
}

function Select({
  children,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}


export default function NuevaVenta() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    total: "",
    paymentMethod: "Transferencia bancaria",
    description: "",
    invoiceRef: "",
    date: new Date().toISOString().slice(0, 10),
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const totalNum = parseFloat(form.total) || 0;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!totalNum || totalNum <= 0) {
      setError("El total debe ser mayor a 0.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch("/admin/ventas/nueva/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: form.clientId || null,
          total: totalNum,
          description: form.description,
          paymentMethod: form.paymentMethod,
          invoiceRef: form.invoiceRef,
          date: form.date,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => router.push("/admin/ventas"), 1200);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "No se pudo registrar la venta.");
      }
    });
  };

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <ShoppingCart className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">¡Venta registrada!</h2>
          <p className="mt-1 text-sm text-slate-500">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/ventas"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Ventas</p>
          <h1 className="text-xl font-extrabold text-slate-900">Registrar nueva venta</h1>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Main form */}
        <div className="space-y-6">
          {/* Client info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              <User className="h-3.5 w-3.5" />
              Información del cliente
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ID Cliente (Supabase)" icon={Hash}>
                <Input
                  value={form.clientId}
                  onChange={(e) => set("clientId", e.target.value)}
                  placeholder="UUID del cliente (opcional)"
                  className="font-mono"
                />
              </Field>
              <Field label="Nombre del cliente" icon={User}>
                <Input
                  value={form.clientName}
                  onChange={(e) => set("clientName", e.target.value)}
                  placeholder="Juan Pérez"
                />
              </Field>
            </div>
          </div>

          {/* Sale details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              <FileText className="h-3.5 w-3.5" />
              Detalle de la venta
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Total (CLP)" icon={DollarSign} required>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    $
                  </span>
                  <Input
                    type="number"
                    min={1}
                    required
                    value={form.total}
                    onChange={(e) => set("total", e.target.value)}
                    placeholder="0"
                    className="pl-7"
                  />
                </div>
              </Field>
              <Field label="Forma de pago" icon={DollarSign}>
                <Select
                  value={form.paymentMethod}
                  onChange={(e) => set("paymentMethod", e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Referencia / Factura" icon={Hash}>
                <Input
                  value={form.invoiceRef}
                  onChange={(e) => set("invoiceRef", e.target.value)}
                  placeholder="ej. FAC-2026-001"
                />
              </Field>
              <Field label="Fecha de venta" icon={Calendar}>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => set("date", e.target.value)}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Descripción / Concepto" icon={FileText}>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Descripción del servicio o producto vendido"
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
              Resumen
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Cliente</span>
                <span className="font-semibold text-slate-900 truncate ml-2">
                  {form.clientName || "Sin asignar"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Pago</span>
                <span className="font-semibold text-slate-900">{form.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Fecha</span>
                <span className="font-semibold text-slate-900">
                  {form.date
                    ? new Date(form.date + "T12:00:00").toLocaleDateString("es-CL", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between">
                  <span className="text-base font-bold text-slate-900">Total</span>
                  <span className="text-xl font-extrabold text-emerald-700">
                    {totalNum > 0 ? currency(totalNum) : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={pending || !totalNum}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {pending ? "Guardando..." : "Registrar venta"}
          </button>

          <Link
            href="/admin/ventas"
            className="flex w-full items-center justify-center rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </Link>

          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
            <p className="text-[11px] font-semibold text-amber-700">
              La venta se guardará en la tabla <code className="font-mono">Sale</code> de Supabase con los campos clientId, total y createdAt.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
