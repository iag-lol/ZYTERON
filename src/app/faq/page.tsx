import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { faqCategories, flatFaqItems } from "@/content/faq-content";
import { buildFaqJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "FAQ para empresas y pymes",
  description:
    "Preguntas frecuentes sobre cotización, tiempos, alcance, sistemas web, paneles administrativos y soporte post-entrega en Chile.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="faq-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/faq",
          title: "FAQ para empresas y pymes",
          description: "Centro de preguntas frecuentes de ZYTERON.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "FAQ", path: "/faq" },
          ],
        })}
      />
      <JsonLd id="faq-page-schema" data={buildFaqJsonLd(flatFaqItems)} />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Preguntas frecuentes
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">Respuestas claras para cotizar con confianza</h1>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            Reunimos dudas comunes de empresas, pymes y emprendedores para que tomes decisiones con mejor información.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-8">
          {faqCategories.map((category) => (
            <section key={category.title} className="card-premium p-6">
              <h2 className="mb-4 text-2xl font-extrabold text-slate-900">{category.title}</h2>
              <div className="space-y-4">
                {category.items.map((faq) => (
                  <article key={faq.question}>
                    <h3 className="mb-1 text-sm font-bold text-slate-900">{faq.question}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}

          <div className="rounded-2xl section-blue p-7 text-center text-white">
            <h2 className="text-2xl font-extrabold">¿Tienes una duda específica de tu proyecto?</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">
              Podemos revisar tu caso y orientarte en alcance, tiempos y forma de trabajo antes de iniciar.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button asChild className="bg-white font-bold text-blue-800 hover:bg-blue-50">
                <Link href="/contacto">
                  Hablar con un especialista <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <Link href="/cotizador">Cotizar página web</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
