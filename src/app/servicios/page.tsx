import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { servicePages } from "@/content/service-pages";
import { buildFaqJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

const faqs = [
  {
    question: "Que servicio debo elegir primero para mejorar resultados?",
    answer:
      "Si hoy no tienes un sitio comercial claro, recomendamos partir por paginas web para empresas. Si ya tienes sitio, priorizamos SEO tecnico y optimizacion de conversion.",
  },
  {
    question: "Trabajan solo proyectos en Santiago?",
    answer:
      "No. Atendemos empresas en todo Chile de forma remota y coordinamos reuniones comerciales segun necesidad.",
  },
  {
    question: "Puedo contratar diseno, desarrollo y SEO en un solo proyecto?",
    answer:
      "Si. Nuestra propuesta integra estrategia, diseno UX, desarrollo y base SEO para lanzar con una estructura lista para posicionar.",
  },
  {
    question: "Cuanto tarda un proyecto promedio?",
    answer:
      "Entre 3 y 7 semanas dependiendo del alcance, cantidad de secciones, integraciones y disponibilidad de contenidos.",
  },
];

export const metadata: Metadata = createPageMetadata({
  title: "Servicios de Diseno y Desarrollo Web en Chile | Zyteron",
  description:
    "Servicios de diseno web Chile, desarrollo web Chile y SEO tecnico para empresas. Estructura pensada para captar leads y escalar posicionamiento.",
  path: "/servicios",
  keywords: [
    "servicios diseno web chile",
    "servicios desarrollo web chile",
    "agencia web para empresas chile",
  ],
});

export default function ServiciosPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="servicios-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/servicios",
          title: "Servicios de Diseno y Desarrollo Web en Chile | Zyteron",
          description:
            "Hub de servicios de diseno web, desarrollo web y creacion de sitios para empresas en Chile.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Servicios", path: "/servicios" },
          ],
        })}
      />
      <JsonLd id="servicios-faq-schema" data={buildFaqJsonLd(faqs)} />
      <JsonLd
        id="servicios-itemlist-schema"
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: servicePages.map((service, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: `https://www.zyteron.cl/servicios/${service.slug}`,
            name: service.navLabel,
          })),
        }}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="relative z-10 space-y-6">
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Hub de servicios SEO
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Servicios de diseno web Chile y desarrollo web Chile para empresas
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            Esta pagina concentra nuestras soluciones principales para posicionar y convertir:
            paginas web para empresas, diseno web en Santiago, creacion de sitios web y
            desarrollo tecnico orientado a resultados.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">
                Solicitar diagnostico <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 font-semibold text-slate-800 hover:bg-slate-50">
              <Link href="/paquetes">Ver planes y cotizar</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Arquitectura de servicios
            </p>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Cada URL responde a una busqueda comercial especifica
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
              Para evitar canibalizacion y mejorar relevancia, cada servicio tiene una pagina
              dedicada con propuesta de valor, FAQs y enlazado interno contextual.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {servicePages.map((service) => (
              <article key={service.slug} className="card-premium flex flex-col p-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">
                  {service.primaryKeyword}
                </p>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{service.navLabel}</h3>
                <p className="flex-1 text-sm leading-relaxed text-slate-600">{service.summary}</p>
                <ul className="my-4 space-y-1.5">
                  {service.deliverables.slice(0, 3).map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="w-full border-slate-300 font-semibold text-slate-800 hover:bg-slate-50">
                  <Link href={`/servicios/${service.slug}`}>
                    Ver detalle del servicio <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt border-y border-slate-200 py-16">
        <Container className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Contenido orientado a personas",
              body: "Cada pagina de servicio responde problemas reales de compra y decision de empresas chilenas.",
            },
            {
              title: "Indexacion limpia",
              body: "URLs canonicas correctas, sitemap actualizado, schema consistente y enlazado interno crawlable.",
            },
            {
              title: "Conversion primero",
              body: "CTAs directos a contacto, cotizador y WhatsApp con seguimiento de eventos y foco comercial.",
            },
          ].map((item) => (
            <article key={item.title} className="card-premium p-5">
              <h3 className="mb-2 text-base font-bold text-slate-900">{item.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{item.body}</p>
            </article>
          ))}
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">FAQ</p>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Preguntas frecuentes sobre servicios web en Chile
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.question} className="card-premium p-6">
                <h3 className="mb-2 text-sm font-bold text-slate-900">{faq.question}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">
                Hablar con un especialista <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 font-semibold text-slate-800 hover:bg-slate-50">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
