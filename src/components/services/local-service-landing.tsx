import Link from "next/link";
import { ArrowRight, CheckCircle2, MapPin, MessageCircle } from "lucide-react";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { buildFaqJsonLd, buildLocalLandingJsonLd } from "@/lib/seo";
import type { LocalServicePageViewModel } from "@/lib/local-service-pages";
import { siteConfig } from "@/config/site";

type Props = {
  page: LocalServicePageViewModel;
};

export function LocalServiceLanding({ page }: Props) {
  const whatsappUrl = `${siteConfig.social.whatsapp}?text=${encodeURIComponent(
    `Hola Zyteron, quiero cotizar ${page.service.serviceName.toLowerCase()} en ${page.ubicacion.nombre} para mi empresa.`,
  )}`;

  return (
    <main className="bg-white">
      <JsonLd
        id={`${page.service.key}-${page.ubicacion.slug}-schema`}
        data={buildLocalLandingJsonLd({
          path: page.path,
          title: page.metaTitle,
          description: page.metaDescription,
          serviceName: page.service.serviceName,
          serviceType: page.service.serviceType,
          locationName: page.ubicacion.nombre,
          region: page.ubicacion.region,
          latitude: page.ubicacion.latitud,
          longitude: page.ubicacion.longitud,
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: page.service.serviceName, path: page.service.basePath },
            { name: page.ubicacion.nombre, path: page.path },
          ],
        })}
      />
      <JsonLd
        id={`${page.service.key}-${page.ubicacion.slug}-faq-schema`}
        data={buildFaqJsonLd(page.faqs)}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5">
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Cobertura local
          </div>
          <h1 className="max-w-5xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            {page.heroTitle}
          </h1>
          <p className="max-w-4xl text-base leading-relaxed text-slate-600 sm:text-lg">
            {page.heroDescription}
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-blue-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5">
              <MapPin className="h-4 w-4" />
              {page.ubicacion.nombre}, {page.ubicacion.region}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-700">
              Base operativa: {siteConfig.address.display}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild size="lg" className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/cotizador">
                Solicitar cotización <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href={page.service.relatedHref}>{page.service.relatedLabel}</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="grid gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              {page.service.serviceName} en {page.ubicacion.nombre}
            </p>
            {page.introParagraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-slate-700 sm:text-base">
                {paragraph}
              </p>
            ))}
          </div>

          <aside className="card-premium p-6">
            <h2 className="text-xl font-extrabold text-slate-900">Señales clave para este proyecto</h2>
            <div className="mt-4 space-y-3">
              {page.localSignals.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-6 lg:grid-cols-2">
          <article className="card-premium p-6">
            <h2 className="mb-4 text-2xl font-extrabold text-slate-900">Qué incluye normalmente</h2>
            <div className="space-y-3">
              {page.deliverables.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card-premium p-6">
            <h2 className="mb-4 text-2xl font-extrabold text-slate-900">Ideal para</h2>
            <div className="space-y-3">
              {page.idealFor.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">FAQ local</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Preguntas frecuentes sobre {page.service.serviceName.toLowerCase()} en {page.ubicacion.nombre}
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {page.faqs.map((faq) => (
              <article key={faq.question} className="card-premium p-5">
                <h3 className="text-sm font-bold text-slate-900">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="rounded-2xl section-blue p-8 text-center text-white md:p-10">
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            ¿Necesitas {page.service.serviceName.toLowerCase()} en {page.ubicacion.nombre}?
          </h2>
          <p className="mx-auto mt-3 max-w-3xl text-sm text-blue-100 sm:text-base">
            Cuéntanos el objetivo de tu negocio, el alcance inicial y la urgencia del proyecto. Te responderemos con
            una propuesta clara y una ruta realista de implementación.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white font-bold text-blue-800 hover:bg-blue-50">
              <Link href="/contacto">Solicitar propuesta</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                Hablar por WhatsApp
              </a>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
