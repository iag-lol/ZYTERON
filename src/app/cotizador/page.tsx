import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { CommercialQuoteBuilder } from "@/components/forms/commercial-quote-builder";

export const metadata: Metadata = createPageMetadata({
  title: "Cotizador web para empresas en Chile",
  description:
    "Completa el cotizador de Zyteron para solicitar una propuesta de desarrollo web, sistemas, automatización o soporte con contexto comercial claro.",
  path: "/cotizador",
});

export default function CotizadorPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="cotizador-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/cotizador",
          title: "Cotizador web para empresas",
          description:
            "Formulario de cotización de Zyteron para levantar necesidades reales y orientar una propuesta comercial.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Cotizador", path: "/cotizador" },
          ],
        })}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Cotizador comercial
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Cuéntanos qué proyecto necesitas cotizar
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            Completa el formulario con tu contexto comercial y técnico. Así podremos responder con una propuesta más clara y útil para tu empresa.
          </p>
        </Container>
      </section>

      <section className="py-12">
        <Container className="space-y-8">
          <CommercialQuoteBuilder />
        </Container>
      </section>
    </main>
  );
}
