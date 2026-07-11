import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { localPages } from "@/content/local-pages";
import { ubicaciones } from "@/data/ubicaciones";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Ciudades y comunas de Chile con cobertura local",
  description:
    "Hub local de Zyteron con comunas de Santiago y ciudades de Chile enlazadas a páginas activas de desarrollo web, sistemas, soporte TI y soluciones digitales.",
  path: "/ciudades",
});

const regionMetropolitana = ubicaciones.filter((ubicacion) => ubicacion.region === "Región Metropolitana");
const ciudadesChile = ubicaciones.filter((ubicacion) => ubicacion.region !== "Región Metropolitana");

export default function CiudadesPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="ciudades-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/ciudades",
          title: "Ciudades y comunas de Chile con cobertura local",
          description:
            "Hub de páginas locales de Zyteron para posicionamiento comercial por comuna y ciudad en Chile.",
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
            Comunas y ciudades de Chile con páginas locales activas
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">
            Esta pestaña concentra el enlazado interno hacia ubicaciones activas de Zyteron para que
            Google y los usuarios encuentren cobertura local real. Aquí reunimos comunas de Santiago y
            ciudades estratégicas del país con acceso directo a páginas locales de servicio.
          </p>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="space-y-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Cobertura indexable</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Explora todas las comunas y ciudades activas
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              Cada botón abre una landing local activa de desarrollo web. Desde esas páginas también se
              puede derivar a diseño web, páginas para pymes, soporte TI y sistemas web según la necesidad
              del negocio.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <article className="card-premium p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Región Metropolitana</p>
                  <h3 className="text-2xl font-extrabold text-slate-900">Comunas y Santiago</h3>
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {regionMetropolitana.length} ubicaciones
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {regionMetropolitana.map((ubicacion) => (
                  <Button
                    key={ubicacion.slug}
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-auto rounded-full border-slate-200 bg-white px-3 py-2 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                  >
                    <Link href={`/desarrollo-web/${ubicacion.slug}`}>
                      <MapPin className="h-3.5 w-3.5" />
                      {ubicacion.nombre}
                    </Link>
                  </Button>
                ))}
              </div>
            </article>

            <article className="card-premium p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Cobertura nacional</p>
                  <h3 className="text-2xl font-extrabold text-slate-900">Ciudades de Chile</h3>
                </div>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {ciudadesChile.length} ubicaciones
                </span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {ciudadesChile.map((ubicacion) => (
                  <Button
                    key={ubicacion.slug}
                    asChild
                    variant="outline"
                    size="sm"
                    className="h-auto rounded-full border-slate-200 bg-white px-3 py-2 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                  >
                    <Link href={`/desarrollo-web/${ubicacion.slug}`}>
                      <MapPin className="h-3.5 w-3.5" />
                      {ubicacion.nombre}
                    </Link>
                  </Button>
                ))}
              </div>
            </article>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/desarrollo-web">
                Ver servicio base <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/contacto">Solicitar cobertura para otra ubicación</Link>
            </Button>
          </div>
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
