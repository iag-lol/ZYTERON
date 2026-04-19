import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { getLocalPageBySlug, localPages } from "@/content/local-pages";
import { buildFaqJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

type LocalPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return localPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: LocalPageProps): Promise<Metadata> {
  const { slug } = await params;
  const cityPage = getLocalPageBySlug(slug);

  if (!cityPage) {
    return createPageMetadata({
      title: "Ciudad no encontrada",
      description: "La página solicitada no existe.",
      path: `/ciudades/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: cityPage.metaTitle,
    description: cityPage.metaDescription,
    path: `/ciudades/${cityPage.slug}`,
    keywords: [
      `diseño web ${cityPage.city.toLowerCase()}`,
      `desarrollo web ${cityPage.city.toLowerCase()}`,
      "seo local chile",
    ],
  });
}

export default async function CiudadDetallePage({ params }: LocalPageProps) {
  const { slug } = await params;
  const cityPage = getLocalPageBySlug(slug);

  if (!cityPage) {
    notFound();
  }

  return (
    <main className="bg-white">
      <JsonLd
        id={`ciudad-webpage-schema-${cityPage.slug}`}
        data={buildWebPageJsonLd({
          path: `/ciudades/${cityPage.slug}`,
          title: cityPage.metaTitle,
          description: cityPage.metaDescription,
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Ciudades", path: "/ciudades" },
            { name: cityPage.city, path: `/ciudades/${cityPage.slug}` },
          ],
        })}
      />
      <JsonLd
        id={`ciudad-faq-schema-${cityPage.slug}`}
        data={buildFaqJsonLd(cityPage.faqs)}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="relative z-10 space-y-5">
          <Link href="/ciudades" className="badge-blue w-fit hover:opacity-90">
            Volver a ciudades
          </Link>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            {cityPage.heroTitle}
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">{cityPage.heroDescription}</p>
          <p className="text-sm font-semibold text-blue-700">
            Cobertura prioritaria: {cityPage.city}, {cityPage.region}
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid gap-8 lg:grid-cols-2">
          <article className="card-premium p-6">
            <h2 className="mb-4 text-2xl font-extrabold text-slate-900">
              Contexto comercial local
            </h2>
            <ul className="space-y-2 text-sm text-slate-700">
              {cityPage.businessContext.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
          <article className="card-premium p-6">
            <h2 className="mb-4 text-2xl font-extrabold text-slate-900">
              Oportunidades prioritarias
            </h2>
            <ul className="space-y-2 text-sm text-slate-700">
              {cityPage.opportunities.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </Container>
      </section>

      <section className="section-alt border-y border-slate-200 py-16">
        <Container className="space-y-8">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Preguntas frecuentes en {cityPage.city}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {cityPage.faqs.map((faq) => (
              <article key={faq.question} className="card-premium p-6">
                <h3 className="mb-2 text-sm font-bold text-slate-900">{faq.question}</h3>
                <p className="text-sm text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">
                Solicitar propuesta local <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/servicios/diseno-web-chile">Ver servicio de diseño web</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
