"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AlertTriangle, ArrowLeft, Save } from "lucide-react";
import { ZYTERON_SII } from "@/lib/company";

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${props.className || ""}`} />;
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 ${props.className || ""}`} />;
}

export default function NuevoDocumentoSiiPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: "",
    projectId: "",
    quoteId: "",
    saleId: "",
    type: "Factura afecta",
    documentNumber: "",
    siiFolio: "",
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    status: "Pendiente",
    paymentStatus: "Pendiente",
    emissionMethod: "Registro interno",
    netAmount: "0",
    taxAmount: "0",
    totalAmount: "0",
    pdfUrl: "",
    xmlUrl: "",
    notes: "",
  });

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const response = await fetch("/admin/sii/nuevo/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          netAmount: Number(form.netAmount) || 0,
          taxAmount: Number(form.taxAmount) || 0,
          totalAmount: Number(form.totalAmount) || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data?.error || "No se pudo registrar el documento.");
        return;
      }

      router.push("/admin/sii");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/admin/sii" className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"><ArrowLeft className="h-4 w-4" /></Link>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Centro tributario</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Registrar boleta o factura</h1>
          <p className="mt-1 text-sm text-slate-500">{ZYTERON_SII.issuerName} · RUT {ZYTERON_SII.issuerRut}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Este formulario registra y centraliza la información tributaria del documento. No reemplaza por sí solo la emisión electrónica certificada ante SII.</p>
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <form onSubmit={onSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">ID cliente</label><Input value={form.clientId} onChange={(e) => set("clientId", e.target.value)} placeholder="UUID cliente" /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">ID proyecto</label><Input value={form.projectId} onChange={(e) => set("projectId", e.target.value)} placeholder="UUID proyecto" /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">ID cotización</label><Input value={form.quoteId} onChange={(e) => set("quoteId", e.target.value)} placeholder="ID cotización" /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">ID venta</label><Input value={form.saleId} onChange={(e) => set("saleId", e.target.value)} placeholder="ID venta" /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Tipo</label><select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option>Factura afecta</option><option>Factura exenta</option><option>Boleta afecta</option><option>Boleta exenta</option><option>Nota de crédito</option></select></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Número interno</label><Input value={form.documentNumber} onChange={(e) => set("documentNumber", e.target.value)} placeholder="FAC-2026-001" /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Folio SII</label><Input value={form.siiFolio} onChange={(e) => set("siiFolio", e.target.value)} placeholder="Folio autorizado" /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fecha emisión</label><Input type="date" value={form.issueDate} onChange={(e) => set("issueDate", e.target.value)} /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fecha vencimiento</label><Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estado</label><select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option>Pendiente</option><option>Emitida</option><option>Aceptada</option><option>Rechazada</option><option>Anulada</option></select></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Estado pago</label><select value={form.paymentStatus} onChange={(e) => set("paymentStatus", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option>Pendiente</option><option>Pagada</option><option>Parcial</option><option>Vencida</option></select></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Método de emisión</label><select value={form.emissionMethod} onChange={(e) => set("emissionMethod", e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option>Registro interno</option><option>SII manual</option><option>Proveedor DTE</option><option>API propia</option></select></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Neto</label><Input type="number" min={0} value={form.netAmount} onChange={(e) => set("netAmount", e.target.value)} /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">IVA</label><Input type="number" min={0} value={form.taxAmount} onChange={(e) => set("taxAmount", e.target.value)} /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Total</label><Input type="number" min={0} value={form.totalAmount} onChange={(e) => set("totalAmount", e.target.value)} /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">URL PDF</label><Input value={form.pdfUrl} onChange={(e) => set("pdfUrl", e.target.value)} placeholder="https://..." /></div>
          <div><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">URL XML</label><Input value={form.xmlUrl} onChange={(e) => set("xmlUrl", e.target.value)} placeholder="https://..." /></div>
          <div className="md:col-span-2 xl:col-span-3"><label className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Notas</label><Textarea rows={5} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Referencia del servicio, observaciones tributarias, comentarios de validación, etc." /></div>
        </div>
        <div className="mt-6 flex justify-end"><button type="submit" disabled={pending} className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"><Save className="h-4 w-4" />{pending ? "Guardando..." : "Guardar documento"}</button></div>
      </form>
    </div>
  );
}
