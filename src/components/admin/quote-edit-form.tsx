"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition, useEffect } from "react";
import {
  Briefcase,
  Calculator,
  ChevronDown,
  FileText,
  Hash,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Trash2,
  User,
} from "lucide-react";
import type { EnrichedQuote } from "@/lib/admin/repository";
import { buildDefaultQuoteTerms } from "@/lib/admin/quote";

type Props = {
  quote: EnrichedQuote;
};

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

type LineItem = {
  id: string;
  description: string;
  detail: string;
  billingMode: "UNIT" | "HOUR";
  qty: number;
  unit: string;
  startTime: string;
  endTime: string;
  unitPrice: number;
  discountPct: number;
};

const IVA_RATE = 0.19;
const FLOW_PAYMENT_METHOD = "Flow online";
const TRANSFER_PAYMENT_METHOD = "Transferencia bancaria";
const SUBSCRIPTION_PAYMENT_TERM = "Suscripción mensual";
const PAYMENT_METHODS = [FLOW_PAYMENT_METHOD, TRANSFER_PAYMENT_METHOD, "Cheque", "Efectivo", "Tarjeta de crédito", "Débito automático"];
const PAYMENT_TERMS = [SUBSCRIPTION_PAYMENT_TERM, "Pago inmediato", "15 días", "30 días", "45 días", "60 días", "Contra entrega"];
const VALIDITY_DAYS = ["15 días", "30 días", "45 días", "60 días", "90 días"];
const PAYMENT_BILLING_TYPES = [
  { value: "ONE_TIME", label: "Pago único" },
  { value: "SUBSCRIPTION", label: "Suscripción mensual" },
];
const PAYMENT_CHANNELS = [
  { value: "FLOW", label: "Flow online" },
  { value: "TRANSFER", label: "Transferencia bancaria" },
];
const PAYMENT_PLAN_MODES = [
  { value: "FULL", label: "Pago completo" },
  { value: "DELIVERY", label: "Contraentrega" },
  { value: "SPLIT", label: "Porcentaje inicio / final" },
];

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

function emptyItem(): LineItem {
  return {
    id: generateId(),
    description: "",
    detail: "",
    billingMode: "UNIT",
    qty: 1,
    unit: "unidad",
    startTime: "",
    endTime: "",
    unitPrice: 0,
    discountPct: 0,
  };
}

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.length >= 10 ? value.slice(0, 10) : "";
  }
  return parsed.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseValidityDays(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

function normalizeTimeInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

function isValidTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return false;
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function getHoursBetween(startTime: string, endTime: string) {
  if (!isValidTime(startTime) || !isValidTime(endTime)) return 0;
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  let diff = endMinutes - startMinutes;
  if (diff < 0) diff += 24 * 60; // Overnight shift
  if (diff === 0) return 0;
  return Math.round((diff / 60) * 100) / 100;
}

function syncPaymentMethodForChannel(method: string, channel: "FLOW" | "TRANSFER") {
  if (method === FLOW_PAYMENT_METHOD || method === TRANSFER_PAYMENT_METHOD) {
    return channel === "TRANSFER" ? TRANSFER_PAYMENT_METHOD : FLOW_PAYMENT_METHOD;
  }
  return method;
}

function applyBillingTypeToPaymentMeta<
  T extends {
    paymentMethod: string;
    paymentTerms: string;
    paymentChannel: string;
    paymentPlanMode: string;
    splitPercentInitial: string;
    paymentBillingType: string;
  },
>(
  current: T,
  billingType: "ONE_TIME" | "SUBSCRIPTION",
) {
  if (billingType === "SUBSCRIPTION") {
    return {
      ...current,
      paymentBillingType: billingType,
      paymentMethod: FLOW_PAYMENT_METHOD,
      paymentTerms: SUBSCRIPTION_PAYMENT_TERM,
      paymentChannel: "FLOW",
      paymentPlanMode: "FULL",
      splitPercentInitial: "50",
    };
  }

  return {
    ...current,
    paymentBillingType: billingType,
    paymentMethod:
      current.paymentMethod === FLOW_PAYMENT_METHOD || current.paymentMethod === TRANSFER_PAYMENT_METHOD
        ? FLOW_PAYMENT_METHOD
        : current.paymentMethod,
    paymentTerms: current.paymentTerms === SUBSCRIPTION_PAYMENT_TERM ? "30 días" : current.paymentTerms,
  };
}

function inferLineItem(raw: EnrichedQuote["meta"]["items"][number], index: number): LineItem {
  const detail = raw.detail || "";
  const horarioMatch = detail.match(/Horario\s*(\d{2}:\d{2})\s*a\s*(\d{2}:\d{2})/i);
  const isHour = (raw.unit || "").toLowerCase().includes("hora") || Boolean(horarioMatch);

  return {
    id: raw.id || `item-${index + 1}`,
    description: raw.description || "",
    detail: detail.replace(/\s*[·-]?\s*Horario\s*\d{2}:\d{2}\s*a\s*\d{2}:\d{2}(?:\s*\([^)]*\))?/i, "").trim(),
    billingMode: isHour ? "HOUR" : "UNIT",
    qty: Math.max(0, Number(raw.qty || 0)),
    unit: raw.unit || (isHour ? "hora" : "unidad"),
    startTime: horarioMatch?.[1] || "",
    endTime: horarioMatch?.[2] || "",
    unitPrice: Math.max(0, Number(raw.unitPrice || 0)),
    discountPct: Math.max(0, Math.min(100, Number(raw.discountPct || 0))),
  };
}

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

export function QuoteEditForm({ quote }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [clientLookupPending, setClientLookupPending] = useState(false);
  const [clientLookupMessage, setClientLookupMessage] = useState<string | null>(null);
  const [lastLookupEmail, setLastLookupEmail] = useState("");

  const [client, setClient] = useState({
    name: quote.name || "",
    email: quote.email || "",
    phone: quote.phone || "",
    company: quote.company || "",
    rut: quote.meta.clientRut || "",
    address: quote.meta.clientAddress || "",
    city: quote.meta.clientCity || "",
    contact: quote.meta.clientContact || "",
  });

  const [meta, setMeta] = useState(() => {
    const d = toDateInput(quote.meta.quoteDate || quote.issuedAt || quote.createdAt) || new Date().toISOString().slice(0, 10);
    const vd = quote.meta.validityDays || "30 días";
    const vu = quote.meta.validUntil 
      ? toDateInput(quote.meta.validUntil) 
      : toDateInput(addDays(new Date(`${d}T00:00:00`), parseValidityDays(vd)).toISOString());

    return {
      quoteNumber: quote.meta.quoteNumber || quote.displayNumber,
      date: d,
      validUntil: vu,
      validityDays: vd,
      paymentMethod:
        quote.meta.paymentMethod ||
        (quote.meta.payment?.defaultChannel === "TRANSFER" ? TRANSFER_PAYMENT_METHOD : FLOW_PAYMENT_METHOD),
      paymentTerms: quote.meta.paymentTerms || "30 días",
      paymentBillingType: quote.meta.payment?.billingType || "ONE_TIME",
      paymentChannel: quote.meta.payment?.defaultChannel || "FLOW",
      paymentPlanMode: quote.meta.payment?.planMode || "FULL",
      splitPercentInitial: String(quote.meta.payment?.splitPercentInitial || 50),
      status: quote.status || "PENDING",
      includeIva: quote.meta.includeIva ?? true,
    };
  });

  const [items, setItems] = useState<LineItem[]>(() => {
    const mapped = (quote.meta.items || []).map((item, index) => inferLineItem(item, index));
    return mapped.length > 0 ? mapped : [emptyItem()];
  });

  const [notes, setNotes] = useState(quote.meta.notes || "");
  const [terms, setTerms] = useState(
    quote.meta.terms && quote.meta.terms.trim().length > 0
      ? quote.meta.terms
      : buildDefaultQuoteTerms(quote.meta.includeIva ?? true),
  );
  const [termsTouched, setTermsTouched] = useState(() => {
    const currentTerms = (quote.meta.terms || "").trim();
    if (!currentTerms) return false;
    const defaultTerms = buildDefaultQuoteTerms(quote.meta.includeIva ?? true).trim();
    return currentTerms !== defaultTerms;
  });

  // Dates are managed in state to allow independent editing

  const itemTotals = items.map((item) => {
    const hours = item.billingMode === "HOUR" ? getHoursBetween(item.startTime, item.endTime) : 0;
    const effectiveQty = item.billingMode === "HOUR" ? hours * (item.qty || 1) : item.qty;
    const bruto = effectiveQty * item.unitPrice;
    const descuento = bruto * ((item.discountPct || 0) / 100);
    return { bruto, descuento, subtotal: bruto - descuento, hours, effectiveQty };
  });

  const subtotal = itemTotals.reduce((acc, t) => acc + t.subtotal, 0);
  const totalDescuento = itemTotals.reduce((acc, t) => acc + t.descuento, 0);
  const iva = meta.includeIva ? subtotal * IVA_RATE : 0;
  const grandTotal = subtotal + iva;

  useEffect(() => {
    if (termsTouched) return;
    setTerms(buildDefaultQuoteTerms(meta.includeIva));
  }, [meta.includeIva, termsTouched]);

  const setItem = useCallback((id: string, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, emptyItem()]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  }, []);

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

  const onSave = () => {
    if (!client.name || !client.email) {
      setError("Nombre y email del cliente son obligatorios.");
      return;
    }

    const hasInvalidItems = items.some((item) => {
      if (!item.description || item.unitPrice <= 0) return true;
      if (item.billingMode === "HOUR") {
        return getHoursBetween(item.startTime, item.endTime) <= 0 && item.startTime !== item.endTime;
      }
      return item.qty <= 0;
    });

    if (hasInvalidItems) {
      setError("Cada ítem debe tener descripción, precio válido y horas/cantidad mayor a 0.");
      return;
    }

    setError(null);
    setSuccess(null);

    const normalizedItems = items.map((item, idx) => {
      const totals = itemTotals[idx];
      const effectiveQty = totals?.effectiveQty || item.qty;
      const baseDetail = item.detail?.trim() || "";

      if (item.billingMode === "HOUR") {
        const hourLabel = `${item.startTime} a ${item.endTime} (${effectiveQty.toFixed(2)} h)`;
        return {
          id: item.id,
          description: item.description,
          detail: baseDetail ? `${baseDetail} · Horario ${hourLabel}` : `Horario ${hourLabel}`,
          qty: effectiveQty,
          unit: "hora",
          unitPrice: item.unitPrice,
          discountPct: item.discountPct,
        };
      }

      return {
        id: item.id,
        description: item.description,
        detail: item.detail,
        qty: effectiveQty,
        unit: item.unit || "unidad",
        unitPrice: item.unitPrice,
        discountPct: item.discountPct,
      };
    });

    const payload = {
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      clientRut: client.rut,
      clientAddress: client.address,
      clientCity: client.city,
      clientContact: client.contact,
      quoteNumber: meta.quoteNumber,
      quoteDate: meta.date,
      validUntil: new Date(meta.validUntil + "T00:00:00").toISOString(),
      validityDays: meta.validityDays,
      paymentMethod: meta.paymentMethod,
      paymentTerms: meta.paymentTerms,
      paymentBillingType: meta.paymentBillingType,
      paymentChannel: meta.paymentChannel,
      paymentPlanMode: meta.paymentPlanMode,
      splitPercentInitial: Math.max(1, Math.min(99, Number(meta.splitPercentInitial) || 50)),
      status: meta.status,
      includeIva: meta.includeIva,
      ivaRate: IVA_RATE,
      notes,
      terms,
      items: normalizedItems,
    };

    startTransition(async () => {
      try {
        const response = await fetch(`/admin/cotizaciones/${quote.id}/editar/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

        if (!response.ok || !result.ok) {
          throw new Error(result.error || "No se pudo actualizar la cotización.");
        }

        setSuccess("Cotización actualizada correctamente. Supabase y PDF fueron actualizados.");
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Error inesperado al guardar.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Edición de cotización</p>
              <h2 className="text-lg font-extrabold text-slate-900">{meta.quoteNumber || quote.displayNumber}</h2>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-[12px] font-semibold text-slate-600">Estado</label>
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
          </div>
        </div>

        <div className="border-b border-slate-100 p-6">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Datos del cliente</h3>
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

        <div className="border-b border-slate-100 p-6">
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Número cotización">
              <Input value={meta.quoteNumber} onChange={(e) => setMeta((p) => ({ ...p, quoteNumber: e.target.value }))} />
            </Field>
            <Field label="Fecha emisión">
              <Input 
                type="date" 
                value={meta.date} 
                onChange={(e) => {
                  const newDate = e.target.value;
                  const d = new Date(newDate + "T00:00:00");
                  d.setDate(d.getDate() + parseValidityDays(meta.validityDays));
                  setMeta((p) => ({ ...p, date: newDate, validUntil: d.toISOString().slice(0, 10) }));
                }} 
              />
            </Field>
            <Field label="Validez">
              <Select 
                value={meta.validityDays} 
                onChange={(e) => {
                  const daysStr = e.target.value;
                  const d = new Date(meta.date + "T00:00:00");
                  d.setDate(d.getDate() + parseValidityDays(daysStr));
                  setMeta((p) => ({ ...p, validityDays: daysStr, validUntil: d.toISOString().slice(0, 10) }));
                }}
              >
                {VALIDITY_DAYS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
            </Field>
            <Field label="Válida hasta">
              <Input 
                type="date" 
                value={meta.validUntil} 
                onChange={(e) => setMeta((p) => ({ ...p, validUntil: e.target.value }))} 
              />
            </Field>
          </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Modalidad de cobro">
              <Select
                value={meta.paymentBillingType}
                onChange={(e) =>
                  setMeta((p) => applyBillingTypeToPaymentMeta(p, e.target.value as "ONE_TIME" | "SUBSCRIPTION"))
                }
              >
                {PAYMENT_BILLING_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Forma de pago">
              <Select
                value={meta.paymentMethod}
                onChange={(e) => setMeta((p) => ({ ...p, paymentMethod: e.target.value }))}
                disabled={meta.paymentBillingType === "SUBSCRIPTION"}
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
                disabled={meta.paymentBillingType === "SUBSCRIPTION"}
              >
                {PAYMENT_TERMS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <Field label="Canal de cobro">
              <Select
                value={meta.paymentChannel}
                onChange={(e) => {
                  const nextChannel = e.target.value as "FLOW" | "TRANSFER";
                  setMeta((p) => ({
                    ...p,
                    paymentChannel: nextChannel,
                    paymentMethod: syncPaymentMethodForChannel(p.paymentMethod, nextChannel),
                  }));
                }}
                disabled={meta.paymentBillingType === "SUBSCRIPTION"}
              >
                {PAYMENT_CHANNELS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Esquema de cobro">
              <Select
                value={meta.paymentPlanMode}
                onChange={(e) =>
                  setMeta((p) => ({ ...p, paymentPlanMode: e.target.value as "FULL" | "DELIVERY" | "SPLIT" }))
                }
                disabled={meta.paymentBillingType === "SUBSCRIPTION"}
              >
                {PAYMENT_PLAN_MODES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            {meta.paymentBillingType === "SUBSCRIPTION" ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[11px] text-blue-900 lg:col-span-2">
                La cotización se cobrará como suscripción mensual por el total completo vía Flow. El cliente activará el enrolamiento de tarjeta y los cobros recurrentes desde su portal.
              </div>
            ) : null}
            {meta.paymentBillingType !== "SUBSCRIPTION" && meta.paymentPlanMode === "SPLIT" ? (
              <Field label="% al inicio">
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={meta.splitPercentInitial}
                  onChange={(e) => setMeta((p) => ({ ...p, splitPercentInitial: e.target.value }))}
                />
              </Field>
            ) : null}
            {meta.paymentBillingType !== "SUBSCRIPTION" && meta.paymentPlanMode === "SPLIT" ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                El porcentaje restante se cobrará como pago final. La suma siempre se ajusta al total completo de la cotización.
              </div>
            ) : null}
            <div className="sm:col-span-2 lg:col-span-2">
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <input
                    type="checkbox"
                    checked={meta.includeIva}
                    onChange={(e) => setMeta((p) => ({ ...p, includeIva: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Todo con IVA (19%)
                </label>
                <p className="mt-1 text-[11px] text-slate-500">Si desmarcas, la cotización quedará en valores netos + IVA.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-slate-400" />
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Detalle de servicios / productos</h3>
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

          <div className="mb-2 grid grid-cols-[3fr_1.6fr_0.8fr_1.2fr_1fr_1fr_auto] items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>Descripción</span>
            <span>Modo / Horario</span>
            <span className="text-center">Hrs x Cant.</span>
            <span className="text-right">Precio unit./hora</span>
            <span className="text-right">Descuento</span>
            <span className="text-right">Subtotal</span>
            <span />
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => {
              const {
                subtotal: st,
                effectiveQty = item.qty,
                hours = 0,
              } = itemTotals[idx] ?? { subtotal: 0, effectiveQty: item.qty, hours: 0 };

              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[3fr_1.6fr_0.8fr_1.2fr_1fr_1fr_auto] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-300"
                >
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

                  <div className="space-y-1.5">
                    <Select
                      value={item.billingMode}
                      onChange={(e) => {
                        const nextMode = e.target.value as LineItem["billingMode"];
                        setItems((prev) =>
                          prev.map((row) =>
                            row.id === item.id
                              ? {
                                  ...row,
                                  billingMode: nextMode,
                                  unit: nextMode === "HOUR" ? "hrs" : row.unit || "unidad",
                                  qty: Math.max(1, row.qty),
                                }
                              : row,
                          ),
                        );
                      }}
                      className="text-[12px]"
                    >
                      <option value="UNIT">Por unidad</option>
                      <option value="HOUR">Por horas</option>
                    </Select>

                    {item.billingMode === "HOUR" ? (
                      <div className="space-y-1">
                        <div className="grid grid-cols-2 gap-1.5">
                          <Input
                            value={item.startTime}
                            onChange={(e) => setItem(item.id, "startTime", normalizeTimeInput(e.target.value))}
                            placeholder="Inicio 09:00"
                            maxLength={5}
                            inputMode="numeric"
                            className="text-[11px]"
                          />
                          <Input
                            value={item.endTime}
                            onChange={(e) => setItem(item.id, "endTime", normalizeTimeInput(e.target.value))}
                            placeholder="Fin 13:30"
                            maxLength={5}
                            inputMode="numeric"
                            className="text-[11px]"
                          />
                        </div>
                        {hours <= 0 && item.startTime && item.endTime ? (
                          <p className="text-[10px] text-rose-500">Ingresa horario válido</p>
                        ) : null}
                      </div>
                    ) : (
                      <Input
                        value={item.unit}
                        onChange={(e) => setItem(item.id, "unit", e.target.value)}
                        placeholder="unidad"
                        className="text-[11px]"
                      />
                    )}
                  </div>

                  <div>
                    {item.billingMode === "HOUR" ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex w-full items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1">
                          <Input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => setItem(item.id, "qty", parseFloat(e.target.value) || 1)}
                            className="h-6 w-12 border-0 bg-transparent p-0 text-center text-[12px] font-bold text-blue-700 shadow-none focus-visible:ring-0"
                            title="Multiplicador (ej. días o personas)"
                          />
                          <span className="text-[11px] font-bold text-blue-700">x {hours > 0 ? hours.toFixed(2) : "0"}h</span>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400">TOTAL: {(hours * (item.qty || 1)).toFixed(2)}h</p>
                      </div>
                    ) : (
                      <Input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => setItem(item.id, "qty", parseFloat(e.target.value) || 1)}
                        className="text-center text-[13px] font-semibold"
                      />
                    )}
                  </div>

                  <div>
                    <Input
                      type="number"
                      min={0}
                      value={item.unitPrice || ""}
                      onChange={(e) => setItem(item.id, "unitPrice", parseFloat(e.target.value) || 0)}
                      placeholder={item.billingMode === "HOUR" ? "Valor por hora" : "0"}
                      className="text-right text-[13px] font-semibold"
                    />
                  </div>

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

                  <div className="text-right">
                    <p className="text-[13px] font-bold text-slate-900">{currency(st)}</p>
                    {item.billingMode === "HOUR" ? (
                      <p className="text-[10px] text-slate-500">{effectiveQty.toFixed(2)} h × {currency(item.unitPrice)}</p>
                    ) : null}
                    {item.discountPct > 0 ? (
                      <p className="text-[10px] text-rose-500 line-through">{currency(effectiveQty * item.unitPrice)}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1fr_auto]">
          <div className="space-y-5 border-r border-slate-100 p-6">
            <div>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">Notas adicionales</h3>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Información adicional para el cliente, alcance del proyecto, consideraciones, etc."
              />
            </div>

            <div>
              <h3 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-slate-500">Términos y condiciones</h3>
              <Textarea
                rows={4}
                value={terms}
                onChange={(e) => {
                  setTermsTouched(true);
                  setTerms(e.target.value);
                }}
              />
            </div>
          </div>

          <div className="min-w-[280px] p-6">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">Resumen financiero</h3>

            <div className="space-y-2">
              {items.map((item, idx) => {
                const { subtotal: st, effectiveQty = item.qty } = itemTotals[idx] ?? { subtotal: 0, effectiveQty: item.qty };
                if (!item.description) return null;
                return (
                  <div key={item.id} className="flex items-start justify-between gap-2 text-[12px]">
                    <span className="flex-1 leading-tight text-slate-600">
                      <span className="block">{item.description}</span>
                      {item.billingMode === "HOUR" ? (
                        <span className="block text-[10px] text-slate-400">
                          {item.startTime || "--:--"} a {item.endTime || "--:--"} · {effectiveQty.toFixed(2)} h
                        </span>
                      ) : null}
                    </span>
                    <span className="whitespace-nowrap font-semibold text-slate-900">{currency(st)}</span>
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
              {totalDescuento > 0 ? (
                <div className="flex justify-between text-sm">
                  <span className="text-rose-500">Descuentos</span>
                  <span className="font-semibold text-rose-600">-{currency(totalDescuento)}</span>
                </div>
              ) : null}
              {meta.includeIva ? (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">IVA (19%)</span>
                  <span className="font-semibold text-slate-900">{currency(iva)}</span>
                </div>
              ) : null}
            </div>

            <div className="my-3 border-t-2 border-slate-200" />

            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-900">TOTAL</span>
              <span className="text-xl font-extrabold text-blue-700">{currency(grandTotal)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onSave}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? <FileText className="h-4 w-4 animate-pulse" /> : <Save className="h-4 w-4" />}
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
