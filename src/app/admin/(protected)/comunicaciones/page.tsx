import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { MessageSquare, ArrowRight, Search, SendHorizontal, Inbox } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCommunicationsPage() {
  const communications = await prisma.clientCommunication.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="relative px-6 py-6 md:px-7">
          <div className="pointer-events-none absolute right-2 top-1 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Soporte y Atención</p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900 md:text-3xl">Bandeja de Entrada</h1>
              <p className="mt-1 text-sm text-slate-600">
                Todos los mensajes enviados y recibidos desde el Portal de Clientes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Buscar mensaje..."
                  className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {communications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
              <Inbox className="h-8 w-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Bandeja vacía</h3>
            <p className="mt-1 text-sm text-slate-500">Aún no hay mensajes registrados en el sistema.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {communications.map((comm) => {
              const isInbound = comm.direction === "INBOUND";
              return (
                <div key={comm.id} className="group relative flex gap-4 p-4 hover:bg-slate-50 sm:p-5 transition-colors">
                  <div className="flex-shrink-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      isInbound ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                    }`}>
                      {isInbound ? <MessageSquare className="h-5 w-5" /> : <SendHorizontal className="h-5 w-5" />}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-semibold text-slate-900 truncate">
                          {comm.user.name}
                        </span>
                        {comm.user.company && (
                          <span className="hidden sm:inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            {comm.user.company}
                          </span>
                        )}
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          {isInbound ? "• Recibido" : "• Enviado"}
                        </span>
                      </div>
                      <time className="whitespace-nowrap text-xs text-slate-500">
                        {formatDistanceToNow(comm.createdAt, { addSuffix: true, locale: es })}
                      </time>
                    </div>
                    
                    <p className="mt-1 text-sm font-medium text-slate-800 truncate">
                      {comm.subject}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500 leading-relaxed">
                      {comm.message}
                    </p>
                    
                    <div className="mt-3 flex items-center gap-3">
                      <Link 
                        href={`/admin/portal-clientes/${comm.user.id}#comunicaciones`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        {isInbound ? "Responder al cliente" : "Ver conversación"}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
