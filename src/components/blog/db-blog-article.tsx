import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { renderMarkdown } from "@/lib/markdown";
import { formatStableLongDateEsCl } from "@/lib/stable-date";
import type { DbBlogPost } from "@/lib/admin/blog-cases-repository";
import { siteConfig } from "@/config/site";

/**
 * Renderiza un artículo del blog administrado en Supabase (contenido Markdown).
 * Mantiene el mismo lenguaje visual del detalle curado (hero + CTA), pero el
 * cuerpo viene de Markdown saneado.
 */
export function DbBlogArticle({ post }: { post: DbBlogPost }) {
  const html = renderMarkdown(post.content);
  const publishedDate = formatStableLongDateEsCl(post.publishedAt ?? post.createdAt ?? "");
  const modifiedDate = formatStableLongDateEsCl(post.updatedAt ?? post.publishedAt ?? post.createdAt ?? "");
  const authorName = post.author?.trim() || siteConfig.representative.name;

  return (
    <main className="bg-white">
      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="relative z-10 space-y-5">
          <Link href="/blog" className="badge-blue w-fit hover:opacity-90">
            Volver al blog
          </Link>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            {post.title}
          </h1>
          {post.excerpt ? <p className="max-w-3xl text-lg text-slate-600">{post.excerpt}</p> : null}
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
              <CalendarDays className="h-3.5 w-3.5" />
              Publicado: {publishedDate}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
              Actualizado: {modifiedDate}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
              <Clock3 className="h-3.5 w-3.5" />
              {post.readMinutes ?? 5} min de lectura
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
              Por{" "}
              <Link href="/quienes-somos" className="text-blue-700 hover:text-blue-900">
                {authorName}
              </Link>
            </span>
          </div>
        </Container>
      </section>

      <article className="py-16">
        <Container className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-8">
            {post.coverImageUrl ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Image
                  src={post.coverImageUrl}
                  alt={post.coverImageAlt || post.title}
                  width={1200}
                  height={630}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
            ) : null}

            <div className="card-premium p-6">
              <div className="blog-content" dangerouslySetInnerHTML={{ __html: html }} />
            </div>

            <section className="rounded-2xl section-blue p-6 text-white">
              <h2 className="text-2xl font-extrabold">¿Quieres aplicar esto en tu empresa?</h2>
              <p className="mt-2 text-sm text-blue-100">
                Podemos revisar tu proyecto y proponer una solución web, sistema o automatización a la medida.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild className="bg-white font-bold text-blue-800 hover:bg-blue-50">
                  <Link href="/contacto">Solicitar diagnóstico</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white"
                >
                  <Link href="/cotizador">Ir al cotizador</Link>
                </Button>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="card-premium p-5">
              <h2 className="mb-3 text-lg font-extrabold text-slate-900">Servicios relacionados</h2>
              <ul className="space-y-2 text-sm">
                {[
                  { href: "/desarrollo-web", label: "Desarrollo web" },
                  { href: "/sistemas-web", label: "Sistemas web" },
                  { href: "/automatizacion", label: "Automatización" },
                  { href: "/tiendas-online", label: "Tiendas online" },
                  { href: "/soporte-ti", label: "Soporte TI" },
                ].map((service) => (
                  <li key={service.href}>
                    <Link href={service.href} className="text-blue-700 transition-colors hover:text-blue-900">
                      {service.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-premium p-5">
              <h2 className="mb-2 text-lg font-extrabold text-slate-900">¿Quieres aplicarlo en tu sitio?</h2>
              <p className="mb-4 text-sm text-slate-600">
                Agenda una revisión y define un plan priorizado para mejorar tu presencia digital.
              </p>
              <Button asChild className="w-full gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href="/contacto">
                  Solicitar diagnóstico <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="mt-3 w-full border-slate-300 font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Link href="/cotizador">Cotizar mi proyecto</Link>
              </Button>
            </div>
          </aside>
        </Container>
      </article>
    </main>
  );
}
