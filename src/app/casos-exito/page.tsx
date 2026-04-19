import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, MapPin } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { caseStudies } from "@/content/case-studies";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Casos de éxito de diseño y desarrollo web en Chile",
  description:
    "Revisa casos de éxito modelo de proyectos web B2B en Chile: arquitectura SEO, conversión y mejoras técnicas aplicadas en escenarios reales.",
  path: "/casos-exito",
  keywords: ["casos de exito diseno web chile", "proyectos web b2b", "agencia diseno web chile"],
});

export default function CasosExitoPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="casos-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/casos-exito",
          title: "Casos de éxito de diseño y desarrollo web en Chile",
          description:
            "Hub de casos de éxito modelo para empresas B2B en Chile.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Casos de éxito", path: "/casos-exito" },
          ],
        })}
      />
      <JsonLd
        id="casos-itemlist-schema"
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: caseStudies.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.title,
            url: `https://www.zyteron.cl/casos-exito/${item.slug}`,
          })),
        }}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="relative z-10 space-y-5">
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Casos de éxito
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Casos de éxito modelo para empresas que buscan resultados reales en Chile
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">
            Compartimos casos anonimizados con enfoque técnico y comercial para mostrar cómo se resuelven
            problemas reales de posicionamiento, confianza y generación de leads.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            {caseStudies.map((caseStudy) => (
              <article key={caseStudy.slug} className="card-premium flex flex-col p-6">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    <Briefcase className="h-3.5 w-3.5" />
                    {caseStudy.industry}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    <MapPin className="h-3.5 w-3.5" />
                    {caseStudy.location}
                  </span>
                </div>
                <h2 className="mb-2 text-xl font-extrabold text-slate-900">{caseStudy.title}</h2>
                <p className="mb-4 text-sm leading-relaxed text-slate-600">{caseStudy.summary}</p>
                <ul className="mb-5 space-y-1.5 text-xs text-slate-600">
                  {caseStudy.outcomes.slice(0, 3).map((outcome) => (
                    <li key={outcome} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {outcome}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-auto border-slate-300 text-slate-800 hover:bg-slate-50">
                  <Link href={`/casos-exito/${caseStudy.slug}`}>
                    Ver caso completo <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">
                Solicitar propuesta <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/servicios">Ver servicios estratégicos</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
