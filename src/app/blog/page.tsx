import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { blogPosts } from "@/content/blog-posts";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Blog de diseño web, SEO y desarrollo para empresas en Chile",
  description:
    "Guías prácticas para empresas y pymes en Chile sobre diseño web, desarrollo, SEO técnico, landing pages, mantención y conversión.",
  path: "/blog",
  keywords: ["blog diseño web chile", "seo para empresas chile", "desarrollo web chile"],
});

export default function BlogPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="blog-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/blog",
          title: "Blog de diseño web, SEO y desarrollo para empresas en Chile",
          description: "Hub de contenidos prácticos para empresas B2B en Chile.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Blog", path: "/blog" },
          ],
        })}
      />
      <JsonLd
        id="blog-itemlist-schema"
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: blogPosts.map((post, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: post.title,
            url: `https://www.zyteron.cl/blog/${post.slug}`,
          })),
        }}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="relative z-10 space-y-5">
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Blog comercial
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Guías útiles para tomar mejores decisiones web en Chile
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">
            Contenido diseñado para empresas que necesitan resultados: más posicionamiento, mejor
            conversión y menos improvisación en proyectos digitales.
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            {blogPosts.map((post) => (
              <article key={post.slug} className="card-premium flex flex-col p-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">
                  {post.primaryKeyword}
                </p>
                <h2 className="mb-2 text-xl font-extrabold text-slate-900">{post.title}</h2>
                <p className="mb-4 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>
                <div className="mb-5 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
                    <Clock3 className="h-3.5 w-3.5" />
                    {post.readingTime}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
                    {post.intent}
                  </span>
                </div>
                <Button asChild variant="outline" className="mt-auto border-slate-300 text-slate-800 hover:bg-slate-50">
                  <Link href={`/blog/${post.slug}`}>
                    Leer artículo <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </article>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">
                Hablar con un especialista <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/servicios">Ver servicios principales</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
