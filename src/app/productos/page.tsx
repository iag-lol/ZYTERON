import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { getWebPricingSnapshot } from "@/lib/web-control";
import { PublicProductsCatalog } from "@/components/forms/public-products-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Productos TI y Hardware Para Empresas | Zyteron",
  description:
    "Catálogo público de productos Zyteron para empresas en Chile, con precios, descuentos, carrito y envío por WhatsApp.",
  path: "/productos",
  keywords: ["productos ti empresas chile", "catalogo productos zyteron", "comprar productos por whatsapp"],
});

const whatsappNumber = "56984752936";

export default async function ProductosPage() {
  const { products } = await getWebPricingSnapshot();

  return (
    <main className="bg-white">
      <JsonLd
        id="productos-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/productos",
          title: "Productos TI y Hardware Para Empresas | Zyteron",
          description:
            "Catálogo público de productos y soluciones TI para empresas, gestionado desde admin.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Productos", path: "/productos" },
          ],
        })}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-16">
        <Container className="relative z-10 space-y-4">
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Catálogo público
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Productos para pymes y empresas
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Publica y gestiona este catálogo desde admin. Aquí tus clientes pueden seleccionar uno o varios productos, definir cantidades y enviar el pedido por WhatsApp.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="btn-primary-glow gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                Hablar con ventas <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50 font-semibold">
              <Link href="/paquetes">Ir al cotizador de servicios</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container>
          <PublicProductsCatalog products={products} whatsappNumber={whatsappNumber} />
        </Container>
      </section>
    </main>
  );
}
