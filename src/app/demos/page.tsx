import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { DemosGrid } from "@/components/demos/demos-grid";
import { PLAN_PRICE_AMOUNTS } from "@/config/pricing";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

/** Formato visible de precios en demos: "Desde $XXX.XXX CLP + IVA", con montos desde pricing.ts. */
function demoPrice(planId: keyof typeof PLAN_PRICE_AMOUNTS) {
  return `Desde $${new Intl.NumberFormat("es-CL").format(PLAN_PRICE_AMOUNTS[planId])} CLP + IVA`;
}

export const metadata: Metadata = createPageMetadata({
  title: "Ejemplos y demos de páginas web",
  description:
    "Mira ejemplos de páginas web que desarrollamos para empresas y pymes: sitios corporativos, tiendas online y plataformas, para imaginar cómo puede quedar la tuya.",
  path: "/demos",
});

const demoCards = [
  {
    title: "Demo tienda online de ropa",
    description:
      "Tienda online profesional para marcas de ropa: diseño moderno, catálogo, carrito y estructura preparada para pagos online.",
    tech: `${demoPrice("ecommerce")} · Responsive · Catálogo · Carrito · Pagos online según requerimiento`,
    demoHref: "https://iag-lol.github.io/tienda.mck/",
    priceFrom: demoPrice("ecommerce"),
    gallery: [
      "/demos/tienda-ropa/tienda-ropa-01.png",
      "/demos/tienda-ropa/tienda-ropa-02.png",
      "/demos/tienda-ropa/tienda-ropa-03.png",
      "/demos/tienda-ropa/tienda-ropa-04.png",
    ],
    includes: [
      "Diseño personalizado",
      "Catálogo de productos",
      "Carrito de compra",
      "Vista responsive para celular",
      "Estructura preparada para pagos online",
      "Demo visual para mostrar productos",
      "Panel administrativo según requerimiento",
    ],
    note: "Precio final según funciones, cantidad de productos, medios de pago e integraciones.",
  },
  {
    title: "Demo estudio jurídico",
    description:
      "Sitio profesional para estudios jurídicos: servicios legales, perfil de abogados, áreas de práctica y captación de consultas.",
    tech: "Web corporativa legal · Formularios de consulta · SEO local · Diseño responsive",
    demoHref: "https://iag-lol.github.io/abogados.mck/",
    gallery: [
      "/demos/estudio-juridico/estudio-juridico-01.png",
      "/demos/estudio-juridico/estudio-juridico-02.png",
      "/demos/estudio-juridico/estudio-juridico-03.png",
      "/demos/estudio-juridico/estudio-juridico-04.png",
    ],
    includes: [
      "Diseño profesional para rubro legal",
      "Secciones de áreas de práctica y servicios",
      "Perfil de abogados y equipo",
      "Formulario de contacto y consulta",
      "Botón directo a WhatsApp",
      "Vista responsive para celular, tablet y computador",
      "Estructura base SEO para posicionamiento local",
    ],
    note: "Precio final según estructura, secciones, formularios, automatizaciones e integraciones requeridas.",
  },
  {
    title: "Demo plataforma de cursos con videos",
    description:
      "Plataforma web para publicar cursos de cualquier rubro: presentación de programas, lecciones en video y captación de nuevos alumnos.",
    tech: `${demoPrice("empresa")} · Plataforma de cursos · Lecciones en video · Responsive · Escalable`,
    demoHref: "https://iag-lol.github.io/cursos.mck/",
    priceFrom: demoPrice("empresa"),
    galleryPending: true,
    includes: [
      "Landing profesional para vender cursos",
      "Sección de catálogo o programas formativos",
      "Módulos con lecciones en video embebidas",
      "Vista responsive para celular, tablet y computador",
      "Estructura preparada para escalar a múltiples cursos",
      "Formulario de contacto o inscripción",
      "Base para integrar panel administrativo según requerimiento",
    ],
    note: "Precio final según cantidad de cursos, estructura académica, integraciones y nivel de automatización solicitado.",
  },
];

export default function DemosPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="demos-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/demos",
          title: "Ejemplos y demos de páginas web",
          description: "Ejemplos navegables de páginas web desarrolladas por Zyteron para evaluar un proyecto antes de cotizar.",
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
            Ejemplos de páginas web que hemos desarrollado
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            Cada tarjeta es un demo funcional que puedes abrir y navegar. Sirven para imaginar cómo
            puede quedar la página web de tu empresa antes de cotizar.
          </p>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container>
          <DemosGrid demos={demoCards} />
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="rounded-2xl section-blue p-8 text-center text-white">
          <h2 className="text-2xl font-extrabold sm:text-3xl">¿Quieres una versión adaptada a tu negocio?</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">
            Revisamos tus requerimientos y te proponemos una implementación por etapas, con cotización formal.
          </p>
          <Button asChild size="lg" className="mt-5 bg-white font-bold text-blue-800 hover:bg-blue-50">
            <Link href="/cotizador">
              Cotizar mi página web <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Container>
      </section>
    </main>
  );
}
