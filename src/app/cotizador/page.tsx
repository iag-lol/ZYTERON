import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { CommercialQuoteBuilder } from "@/components/forms/commercial-quote-builder";
import { PLAN_PRICE_AMOUNTS, clp } from "@/config/pricing";

const BASIC_WEB_PRICE = clp(PLAN_PRICE_AMOUNTS["web-basica"]);

export const metadata: Metadata = createPageMetadata({
  title: "Cotizar desarrollo web y software a medida en Chile",
  description: `Solicita una propuesta para tu web, software o automatización en Chile. Si necesitas una web de presentación, compara planes desde ${BASIC_WEB_PRICE} + IVA o calcula una referencia.`,
  path: "/cotizador",
});

export default function CotizadorPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="cotizador-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/cotizador",
          title: "Cotización de desarrollo web y software a medida",
          description:
            "Calculadora de referencia, paquetes web y solicitud de propuesta personalizada para empresas en Chile.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Cotizador", path: "/cotizador" },
          ],
        })}
      />

      <section className="bg-hero-pattern relative overflow-hidden border-b border-slate-200 py-20">
        <Container className="space-y-5 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Cotización web y proyectos a medida
          </div>
          <h1 className="text-4xl leading-tight font-extrabold text-slate-900 sm:text-5xl">
            Cotiza tu web, software o automatización en Chile
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            Una web de presentación de una página parte desde {BASIC_WEB_PRICE} + IVA. Estima el
            presupuesto según lo que necesitas o solicita una propuesta con alcance y condiciones
            para tu proyecto.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/calculadora-precio-pagina-web">Calcular precio sin dejar mis datos</Link>
            </Button>
            <Button asChild variant="outline" className="font-semibold">
              <Link href="#solicitud">Solicitar propuesta personalizada</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="py-12">
        <Container className="space-y-8">
          <div className="manual-custom">
            <h2>¿Prefieres configurar un paquete web?</h2>
            <p>
              Revisa un plan web, catálogo o ecommerce con adicionales, alcance y plazo. Este
              recorrido solicita tus datos de contacto para guardar la cotización antes de
              configurar el paquete.
            </p>
            <Link href="/cotizador/manual" className="design-button">
              Configurar y guardar mi cotización
            </Link>
          </div>
          <div id="solicitud" className="scroll-mt-28 space-y-5">
            <div className="max-w-3xl space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">
                Solicita una propuesta para tu proyecto
              </h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Para una web con requisitos propios, software, automatización o soporte, completa el
                formulario con tu necesidad. El presupuesto final se define según el alcance.
              </p>
            </div>
            <CommercialQuoteBuilder />
          </div>
        </Container>
      </section>
    </main>
  );
}
