import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { caseStudies } from "@/content/case-studies";
import { buildAbsoluteUrl, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Casos de Éxito Anónimos | Sistemas Web, SEO y Soluciones Digitales",
  description:
    "Casos anónimos de Zyteron: sistemas web, control de flota, asistencia, inventario, tickets, cotizaciones PDF, tiendas online y SEO para empresas en Chile.",
  path: "/casos-exito",
  keywords: [
    "casos de éxito desarrollo web chile",
    "sistemas web para empresas",
    "software a medida chile",
    "casos anonimos zyteron",
  ],
});

function buildCaseStudiesItemListJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${buildAbsoluteUrl("/casos-exito")}#case-studies`,
    name: "Casos anónimos de soluciones digitales Zyteron",
    itemListElement: caseStudies.map((caseStudy, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Article",
        name: caseStudy.title,
        headline: caseStudy.title,
        description: caseStudy.summary,
        url: buildAbsoluteUrl(`/casos-exito/${caseStudy.slug}`),
        datePublished: caseStudy.publishedAt,
        dateModified: caseStudy.updatedAt ?? caseStudy.publishedAt,
      },
    })),
  };
}

const businessSignals = [
  "Casos anonimizados para proteger información comercial y operativa de clientes.",
  "Proyectos orientados a procesos reales: registros, KPIs, SLA, control, reportes y trazabilidad.",
  "Soluciones aplicadas en web corporativa, sistemas internos, ecommerce, flota, inventario y operación en terreno.",
  "No se publican métricas confidenciales ni nombres de clientes sin autorización.",
];

export default function CasosExitoPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="casos-exito-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/casos-exito",
          title: "Casos de éxito anónimos de Zyteron",
          description:
            "Casos documentados de sistemas web, automatización, tiendas online, SEO y soluciones digitales para empresas en Chile.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Casos de éxito", path: "/casos-exito" },
          ],
        })}
      />
      <JsonLd id="casos-exito-itemlist-schema" data={buildCaseStudiesItemListJsonLd()} />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5 text-center">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-blue-700">
              Inicio
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-700">Casos de éxito</span>
          </nav>
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Proyectos documentados
          </div>
          <h1 className="mx-auto max-w-5xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Casos de éxito anónimos en desarrollo web, sistemas digitales y automatización para empresas
          </h1>
          <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Estos casos muestran problemas reales resueltos con tecnología: procesos en papel, falta de control,
            inventario desordenado, documentación de flota, tickets georreferenciados, cotizaciones PDF, ecommerce y SEO.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">
                Cotizar una solución similar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/servicios">Ver servicios</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="section-alt py-12">
        <Container className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {businessSignals.map((signal) => (
            <div key={signal} className="card-premium flex items-start gap-3 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              <p className="text-sm leading-relaxed text-slate-700">{signal}</p>
            </div>
          ))}
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-8">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Evidencia comercial</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Problemas reales transformados en sistemas, datos y control
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Cada caso está estructurado con problema, objetivos, solución, implementación, resultados esperados y KPIs posibles.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {caseStudies.map((caseStudy) => (
              <article key={caseStudy.slug} className="card-premium flex flex-col p-6">
                <div className="mb-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {caseStudy.industry}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                    {caseStudy.location}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold leading-snug text-slate-900">{caseStudy.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{caseStudy.summary}</p>
                <div className="mt-4 space-y-2">
                  {caseStudy.outcomes.slice(0, 2).map((outcome) => (
                    <div key={outcome} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>{outcome}</span>
                    </div>
                  ))}
                </div>
                <Button asChild variant="outline" className="mt-5 border-slate-300 text-slate-800 hover:bg-slate-50">
                  <Link href={`/casos-exito/${caseStudy.slug}`}>
                    Ver caso documentado <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">KPIs y control</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              La diferencia no está solo en programar, está en ordenar datos para decidir mejor
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              Varios proyectos parten como formularios o páginas internas, pero el valor aparece cuando esos registros se convierten en historial, indicadores, pendientes, alertas, reportes y trazabilidad.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Registros digitales limpios",
              "KPIs operativos",
              "SLA y tiempos de respuesta",
              "Inventario y ventas",
              "Documentación y vencimientos",
              "Tickets con foto y ubicación",
            ].map((item) => (
              <div key={item} className="card-premium flex items-center gap-3 p-4">
                <BarChart3 className="h-5 w-5 text-blue-700" />
                <p className="text-sm font-semibold text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="rounded-2xl section-blue p-8 text-center text-white md:p-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">¿Tienes un proceso parecido que hoy se hace en papel, Excel o WhatsApp?</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-blue-100 sm:text-base">
            Podemos ayudarte a convertirlo en una aplicación, sistema web o flujo digital con registros claros, control y datos para tomar mejores decisiones.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white font-bold text-blue-800 hover:bg-blue-50">
              <Link href="/contacto">Solicitar evaluación</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 text-white hover:bg-white/10 hover:text-white">
              <Link href="/sistemas-web">Ver sistemas web</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
