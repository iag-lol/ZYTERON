import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import { servicePages, getServicePageBySlug } from "@/content/service-pages";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import {
  buildFaqJsonLd,
  buildServiceJsonLd,
  buildWebPageJsonLd,
  createPageMetadata,
} from "@/lib/seo";

type ServicePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const WHATSAPP_BASE = siteConfig.social.whatsapp;

const CANONICAL_SERVICE_PATHS: Record<string, string> = {
  "desarrollo-web-chile": "/desarrollo-web",
  "paginas-web-para-empresas": "/paginas-web-para-empresas",
  "creacion-de-sitios-web-para-empresas": "/desarrollo-web",
  "paginas-web-para-pymes": "/paginas-web-para-pymes",
  "diseno-web-chile": "/paginas-web-para-empresas",
  "agencia-diseno-web-chile": "/paginas-web-para-empresas",
  "diseno-web-santiago": "/paginas-web-santiago",
};
const CONSOLIDATED_SERVICE_SLUGS = new Set(Object.keys(CANONICAL_SERVICE_PATHS));

const serviceExamplesBySlug: Record<
  string,
  {
    problem: string;
    solution: string;
    useCases: string[];
  }
> = {
  "paginas-web-para-empresas": {
    problem:
      "Muchas empresas tienen una web que sí existe, pero no logra explicar bien sus servicios, filtrar consultas ni apoyar al equipo comercial.",
    solution:
      "Zyteron ordena la arquitectura, la propuesta de valor y los llamados a la acción para que la web funcione como un canal comercial serio.",
    useCases: [
      "Ejemplo de uso en consultoría: presentar servicios, industrias atendidas y agendamiento comercial.",
      "Ejemplo de uso en servicios industriales: mostrar capacidades técnicas, cobertura y formularios de solicitud.",
      "Ejemplo de uso en proveedores B2B: separar soluciones por línea de negocio y facilitar cotizaciones.",
    ],
  },
  "diseno-web-chile": {
    problem:
      "Un diseño poco claro genera desconfianza, hace difícil entender la oferta y termina bajando la tasa de contacto.",
    solution:
      "Trabajamos jerarquía visual, lectura rápida y bloques de confianza para que el sitio acompañe la decisión del cliente.",
    useCases: [
      "Ejemplo de uso en estudios profesionales: ordenar servicios, equipo y preguntas frecuentes.",
      "Ejemplo de uso en salud o educación: mejorar claridad de información y rutas de contacto.",
      "Ejemplo de uso en empresas de servicios: rediseñar páginas clave sin perder continuidad comercial.",
    ],
  },
  "desarrollo-web-chile": {
    problem:
      "Sitios lentos, difíciles de mantener o poco preparados para crecer terminan afectando SEO, conversiones y continuidad operativa.",
    solution:
      "Construimos una base técnica estable, medible y escalable para que la web pueda evolucionar sin rehacerse.",
    useCases: [
      "Ejemplo de uso en empresas B2B: integrar formularios, analítica y nuevas páginas por servicio.",
      "Ejemplo de uso en negocios con campañas: crear landings rápidas con seguimiento de conversiones.",
      "Ejemplo de uso en operaciones con documentación: conectar formularios con procesos internos.",
    ],
  },
  "agencia-diseno-web-chile": {
    problem:
      "Cuando estrategia, diseño y desarrollo quedan separados, el proyecto avanza sin una línea clara y se diluye el resultado comercial.",
    solution:
      "Zyteron concentra diagnóstico, estructura, diseño y ejecución técnica en una misma ruta de trabajo.",
    useCases: [
      "Ejemplo de uso en empresas con varias líneas de servicio: definir una arquitectura comercial coherente.",
      "Ejemplo de uso en marcas en crecimiento: mejorar posicionamiento y conversión sin coordinar varios proveedores.",
      "Ejemplo de uso en negocios con bajo rendimiento web: priorizar mejoras con foco en leads.",
    ],
  },
  "diseno-web-santiago": {
    problem:
      "Competir en búsquedas locales exige una propuesta clara, contexto territorial y una página que responda a la intención real del cliente.",
    solution:
      "Creamos landings con enfoque local para Santiago, reforzando cobertura, señales de confianza y rutas directas a cotizar.",
    useCases: [
      "Ejemplo de uso en servicios técnicos: cubrir comunas prioritarias y facilitar contacto rápido.",
      "Ejemplo de uso en empresas B2B locales: separar atención en Santiago del resto del país.",
      "Ejemplo de uso en oficinas profesionales: reforzar presencia en búsquedas por comuna o zona.",
    ],
  },
  "creacion-de-sitios-web-para-empresas": {
    problem:
      "Partir un sitio desde cero suele retrasarse cuando no hay claridad sobre alcance, prioridades ni estructura comercial.",
    solution:
      "Guiamos el proyecto desde el levantamiento inicial hasta la publicación con una metodología clara y entregables por etapa.",
    useCases: [
      "Ejemplo de uso en empresas sin sitio previo: lanzar una primera versión sólida y escalable.",
      "Ejemplo de uso en rebranding: reconstruir la presencia digital con nueva narrativa y páginas clave.",
      "Ejemplo de uso en equipos comerciales: salir rápido con servicios, casos y contacto visibles.",
    ],
  },
  "paginas-web-para-pymes": {
    problem:
      "Muchas pymes dependen solo de redes sociales o recomendaciones y pierden oportunidades por falta de una web clara y profesional.",
    solution:
      "Diseñamos sitios simples de administrar, enfocados en explicar servicios, generar confianza y recibir consultas reales.",
    useCases: [
      "Ejemplo de uso en talleres o servicios locales: mostrar trabajo, cobertura y WhatsApp comercial.",
      "Ejemplo de uso en profesionales independientes: centralizar servicios, credenciales y contacto.",
      "Ejemplo de uso en pymes B2B: ordenar servicios y responder objeciones frecuentes desde la web.",
    ],
  },
  "landing-pages-para-empresas": {
    problem:
      "Las campañas pierden rendimiento cuando el tráfico llega a páginas genéricas sin una ruta clara hacia la conversión.",
    solution:
      "Construimos landings orientadas a una sola oferta, con mensajes concretos, pruebas de confianza y CTA visibles.",
    useCases: [
      "Ejemplo de uso en campañas de Google Ads: aterrizar una búsqueda con una propuesta específica.",
      "Ejemplo de uso en lanzamientos: captar contactos para un servicio nuevo o una promoción acotada.",
      "Ejemplo de uso en ventas consultivas: filtrar leads antes de la reunión comercial.",
    ],
  },
  "mantencion-web-chile": {
    problem:
      "Una web sin mantención acumula fallas menores, pérdida de rendimiento y riesgos que terminan afectando ventas e indexación.",
    solution:
      "Ofrecemos continuidad técnica para resolver ajustes, prevenir incidencias y priorizar mejoras según impacto real.",
    useCases: [
      "Ejemplo de uso en sitios corporativos: actualizar contenido, revisar formularios y corregir errores técnicos.",
      "Ejemplo de uso en ecommerce: monitorear flujos clave y mantener estabilidad operativa.",
      "Ejemplo de uso en webs heredadas: ordenar una base existente antes de crecer con nuevas páginas.",
    ],
  },
  "seo-para-empresas-chile": {
    problem:
      "Publicar contenido sin arquitectura ni base técnica correcta suele generar páginas que no posicionan ni convierten.",
    solution:
      "Trabajamos prioridades SEO reales: estructura, metadata, enlazado interno, rendimiento y contenido alineado a intención de búsqueda.",
    useCases: [
      "Ejemplo de uso en empresas B2B: crear páginas por servicio con mejor enfoque comercial.",
      "Ejemplo de uso en negocios locales: reforzar señales geográficas y rutas a contacto.",
      "Ejemplo de uso en sitios con tráfico estancado: ordenar la base técnica antes de escalar contenidos.",
    ],
  },
};

export function generateStaticParams() {
  // Los slugs con redirect 301 en next.config.ts no se construyen: nunca son
  // alcanzables y solo inflan el build.
  return servicePages
    .filter((service) => !CONSOLIDATED_SERVICE_SLUGS.has(service.slug))
    .map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServicePageBySlug(slug);

  if (!service) {
    return createPageMetadata({
      title: "Servicio no encontrado",
      description: "La pagina solicitada no existe.",
      path: `/servicios/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: service.metaTitle,
    description: service.metaDescription,
    path: `/servicios/${service.slug}`,
  });
}

export default async function ServicioDetallePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getServicePageBySlug(slug);

  if (!service) {
    notFound();
  }

  const servicePath = `/servicios/${service.slug}`;
  const serviceExamples = serviceExamplesBySlug[service.slug];
  const relatedServices = service.relatedSlugs
    .map((slug) => getServicePageBySlug(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
  const whatsappUrl = `${WHATSAPP_BASE}?text=${encodeURIComponent(
    `Hola Zyteron, quiero cotizar ${service.navLabel} para mi empresa.`,
  )}`;

  return (
    <main className="bg-white">
      <JsonLd
        id={`webpage-schema-${service.slug}`}
        data={buildWebPageJsonLd({
          path: servicePath,
          title: service.metaTitle,
          description: service.metaDescription,
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Servicios", path: "/servicios" },
            { name: service.navLabel, path: servicePath },
          ],
        })}
      />
      <JsonLd
        id={`service-schema-${service.slug}`}
        data={buildServiceJsonLd({
          path: servicePath,
          name: service.navLabel,
          description: service.summary,
          serviceType: service.primaryKeyword,
        })}
      />
      <JsonLd id={`faq-schema-${service.slug}`} data={buildFaqJsonLd(service.faqs)} />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="relative z-10 space-y-6">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-blue-700">
              Inicio
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <Link href="/servicios" className="hover:text-blue-700">
              Servicios
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-700">{service.navLabel}</span>
          </nav>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            {service.heroTitle}
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            {service.heroDescription}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/cotizador">
                Cotizar este servicio <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 font-semibold text-slate-800 hover:bg-slate-50">
              <Link href={`/contacto?servicio=${service.slug}`}>
                Solicitar propuesta <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 font-semibold text-slate-800 hover:bg-slate-50">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 font-semibold text-slate-800 hover:bg-slate-50">
              <a href={`tel:${siteConfig.contact.phone}`}>Llamar al {siteConfig.contact.phoneDisplay}</a>
            </Button>
          </div>
        </Container>
      </section>

      <section className="cv-auto border-b border-slate-200 py-16">
        <Container className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Resumen del servicio
            </p>
            <p className="text-sm leading-relaxed text-slate-600">{service.summary}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <article className="card-premium p-5">
                <h2 className="text-base font-extrabold text-slate-900">Problema habitual</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {serviceExamples?.problem ?? service.summary}
                </p>
              </article>
              <article className="card-premium p-5">
                <h2 className="text-base font-extrabold text-slate-900">Cómo ayuda Zyteron</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {serviceExamples?.solution ??
                    "Definimos una solución técnica y comercial clara para que el servicio responda al problema real del negocio."}
                </p>
              </article>
            </div>
          </div>
          <div className="card-premium p-6">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
              Ideal para
            </p>
            <ul className="space-y-3">
              {service.idealFor.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="cv-auto section-alt py-16">
        <Container className="grid gap-8 lg:grid-cols-2">
          <div className="card-premium p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Qué incluye este servicio</h2>
            <ul className="space-y-2">
              {service.deliverables.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="card-premium p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Proceso de trabajo</h2>
            <ol className="space-y-3">
              {service.process.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm text-slate-700">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {serviceExamples?.useCases?.length ? (
        <section className="cv-auto border-t border-slate-200 bg-white py-16">
          <Container className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <article className="space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Ejemplos referenciales</p>
                <h2 className="text-2xl font-extrabold text-slate-900">Ejemplos de uso por rubro</h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  Estos escenarios son referenciales y sirven para visualizar cómo se puede aplicar el servicio según el tipo de empresa.
                </p>
              </div>
              <div className="grid gap-3">
                {serviceExamples.useCases.map((item) => (
                  <div key={item} className="card-premium flex items-start gap-3 p-4">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                    <p className="text-sm leading-relaxed text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </article>

            <aside className="card-premium p-6">
              <h2 className="mb-4 text-xl font-extrabold text-slate-900">Enlaces internos útiles</h2>
              <div className="space-y-3">
                <Link href="/planes" className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-blue-200 hover:bg-white">
                  <span className="text-sm font-bold text-slate-900">Revisar planes y valores referenciales</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">Compara rangos base antes de cotizar este servicio.</span>
                </Link>
                <Link href="/cotizador" className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-blue-200 hover:bg-white">
                  <span className="text-sm font-bold text-slate-900">Ir al cotizador</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">Completa el formulario y envía tu requerimiento con más contexto.</span>
                </Link>
                <Link href={`/contacto?servicio=${service.slug}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition-colors hover:border-blue-200 hover:bg-white">
                  <span className="text-sm font-bold text-slate-900">Hablar con un especialista</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">Solicita orientación comercial para definir alcance y prioridades.</span>
                </Link>
              </div>
            </aside>
          </Container>
        </section>
      ) : null}

      <section className="cv-auto border-t border-slate-200 py-16">
        <Container className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">FAQ</p>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Preguntas frecuentes sobre {service.navLabel.toLowerCase()}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {service.faqs.map((faq) => (
              <article key={faq.question} className="card-premium p-6">
                <h3 className="mb-2 text-sm font-bold text-slate-900">{faq.question}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="cv-auto section-alt border-t border-slate-200 py-16">
        <Container className="space-y-6">
          <h2 className="text-2xl font-extrabold text-slate-900">Servicios relacionados</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {relatedServices.map((related) => (
              <Link
                key={related.slug}
                href={CANONICAL_SERVICE_PATHS[related.slug] ?? `/servicios/${related.slug}`}
                className="card-premium p-5 transition-colors hover:border-blue-200"
              >
                <h3 className="mb-2 text-base font-bold text-slate-900">{related.navLabel}</h3>
                <p className="text-sm text-slate-600">{related.summary}</p>
              </Link>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Páginas web en Santiago",
                description: "Nuestro servicio principal para empresas y pymes de Santiago y la Región Metropolitana.",
                href: "/paginas-web-santiago",
              },
              {
                title: "Blog comercial",
                description: "Guías para ejecutar esta estrategia con menos riesgo.",
                href: "/blog",
              },
              {
                title: "FAQ de servicio",
                description: "Respuestas clave antes de definir alcance y presupuesto.",
                href: "/faq",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card-premium p-5 transition-colors hover:border-blue-200"
              >
                <h3 className="mb-2 text-base font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/cotizador">
                Ir al cotizador <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 font-semibold text-slate-800 hover:bg-slate-50">
              <Link href={`/contacto?servicio=${service.slug}`}>Hablar con un especialista</Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 font-semibold text-slate-800 hover:bg-slate-50">
              <Link href="/servicios">Ver todos los servicios</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
