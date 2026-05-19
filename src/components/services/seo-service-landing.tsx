import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircle, SearchCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import type { SeoServicePage } from "@/content/seo-service-pages";
import { buildFaqJsonLd, buildServiceJsonLd, buildWebPageJsonLd } from "@/lib/seo";

const WHATSAPP_PHONE = "56984752936";

type Props = {
  page: SeoServicePage;
};

export function SeoServiceLanding({ page }: Props) {
  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    `Hola Zyteron, quiero cotizar ${page.navLabel} para mi empresa.`,
  )}`;

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
            { name: page.navLabel, path: page.path },
          ],
        })}
      />
      <JsonLd
        id={`${page.slug}-service-schema`}
        data={buildServiceJsonLd({
          path: page.path,
          name: page.navLabel,
          description: page.metaDescription,
          serviceType: page.serviceType,
        })}
      />
      <JsonLd id={`${page.slug}-faq-schema`} data={buildFaqJsonLd(page.faqs)} />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-18 sm:py-20">
        <Container className="space-y-6">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-blue-700">
              Inicio
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <Link href="/servicios" className="hover:text-blue-700">
              Servicios
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-700">{page.navLabel}</span>
          </nav>

          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Servicio SEO prioritario
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="space-y-5">
              <h1 className="max-w-5xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                {page.heroTitle}
              </h1>
              <p className="max-w-4xl text-base leading-relaxed text-slate-600 sm:text-lg">
                {page.heroDescription}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-blue-700 font-bold text-white hover:bg-blue-800">
                  <Link href={`/contacto?servicio=${page.slug}`}>
                    {page.primaryCta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                  <Link href="/planes">Ver planes</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
                  </a>
                </Button>
              </div>
            </div>

            <aside className="card-premium p-6">
              <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <SearchCheck className="h-5 w-5 text-blue-700" />
                Enfoque del servicio
              </p>
              <div className="flex flex-wrap gap-2">
                {[page.primaryKeyword, ...page.secondaryKeywords].map((keyword) => (
                  <span key={keyword} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {keyword}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Atendemos proyectos para pymes, emprendedores y empresas de Santiago, Región Metropolitana y distintas regiones de Chile.
              </p>
            </aside>
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <article className="card-premium p-6">
            <h2 className="text-2xl font-extrabold text-slate-900">{page.problemTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              {page.problemDescription}
            </p>
          </article>

          <div className="grid gap-4 md:grid-cols-2">
            {page.benefits.map((benefit) => (
              <div key={benefit} className="card-premium flex items-start gap-3 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <p className="text-sm leading-relaxed text-slate-700">{benefit}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-6 lg:grid-cols-3">
          <article className="card-premium p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Qué incluye</h2>
            <div className="space-y-2">
              {page.includes.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card-premium p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Para quién es</h2>
            <div className="space-y-2">
              {page.audience.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card-premium p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Enlaces internos útiles</h2>
            <div className="space-y-2">
              {page.relatedLinks.slice(0, 5).map((link) => (
                <Link key={`${link.href}-${link.label}`} href={link.href} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-blue-200 hover:bg-white">
                  <span className="text-sm font-bold text-slate-900">{link.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">{link.description}</span>
                </Link>
              ))}
            </div>
          </article>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-8">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Metodología</p>
            <h2 className="text-3xl font-extrabold text-slate-900">Proceso de trabajo claro y por etapas</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {page.process.map((step, index) => (
              <article key={step.title} className="card-premium border-t-4 border-t-blue-200 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Paso {index + 1}</p>
                <h3 className="mt-1 text-base font-extrabold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">FAQ</p>
            <h2 className="text-3xl font-extrabold text-slate-900">Preguntas frecuentes sobre {page.navLabel.toLowerCase()}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {page.faqs.map((faq) => (
              <article key={faq.question} className="card-premium p-5">
                <h3 className="text-sm font-extrabold text-slate-900">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl section-blue p-8 text-white md:p-10">
            <h2 className="text-2xl font-extrabold sm:text-3xl">{page.finalCtaTitle}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-blue-100 sm:text-base">
              {page.finalCtaCopy}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="bg-white font-bold text-blue-800 hover:bg-blue-50">
                <Link href={`/contacto?servicio=${page.slug}`}>
                  Solicitar asesoría <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/35 text-white hover:bg-white/10 hover:text-white">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  Hablar por WhatsApp
                </a>
              </Button>
            </div>
          </div>

          <aside className="card-premium p-6">
            <h2 className="text-xl font-extrabold text-slate-900">Más recursos para decidir</h2>
            <div className="mt-4 space-y-2">
              {page.relatedLinks.slice(5).map((link) => (
                <Link key={`${link.href}-${link.label}`} href={link.href} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-blue-200 hover:bg-white">
                  <span className="text-sm font-bold text-slate-900">{link.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">{link.description}</span>
                </Link>
              ))}
            </div>
          </aside>
        </Container>
      </section>
    </main>
  );
}
