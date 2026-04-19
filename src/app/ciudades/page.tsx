import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { localPages } from "@/content/local-pages";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Diseño web por ciudad en Chile",
  description:
    "Páginas locales de diseño y desarrollo web para empresas en Chile. Cobertura inicial: Santiago, Viña del Mar y Concepción.",
  path: "/ciudades",
  keywords: ["diseño web chile ciudades", "agencia web regional", "seo local chile"],
});

export default function CiudadesPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="ciudades-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/ciudades",
          title: "Diseño web por ciudad en Chile",
          description:
            "Hub de páginas locales de Zyteron para posicionamiento comercial por ciudad en Chile.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Ciudades", path: "/ciudades" },
          ],
        })}
      />
      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="relative z-10 space-y-5">
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            SEO local Chile
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Diseño web por ciudad para captar demanda local de alto valor
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">
            No creamos landings masivas sin diferenciación. Priorizamos ciudades con demanda real y
            contenido local útil para evitar páginas doorway y canibalización.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-8">
          <div className="grid gap-4 md:grid-cols-3">
            {localPages.map((page) => (
              <article key={page.slug} className="card-premium flex flex-col p-6">
                <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  <MapPin className="h-3.5 w-3.5" />
                  {page.city}
                </div>
                <h2 className="mb-2 text-xl font-extrabold text-slate-900">{page.city}</h2>
                <p className="mb-4 text-sm text-slate-600">{page.heroDescription}</p>
                <ul className="mb-5 space-y-2 text-xs text-slate-600">
                  {page.opportunities.slice(0, 2).map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="mt-auto border-slate-300 text-slate-800 hover:bg-slate-50">
                  <Link href={`/ciudades/${page.slug}`}>
                    Ver estrategia local <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">
                Solicitar plan local <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/servicios">Ver servicios principales</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
