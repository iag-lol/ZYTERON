import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye, LayoutTemplate } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Demos funcionales y casos de uso",
  description:
    "Explora demos funcionales de ZYTERON para empresas y pymes: tienda online, web corporativa, paneles administrativos y sistemas internos.",
  path: "/demos",
  keywords: [
    "demos desarrollo web chile",
    "demo panel administrativo",
    "casos de uso sistemas web",
    "demo tienda online chile",
  ],
});

const demoCards = [
  {
    title: "Demo tienda online",
    description: "Flujo de catálogo, carrito y estados de pedido para venta digital.",
    tech: "Catálogo, carrito, pagos, panel de pedidos",
  },
  {
    title: "Demo página corporativa",
    description: "Sitio institucional con propuesta de valor y captación comercial.",
    tech: "Home comercial, servicios, contacto, SEO base",
  },
  {
    title: "Demo catálogo de productos",
    description: "Publicación ordenada de productos con fichas y canal de contacto.",
    tech: "Categorías, filtros, fichas técnicas",
  },
  {
    title: "Demo sistema de reservas",
    description: "Agenda de servicios con control de disponibilidad y estados.",
    tech: "Reservas, confirmaciones, historial",
  },
  {
    title: "Demo cotizador con PDF",
    description: "Cotización guiada con resumen financiero y generación de PDF.",
    tech: "Formulario, cálculo, exportación PDF",
  },
  {
    title: "Demo panel administrativo",
    description: "Panel interno para gestionar contenido, productos y usuarios.",
    tech: "CRUD, permisos, dashboard",
  },
  {
    title: "Demo control de flota",
    description: "Control operacional de vehículos, mantenimientos y reportes.",
    tech: "Bitácora, alertas, métricas",
  },
  {
    title: "Demo control de combustible",
    description: "Seguimiento de cargas, costos y rendimiento por unidad.",
    tech: "Registros, análisis y reportes",
  },
  {
    title: "Demo sistema interno para empresas",
    description: "Automatización de procesos administrativos y operativos.",
    tech: "Formularios, flujos internos, control",
  },
  {
    title: "Demo landing page comercial",
    description: "Landing enfocada en captar solicitudes de cotización.",
    tech: "Copy comercial, CTA, formulario",
  },
];

export default function DemosPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="demos-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/demos",
          title: "Demos funcionales y casos de uso",
          description: "Catálogo de demos funcionales para evaluación comercial de proyectos.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Demos", path: "/demos" },
          ],
        })}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Portafolio de referencia
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Demos funcionales para evaluar soluciones reales
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            Cada tarjeta corresponde a un demo funcional. Se usan para revisar estructura, flujo y capacidades antes de cotizar.
          </p>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {demoCards.map((demo) => (
            <article key={demo.title} className="card-premium overflow-hidden">
              <div className="bg-grid-light border-b border-slate-200 p-5">
                <div className="flex aspect-[16/9] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/80">
                  <div className="text-center">
                    <LayoutTemplate className="mx-auto h-6 w-6 text-blue-700" />
                    <p className="mt-2 text-xs font-bold uppercase tracking-widest text-blue-700">Demo funcional</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 p-5">
                <h2 className="text-base font-bold text-slate-900">{demo.title}</h2>
                <p className="text-sm text-slate-600">{demo.description}</p>
                <p className="text-xs text-slate-500">{demo.tech}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button asChild size="sm" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                    <Link href="/contacto?origen=demo">
                      <Eye className="h-4 w-4" /> Ver demo
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="bg-blue-700 text-white hover:bg-blue-800">
                    <Link href={`/contacto?origen=demo&item=${encodeURIComponent(demo.title)}`}>
                      Cotizar algo similar
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="rounded-2xl section-blue p-8 text-center text-white">
          <h2 className="text-2xl font-extrabold sm:text-3xl">¿Quieres una versión adaptada a tu negocio?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">
            Revisamos tus requerimientos y te proponemos una implementación por etapas, con cotización formal.
          </p>
          <Button asChild size="lg" className="mt-5 bg-white font-bold text-blue-800 hover:bg-blue-50">
            <Link href="/paquetes">
              Solicitar cotización <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Container>
      </section>
    </main>
  );
}
