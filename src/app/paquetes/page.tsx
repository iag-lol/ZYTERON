import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Check, Star, ArrowRight, Plus, Globe, Mail, Headphones, BarChart3, Laptop, Code2, BookOpen, ShoppingCart, MessageSquare } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Cotizador de Sitios Web Para Empresas | Zyteron",
  description:
    "Arma tu paquete de diseno web y desarrollo web en Chile. Cotiza servicios, SEO, soporte e integraciones para tu empresa.",
  path: "/paquetes",
  keywords: ["cotizador pagina web chile", "cotizar diseno web chile", "paquete web para empresas"],
});

const WspIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const basePlans = [
  { name: "Básico", price: "$390.000", desc: "Landing profesional + hosting + soporte básico", featured: false },
  { name: "Intermedio", price: "$790.000", desc: "Sitio 5 secciones + SEO + analítica + CRM", featured: true, badge: "Popular" },
  { name: "Pro", price: "$1.490.000", desc: "Corporativo + blog + SEO avanzado + paneles", featured: false },
];

const extrasGroups = [
  {
    category: "Infraestructura",
    icon: <Globe className="h-5 w-5" />,
    iconBg: "bg-blue-50", iconColor: "text-blue-700", headerBg: "bg-blue-50",
    extras: [
      { name: "Dominio .cl — 1 año", price: "$29.000" },
      { name: "Dominio .com — 1 año", price: "$35.000" },
      { name: "Hosting extra (12 meses)", price: "$89.000" },
      { name: "SSL wildcard premium", price: "$59.000" },
    ],
  },
  {
    category: "Correos corporativos",
    icon: <Mail className="h-5 w-5" />,
    iconBg: "bg-emerald-50", iconColor: "text-emerald-700", headerBg: "bg-emerald-50",
    extras: [
      { name: "1 correo corporativo — 1 año", price: "$29.000" },
      { name: "Pack 5 correos — 1 año", price: "$119.000" },
      { name: "Pack 10 correos — 1 año", price: "$199.000" },
    ],
  },
  {
    category: "SEO y Marketing",
    icon: <BarChart3 className="h-5 w-5" />,
    iconBg: "bg-violet-50", iconColor: "text-violet-700", headerBg: "bg-violet-50",
    extras: [
      { name: "SEO básico on-page", price: "$99.000" },
      { name: "SEO intermedio + schema", price: "$199.000" },
      { name: "SEO avanzado + contenido", price: "$349.000" },
      { name: "SEO local (por ciudad)", price: "$149.000" },
    ],
  },
  {
    category: "Soporte técnico",
    icon: <Headphones className="h-5 w-5" />,
    iconBg: "bg-amber-50", iconColor: "text-amber-700", headerBg: "bg-amber-50",
    extras: [
      { name: "Soporte remoto — 1 mes", price: "$59.000" },
      { name: "Soporte remoto — 3 meses", price: "$149.000" },
      { name: "Visita técnica presencial", price: "$89.000" },
      { name: "Mantención web mensual", price: "$79.000/mes" },
    ],
  },
  {
    category: "Funcionalidades",
    icon: <Code2 className="h-5 w-5" />,
    iconBg: "bg-rose-50", iconColor: "text-rose-700", headerBg: "bg-rose-50",
    extras: [
      { name: "Blog integrado", price: "$149.000" },
      { name: "Panel de cliente", price: "$249.000" },
      { name: "Panel de administrador", price: "$299.000" },
      { name: "Módulo de reservas online", price: "$199.000" },
    ],
  },
  {
    category: "Ecommerce y pagos",
    icon: <ShoppingCart className="h-5 w-5" />,
    iconBg: "bg-cyan-50", iconColor: "text-cyan-700", headerBg: "bg-cyan-50",
    extras: [
      { name: "Tienda online básica", price: "$299.000" },
      { name: "Pasarela Webpay Plus", price: "$199.000" },
      { name: "Catálogo de productos", price: "$149.000" },
    ],
  },
  {
    category: "Equipos y hardware",
    icon: <Laptop className="h-5 w-5" />,
    iconBg: "bg-indigo-50", iconColor: "text-indigo-700", headerBg: "bg-indigo-50",
    extras: [
      { name: "Notebook Oficina Pro", price: "$520.000" },
      { name: "PC Escritorio Empresa", price: "$680.000" },
      { name: "Pack periféricos oficina", price: "$149.000" },
    ],
  },
  {
    category: "Capacitación",
    icon: <BookOpen className="h-5 w-5" />,
    iconBg: "bg-pink-50", iconColor: "text-pink-700", headerBg: "bg-pink-50",
    extras: [
      { name: "Capacitación inicial (2h)", price: "$79.000" },
      { name: "Capacitación avanzada (4h)", price: "$149.000" },
      { name: "Manual de uso personalizado", price: "$59.000" },
    ],
  },
];

const steps = [
  { num: "01", title: "Elige tu plan base", desc: "Selecciona el plan que mejor se adapte: Básico, Intermedio o Pro.", iconBg: "bg-blue-50", iconColor: "text-blue-700", border: "border-blue-200" },
  { num: "02", title: "Suma los extras", desc: "Agrega dominio, correos, SEO, soporte, funcionalidades o equipos.", iconBg: "bg-violet-50", iconColor: "text-violet-700", border: "border-violet-200" },
  { num: "03", title: "Envía tu cotización", desc: "Un ejecutivo te contacta en menos de 24h con la propuesta final.", iconBg: "bg-emerald-50", iconColor: "text-emerald-700", border: "border-emerald-200" },
];

export default function PaquetesPage() {
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
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-pattern border-b border-slate-200 py-20">
        <Container className="relative z-10 space-y-5 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Cotizador avanzado
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Arma tu paquete{" "}
            <span className="text-gradient-blue">a medida</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Diseñamos soluciones digitales completamente personalizadas. Elige tu plan base y agrega los extras que realmente necesita tu empresa.
          </p>
        </Container>
      </section>

      {/* Steps */}
      <section className="py-14 section-alt border-b border-slate-200">
        <Container>
          <div className="grid gap-5 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.num} className={`card-premium border-t-4 ${step.border.replace("border-", "border-t-")} p-6 space-y-3`}>
                <span className={`text-4xl font-black ${step.iconColor} opacity-20`}>{step.num}</span>
                <h3 className="text-base font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Base plans */}
      <section className="py-16 bg-white">
        <Container className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Paso 1</p>
            <h2 className="text-2xl font-extrabold text-slate-900">Elige tu plan base</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {basePlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 transition-all duration-300 ${
                  plan.featured
                    ? "card-featured text-white"
                    : "card-premium"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white shadow-blue-600/40 shadow-md">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <div className="space-y-2 mb-5">
                  <p className={`text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-blue-200" : "text-slate-400"}`}>{plan.name}</p>
                  <p className={`text-3xl font-extrabold ${plan.featured ? "text-white" : "text-slate-900"}`}>{plan.price}</p>
                  <p className={`text-sm ${plan.featured ? "text-blue-100" : "text-slate-600"}`}>{plan.desc}</p>
                </div>
                <Link
                  href="/contacto"
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                    plan.featured
                      ? "bg-white text-blue-800 hover:bg-blue-50"
                      : "bg-blue-700 hover:bg-blue-800 text-white"
                  }`}
                >
                  Elegir {plan.name} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Link href="/planes" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900 transition-colors">
              Ver comparativa completa de planes <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* Extras */}
      <section className="py-16 section-alt">
        <Container className="space-y-10">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Paso 2</p>
            <h2 className="text-2xl font-extrabold text-slate-900">Agrega los extras que necesitas</h2>
            <p className="text-slate-600 text-sm">Personaliza tu paquete con servicios adicionales a medida de tu empresa.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {extrasGroups.map((group) => (
              <div key={group.category} className="card-premium overflow-hidden">
                <div className={`flex items-center gap-3 border-b border-slate-100 p-4 ${group.headerBg}`}>
                  <span className={group.iconColor}>{group.icon}</span>
                  <p className="text-sm font-bold text-slate-900">{group.category}</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {group.extras.map((extra) => (
                    <div key={extra.name} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <Plus className={`h-3.5 w-3.5 ${group.iconColor}`} />
                        <span className="text-sm text-slate-700">{extra.name}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 shrink-0 ml-4">{extra.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Send quote */}
      <section className="py-16 bg-white">
        <Container>
          <div className="relative overflow-hidden rounded-2xl section-blue p-8 md:p-12 text-white">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Paso 3</p>
                <h3 className="text-2xl font-extrabold sm:text-3xl">Envía tu cotización</h3>
                <p className="text-blue-100 leading-relaxed text-sm">
                  Cuéntanos el plan base y los extras que te interesan. Un ejecutivo te preparará la propuesta y te contactará en menos de 24h hábiles.
                </p>
                <div className="space-y-2">
                  {["Propuesta personalizada sin costo", "Respuesta garantizada en 24h hábiles", "Sin compromiso ni letras pequeñas"].map((item) => (
                    <div key={item} className="flex items-center gap-2 text-sm text-blue-100">
                      <Check className="h-4 w-4 text-emerald-300 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="https://wa.me/56984752936?text=Hola%20Zyteron%2C%20quiero%20cotizar%20un%20paquete%20personalizado"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#25d366] px-5 py-3.5 text-sm font-bold text-white transition-all hover:bg-[#20b858] wsp-pulse"
                >
                  <WspIcon />
                  Cotizar por WhatsApp
                </Link>
                <Button asChild size="lg" className="w-full gap-2 bg-white text-blue-800 hover:bg-blue-50 font-bold">
                  <Link href="/contacto">
                    <MessageSquare className="h-4 w-4" />
                    Enviar formulario
                  </Link>
                </Button>
                <p className="text-center text-xs text-blue-200">Sin compromiso · Respuesta en &lt; 24h</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Gifts */}
      <section className="py-12 section-alt border-t border-slate-200">
        <Container>
          <div className="grid gap-4 md:grid-cols-3 text-center">
            {[
              { icon: <Star className="h-5 w-5" />, title: "Plan Pro incluye gratis", items: ["Dominio .cl 1 año", "1 correo corporativo", "Capacitación (2h)"], bg: "bg-blue-50", ic: "text-blue-700" },
              { icon: <Check className="h-5 w-5" />, title: "Todos los planes incluyen", items: ["Diseño 100% responsive", "Certificado SSL", "1 mes de soporte"], bg: "bg-emerald-50", ic: "text-emerald-700" },
              { icon: <MessageSquare className="h-5 w-5" />, title: "Garantías Zyteron", items: ["Entrega en plazos pactados", "Revisiones incluidas", "Código fuente entregado"], bg: "bg-violet-50", ic: "text-violet-700" },
            ].map((block) => (
              <div key={block.title} className="card-premium p-5 space-y-3">
                <div className={`flex items-center justify-center h-10 w-10 rounded-xl ${block.bg} ${block.ic} mx-auto`}>{block.icon}</div>
                <p className="text-sm font-bold text-slate-900">{block.title}</p>
                <div className="space-y-1">
                  {block.items.map((item) => <p key={item} className="text-xs text-slate-500">{item}</p>)}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
