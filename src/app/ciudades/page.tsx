import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { ubicaciones } from "@/data/ubicaciones";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Ciudades y comunas de Chile con cobertura local",
  description:
    "Zyteron atiende proyectos de desarrollo web, sistemas, automatización y soporte TI en Santiago y otras ciudades de Chile.",
  path: "/ciudades",
  noIndex: true,
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
            "Cobertura de Zyteron para proyectos digitales en Santiago y otras ciudades de Chile.",
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
            Atención en Chile
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Cobertura para proyectos digitales en Chile
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">
            Trabajamos de forma remota con empresas y pymes de distintas regiones, y coordinamos cada
            proyecto según su alcance, horarios y necesidades operativas. Nuestra base de atención está
            en Santiago, sin exigir reuniones presenciales para avanzar.
          </p>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="space-y-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Cobertura declarada</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Comunas y ciudades donde podemos atender
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              La ubicación no limita la evaluación inicial. Revisamos tu necesidad por videollamada,
              correo o WhatsApp y definimos una propuesta con entregables, plazos y responsables claros.
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
                  <span
                    key={ubicacion.slug}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    {ubicacion.nombre}
                  </span>
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
                  <span
                    key={ubicacion.slug}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                  >
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    {ubicacion.nombre}
                  </span>
                ))}
              </div>
            </article>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/desarrollo-web">
                Ver desarrollo web <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/contacto?origen=cobertura">Consultar por mi ubicación</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="card-premium grid gap-8 p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Evaluación inicial</p>
              <h2 className="text-3xl font-extrabold text-slate-900">El proyecto se define por necesidad, no por comuna</h2>
              <p className="leading-relaxed text-slate-600">
                Cuéntanos qué quieres vender, ordenar o automatizar. Te orientaremos hacia una página web,
                tienda online, sistema o servicio de soporte según el problema real de tu empresa.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href="/contacto?origen=cobertura">
                  Solicitar evaluación <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                <Link href="/servicios">Ver servicios</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
