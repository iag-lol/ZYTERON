import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BarChart3, CheckCircle2, LockKeyhole, Target } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { caseStudies, getCaseStudyBySlug } from "@/content/case-studies";
import { getServicePageBySlug } from "@/content/service-pages";
import {
  buildArticleJsonLd,
  buildWebPageJsonLd,
  createPageMetadata,
} from "@/lib/seo";

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
      description: "El caso solicitado no está disponible.",
      path: `/casos-exito/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: caseStudy.metaTitle,
    description: caseStudy.metaDescription,
    path: `/casos-exito/${caseStudy.slug}`,
  });
}

export default async function CaseDetailPage({ params }: CaseDetailProps) {
  const { slug } = await params;
  const caseStudy = getCaseStudyBySlug(slug);

  if (!caseStudy) {
    notFound();
  }

  const casePath = `/casos-exito/${caseStudy.slug}`;
  const relatedServices = caseStudy.relatedServices
    .map((serviceSlug) => getServicePageBySlug(serviceSlug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <main className="bg-white">
      <JsonLd
        id={`${caseStudy.slug}-webpage-schema`}
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
        id={`${caseStudy.slug}-article-schema`}
        data={buildArticleJsonLd({
          path: casePath,
          title: caseStudy.title,
          description: caseStudy.summary,
          datePublished: caseStudy.publishedAt,
          dateModified: caseStudy.updatedAt,
          authorName: "Equipo Zyteron",
        })}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-blue-700">
              Inicio
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <Link href="/casos-exito" className="hover:text-blue-700">
              Casos de éxito
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-700">Caso anónimo</span>
          </nav>
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Caso anónimo documentado
          </div>
          <h1 className="max-w-5xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            {caseStudy.title}
          </h1>
          <p className="max-w-4xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {caseStudy.summary}
          </p>
          <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-blue-700">{caseStudy.industry}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{caseStudy.location}</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{caseStudy.clientProfile}</span>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href={`/contacto?caso=${caseStudy.slug}`}>
                Cotizar una solución similar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/casos-exito">Ver otros casos</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="section-alt py-12">
        <Container>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
              <LockKeyhole className="h-5 w-5 text-amber-700" />
              Nota de confidencialidad
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              Este caso se publica de forma anónima para proteger datos comerciales, operativos y contractuales. No se muestran nombres de clientes, ubicaciones exactas, documentos, imágenes internas ni métricas confidenciales.
            </p>
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="card-premium p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Problema inicial</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Qué necesitaba resolver el negocio</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{caseStudy.challenge}</p>
          </article>

          <article className="card-premium p-6">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <Target className="h-4 w-4" /> Objetivos
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {caseStudy.objectives.map((objective) => (
                <div key={objective} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <span>{objective}</span>
                </div>
              ))}
            </div>
          </article>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-6 lg:grid-cols-3">
          <article className="card-premium p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Solución diseñada</h2>
            <div className="space-y-2">
              {caseStudy.solution.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card-premium p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Implementación</h2>
            <div className="space-y-2">
              {caseStudy.implementation.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card-premium p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-slate-900">
              <BarChart3 className="h-5 w-5 text-blue-700" /> KPIs posibles
            </h2>
            <div className="space-y-2">
              {caseStudy.kpis.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Resultados operativos</p>
            <h2 className="text-3xl font-extrabold text-slate-900">Qué mejoró con la solución</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {caseStudy.outcomes.map((outcome) => (
              <div key={outcome} className="card-premium flex items-start gap-3 p-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <p className="text-sm leading-relaxed text-slate-700">{outcome}</p>
              </div>
            ))}
          </div>
          {caseStudy.notes?.length ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-extrabold text-slate-900">Consideraciones</h2>
              <div className="mt-3 space-y-2">
                {caseStudy.notes.map((note) => (
                  <p key={note} className="text-sm leading-relaxed text-slate-600">{note}</p>
                ))}
              </div>
            </div>
          ) : null}
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <article className="card-premium p-6">
            <h2 className="text-xl font-extrabold text-slate-900">Servicios relacionados</h2>
            <div className="mt-4 space-y-2">
              {relatedServices.map((service) => (
                <Link key={service.slug} href={`/servicios/${service.slug}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-blue-200 hover:bg-white">
                  <span className="text-sm font-bold text-slate-900">{service.navLabel}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">{service.summary}</span>
                </Link>
              ))}
            </div>
          </article>

          <article className="card-premium p-6">
            <h2 className="text-xl font-extrabold text-slate-900">Páginas útiles para cotizar algo similar</h2>
            <div className="mt-4 space-y-2">
              {caseStudy.relatedPages.map((page) => (
                <Link key={page.href} href={page.href} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 transition-colors hover:border-blue-200 hover:bg-white">
                  {page.label}
                </Link>
              ))}
            </div>
          </article>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="rounded-2xl section-blue p-8 text-center text-white md:p-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">¿Tu empresa tiene un problema parecido?</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-blue-100 sm:text-base">
            Podemos revisar tu flujo actual y proponer una solución digital por etapas: aplicación, sistema web, automatización, panel administrativo o mejora SEO.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white font-bold text-blue-800 hover:bg-blue-50">
              <Link href={`/contacto?caso=${caseStudy.slug}`}>Solicitar evaluación</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/casos-exito">Ver más casos</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
