import { Container } from "@/components/layout/container";
import { ManualQuoteBuilder } from "@/components/manual-quote/quote-builder";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata({
  title: "Cotizador manual: configura y compra tu proyecto",
  description:
    "Elige un plan web, catálogo o ecommerce y agrega funciones con precio fijo, alcance escrito y plazo de entrega. Compra con correo verificado.",
  path: "/cotizador/manual",
});
export default async function ManualQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  return (
    <main className="manual-page">
      <Container>
        <header className="manual-page-heading">
          <p className="eyebrow">Cotizador manual / Zyteron</p>
          <h1>
            Tu próximo proyecto.
            <br />
            <span>Claro desde el comienzo.</span>
          </h1>
          <p>
            Un plan base, los adicionales que eliges y el detalle de lo que vas a recibir. Conoce el
            precio completo antes de comprar.
          </p>
        </header>
        <ManualQuoteBuilder initialPlan={plan} />
      </Container>
    </main>
  );
}
