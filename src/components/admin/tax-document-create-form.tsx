"use client";

import { useMemo, useState, useTransition, type FormEvent, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Calculator, FileCheck2, Save } from "lucide-react";

type ClientOption = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  rut: string | null;
};
type QuoteOption = {
  id: string;
  clientId: string | null;
  label: string;
  status: string;
  netAmount: number;
  taxAmount: number;
  totalAmount: number;
};
type ProjectOption = { id: string; clientId: string | null; quoteId: string | null; title: string };
type SaleOption = {
  id: string;
  clientId: string | null;
  total: number;
  description: string | null;
};

type Props = {
  clients: ClientOption[];
  quotes: QuoteOption[];
  projects: ProjectOption[];
  sales: SaleOption[];
  initial: { clientId: string; quoteId: string; projectId: string; saleId: string };
};

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 transition outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${props.className || ""}`}
    />
  );
}

const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

function amount(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function currency(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function TaxDocumentCreateForm({ clients, quotes, projects, sales, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const initialQuote = quotes.find((quote) => quote.id === initial.quoteId) || null;
  const [form, setForm] = useState({
    ...initial,
    clientId: initial.clientId || initialQuote?.clientId || "",
    type: "Factura afecta",
    documentNumber: "",
    siiFolio: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    status: "Borrador",
    emissionMethod: "Registro interno",
    netAmount: String(initialQuote?.netAmount || 0),
    taxAmount: String(initialQuote?.taxAmount || 0),
    totalAmount: String(initialQuote?.totalAmount || 0),
    pdfUrl: "",
    xmlUrl: "",
    notes: "",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const selectedClient = clients.find((client) => client.id === form.clientId) || null;
  const clientQuotes = useMemo(
    () => quotes.filter((quote) => !form.clientId || quote.clientId === form.clientId),
    [form.clientId, quotes],
  );
  const clientProjects = useMemo(
    () => projects.filter((project) => !form.clientId || project.clientId === form.clientId),
    [form.clientId, projects],
  );
  const clientSales = useMemo(
    () => sales.filter((sale) => !form.clientId || sale.clientId === form.clientId),
    [form.clientId, sales],
  );

  function chooseQuote(quoteId: string) {
    const quote = quotes.find((item) => item.id === quoteId);
    setForm((current) => ({
      ...current,
      quoteId,
      clientId: quote?.clientId || current.clientId,
      netAmount: quote ? String(quote.netAmount) : current.netAmount,
      taxAmount: quote ? String(quote.taxAmount) : current.taxAmount,
      totalAmount: quote ? String(quote.totalAmount) : current.totalAmount,
      notes: quote ? `Documento vinculado a ${quote.label}.` : current.notes,
    }));
  }

  function recalculate() {
    const net = amount(form.netAmount);
    const tax = form.type.includes("exenta") ? 0 : Math.round(net * 0.19);
    setForm((current) => ({ ...current, taxAmount: String(tax), totalAmount: String(net + tax) }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const response = await fetch("/admin/sii/nuevo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          netAmount: amount(form.netAmount),
          taxAmount: amount(form.taxAmount),
          totalAmount: amount(form.totalAmount),
          paymentStatus: "Pendiente",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload?.error || "No se pudo registrar el documento.");
        return;
      }
      router.push(
        form.clientId
          ? `/admin/clientes/${form.clientId}?invoice_created=1`
          : "/admin/sii?created=1",
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-blue-600" />
            <div>
              <h2 className="font-bold text-slate-900">Origen del documento</h2>
              <p className="text-xs text-slate-500">
                Selecciona registros reales; no vuelvas a copiar IDs manualmente.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Cliente *
              <select
                required
                className={selectClass}
                value={form.clientId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    clientId: event.target.value,
                    quoteId: "",
                    projectId: "",
                    saleId: "",
                  }))
                }
              >
                <option value="">Seleccionar cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.company || client.name} · {client.rut || client.email || "sin RUT"}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Cotización de origen
              <select
                className={selectClass}
                value={form.quoteId}
                onChange={(event) => chooseQuote(event.target.value)}
              >
                <option value="">Sin cotización</option>
                {clientQuotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>
                    {quote.label} · {quote.status} · {currency(quote.totalAmount)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Proyecto
              <select
                className={selectClass}
                value={form.projectId}
                onChange={(event) => set("projectId", event.target.value)}
              >
                <option value="">Sin proyecto</option>
                {clientProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Venta
              <select
                className={selectClass}
                value={form.saleId}
                onChange={(event) => set("saleId", event.target.value)}
              >
                <option value="">Sin venta</option>
                {clientSales.map((sale) => (
                  <option key={sale.id} value={sale.id}>
                    {sale.description || "Venta"} · {currency(sale.total)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-900">Documento y emisión</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Tipo
              <select
                className={selectClass}
                value={form.type}
                onChange={(e) => {
                  const type = e.target.value;
                  const net = amount(form.netAmount);
                  const tax = type.includes("exenta") ? 0 : Math.round(net * 0.19);
                  setForm((current) => ({
                    ...current,
                    type,
                    taxAmount: String(tax),
                    totalAmount: String(net + tax),
                  }));
                }}
              >
                <option>Factura afecta</option>
                <option>Factura exenta</option>
                <option>Boleta afecta</option>
                <option>Boleta exenta</option>
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Número interno
              <Input
                value={form.documentNumber}
                onChange={(e) => set("documentNumber", e.target.value)}
                placeholder="Se asigna al confirmar"
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Folio SII
              <Input
                value={form.siiFolio}
                onChange={(e) => set("siiFolio", e.target.value)}
                placeholder="Solo si ya fue emitido"
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Emisión
              <Input
                type="date"
                required
                value={form.issueDate}
                onChange={(e) => set("issueDate", e.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Vencimiento
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Estado
              <select
                className={selectClass}
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option>Borrador</option>
                <option>Emitida</option>
                <option>Aceptada</option>
                <option>Rechazada</option>
                <option>Anulada</option>
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              Método
              <select
                className={selectClass}
                value={form.emissionMethod}
                onChange={(e) => set("emissionMethod", e.target.value)}
              >
                <option>Registro interno</option>
                <option>SII manual</option>
                <option>Proveedor DTE</option>
                <option>API propia</option>
              </select>
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              URL PDF
              <Input
                type="url"
                value={form.pdfUrl}
                onChange={(e) => set("pdfUrl", e.target.value)}
                placeholder="https://…"
              />
            </label>
            <label className="space-y-1.5 text-xs font-semibold text-slate-700">
              URL XML
              <Input
                type="url"
                value={form.xmlUrl}
                onChange={(e) => set("xmlUrl", e.target.value)}
                placeholder="https://…"
              />
            </label>
          </div>
          <label className="mt-4 block space-y-1.5 text-xs font-semibold text-slate-700">
            Notas
            <textarea
              rows={4}
              className={selectClass}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Hito facturado, condición comercial y observaciones."
            />
          </label>
        </section>
      </div>

      <aside className="space-y-5">
        <section className="sticky top-6 rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-950 to-blue-700 p-6 text-white shadow-xl shadow-blue-950/10">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-200" />
            <h2 className="font-bold">Totales</h2>
          </div>
          <div className="mt-5 space-y-3">
            <label className="block space-y-1.5 text-xs font-semibold text-blue-100">
              Neto
              <Input
                type="number"
                min={0}
                value={form.netAmount}
                onChange={(e) => set("netAmount", e.target.value)}
              />
            </label>
            <label className="block space-y-1.5 text-xs font-semibold text-blue-100">
              IVA
              <Input
                type="number"
                min={0}
                value={form.taxAmount}
                onChange={(e) => set("taxAmount", e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={recalculate}
              className="text-xs font-semibold text-blue-100 underline decoration-blue-300 underline-offset-4"
            >
              Recalcular IVA 19%
            </button>
            <label className="block space-y-1.5 text-xs font-semibold text-blue-100">
              Total
              <Input
                type="number"
                min={1}
                required
                value={form.totalAmount}
                onChange={(e) => set("totalAmount", e.target.value)}
              />
            </label>
          </div>
          <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4">
            <p className="text-xs tracking-widest text-blue-200 uppercase">Cliente facturado</p>
            <p className="mt-1 font-bold">
              {selectedClient?.company || selectedClient?.name || "Selecciona un cliente"}
            </p>
            <p className="mt-1 text-xs text-blue-100">
              {selectedClient?.rut || selectedClient?.email || "Sin identificación"}
            </p>
            <p className="mt-4 text-2xl font-extrabold">{currency(amount(form.totalAmount))}</p>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-300/30 bg-amber-300/10 p-3 text-xs text-amber-50">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              “Borrador” registra la obligación y el saldo, pero no declara emisión electrónica ante
              el SII.
            </p>
          </div>
          <button
            type="submit"
            disabled={pending || !form.clientId || amount(form.totalAmount) <= 0}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-blue-800 transition hover:bg-blue-50 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {pending ? "Guardando…" : "Crear y vincular saldo"}
          </button>
        </section>
      </aside>
    </form>
  );
}
