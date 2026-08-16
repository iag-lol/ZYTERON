import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, CircleAlert, MessageCircle } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import { getVerticalPageBySlug, verticalPages } from "@/content/vertical-pages";
import {
  buildFaqJsonLd,
  buildServiceJsonLd,
  buildWebPageJsonLd,
  createPageMetadata,
} from "@/lib/seo";

type VerticalPageProps = {
  params: Promise<{ vertical: string }>;
};

export function generateStaticParams() {
  return verticalPages.map((page) => ({ vertical: page.slug }));
}

export async function generateMetadata({ params }: VerticalPageProps): Promise<Metadata> {
  const { vertical } = await params;
  const page = getVerticalPageBySlug(vertical);

  if (!page) {
    return createPageMetadata({
      title: "Página no encontrada",
      description: "La página solicitada no existe.",
      path: `/paginas-web/${vertical}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: page.metaTitle,
    description: page.metaDescription,
    path: page.path,
  });
}

export default async function VerticalRoutePage({ params }: VerticalPageProps) {
  const { vertical } = await params;
  const page = getVerticalPageBySlug(vertical);

  if (!page) notFound();

  const whatsappUrl = `${siteConfig.social.whatsapp}?text=${encodeURIComponent(
    `Hola Zyteron, quiero cotizar una página web para mi empresa de ${page.navLabel.toLowerCase()}.`,
  )}`;

  return (
    <main className="bg-white">
      <JsonLd
        id={`vertical-webpage-${page.slug}`}
        data={buildWebPageJsonLd({
          path: page.path,
          title: page.metaTitle,
          description: page.metaDescription,
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Páginas web", path: "/desarrollo-web" },
            { name: page.navLabel, path: page.path },
          ],
        })}
      />
      <JsonLd
        id={`vertical-service-${page.slug}`}
        data={buildServiceJsonLd({
          path: page.path,
          name: page.metaTitle,
          description: page.metaDescription,
          serviceType: page.primaryKeyword,
        })}
      />
      <JsonLd id={`vertical-faq-${page.slug}`} data={buildFaqJsonLd(page.faqs)} />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-16 sm:py-20">
        <Container className="space-y-5">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-blue-700">
              Inicio
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <Link href="/desarrollo-web" className="hover:text-blue-700">
              Páginas web
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-700">{page.navLabel}</span>
          </nav>

          <h1 className="max-w-4xl text-balance text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            {page.heroTitle}
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {page.heroDescription}
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="btn-primary-glow gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800"
            >
              <Link href="/cotizador">
                Cotizar página web <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-slate-300 font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Link href="/calculadora-precio-pagina-web">Calcular precio estimado</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-slate-300 font-semibold text-slate-800 hover:bg-slate-50"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
              </a>
            </Button>
          </div>
        </Container>
      </section>

      <section className="cv-auto section-alt py-16">
        <Container className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Lo que vemos en el rubro
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Problemas concretos que resuelve una web bien hecha
            </h2>
            <ul className="space-y-3 pt-2">
              {page.painPoints.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="card-premium p-6">
            <h2 className="text-xl font-extrabold text-slate-900">Qué construimos para este rubro</h2>
            <ul className="mt-4 space-y-3">
              {page.capabilities.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="cv-auto border-t border-slate-200 bg-white py-16">
        <Container className="space-y-8">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Escenarios referenciales
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Cómo se aplica según el tipo de empresa
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Estos escenarios son ejemplos construidos para ilustrar la solución, no clientes
              reales. Sirven para que reconozcas cuál se parece más a tu operación.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {page.scenarios.map((scenario) => (
              <article key={scenario.title} className="card-premium p-5">
                <h3 className="text-sm font-extrabold text-slate-900">{scenario.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{scenario.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="cv-auto section-alt py-16">
        <Container className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Estructura</p>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Secciones que suele necesitar este tipo de sitio
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Es un punto de partida, no una plantilla cerrada. En el levantamiento definimos la
              estructura final según tus servicios y tu proceso comercial.
            </p>
          </div>
          <ol className="grid gap-2.5 sm:grid-cols-2">
            {page.siteStructure.map((section, index) => (
              <li
                key={section}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-700"
              >
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                  {index + 1}
                </span>
                {section}
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section className="cv-auto border-t border-slate-200 bg-white py-16">
        <Container className="space-y-8">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">FAQ</p>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Preguntas frecuentes de este rubro
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {page.faqs.map((faq) => (
              <article key={faq.question} className="card-premium p-6">
                <h3 className="mb-2 text-sm font-bold text-slate-900">{faq.question}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="cv-auto section-blue py-16 text-white">
        <Container className="space-y-5 text-center">
          <h2 className="text-2xl font-extrabold sm:text-3xl">{page.finalCtaTitle}</h2>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
            {page.finalCtaCopy}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild size="lg" className="bg-white font-bold text-blue-800 hover:bg-blue-50">
              <Link href="/cotizador">
                Cotizar página web <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/35 bg-transparent font-semibold text-white hover:bg-white/10 hover:text-white"
            >
              <Link href={page.relatedService.href}>{page.relatedService.label}</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="cv-auto border-t border-slate-200 bg-white py-14">
        <Container className="space-y-5">
          <h2 className="text-xl font-extrabold text-slate-900">Páginas web por rubro</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {verticalPages
              .filter((item) => item.slug !== page.slug)
              .map((item) => (
                <Link
                  key={item.slug}
                  href={item.path}
                  className="card-premium p-5 transition-colors hover:border-blue-200"
                >
                  <h3 className="text-base font-bold text-slate-900">{item.navLabel}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.heroTitle}</p>
                </Link>
              ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
