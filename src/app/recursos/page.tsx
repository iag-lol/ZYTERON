import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, Scale } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

const path = "/recursos";

export const metadata: Metadata = createPageMetadata({
  title: "Guías y recursos para decidir tu página web en Chile",
  description:
    "Guías gratuitas para empresas y pymes chilenas: cómo elegir una empresa de desarrollo web, WordPress versus desarrollo a medida y checklist SEO de 25 controles.",
  path,
});

const resources = [
  {
    icon: ClipboardCheck,
    title: "Cómo elegir una empresa de desarrollo web en Chile",
    description:
      "Checklist de 12 criterios verificables antes de contratar: portafolio real, precios publicados, contrato y factura, propiedad del código y señales de alerta.",
    href: "/recursos/como-elegir-empresa-desarrollo-web-chile",
    tag: "Guía de decisión",
  },
  {
    icon: Scale,
    title: "WordPress vs desarrollo a medida en Chile",
    description:
      "Comparativa honesta de costos iniciales, mantención, velocidad, seguridad y escalabilidad, con una tabla para decidir cuál conviene según tu proyecto.",
    href: "/recursos/wordpress-vs-web-a-medida-chile",
    tag: "Comparativa",
  },
  {
    icon: BookOpen,
    title: "Checklist SEO para pymes en Chile: 25 controles",
    description:
      "Revisa indexación, contenido, enlazado interno, autoridad local y medición antes de invertir en posicionamiento orgánico.",
    href: "/recursos/checklist-seo-pymes-chile",
    tag: "Checklist SEO",
  },
];

const serviceLinks = [
  { name: "Desarrollo web para empresas", href: "/desarrollo-web" },
  { name: "Sistemas web a medida", href: "/sistemas-web" },
  { name: "Planes y precios publicados", href: "/planes" },
  { name: "Cotizador en línea", href: "/cotizador" },
];

export default function RecursosPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="recursos-webpage-schema"
        data={buildWebPageJsonLd({
          path,
          title: "Guías y recursos para decidir tu página web en Chile",
          description:
            "Hub de guías gratuitas de Zyteron para comparar opciones, cotizar con criterio y revisar el SEO de tu sitio web.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Recursos", path },
          ],
        })}
      />

      <section className="border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Recursos gratuitos</p>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Guías y recursos para decidir tu página web en Chile
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            Antes de contratar un desarrollo web conviene comparar con criterio. Estas guías reúnen lo que el equipo de Zyteron revisa en proyectos reales: qué exigir a una agencia, qué tecnología conviene según tu caso y cómo auditar el SEO de tu sitio.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-12">
          <div className="grid gap-5 lg:grid-cols-3">
            {resources.map((resource) => (
              <article key={resource.href} className="card-premium flex flex-col p-6">
                <resource.icon className="h-8 w-8 text-blue-700" />
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-blue-700">{resource.tag}</p>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">{resource.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{resource.description}</p>
                <div className="mt-5">
                  <Button asChild variant="outline">
                    <Link href={resource.href}>
                      Leer la guía <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>

          <section className="card-premium p-6 sm:p-8">
            <h2 className="text-2xl font-extrabold text-slate-900">¿Listo para dar el siguiente paso?</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              Si después de leer las guías quieres ver cómo se aplica todo esto a tu proyecto, revisa nuestros servicios con precios publicados o pide una cotización sin compromiso.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {serviceLinks.map((link) => (
                <Button key={link.href} asChild variant="outline">
                  <Link href={link.href}>{link.name}</Link>
                </Button>
              ))}
            </div>
          </section>
        </Container>
      </section>
    </main>
  );
}
