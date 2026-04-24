import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { getWebPricingSnapshot } from "@/lib/web-control";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createPageMetadata({
  title: "Productos TI y Hardware Para Empresas | Zyteron",
  description:
    "Catalogo de productos TI para empresas en Chile: notebooks, PCs y kits POS con soporte y envio nacional.",
  path: "/productos",
  keywords: ["productos ti empresas chile", "notebooks empresas chile", "kit pos chile"],
});

const whatsappNumber = "56984752936";

function currencyCLP(value: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(value)));
}

function getWaLink(name: string, price: string) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hola, quiero comprar ${name} (${price}, IVA incluido). ¿Disponibilidad y envío a mi dirección?`,
  )}`;
}

const productImages: Record<string, string> = {
  "notebook-oficina-pro": "https://media.falabella.com/falabellaCL/152349797_01/w=1200,h=1200,fit=pad",
  "pc-escritorio-empresa": "https://media.falabella.com/falabellaCL/145028643_01/w=1200,h=1200,fit=pad",
  "combo-pyme-digital": "https://cdnx.jumpseller.com/opentecno/image/72034358/thumb/1079/1079?1768854032",
  "combo-empresa-pro": "https://cdnx.jumpseller.com/opentecno/image/72034358/thumb/1079/1079?1768854032",
};

export default async function ProductosPage() {
  const { products } = await getWebPricingSnapshot();
  const featured = products.filter((item) => item.featured);
  const standard = products.filter((item) => !item.featured);
  const sections = [
    {
      id: "destacados",
      title: "Productos destacados",
      subtitle: "Configuraciones más solicitadas para operación empresarial.",
      items: featured.length > 0 ? featured : products,
    },
    {
      id: "catalogo",
      title: "Catálogo general",
      subtitle: "Todo el stock administrable desde el panel de Control Web.",
      items: standard.length > 0 ? standard : products,
    },
  ];

  return (
    <main className="bg-white">
      <JsonLd
        id="productos-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/productos",
          title: "Productos TI y Hardware Para Empresas | Zyteron",
          description:
            "Catalogo de hardware empresarial y kits POS para empresas en Chile.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Productos", path: "/productos" },
          ],
        })}
      />
      <section className="relative overflow-hidden bg-hero-pattern border-b border-slate-200 py-16">
        <Container className="relative z-10 space-y-4">
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Catálogo
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Productos para pymes y empresas
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Equipos y soluciones listos para operar, IVA incluido y envío a todo Chile.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold btn-primary-glow">
              <Link href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                Escribir por WhatsApp <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50 font-semibold">
              <Link href="/contacto">Consultar disponibilidad</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="py-16 bg-white">
        <Container className="space-y-10">
          {sections.map((section) => (
            <div key={section.id} className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{section.title}</p>
                </div>
                <p className="text-sm text-slate-600">{section.subtitle}</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {section.items.map((product) => {
                  const discountValue = Math.max(0, Math.round(product.price * (product.discountPct / 100)));
                  const finalPrice = product.price - discountValue;
                  const wa = getWaLink(product.name, currencyCLP(finalPrice));
                  const image = productImages[product.slug];

                  return (
                    <article key={`${section.id}-${product.id}`} className="card-premium flex flex-col p-5">
                      {image ? (
                        <div className="mb-4 overflow-hidden rounded-xl border border-slate-100 bg-white">
                          <Image
                            src={image}
                            alt={product.name}
                            className="h-44 w-full object-cover"
                            width={1079}
                            height={1079}
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                            loading="lazy"
                          />
                        </div>
                      ) : null}

                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{product.name}</h3>
                        {product.featured ? (
                          <span className="shrink-0 rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                            Destacado
                          </span>
                        ) : null}
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">{product.description}</p>
                      <ul className="mt-3 space-y-1 text-xs text-slate-600">
                        {product.badges.map((badge) => (
                          <li key={`${product.id}-${badge}`} className="flex items-start gap-2">
                            <Check className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                            <span>{badge}</span>
                          </li>
                        ))}
                        <li className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                          <span>Stock actual: {product.stock}</span>
                        </li>
                      </ul>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        <div>
                          {product.discountPct > 0 ? (
                            <p className="text-xs text-slate-400 line-through">{currencyCLP(product.price)}</p>
                          ) : null}
                          <span className="text-xl font-extrabold text-slate-900">{currencyCLP(finalPrice)}</span>
                        </div>
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100"
                        >
                          Comprar por WhatsApp <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </Container>
      </section>
    </main>
  );
}
