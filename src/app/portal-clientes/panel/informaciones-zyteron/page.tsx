import Link from "next/link";
import { ExternalLink, FileText, Scale, ShieldCheck } from "lucide-react";
import { requirePortalSession } from "@/lib/auth/portal-session";
import {
  privacyIntro,
  privacyLastUpdated,
  privacySections,
} from "@/app/privacidad/page";
import {
  termsCompanyInfo,
  termsExtraNotes,
  termsIntro,
  termsLastUpdated,
  termsSections,
} from "@/app/terminos/page";

export default async function PortalInformacionesZyteronPage() {
  await requirePortalSession();

  return (
    <section className="space-y-5">
      <div className="portal-card-premium p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Informaciones Zyteron
            </div>
            <h2 className="mt-3 text-xl font-extrabold text-slate-900 sm:text-2xl">
              Documentación legal e informativa vigente
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Aquí puedes revisar la información activa publicada en Zyteron sobre privacidad de datos y condiciones de servicio. El contenido se muestra con el mismo enfoque legal e informativo de la web pública.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <Scale className="h-3.5 w-3.5" />
            Contenido vigente
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-600">
                  <FileText className="h-3.5 w-3.5" />
                  Política de privacidad
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{privacyIntro}</p>
              </div>
              <Link
                href="/privacidad"
                target="_blank"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Ver página
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="max-h-[880px] space-y-4 overflow-y-auto px-6 py-5">
            {privacySections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-extrabold text-slate-900">{section.title}</h3>
                <div className="mt-3 space-y-2">
                  {section.points.map((point) => (
                    <div key={point} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                      <p>{point}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-4 text-xs font-medium text-slate-500">
            Última actualización: {privacyLastUpdated}.
          </div>
        </article>

        <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-slate-600">
                  <Scale className="h-3.5 w-3.5" />
                  Términos y condiciones
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{termsIntro}</p>
              </div>
              <Link
                href="/terminos"
                target="_blank"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                Ver página
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="max-h-[880px] space-y-4 overflow-y-auto px-6 py-5">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-extrabold text-slate-900">Datos corporativos</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {termsCompanyInfo.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {termsSections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-extrabold text-slate-900">{section.title}</h3>
                <div className="mt-3 space-y-2">
                  {section.points.map((point, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                      <div>{point}</div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <h3 className="text-sm font-extrabold text-slate-900">Notas operativas complementarias</h3>
              <div className="mt-3 space-y-2">
                {termsExtraNotes.map((note) => (
                  <div key={note} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                    <p>{note}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-4 text-xs font-medium text-slate-500">
            Última actualización: {termsLastUpdated}.
          </div>
        </article>
      </div>
    </section>
  );
}
