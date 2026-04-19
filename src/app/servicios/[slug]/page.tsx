import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { servicePages, getServicePageBySlug } from "@/content/service-pages";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
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

export function generateStaticParams() {
  return servicePages.map((service) => ({ slug: service.slug }));
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
    keywords: [service.primaryKeyword, ...service.secondaryKeywords],
  });
}

export default async function ServicioDetallePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getServicePageBySlug(slug);

  if (!service) {
    notFound();
  }

  const servicePath = `/servicios/${service.slug}`;
  const relatedServices = service.relatedSlugs
    .map((slug) => getServicePageBySlug(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

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
          <Link href="/servicios" className="badge-blue w-fit hover:opacity-90">
            Volver a servicios
          </Link>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            {service.heroTitle}
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            {service.heroDescription}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">
                Solicitar propuesta <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 font-semibold text-slate-800 hover:bg-slate-50">
              <Link href="/paquetes">Ver planes y cotizar</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="cv-auto border-b border-slate-200 py-16">
        <Container className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Resumen del servicio
            </p>
            <p className="text-sm leading-relaxed text-slate-600">{service.summary}</p>
            <div className="space-y-2">
              {service.secondaryKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="mr-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {keyword}
                </span>
              ))}
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
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Que incluye este servicio</h2>
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

      <section className="cv-auto border-t border-slate-200 py-16">
        <Container className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">FAQ</p>
            <h2 className="text-2xl font-extrabold text-slate-900">
              Preguntas frecuentes sobre {service.primaryKeyword}
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
                href={`/servicios/${related.slug}`}
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
                title: "Casos de éxito",
                description: "Revisa implementaciones modelo y enfoque aplicado.",
                href: "/casos-exito",
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
              <Link href="/contacto">
                Hablar con un especialista <ArrowRight className="h-4 w-4" />
              </Link>
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
