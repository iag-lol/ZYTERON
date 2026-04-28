import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { PackageBuilder } from "@/components/forms/package-builder";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { getWebPricingSnapshot } from "@/lib/web-control";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Cotizador de Sitios Web Para Empresas | Zyteron",
  description:
    "Arma tu paquete de diseno web y desarrollo web en Chile. Cotiza servicios, SEO, soporte e integraciones para tu empresa.",
  path: "/paquetes",
  keywords: ["cotizador pagina web chile", "cotizar diseno web chile", "paquete web para empresas"],
});

export default async function PaquetesPage() {
  const { plans, extras, discounts, reviews } = await getWebPricingSnapshot();

  return (
    <main className="bg-white">
      <JsonLd
        id="paquetes-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/paquetes",
          title: "Cotizador de Sitios Web Para Empresas | Zyteron",
          description:
            "Cotizador para crear paquetes de paginas web para empresas con servicios adicionales en Chile.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Paquetes", path: "/paquetes" },
          ],
        })}
      />

      <section className="relative overflow-hidden bg-hero-pattern border-b border-slate-200 py-20">
        <Container className="relative z-10 space-y-5 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Cotizador avanzado
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Arma tu paquete <span className="text-gradient-blue">a medida</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Plan base, extras con botones, carrito final y envío directo al panel admin para seguimiento comercial.
          </p>
        </Container>
      </section>

      <section className="py-12">
        <Container>
          <PackageBuilder plans={plans} extras={extras} discounts={discounts} reviews={reviews} showReviewsSection={false} />
        </Container>
      </section>
    </main>
  );
}
