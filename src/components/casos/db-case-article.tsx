import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Quote, Target } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import type { DbCaseStudy } from "@/lib/admin/blog-cases-repository";

const caseServiceOptions = [
  {
    href: "/sistemas-web",
    label: "Ver sistemas web",
    signals: ["sistema", "panel", "inventario", "asistencia", "control", "dashboard", "software"],
  },
  {
    href: "/tiendas-online",
    label: "Ver tiendas online",
    signals: ["ecommerce", "tienda online", "catálogo", "carrito", "producto"],
  },
  {
    href: "/automatizacion",
    label: "Ver automatización",
    signals: ["automat", "whatsapp", "notificación", "tarea repetitiva"],
  },
  {
    href: "/paginas-web-para-pymes",
    label: "Ver páginas web para pymes",
    signals: ["pyme", "emprendimiento", "negocio pequeño"],
  },
  {
    href: "/diseno-web-empresas",
    label: "Ver páginas web para empresas",
    signals: ["página web", "sitio web", "web corporativa", "landing", "seo"],
  },
] as const;

function getCaseService(item: DbCaseStudy) {
  const context = [item.companyName, item.industry, item.problem, item.solution, item.results]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    caseServiceOptions.find((service) => service.signals.some((signal) => context.includes(signal))) ??
    caseServiceOptions[0]
  );
}

/**
 * Renderiza un caso de éxito administrado en Supabase.
 * Mantiene el lenguaje visual de los casos curados.
 */
export function DbCaseArticle({ item }: { item: DbCaseStudy }) {
  const problemSummary = item.problem.trim().replace(/\s+/g, " ").split(/(?<=[.!?])\s/)[0];
  const contactHref = `/contacto?origen=caso-exito&item=${encodeURIComponent(item.slug)}`;
  const relatedService = getCaseService(item);

  return (
    <main className="bg-white">
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
            <span className="text-slate-700">{item.companyName}</span>
          </nav>
          <div className="flex flex-wrap gap-2">
            {item.industry ? (
              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {item.industry}
              </span>
            ) : null}
            {item.projectDuration ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                {item.projectDuration}
              </span>
            ) : null}
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            {item.companyName}
          </h1>
          {problemSummary ? <p className="max-w-3xl text-lg text-slate-600">{problemSummary}</p> : null}
        </Container>
      </section>

      <article className="py-16">
        <Container className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-8">
            {item.imageUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Image
                  src={item.imageUrl}
                  alt={item.imageAlt || `Caso de éxito: ${item.companyName}`}
                  width={1200}
                  height={675}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
            ) : null}

            <section className="card-premium p-6">
              <h2 className="mb-3 flex items-center gap-2 text-2xl font-extrabold text-slate-900">
                <Target className="h-5 w-5 text-blue-700" /> El problema
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{item.problem}</p>
            </section>

            <section className="card-premium p-6">
              <h2 className="mb-3 flex items-center gap-2 text-2xl font-extrabold text-slate-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" /> La solución
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{item.solution}</p>
            </section>

            {item.results ? (
              <section className="card-premium p-6">
                <h2 className="mb-3 flex items-center gap-2 text-2xl font-extrabold text-slate-900">
                  <BarChart3 className="h-5 w-5 text-blue-700" /> Resultados
                </h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{item.results}</p>
              </section>
            ) : null}

            {item.clientQuote ? (
              <blockquote className="rounded-2xl border-l-4 border-blue-300 bg-slate-50 p-6">
                <Quote className="h-6 w-6 text-blue-400" />
                <p className="mt-2 text-base italic leading-relaxed text-slate-700">{item.clientQuote}</p>
                <p className="mt-3 text-sm font-bold text-slate-900">— {item.companyName}</p>
              </blockquote>
            ) : null}

            <section className="rounded-2xl section-blue p-6 text-white">
              <h2 className="text-2xl font-extrabold">¿Tienes un desafío parecido?</h2>
              <p className="mt-2 text-sm text-blue-100">
                Conversemos sobre cómo resolverlo con una solución digital a la medida.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild className="bg-white font-bold text-blue-800 hover:bg-blue-50">
                  <Link href={contactHref}>Solicitar evaluación</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href={relatedService.href}>{relatedService.label}</Link>
                </Button>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            {item.technologies && item.technologies.length > 0 ? (
              <div className="card-premium p-5">
                <h2 className="mb-3 text-lg font-extrabold text-slate-900">Tecnologías</h2>
                <div className="flex flex-wrap gap-2">
                  {item.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="card-premium p-5">
              <h2 className="mb-3 text-lg font-extrabold text-slate-900">Ficha del proyecto</h2>
              <dl className="space-y-2 text-sm">
                {item.industry ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Rubro</dt>
                    <dd className="text-right font-semibold text-slate-800">{item.industry}</dd>
                  </div>
                ) : null}
                {item.projectDuration ? (
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Duración</dt>
                    <dd className="text-right font-semibold text-slate-800">{item.projectDuration}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="card-premium p-5">
              <h2 className="mb-2 text-lg font-extrabold text-slate-900">¿Quieres algo similar?</h2>
              <p className="mb-4 text-sm text-slate-600">
                Cuéntanos tu proceso actual y te proponemos una solución concreta.
              </p>
              <Button asChild className="w-full gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href={contactHref}>
                  Cotizar una solución <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </aside>
        </Container>
      </article>
    </main>
  );
}
