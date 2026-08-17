import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Clock3, Globe, Mail, MapPin, Phone, User } from "lucide-react";

import { getCompany, getCompanyTimeline } from "@/lib/sales-ai/repository";
import { SALES_STATUS_LABELS } from "@/lib/sales-ai/types";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

export default async function ProspectoDetallePage({ params }: PageProps) {
  const { id } = await params;

  const company = await getCompany(id).catch(() => null);
  if (!company) notFound();

  const timeline = await getCompanyTimeline(id, 100).catch(() => []);

  const fields: Array<{ label: string; value: string | null | undefined; icon?: React.ReactNode }> = [
    { label: "Razón social", value: company.legal_name },
    { label: "RUT", value: company.tax_id },
    { label: "Rubro", value: company.industry },
    { label: "Comuna / Región", value: [company.commune, company.region].filter(Boolean).join(" · ") || null,
      icon: <MapPin className="h-3.5 w-3.5" /> },
    { label: "Sitio web", value: company.website, icon: <Globe className="h-3.5 w-3.5" /> },
    { label: "Email", value: company.primary_email, icon: <Mail className="h-3.5 w-3.5" /> },
    { label: "Teléfono", value: company.phone, icon: <Phone className="h-3.5 w-3.5" /> },
    { label: "WhatsApp", value: company.whatsapp },
    { label: "Contacto", value: company.contact_name, icon: <User className="h-3.5 w-3.5" /> },
    { label: "Cargo", value: company.contact_role },
    { label: "Origen", value: company.source },
    { label: "Responsable", value: company.owner_user },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/ventas-ia/prospectos"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a prospectos
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <Building2 className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">{company.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
                {SALES_STATUS_LABELS[company.status] ?? company.status}
              </span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                Potencial {company.potential}
              </span>
              {company.do_not_contact ? (
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">
                  NO CONTACTAR
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {company.potential_value ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs font-semibold text-slate-500">Valor potencial</p>
            <p className="text-lg font-extrabold text-slate-900">
              ${Number(company.potential_value).toLocaleString("es-CL")}
            </p>
          </div>
        ) : null}
      </header>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-sm font-extrabold text-slate-900">Ficha de la empresa</h2>
            <dl className="mt-3 space-y-2.5">
              {fields.map((field) => (
                <div key={field.label} className="flex items-start justify-between gap-3 text-sm">
                  <dt className="flex items-center gap-1.5 text-slate-500">
                    {field.icon}
                    {field.label}
                  </dt>
                  <dd className="max-w-[60%] break-words text-right font-semibold text-slate-800">
                    {field.value || "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {company.detected_problem || company.recommended_service ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-extrabold text-slate-900">Diagnóstico comercial</h2>
              {company.detected_problem ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500">Problema detectado</p>
                  <p className="mt-1 text-sm text-slate-700">{company.detected_problem}</p>
                </div>
              ) : null}
              {company.recommended_service ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-slate-500">Servicio recomendado</p>
                  <p className="mt-1 text-sm text-slate-700">{company.recommended_service}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {company.notes ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-extrabold text-slate-900">Notas</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{company.notes}</p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <Clock3 className="h-4 w-4" /> Historial completo
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Registro append-only. No se borra al cambiar de estado.
          </p>

          {timeline.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Sin eventos registrados todavía.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {timeline.map((event) => (
                <li key={event.id} className="relative border-l-2 border-slate-200 pl-4">
                  <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-blue-600" />
                  <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                  {event.detail ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{event.detail}</p>
                  ) : null}
                  <p className="mt-1 text-[11px] text-slate-400">
                    {formatDateTime(event.created_at)} ·{" "}
                    {event.is_automated ? event.actor || "SISTEMA" : `${event.actor} (manual)`}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
