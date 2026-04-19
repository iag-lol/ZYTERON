import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, MapPin } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { caseStudies, getCaseStudyBySlug } from "@/content/case-studies";
import { getLocalPageBySlug } from "@/content/local-pages";
import { getServicePageBySlug } from "@/content/service-pages";
import { buildArticleJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

type CaseDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return caseStudies.map((caseStudy) => ({ slug: caseStudy.slug }));
}

export async function generateMetadata({ params }: CaseDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const caseStudy = getCaseStudyBySlug(slug);

  if (!caseStudy) {
    return createPageMetadata({
      title: "Caso no encontrado",
      description: "El caso solicitado no existe.",
      path: `/casos-exito/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: caseStudy.metaTitle,
    description: caseStudy.metaDescription,
    path: `/casos-exito/${caseStudy.slug}`,
    keywords: ["caso de exito web", caseStudy.industry.toLowerCase(), "agencia diseno web chile"],
  });
}

export default async function CaseDetailPage({ params }: CaseDetailProps) {
  const { slug } = await params;
  const caseStudy = getCaseStudyBySlug(slug);

  if (!caseStudy) {
    notFound();
  }

  const relatedServices = caseStudy.relatedServices
    .map((slug) => getServicePageBySlug(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const relatedCities = caseStudy.relatedCities
    .map((slug) => getLocalPageBySlug(slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const casePath = `/casos-exito/${caseStudy.slug}`;

  return (
    <main className="bg-white">
      <JsonLd
        id={`case-webpage-schema-${caseStudy.slug}`}
        data={buildWebPageJsonLd({
          path: casePath,
          title: caseStudy.metaTitle,
          description: caseStudy.metaDescription,
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Casos de éxito", path: "/casos-exito" },
            { name: caseStudy.title, path: casePath },
          ],
        })}
      />
      <JsonLd
        id={`case-article-schema-${caseStudy.slug}`}
        data={buildArticleJsonLd({
          path: casePath,
          title: caseStudy.title,
          description: caseStudy.summary,
          datePublished: caseStudy.publishedAt,
          dateModified: caseStudy.updatedAt,
        })}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="relative z-10 space-y-5">
          <Link href="/casos-exito" className="badge-blue w-fit hover:opacity-90">
            Volver a casos de éxito
          </Link>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            {caseStudy.title}
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">{caseStudy.summary}</p>
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
              <MapPin className="h-3.5 w-3.5" />
              {caseStudy.location}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
              <CalendarDays className="h-3.5 w-3.5" />
              Publicado: {caseStudy.publishedAt}
            </span>
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid gap-8 lg:grid-cols-2">
          <article className="card-premium p-6">
            <h2 className="mb-4 text-2xl font-extrabold text-slate-900">Desafío</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              {caseStudy.challenge.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="card-premium p-6">
            <h2 className="mb-4 text-2xl font-extrabold text-slate-900">Estrategia</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              {caseStudy.strategy.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </Container>
      </section>

      <section className="section-alt border-y border-slate-200 py-16">
        <Container className="grid gap-8 lg:grid-cols-2">
          <article className="card-premium p-6">
            <h2 className="mb-4 text-2xl font-extrabold text-slate-900">Implementación</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              {caseStudy.implementation.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article className="card-premium p-6">
            <h2 className="mb-4 text-2xl font-extrabold text-slate-900">Resultado observado</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              {caseStudy.outcomes.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
            {caseStudy.notes?.length ? (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Nota</p>
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {caseStudy.notes.map((note) => (
                    <li key={note} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            <article className="card-premium p-6">
              <h2 className="mb-4 text-xl font-extrabold text-slate-900">Servicios relacionados</h2>
              <ul className="space-y-2 text-sm">
                {relatedServices.map((service) => (
                  <li key={service.slug}>
                    <Link
                      href={`/servicios/${service.slug}`}
                      className="text-blue-700 transition-colors hover:text-blue-900"
                    >
                      {service.navLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>

            <article className="card-premium p-6">
              <h2 className="mb-4 text-xl font-extrabold text-slate-900">Cobertura local asociada</h2>
              <ul className="space-y-2 text-sm">
                {relatedCities.map((city) => (
                  <li key={city.slug}>
                    <Link
                      href={`/ciudades/${city.slug}`}
                      className="text-blue-700 transition-colors hover:text-blue-900"
                    >
                      Diseño web en {city.city}
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">
                Quiero una estrategia similar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/blog">Leer guía de implementación</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
