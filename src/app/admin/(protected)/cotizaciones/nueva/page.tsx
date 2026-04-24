"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useCallback } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calculator,
  Save,
  Globe,
  User,
  Briefcase,
  Hash,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";
import { ZYTERON_COMPANY } from "@/lib/company";

const COMPANY = {
  name: ZYTERON_COMPANY.legalName,
  rut: ZYTERON_COMPANY.rut,
  giro: ZYTERON_COMPANY.businessLine,
  address: ZYTERON_COMPANY.addressLine,
  city: ZYTERON_COMPANY.location,
  phone: ZYTERON_COMPANY.phone,
  email: ZYTERON_COMPANY.salesEmail,
  website: ZYTERON_COMPANY.website.replace("https://", ""),
  logo: "Z",
};

const IVA_RATE = 0.19;
const PAYMENT_METHODS = ["Transferencia bancaria", "Cheque", "Efectivo", "Tarjeta de crédito", "Débito automático"];
const PAYMENT_TERMS = ["Pago inmediato", "15 días", "30 días", "45 días", "60 días", "Contra entrega"];
const VALIDITY_DAYS = ["15 días", "30 días", "45 días", "60 días", "90 días"];

interface LineItem {
  id: string;
  description: string;
  detail: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discountPct: number;
}

type ClientLookupResult = {
  found: boolean;
  client?: {
    id: string;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    rut?: string | null;
    address?: string | null;
    city?: string | null;
    contactName?: string | null;
  };
};

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatDateCL(date: Date) {
  return date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

const today = new Date();
const quoteNumber = `COT-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 900) + 100)}`;

const emptyItem = (): LineItem => ({
  id: generateId(),
  description: "",
  detail: "",
  qty: 1,
  unit: "unidad",
  unitPrice: 0,
  discountPct: 0,
});

/* ─── Field components ─── */
function Field({
  label,
  icon: Icon,
  children,
  required,
}: {
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  required?: boolean;
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

function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors ${className}`}
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
    <div className="relative">
      <select
        className={`w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function Textarea({
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-colors resize-none ${className}`}
      {...props}
    />
  );
}

export default function NuevaCotizacion() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [clientLookupPending, setClientLookupPending] = useState(false);
  const [clientLookupMessage, setClientLookupMessage] = useState<string | null>(null);
  const [lastLookupEmail, setLastLookupEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [savedQuote, setSavedQuote] = useState<{ id: string; pdfUrl: string } | null>(null);

  /* Client info */
  const [client, setClient] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    rut: "",
    address: "",
    city: "",
    contact: "",
  });

  /* Quote meta */
  const [meta, setMeta] = useState({
    validityDays: "30 días",
    paymentMethod: "Transferencia bancaria",
    paymentTerms: "30 días",
    status: "PENDING",
    date: today.toISOString().slice(0, 10),
  });

  /* Line items */
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  /* Extra */
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState(
    "Esta cotización tiene validez según el plazo indicado. Los precios no incluyen IVA salvo indicación contraria. El servicio comenzará una vez recibido el anticipo o acuerdo firmado."
  );
  const [includeIva, setIncludeIva] = useState(true);

  /* ─── Computed totals ─── */
  const itemTotals = items.map((item) => {
    const bruto = item.qty * item.unitPrice;
    const descuento = bruto * (item.discountPct / 100);
    return { bruto, descuento, subtotal: bruto - descuento };
  });

  const subtotal = itemTotals.reduce((acc, t) => acc + t.subtotal, 0);
  const totalDescuento = itemTotals.reduce((acc, t) => acc + t.descuento, 0);
  const iva = includeIva ? subtotal * IVA_RATE : 0;
  const grandTotal = subtotal + iva;

  const validUntil = (() => {
    const days = parseInt(meta.validityDays) || 30;
    return addDays(today, days);
  })();

  /* ─── Item handlers ─── */
  const setItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (id: string) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));

  const autofillClientByEmail = useCallback(
    async (force = false) => {
      const email = client.email.trim().toLowerCase();
      if (!email) {
        setClientLookupMessage(null);
        return;
      }

      if (!force && email === lastLookupEmail) {
        return;
      }

      setClientLookupPending(true);
      setClientLookupMessage(null);
      setLastLookupEmail(email);

      try {
        const res = await fetch(`/admin/cotizaciones/nueva/client?email=${encodeURIComponent(email)}`, {
          method: "GET",
          cache: "no-store",
        });
        const data = (await res.json().catch(() => null)) as ClientLookupResult | null;

        if (!res.ok) {
          setClientLookupMessage("No se pudo consultar el cliente en este momento.");
          return;
        }

        if (!data?.found || !data.client) {
          setClientLookupMessage("No hay datos previos para este email.");
          return;
        }

        setClient((prev) => ({
          ...prev,
          name: prev.name || data.client?.name || "",
          phone: prev.phone || data.client?.phone || "",
          company: prev.company || data.client?.company || "",
          rut: prev.rut || data.client?.rut || "",
          address: prev.address || data.client?.address || "",
          city: prev.city || data.client?.city || "",
          contact: prev.contact || data.client?.contactName || data.client?.name || "",
        }));
        setClientLookupMessage("Cliente encontrado. Campos completados automáticamente.");
      } catch {
        setClientLookupMessage("No se pudo consultar el cliente en este momento.");
      } finally {
        setClientLookupPending(false);
      }
    },
    [client.email, lastLookupEmail],
  );

  /* ─── Submit ─── */
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!client.name || !client.email) {
      setError("Nombre y email del cliente son obligatorios.");
      return;
    }
    if (items.some((i) => !i.description || i.unitPrice <= 0)) {
      setError("Cada ítem debe tener descripción y precio mayor a 0.");
      return;
    }

    setError(null);

    const payload = {
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      subtotal: Math.round(subtotal),
      discount: Math.round(totalDescuento),
      total: Math.round(grandTotal),
      status: meta.status,
      message: JSON.stringify({
        clientRut: client.rut,
        clientAddress: client.address,
        clientCity: client.city,
        clientContact: client.contact,
        quoteNumber,
        quoteDate: meta.date,
        validUntil: validUntil.toISOString(),
        validityDays: meta.validityDays,
        paymentMethod: meta.paymentMethod,
        paymentTerms: meta.paymentTerms,
        includeIva,
        ivaRate: IVA_RATE,
        items,
        subtotal,
        totalDescuento,
        iva,
        grandTotal,
        notes,
        terms,
      }),
    };

    startTransition(async () => {
      const res = await fetch("/admin/cotizaciones/nueva/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.id && data?.pdfUrl) {
          setSavedQuote({ id: data.id, pdfUrl: data.pdfUrl });
        }
        setSuccess(true);
        setTimeout(() => router.push("/admin/cotizaciones"), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "No se pudo guardar la cotización.");
      }
    });
  };

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <FileText className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-slate-900">¡Cotización guardada!</h2>
          <p className="mt-1 text-sm text-slate-500">PDF profesional generado y registro conectado al panel.</p>
          {savedQuote && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <a
                href={savedQuote.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Abrir PDF
              </a>
              <Link
                href={`/admin/cotizaciones/${savedQuote.id}`}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Ver ficha
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/cotizaciones"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Nueva cotización
            </p>
            <h1 className="text-xl font-extrabold text-slate-900">Crear cotización profesional</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs font-bold text-slate-500">
            {quoteNumber}
          </span>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {pending ? "Guardando..." : "Guardar cotización"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* ── INVOICE DOCUMENT ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Document header: Company + Quote metadata */}
        <div className="grid grid-cols-[1fr_auto] gap-6 border-b border-slate-100 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
          {/* Company info */}
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xl font-extrabold shadow-lg shadow-blue-500/30">
              {COMPANY.logo}
            </div>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">{COMPANY.name}</h2>
              <p className="text-[11px] text-slate-300">RUT: {COMPANY.rut}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{COMPANY.giro}</p>
              <div className="mt-2 space-y-0.5 text-[11px] text-slate-300">
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3 w-3 text-slate-400" />
                  {COMPANY.address}, {COMPANY.city}
                </p>
                <p className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-slate-400" />
                  {COMPANY.phone}
                </p>
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3 w-3 text-slate-400" />
                  {COMPANY.email}
                </p>
                <p className="flex items-center gap-1.5">
                  <Globe className="h-3 w-3 text-slate-400" />
                  {COMPANY.website}
                </p>
              </div>
            </div>
          </div>

          {/* Quote metadata */}
          <div className="flex flex-col items-end gap-3 text-right">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Cotización
              </p>
              <p className="font-mono text-xl font-extrabold">{quoteNumber}</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[12px]">
              <div className="text-left">
                <p className="text-[10px] text-slate-400">Fecha emisión</p>
                <p className="font-semibold">{formatDateCL(today)}</p>
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-400">Válida hasta</p>
                <p className="font-semibold">{formatDateCL(validUntil)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-300">Validez:</label>
              <select
                value={meta.validityDays}
                onChange={(e) => setMeta((p) => ({ ...p, validityDays: e.target.value }))}
                className="rounded-lg border border-slate-600 bg-slate-700 px-2 py-1 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {VALIDITY_DAYS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Estado:
            </label>
            <select
              value={meta.status}
              onChange={(e) => setMeta((p) => ({ ...p, status: e.target.value }))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="PENDING">⏳ Pendiente</option>
              <option value="SENT">📤 Enviada</option>
              <option value="WON">✅ Ganada</option>
              <option value="LOST">❌ Perdida</option>
            </select>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <label className="flex items-center gap-2 text-[12px] font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeIva}
                onChange={(e) => setIncludeIva(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Incluir IVA (19%)
            </label>
          </div>
        </div>

        {/* Client section */}
        <div className="border-b border-slate-100 p-6">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Datos del cliente
            </h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Nombre completo" icon={User} required>
              <Input
                required
                value={client.name}
                onChange={(e) => setClient((p) => ({ ...p, name: e.target.value }))}
                placeholder="Juan Pérez González"
              />
            </Field>
            <Field label="Email" icon={Mail} required>
              <div className="space-y-2">
                <Input
                  type="email"
                  required
                  value={client.email}
                  onChange={(e) => {
                    setClient((p) => ({ ...p, email: e.target.value }));
                    setClientLookupMessage(null);
                  }}
                  onBlur={() => {
                    void autofillClientByEmail(false);
                  }}
                  placeholder="juan@empresa.cl"
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void autofillClientByEmail(true);
                    }}
                    disabled={clientLookupPending || !client.email.trim()}
                    className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {clientLookupPending ? "Buscando..." : "Autorrellenar cliente"}
                  </button>
                  {clientLookupMessage ? (
                    <p className="text-[11px] text-slate-500">{clientLookupMessage}</p>
                  ) : null}
                </div>
              </div>
            </Field>
            <Field label="Teléfono" icon={Phone}>
              <Input
                value={client.phone}
                onChange={(e) => setClient((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+56 9 8765 4321"
              />
            </Field>
            <Field label="RUT cliente" icon={Hash}>
              <Input
                value={client.rut}
                onChange={(e) => setClient((p) => ({ ...p, rut: e.target.value }))}
                placeholder="12.345.678-9"
              />
            </Field>
            <Field label="Empresa / Razón social" icon={Briefcase}>
              <Input
                value={client.company}
                onChange={(e) => setClient((p) => ({ ...p, company: e.target.value }))}
                placeholder="Empresa SpA"
              />
            </Field>
            <Field label="Persona de contacto" icon={User}>
              <Input
                value={client.contact}
                onChange={(e) => setClient((p) => ({ ...p, contact: e.target.value }))}
                placeholder="Nombre del encargado"
              />
            </Field>
            <Field label="Dirección" icon={MapPin}>
              <Input
                value={client.address}
                onChange={(e) => setClient((p) => ({ ...p, address: e.target.value }))}
                placeholder="Calle 123, Piso 4"
              />
            </Field>
            <Field label="Ciudad" icon={MapPin}>
              <Input
                value={client.city}
                onChange={(e) => setClient((p) => ({ ...p, city: e.target.value }))}
                placeholder="Santiago, RM"
              />
            </Field>
          </div>
        </div>

        {/* Line items */}
        <div className="border-b border-slate-100 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-slate-400" />
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Detalle de servicios / productos
              </h3>
            </div>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-blue-300 bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-600 transition-colors hover:bg-blue-100"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar ítem
            </button>
          </div>

          {/* Table header */}
          <div className="mb-2 grid grid-cols-[3fr_1fr_0.8fr_1.2fr_1fr_1fr_auto] items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>Descripción</span>
            <span>Detalle/Unidad</span>
            <span className="text-center">Cant.</span>
            <span className="text-right">Precio unit.</span>
            <span className="text-right">Descuento</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => {
              const { subtotal: st } = itemTotals[idx] ?? { subtotal: 0 };
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[3fr_1fr_0.8fr_1.2fr_1fr_1fr_auto] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300"
                >
                  {/* Description */}
                  <div className="space-y-1.5">
                    <Input
                      required
                      value={item.description}
                      onChange={(e) => setItem(item.id, "description", e.target.value)}
                      placeholder={`Ítem ${idx + 1}: ej. Desarrollo web`}
                      className="text-[13px] font-semibold"
                    />
                    <Input
                      value={item.detail}
                      onChange={(e) => setItem(item.id, "detail", e.target.value)}
                      placeholder="Descripción detallada (opcional)"
                      className="text-[11px] text-slate-500"
                    />
                  </div>

                  {/* Unit */}
                  <div>
                    <Input
                      value={item.unit}
                      onChange={(e) => setItem(item.id, "unit", e.target.value)}
                      placeholder="unidad"
                      className="text-[12px]"
                    />
                  </div>

                  {/* Qty */}
                  <div>
                    <Input
                      type="number"
                      min={1}
                      value={item.qty}
                      onChange={(e) => setItem(item.id, "qty", parseFloat(e.target.value) || 1)}
                      className="text-center text-[13px] font-semibold"
                    />
                  </div>

                  {/* Unit price */}
                  <div>
                    <Input
                      type="number"
                      min={0}
                      value={item.unitPrice || ""}
                      onChange={(e) => setItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="text-right text-[13px] font-semibold"
                    />
                  </div>

                  {/* Discount */}
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={item.discountPct || ""}
                      onChange={(e) => setItem(item.id, "discountPct", parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="pr-6 text-right text-[13px]"
                    />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">
                      %
                    </span>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right">
                    <p className="text-[13px] font-bold text-slate-900">{currency(st)}</p>
                    {item.discountPct > 0 && (
                      <p className="text-[10px] text-rose-500 line-through">
                        {currency(item.qty * item.unitPrice)}
                      </p>
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:border-blue-300 hover:text-blue-500"
          >
            <Plus className="h-4 w-4" />
            Agregar línea
          </button>
        </div>

        {/* Totals + payment */}
        <div className="grid gap-0 lg:grid-cols-[1fr_auto] border-b border-slate-100">
          {/* Payment & notes */}
          <div className="space-y-5 border-r border-slate-100 p-6">
            <div>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Condiciones de pago
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Forma de pago">
                  <Select
                    value={meta.paymentMethod}
                    onChange={(e) => setMeta((p) => ({ ...p, paymentMethod: e.target.value }))}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Plazo de pago">
                  <Select
                    value={meta.paymentTerms}
                    onChange={(e) => setMeta((p) => ({ ...p, paymentTerms: e.target.value }))}
                  >
                    {PAYMENT_TERMS.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Notas adicionales
              </h3>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional para el cliente, alcance del proyecto, consideraciones, etc."
              />
            </div>

            <div>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                Términos y condiciones
              </h3>
              <Textarea
                rows={4}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>
          </div>

          {/* Totals */}
          <div className="min-w-[280px] p-6">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Resumen financiero
            </h3>

            <div className="space-y-2">
              {/* Items */}
              {items.map((item, idx) => {
                const { subtotal: st } = itemTotals[idx] ?? { subtotal: 0 };
                if (!item.description) return null;
                return (
                  <div key={item.id} className="flex items-start justify-between gap-2 text-[12px]">
                    <span className="flex-1 text-slate-600 leading-tight">{item.description}</span>
                    <span className="font-semibold text-slate-900 whitespace-nowrap">{currency(st)}</span>
                  </div>
                );
              })}
            </div>

            <div className="my-4 border-t border-slate-200" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal neto</span>
                <span className="font-semibold text-slate-900">{currency(subtotal)}</span>
              </div>
              {totalDescuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-rose-500">Descuentos</span>
                  <span className="font-semibold text-rose-600">-{currency(totalDescuento)}</span>
                </div>
              )}
              {includeIva && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">IVA (19%)</span>
                  <span className="font-semibold text-slate-900">{currency(iva)}</span>
                </div>
              )}
            </div>

            <div className="my-3 border-t-2 border-slate-200" />

            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900">TOTAL</span>
              <span className="text-xl font-extrabold text-blue-700">{currency(grandTotal)}</span>
            </div>

            {includeIva && (
              <p className="mt-1 text-[10px] text-slate-400 text-right">
                Incluye IVA · {currency(subtotal)} neto
              </p>
            )}

            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Forma de pago</span>
                <span className="font-semibold text-slate-700">{meta.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Plazo</span>
                <span className="font-semibold text-slate-700">{meta.paymentTerms}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Válida hasta</span>
                <span className="font-semibold text-slate-700">{formatDateCL(validUntil)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-500">Ítems</span>
                <span className="font-semibold text-slate-700">{items.filter(i => i.description).length} líneas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 bg-slate-50 px-6 py-4">
          <p className="text-[11px] text-slate-400">
            {COMPANY.name} · {COMPANY.rut} · {COMPANY.email} · {COMPANY.phone}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/cotizaciones"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {pending ? "Guardando..." : "Guardar cotización"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
