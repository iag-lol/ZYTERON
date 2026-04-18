import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  CalendarClock,
  FileText,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Workflow,
} from "lucide-react";
import { currencyCLP } from "@/lib/admin/quote";
import { getClientWorkspace } from "@/lib/admin/repository";

type Params = {
  params: Promise<{ id: string }>;
};

function StatCard({ label, value, helper }: { label: string; value: string | number; helper: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

export default async function ClienteDetallePage({ params }: Params) {
  const { id } = await params;
  const workspace = await getClientWorkspace(id);

  if (!workspace.client) {
    notFound();
  }

  const { client, quotes, visits, sales, projects, requests, documents } = workspace;
  const totalSales = sales.reduce((acc, sale) => acc + (sale.total || 0), 0);
  const totalQuoted = quotes.reduce((acc, quote) => acc + (quote.totalAmount || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link
            href="/admin/clientes"
            className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Cliente</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{client.company || client.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{client.contactName || client.name} · {client.email || "Sin email"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/cotizaciones/nueva"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Nueva cotización
          </Link>
          <Link
            href="/admin/proyectos/nuevo"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Nuevo proyecto
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Cotizaciones" value={quotes.length} helper={currencyCLP(totalQuoted)} />
        <StatCard label="Ventas" value={sales.length} helper={currencyCLP(totalSales)} />
        <StatCard label="Visitas" value={visits.length} helper="Agenda y soporte" />
        <StatCard label="Solicitudes" value={requests.length} helper="Tickets y requerimientos" />
        <StatCard label="Proyectos" value={projects.length} helper={`${documents.length} doc. tributarios`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.4fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900">Perfil comercial</h2>
          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /> {client.email || "Sin email"}</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {client.phone || "Sin teléfono"}</p>
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /> {[client.address, client.city].filter(Boolean).join(", ") || "Sin dirección"}</p>
            <p className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-slate-400" /> {client.industry || "Sin industria definida"}</p>
            <p className="flex items-center gap-2"><Receipt className="h-4 w-4 text-slate-400" /> {client.rut || "Sin RUT"}</p>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Notas</p>
              <p className="mt-2 leading-6">{client.notes || "Sin notas internas."}</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <FileText className="h-4 w-4 text-blue-600" />
                Cotizaciones
              </h2>
              <div className="mt-4 space-y-3">
                {quotes.length === 0 ? <p className="text-sm text-slate-500">Sin cotizaciones registradas.</p> : quotes.slice(0, 4).map((quote) => (
                  <Link key={quote.id} href={`/admin/cotizaciones/${quote.id}`} className="block rounded-2xl border border-slate-200 p-4 transition-colors hover:bg-slate-50">
                    <p className="text-sm font-semibold text-slate-900">{quote.displayNumber}</p>
                    <p className="mt-1 text-xs text-slate-500">{new Date(quote.issuedAt).toLocaleDateString("es-CL")} · {quote.status}</p>
                    <p className="mt-2 text-sm font-bold text-blue-700">{currencyCLP(quote.totalAmount)}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                <Workflow className="h-4 w-4 text-blue-600" />
                Proyectos y solicitudes
              </h2>
              <div className="mt-4 space-y-3">
                {projects.slice(0, 3).map((project) => (
                  <div key={project.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">{project.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{project.status || "Planificado"} · {project.serviceArea || "Sin área"}</p>
                    <p className="mt-2 text-sm text-slate-600">{project.startDate || "Sin fecha"} → {project.endDate || "Sin cierre"}</p>
                  </div>
                ))}
                {requests.slice(0, 3).map((request) => (
                  <div key={request.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">{request.subject}</p>
                    <p className="mt-1 text-xs text-slate-500">{request.channel || "Canal no definido"} · {request.status || "Abierta"}</p>
                    <p className="mt-2 text-sm text-slate-600">{request.description || "Sin detalle"}</p>
                  </div>
                ))}
                {projects.length === 0 && requests.length === 0 && (
                  <p className="text-sm text-slate-500">Sin proyectos ni solicitudes asociadas.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <CalendarClock className="h-4 w-4 text-blue-600" />
              Agenda y documentos
            </h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                {visits.length === 0 ? <p className="text-sm text-slate-500">Sin visitas registradas.</p> : visits.slice(0, 3).map((visit) => (
                  <div key={visit.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">{visit.status || "Programada"}</p>
                    <p className="mt-1 text-xs text-slate-500">{visit.date ? new Date(visit.date).toLocaleString("es-CL") : "Sin fecha"}</p>
                    <p className="mt-2 text-sm text-slate-600">{visit.notes || "Sin notas"}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {documents.length === 0 ? <p className="text-sm text-slate-500">Sin documentos tributarios asociados.</p> : documents.slice(0, 3).map((document) => (
                  <div key={document.id} className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-900">{document.type || "Documento"} {document.documentNumber ? `· ${document.documentNumber}` : ""}</p>
                    <p className="mt-1 text-xs text-slate-500">{document.status || "Registrado"} · {document.issueDate || "Sin fecha"}</p>
                    <p className="mt-2 text-sm font-bold text-blue-700">{currencyCLP(document.totalAmount || 0)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
