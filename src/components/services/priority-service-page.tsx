import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import type { PriorityServicePage } from "@/content/priority-service-pages";
import {
  buildFaqJsonLd,
  buildProfessionalServiceJsonLd,
  buildServiceJsonLd,
  buildWebPageJsonLd,
} from "@/lib/seo";

const WHATSAPP_URL =
  `${siteConfig.social.whatsapp}?text=Hola%20ZYTERON%2C%20quiero%20cotizar%20una%20soluci%C3%B3n%20para%20mi%20empresa.`;

type Props = {
  page: PriorityServicePage;
};

export function PriorityServicePageTemplate({ page }: Props) {
  return (
    <main className="bg-white">
      <JsonLd
        id={`${page.slug}-webpage-schema`}
        data={buildWebPageJsonLd({
          path: page.path,
          title: page.metaTitle,
          description: page.metaDescription,
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Servicios", path: "/servicios" },
            { name: page.title, path: page.path },
          ],
        })}
      />
      <JsonLd
        id={`${page.slug}-professional-service-schema`}
        data={buildProfessionalServiceJsonLd({
          path: page.path,
          description: page.metaDescription,
        })}
      />
      <JsonLd
        id={`${page.slug}-service-schema`}
        data={buildServiceJsonLd({
          path: page.path,
          name: page.title,
          description: page.metaDescription,
          serviceType: page.serviceType,
        })}
      />
      <JsonLd
        id={`${page.slug}-faq-schema`}
        data={buildFaqJsonLd(
          page.faqs.map((faq) => ({
            question: faq.question,
            answer: faq.answer,
          })),
        )}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-18 sm:py-20">
        <Container className="space-y-5">
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Servicio especializado
          </div>
          <h1 className="max-w-5xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            {page.heroTitle}
          </h1>
          <p className="max-w-4xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {page.heroDescription}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/cotizador">
                {page.primaryCta} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/servicios">Ver servicios relacionados</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Hablar por WhatsApp
              </a>
            </Button>
          </div>
        </Container>
      </section>

      <section className="bg-white py-14">
        <Container className="space-y-4">
          {page.context.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-relaxed text-slate-700 sm:text-base">
              {paragraph}
            </p>
          ))}
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-6 lg:grid-cols-3">
          <article className="card-premium p-6 lg:col-span-1">
            <h2 className="mb-3 text-xl font-extrabold text-slate-900">Beneficios principales</h2>
            <div className="space-y-2">
              {page.benefits.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card-premium p-6 lg:col-span-1">
            <h2 className="mb-3 text-xl font-extrabold text-slate-900">Qué incluye</h2>
            <div className="space-y-2">
              {page.includes.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card-premium p-6 lg:col-span-1">
            <h2 className="mb-3 text-xl font-extrabold text-slate-900">Para quién es</h2>
            <div className="space-y-2">
              {page.audience.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="card-premium p-6">
            <h2 className="mb-4 text-2xl font-extrabold text-slate-900">Proceso de trabajo</h2>
            <div className="space-y-3">
              {page.process.map((item, index) => (
                <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card-premium p-6">
            <h2 className="mb-3 text-xl font-extrabold text-slate-900">Enlaces útiles</h2>
            <div className="space-y-2 text-sm">
              <Link href="/planes" className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 hover:bg-slate-100">
                Ver planes y valores referenciales
              </Link>
              <Link href="/faq" className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 hover:bg-slate-100">
                Resolver dudas frecuentes antes de cotizar
              </Link>
              <Link href="/contacto" className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-700 hover:bg-slate-100">
                Solicitar contacto comercial
              </Link>
            </div>
          </article>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="space-y-5">
          <h2 className="text-2xl font-extrabold text-slate-900">Preguntas frecuentes</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {page.faqs.map((faq) => (
              <article key={faq.question} className="card-premium p-5">
                <h3 className="text-sm font-bold text-slate-900">{faq.question}</h3>
                <p className="mt-1 text-sm text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="rounded-2xl section-blue p-8 text-center text-white md:p-10">
          <h2 className="text-2xl font-extrabold sm:text-3xl">{page.finalCtaTitle}</h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm text-blue-100 sm:text-base">{page.finalCtaCopy}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-white font-bold text-blue-800 hover:bg-blue-50">
              <Link href="/cotizador">
                Solicitar cotización <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
              </a>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
