import Link from "next/link";
import { CircleAlert, MessagesSquare, Plus, ShieldAlert } from "lucide-react";
import { getRequests } from "@/lib/admin/repository";

export default async function SolicitudesPage() {
  const requests = (await getRequests()).slice().sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  const urgentCount = requests.filter((request) => request.priority === "Urgente").length;
  const openCount = requests.filter((request) => !request.status || ["Abierta", "En proceso"].includes(request.status)).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">CRM</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">Solicitudes del cliente</h1>
          <p className="mt-1 text-sm text-slate-500">{requests.length} requerimientos registrados · {openCount} abiertos</p>
        </div>
        <Link href="/admin/solicitudes/nuevo" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Nueva solicitud
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Abiertas", value: openCount, helper: "Pendientes o en proceso", icon: MessagesSquare },
          { label: "Urgentes", value: urgentCount, helper: "Requieren priorización", icon: ShieldAlert },
          { label: "Totales", value: requests.length, helper: "Historial completo", icon: CircleAlert },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700">
              <card.icon className="h-5 w-5" />
            </div>
            <p className="mt-4 text-2xl font-extrabold text-slate-900">{card.value}</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{card.label}</p>
            <p className="mt-1 text-xs text-slate-500">{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr_1fr] gap-4 border-b border-slate-100 bg-slate-50 px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
          <span>Solicitud</span>
          <span>Canal</span>
          <span>Prioridad</span>
          <span>Estado</span>
          <span>Vencimiento</span>
        </div>
        <div className="divide-y divide-slate-100">
          {requests.length === 0 ? (
            <div className="px-6 py-14 text-center text-sm text-slate-500">Sin solicitudes registradas.</div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="grid grid-cols-[1.8fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-4 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">{request.subject}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{request.description || "Sin descripción"}</p>
                </div>
                <div className="text-slate-600">{request.channel || "Web / interno"}</div>
                <div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{request.priority || "Normal"}</span></div>
                <div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{request.status || "Abierta"}</span></div>
                <div className="text-slate-600">{request.dueDate || "Sin fecha"}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
