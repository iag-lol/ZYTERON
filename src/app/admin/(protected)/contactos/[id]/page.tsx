import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, Mail, MessageSquareText, Phone } from "lucide-react";
import { parseContactLeadDetails } from "@/lib/admin/contact-lead";
import { safeSelectSingle, type Lead } from "@/lib/admin/repository";

function value(input?: string | null) {
  return input?.trim() || "No informado";
}

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await safeSelectSingle<Lead>(
    "Lead",
    "id,name,email,phone,source,message,type,status,createdAt",
    { id },
  );
  if (!lead) notFound();

  const details = parseContactLeadDetails(lead.message);
  const facts = [
    ["Empresa", details.company],
    ["Servicio", details.service || details.projectType],
    ["Presupuesto", details.budget || details.budgetRange],
    ["Fecha esperada", details.expectedDate],
  ].filter((item) => item[1]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/admin/contactos" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700">
        <ArrowLeft className="h-4 w-4" /> Volver a contactos
      </Link>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Ficha de contacto</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{value(lead.name)}</h1>
          <p className="mt-1 text-sm text-slate-500">{value(lead.source || lead.type)}</p>
        </header>

        <div className="grid gap-3 p-6 sm:grid-cols-2">
          {[
            { label: "Correo", text: lead.email, icon: Mail },
            { label: "Teléfono", text: lead.phone, icon: Phone },
            { label: "Empresa", text: details.company, icon: Building2 },
            { label: "Recibido", text: lead.createdAt ? new Date(lead.createdAt).toLocaleString("es-CL") : null, icon: CalendarDays },
          ].map((item) => (
            <div key={item.label} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value(item.text)}</p>
              </div>
            </div>
          ))}
        </div>

        {facts.length > 0 && (
          <dl className="grid gap-4 border-t border-slate-100 px-6 py-5 sm:grid-cols-2">
            {facts.map(([label, text]) => (
              <div key={label}>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{text}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="border-t border-slate-100 px-6 py-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <MessageSquareText className="h-4 w-4" /> Mensaje recibido
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
            {value(details.brief || details.rawMessage)}
          </p>
        </div>
      </section>
    </div>
  );
}
