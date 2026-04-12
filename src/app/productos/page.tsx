import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

const whatsappNumber = "56984752936";
const getWaLink = (name: string, price: string) =>
  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    `Hola, quiero comprar ${name} (${price}, IVA incluido). ¿Disponibilidad y envío a mi dirección?`
  )}`;

type Product = {
  slug: string;
  title: string;
  desc: string;
  price: string;
  badge?: string;
  badgeClass?: string;
  specs: string[];
};

const products: Record<string, Product> = {
  "pc-m72e-i3": {
    slug: "pc-m72e-i3",
    title: "Kit PC Lenovo ThinkCentre M72e i3 · 8GB · 240GB SSD · 14\"",
    desc: "Equipo SFF confiable para oficina y cajas, incluye monitor.",
    price: "$309.990 IVA inc.",
    badge: "Entrega rápida",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    specs: [
      "Pantalla 14\"",
      "Intel Core i3 3.3GHz · 8GB DDR3 · 240GB SSD",
      "Windows 10 Pro licenciado",
      "Tipo: Computador de escritorio",
    ],
  },
  "pc-m72e-i5": {
    slug: "pc-m72e-i5",
    title: "Kit PC Lenovo ThinkCentre M72e i5 SFF · Quad core · 8GB · 240GB SSD · 19\"",
    desc: "SFF con más potencia y monitor 19\" para turnos exigentes.",
    price: "$379.990 IVA inc.",
    badge: "Quad core",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    specs: [
      "Pantalla 19\"",
      "Intel Core i5 3.8GHz · 8GB DDR3 · 240GB SSD",
      "Windows 10 Pro",
      "Núcleos: Quad core",
    ],
  },
  "notebook-n100": {
    slug: "notebook-n100",
    title: "Notebook Lenovo IdeaPad Slim 3i 15.6\" N100 · 4GB · 128GB SSD",
    desc: "Portátil liviano para ventas terreno y oficina móvil.",
    price: "$369.990 IVA inc.",
    badge: "Stock PYME",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    specs: [
      "Pantalla 15.6\"",
      "Intel Processor N100 · 4GB RAM · 128GB SSD",
      "GPU integrada",
      "Núcleos: Quad core",
    ],
  },
  "pos-base": {
    slug: "pos-base",
    title: "Kit POS Cafetería / Restaurante",
    desc: "Punto de venta completo listo para operar en barra o caja.",
    price: "$459.996 IVA inc.",
    badge: "Lista entrega",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    specs: [
      "All-in-One 20\" Intel i5 · 4GB RAM · HDD",
      "Teclado + mouse inalámbrico",
      "Impresora térmica 58mm",
      "Gaveta de dinero electrónica RJ11",
      "Lector de códigos 1D",
      "Envíos a todo Chile",
    ],
  },
  "pos-web": {
    slug: "pos-web",
    title: "Kit POS + Página Web Lista para Vender",
    desc: "Incluye POS completo + web operativa para pedidos y catálogo.",
    price: "$699.990 IVA inc.",
    badge: "Incluye web",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
    specs: [
      "All-in-One 20\" Intel i5 · 4GB RAM · HDD",
      "Sitio web operando (productos, pedidos, contacto)",
      "Impresora térmica + gaveta + lector",
      "Capacitación corta de uso",
      "Envíos a todo Chile",
    ],
  },
};

const productImages: Record<string, string> = {
  "Kit PC Lenovo ThinkCentre M72e i3 · 8GB · 240GB SSD · 14\"":
    "https://media.falabella.com/falabellaCL/145028643_01/w=1200,h=1200,fit=pad",
  "Kit PC Lenovo ThinkCentre M72e i5 SFF · Quad core · 8GB · 240GB SSD · 19\"":
    "https://media.falabella.com/falabellaCL/145028643_01/w=1200,h=1200,fit=pad",
  "Notebook Lenovo IdeaPad Slim 3i 15.6\" N100 · 4GB · 128GB SSD":
    "https://media.falabella.com/falabellaCL/152349797_01/w=1200,h=1200,fit=pad",
  "Kit POS Cafetería / Restaurante":
    "https://cdnx.jumpseller.com/opentecno/image/72034358/thumb/1079/1079?1768854032",
  "Kit POS + Página Web Lista para Vender":
    "https://cdnx.jumpseller.com/opentecno/image/72034358/thumb/1079/1079?1768854032",
};

const sections = [
  {
    id: "pymes",
    title: "Productos para PYMES",
    subtitle: "Costo-efectivos para vender rápido y sin dolores de cabeza.",
    items: ["pc-m72e-i3", "notebook-n100", "pos-base"],
  },
  {
    id: "empresas",
    title: "Productos para empresas",
    subtitle: "Más potencia y POS con web incluida para sucursales.",
    items: ["pc-m72e-i5", "pos-web"],
  },
  {
    id: "venta",
    title: "Catálogo completo PC & POS",
    subtitle: "Todo con IVA incluido y envío a todo Chile.",
    items: ["pc-m72e-i3", "pc-m72e-i5", "notebook-n100", "pos-base", "pos-web"],
  },
];

export default function ProductosPage() {
  return (
    <main className="bg-white">
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
            Equipos y POS listos para operar, IVA incluido y envío a todo Chile. Pregunta por stock y te respondemos en menos de 24h.
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
                {section.items.map((slug) => {
                  const p = products[slug];
                  const img = productImages[p.title];
                  const wa = getWaLink(p.title, p.price);
                  return (
                    <div key={p.slug} className="card-premium flex flex-col p-5">
                      {img && (
                        <div className="mb-4 overflow-hidden rounded-xl border border-slate-100 bg-white">
                          <img src={img} alt={p.title} className="h-44 w-full object-cover" loading="lazy" />
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{p.title}</h3>
                        {p.badge && (
                          <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${p.badgeClass}`}>
                            {p.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{p.desc}</p>
                      <ul className="mt-3 space-y-1 text-xs text-slate-600">
                        {p.specs.map((s) => (
                          <li key={s} className="flex items-start gap-2">
                            <Check className="h-3.5 w-3.5 text-blue-600 mt-0.5 shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-center justify-between">
                        <span className="text-xl font-extrabold text-slate-900">{p.price}</span>
                        <a
                          href={wa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 transition-all hover:bg-blue-100"
                        >
                          Comprar por WhatsApp <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-500">
                        Respuesta en &lt;24h. Sin extras obligatorios. Envíos a todo Chile.
                      </p>
                    </div>
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
