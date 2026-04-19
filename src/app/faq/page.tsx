import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { faqCategories, flatFaqItems } from "@/content/faq-content";
import { buildFaqJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "FAQ de diseño web, desarrollo y SEO para empresas en Chile",
  description:
    "Preguntas frecuentes sobre páginas web para empresas, SEO, mantención y cotización de proyectos digitales en Chile.",
  path: "/faq",
  keywords: ["faq diseno web chile", "preguntas diseno web empresas", "seo para empresas chile"],
});

export default function FaqPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="faq-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/faq",
          title: "FAQ de diseño web, desarrollo y SEO para empresas en Chile",
          description: "Centro de preguntas frecuentes de Zyteron para empresas y pymes en Chile.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "FAQ", path: "/faq" },
          ],
        })}
      />
      <JsonLd id="faq-page-schema" data={buildFaqJsonLd(flatFaqItems)} />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="relative z-10 space-y-5">
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            FAQ
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Respuestas claras para decisiones web y SEO en Chile
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">
            Reunimos las preguntas más comunes de empresas y pymes para ayudarte a definir alcance,
            tiempos y estrategia digital sin improvisar.
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

          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">
                Resolver mi caso con un especialista <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/servicios">Ver servicios</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
