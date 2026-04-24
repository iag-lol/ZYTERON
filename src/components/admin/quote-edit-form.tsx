"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type { EnrichedQuote } from "@/lib/admin/repository";

type Props = {
  quote: EnrichedQuote;
};

type Item = {
  id: string;
  description: string;
  detail: string;
  qty: number;
  unit: string;
  unitPrice: number;
  discountPct: number;
};

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function toDateInput(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.length >= 10 ? value.slice(0, 10) : "";
  }
  return parsed.toISOString().slice(0, 10);
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

const textareaClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

export function QuoteEditForm({ quote }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const [meta, setMeta] = useState({
    quoteNumber: quote.meta.quoteNumber || quote.displayNumber,
    quoteDate: toDateInput(quote.meta.quoteDate || quote.issuedAt),
    validUntil: toDateInput(quote.meta.validUntil),
    validityDays: quote.meta.validityDays || "30 días",
    paymentMethod: quote.meta.paymentMethod || "Transferencia bancaria",
    paymentTerms: quote.meta.paymentTerms || "30 días",
    status: quote.status || "PENDING",
    includeIva: quote.meta.includeIva ?? true,
  });

  const [items, setItems] = useState<Item[]>(
    (quote.meta.items || []).map((item, index) => ({
      id: item.id || `item-${index + 1}`,
      description: item.description || "",
      detail: item.detail || "",
      qty: Number(item.qty || 0),
      unit: item.unit || "unidad",
      unitPrice: Number(item.unitPrice || 0),
      discountPct: Number(item.discountPct || 0),
    })),
  );

  const [notes, setNotes] = useState(quote.meta.notes || "");
  const [terms, setTerms] = useState(quote.meta.terms || "");

  const totals = items.map((item) => {
    const gross = Math.max(0, item.qty) * Math.max(0, item.unitPrice);
    const discount = gross * (Math.max(0, Math.min(100, item.discountPct)) / 100);
    const subtotal = gross - discount;
    return { gross, discount, subtotal };
  });

  const subtotal = totals.reduce((acc, t) => acc + t.subtotal, 0);
  const totalDiscount = totals.reduce((acc, t) => acc + t.discount, 0);
  const iva = meta.includeIva ? subtotal * 0.19 : 0;
  const grandTotal = subtotal + iva;

  function setItem(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id: randomId(),
        description: "",
        detail: "",
        qty: 1,
        unit: "unidad",
        unitPrice: 0,
        discountPct: 0,
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  }

  function onSave() {
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/admin/cotizaciones/${quote.id}/editar/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: client.name,
            email: client.email,
            phone: client.phone,
            company: client.company,
            clientRut: client.rut,
            clientAddress: client.address,
            clientCity: client.city,
            clientContact: client.contact,
            quoteNumber: meta.quoteNumber,
            quoteDate: meta.quoteDate,
            validUntil: meta.validUntil,
            validityDays: meta.validityDays,
            paymentMethod: meta.paymentMethod,
            paymentTerms: meta.paymentTerms,
            status: meta.status,
            includeIva: meta.includeIva,
            notes,
            terms,
            items: items.map((item) => ({
              id: item.id,
              description: item.description,
              detail: item.detail,
              qty: item.qty,
              unit: item.unit,
              unitPrice: item.unitPrice,
              discountPct: item.discountPct,
            })),
          }),
        });

        const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "No se pudo actualizar la cotización.");
        }

        setSuccess("Cotización actualizada correctamente.");
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Error inesperado.");
      }
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Cliente</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input className={inputClass} placeholder="Nombre" value={client.name} onChange={(e) => setClient((p) => ({ ...p, name: e.target.value }))} />
          <input className={inputClass} placeholder="Empresa" value={client.company} onChange={(e) => setClient((p) => ({ ...p, company: e.target.value }))} />
          <input className={inputClass} placeholder="Email" value={client.email} onChange={(e) => setClient((p) => ({ ...p, email: e.target.value }))} />
          <input className={inputClass} placeholder="Teléfono" value={client.phone} onChange={(e) => setClient((p) => ({ ...p, phone: e.target.value }))} />
          <input className={inputClass} placeholder="RUT" value={client.rut} onChange={(e) => setClient((p) => ({ ...p, rut: e.target.value }))} />
          <input className={inputClass} placeholder="Contacto" value={client.contact} onChange={(e) => setClient((p) => ({ ...p, contact: e.target.value }))} />
          <input className={`${inputClass} md:col-span-2`} placeholder="Dirección" value={client.address} onChange={(e) => setClient((p) => ({ ...p, address: e.target.value }))} />
          <input className={inputClass} placeholder="Ciudad" value={client.city} onChange={(e) => setClient((p) => ({ ...p, city: e.target.value }))} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Datos comerciales</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <input className={inputClass} placeholder="Número cotización" value={meta.quoteNumber} onChange={(e) => setMeta((p) => ({ ...p, quoteNumber: e.target.value }))} />
          <input className={inputClass} type="date" value={meta.quoteDate} onChange={(e) => setMeta((p) => ({ ...p, quoteDate: e.target.value }))} />
          <select className={inputClass} value={meta.status} onChange={(e) => setMeta((p) => ({ ...p, status: e.target.value }))}>
            <option value="PENDING">PENDING</option>
            <option value="SENT">SENT</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
          </select>
          <input className={inputClass} placeholder="Validez (ej: 30 días)" value={meta.validityDays} onChange={(e) => setMeta((p) => ({ ...p, validityDays: e.target.value }))} />
          <input className={inputClass} type="date" value={meta.validUntil} onChange={(e) => setMeta((p) => ({ ...p, validUntil: e.target.value }))} />
          <input className={inputClass} placeholder="Método de pago" value={meta.paymentMethod} onChange={(e) => setMeta((p) => ({ ...p, paymentMethod: e.target.value }))} />
          <input className={inputClass} placeholder="Plazo de pago" value={meta.paymentTerms} onChange={(e) => setMeta((p) => ({ ...p, paymentTerms: e.target.value }))} />
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" checked={meta.includeIva} onChange={(e) => setMeta((p) => ({ ...p, includeIva: e.target.checked }))} />
            Incluir IVA (19%)
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Items cotizados</h2>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar ítem
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 md:grid-cols-[2.2fr_1.8fr_0.8fr_1fr_0.8fr_auto]">
              <input className={inputClass} placeholder="Concepto" value={item.description} onChange={(e) => setItem(item.id, { description: e.target.value })} />
              <input className={inputClass} placeholder="Detalle" value={item.detail} onChange={(e) => setItem(item.id, { detail: e.target.value })} />
              <input className={inputClass} type="number" min={0} step={1} value={item.qty} onChange={(e) => setItem(item.id, { qty: Number(e.target.value) })} />
              <input className={inputClass} type="number" min={0} step={1000} value={item.unitPrice} onChange={(e) => setItem(item.id, { unitPrice: Number(e.target.value) })} />
              <input className={inputClass} type="number" min={0} max={100} step={1} value={item.discountPct} onChange={(e) => setItem(item.id, { discountPct: Number(e.target.value) })} />
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2 py-2 text-rose-700 hover:bg-rose-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">Notas y términos</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <textarea className={textareaClass} rows={5} placeholder="Notas internas o comerciales" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <textarea className={textareaClass} rows={5} placeholder="Términos comerciales" value={terms} onChange={(e) => setTerms(e.target.value)} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
        <h2 className="text-base font-bold">Resumen</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-200">
          <div className="flex items-center justify-between"><span>Subtotal</span><span>{currency(subtotal)}</span></div>
          <div className="flex items-center justify-between"><span>Descuento</span><span>-{currency(totalDiscount)}</span></div>
          <div className="flex items-center justify-between"><span>IVA</span><span>{currency(iva)}</span></div>
          <div className="border-t border-white/15 pt-2 text-base font-extrabold">
            <div className="flex items-center justify-between"><span>Total</span><span>{currency(grandTotal)}</span></div>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {pending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

