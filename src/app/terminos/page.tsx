import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import {
  termsCompanyInfo,
  termsExtraNotes,
  termsIntro,
  termsLastUpdated,
  termsSections,
} from "@/content/legal-documents";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Políticas y condiciones de servicio",
  description:
    "Políticas y condiciones de servicio de ZYTERON SpA para desarrollo web, software, soporte técnico, pagos, revisiones, garantía y propiedad intelectual.",
  path: "/terminos",
  noIndex: true,
});

export default function TerminosPage() {
  return (
    <main className="bg-white py-16">
      <Container className="max-w-5xl space-y-8">
        <div className="space-y-4">
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Documento corporativo
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Políticas y condiciones de servicio
          </h1>
          <p className="max-w-4xl text-sm leading-7 text-slate-600 sm:text-base">
            {termsIntro.split("ZYTERON SpA").map((part, index, array) => (
              <span key={index}>
                {part}
                {index < array.length - 1 ? <strong>ZYTERON SpA</strong> : null}
              </span>
            ))}
          </p>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            {termsCompanyInfo.map((item) => (
              <div key={item.label}>
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-5">
          {termsSections.map((section) => (
            <section key={section.title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-900">{section.title}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                {section.points.map((point, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    <p>{point}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="rounded-[2rem] border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900">Notas operativas complementarias</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-slate-700">
            {termsExtraNotes.map((note) => (
              <div key={note} className="flex items-start gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                <p>{note}</p>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-slate-500">Última actualización: {termsLastUpdated}.</p>
      </Container>
    </main>
  );
}
