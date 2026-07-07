import { Metadata } from "next";
import Link from "next/link";
import { Inbox, Mail, Search } from "lucide-react";
import { getBecasSupabaseClient } from "@/lib/becas/supabase-client";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { BecasHeader } from "../_components/becas-nav";
import { ScholarshipStatusBadge, scholarshipStatusLabel } from "../_components/status-badge";

export const metadata: Metadata = {
  title: "Participantes | Becas Web Pyme",
};

export const dynamic = "force-dynamic";

const nf = new Intl.NumberFormat("es-CL");
const dateFmt = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type ParticipantRow = {
  id: string;
  application_code: string;
  full_name: string;
  business_name: string;
  email: string;
  whatsapp: string | null;
  region: string | null;
  comuna: string | null;
  industry: string | null;
  status: string;
  submitted_at: string | null;
  public_gallery_consent: boolean | null;
  public_instagram_consent: boolean | null;
  marketing_consent: boolean | null;
};

type PageProps = {
  searchParams: Promise<{ estado?: string; q?: string }>;
};

function ConsentDot({ granted, label }: { granted: boolean; label: string }) {
  return (
    <span
      title={`${label}: ${granted ? "sí" : "no"}`}
      className={`inline-block h-2 w-2 rounded-full ${granted ? "bg-emerald-500" : "bg-slate-200"}`}
    />
  );
}

export default async function AdminParticipantesPage({ searchParams }: PageProps) {
  const { estado, q } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";

  const supabase = getBecasSupabaseClient();
  const { data } = await supabase
    .from("scholarship_applications")
    .select(
      "id, application_code, full_name, business_name, email, whatsapp, region, comuna, industry, status, submitted_at, public_gallery_consent, public_instagram_consent, marketing_consent",
    )
    .order("submitted_at", { ascending: false });

  const all = (data as ParticipantRow[] | null) ?? [];

  const statusCounts = new Map<string, number>();
  for (const row of all) {
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  }

  const filtered = all.filter((row) => {
    if (estado && row.status !== estado) return false;
    if (!query) return true;
    return [row.application_code, row.full_name, row.business_name, row.email]
      .filter(Boolean)
      .some((field) => field.toLowerCase().includes(query));
  });

  const chipHref = (status?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("estado", status);
    if (q) params.set("q", q);
    const suffix = params.toString();
    return suffix ? `/admin/becas/participantes?${suffix}` : "/admin/becas/participantes";
  };

  return (
    <div className="space-y-6">
      <BecasHeader
        active="participantes"
        title="Participantes"
        description="Todas las postulaciones recibidas, con filtros por estado y búsqueda."
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={chipHref()}
            className={
              !estado
                ? "rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white"
                : "rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            }
          >
            Todas · {nf.format(all.length)}
          </Link>
          {[...statusCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => (
              <Link
                key={status}
                href={chipHref(status)}
                className={
                  estado === status
                    ? "rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white"
                    : "rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                }
              >
                {scholarshipStatusLabel(status)} · {nf.format(count)}
              </Link>
            ))}
        </div>

        <form method="GET" className="relative">
          {estado ? <input type="hidden" name="estado" value={estado} /> : null}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por negocio, nombre, email o código…"
            className="w-72 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </form>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Negocio</th>
                <th className="px-5 py-3">Representante</th>
                <th className="px-5 py-3">Ubicación</th>
                <th className="px-5 py-3" title="Consentimientos: vitrina, Instagram, marketing">
                  Consent.
                </th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Fecha</th>
                <th className="px-5 py-3 text-right">Contacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((row) => {
                const waDigits = row.whatsapp?.replace(/\D/g, "") ?? "";
                return (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-700">
                          {row.business_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">{row.business_name}</p>
                          <p className="truncate text-xs text-slate-500">
                            {row.industry ?? "Sin rubro"} ·{" "}
                            <span className="font-mono text-[11px]">{row.application_code}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-700">{row.full_name}</p>
                      <p className="truncate text-xs text-slate-500">{row.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <p>{row.comuna ?? "—"}</p>
                      <p className="text-xs text-slate-400">{row.region ?? ""}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <ConsentDot granted={Boolean(row.public_gallery_consent)} label="Vitrina pública" />
                        <ConsentDot granted={Boolean(row.public_instagram_consent)} label="Instagram" />
                        <ConsentDot granted={Boolean(row.marketing_consent)} label="Marketing" />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <ScholarshipStatusBadge status={row.status} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-slate-500">
                      {row.submitted_at ? dateFmt.format(new Date(row.submitted_at)) : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`mailto:${row.email}`}
                          title={`Escribir a ${row.email}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-blue-300 hover:text-blue-600"
                        >
                          <Mail className="h-4 w-4" />
                        </a>
                        {waDigits ? (
                          <a
                            href={`https://wa.me/${waDigits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`WhatsApp ${row.whatsapp}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-emerald-300 hover:text-emerald-600"
                          >
                            <WhatsAppIcon className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <Inbox className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              {all.length === 0
                ? "Aún no hay postulaciones registradas."
                : "Ninguna postulación coincide con los filtros aplicados."}
            </p>
            {all.length > 0 ? (
              <Link
                href="/admin/becas/participantes"
                className="mt-2 inline-block text-xs font-bold text-blue-600 hover:text-blue-500"
              >
                Limpiar filtros
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs font-medium text-slate-500">
            Mostrando {nf.format(filtered.length)} de {nf.format(all.length)} postulaciones
          </div>
        )}
      </div>
    </div>
  );
}
