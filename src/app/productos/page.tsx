import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes, PackageCheck, ShieldCheck, Tag } from "lucide-react";
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
  const visibleProducts = products.filter((product) => product.published !== false);
  const activeOffers = visibleProducts.filter((product) => product.discountActive || product.onOffer).length;
  const comboCount = visibleProducts.filter((product) => product.isCombo).length;

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

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-18">
        <Container className="relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <div className="space-y-5">
            <div className="badge-blue w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Catálogo empresarial
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Productos TI para operación, crecimiento y continuidad
            </h1>
            <p className="max-w-2xl text-lg text-slate-600">
              Catálogo conectado al panel administrativo de productos. Cada precio, combo, imagen y promoción se publica desde tu base en Supabase.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button asChild size="lg" className="btn-primary-glow gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                  Hablar con ventas <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50 font-semibold">
                <Link href="/paquetes">Ir al cotizador de servicios</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Resumen del catálogo</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <Boxes className="h-3.5 w-3.5 text-blue-700" /> Publicados
                </p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{visibleProducts.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <Tag className="h-3.5 w-3.5 text-emerald-700" /> Ofertas activas
                </p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{activeOffers}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <PackageCheck className="h-3.5 w-3.5 text-violet-700" /> Combos
                </p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{comboCount}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-700" />
              Información sincronizada desde Supabase.
            </p>
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
