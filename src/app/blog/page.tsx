import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, Tag } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { blogPosts } from "@/content/blog-posts";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Blog para empresas y pymes",
  description:
    "Contenido de ZYTERON sobre desarrollo web, pymes, automatización, soporte TI, tiendas online y seguridad digital con enfoque comercial.",
  path: "/blog",
});

const categories = [
  "Desarrollo web",
  "Pymes",
  "Automatización",
  "Soporte TI",
  "Tiendas online",
  "Seguridad digital",
  "Consejos para empresas",
];

const suggestedArticles = [
  "Cuánto cuesta una página web para pyme en Chile",
  "Qué debe tener una web profesional para vender",
  "Página web vs sistema web: diferencias",
  "Cómo automatizar reservas por WhatsApp",
  "Qué es un panel administrativo para empresas",
  "Errores al contratar desarrollo web en Chile",
  "Tienda online para pyme: qué necesitas antes de empezar",
  "Cómo elegir una empresa de desarrollo web en Santiago",
];

export default function BlogPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="blog-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/blog",
          title: "Blog para empresas y pymes",
          description: "Hub de contenidos comerciales y técnicos de ZYTERON.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Blog", path: "/blog" },
          ],
        })}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5">
          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Blog comercial y técnico
          </div>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Contenido para vender mejor y digitalizar con criterio
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">
            Publicamos guías para empresas, pymes y emprendedores que necesitan tomar decisiones web con enfoque real de negocio.
          </p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <span key={category} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                <Tag className="h-3.5 w-3.5 text-blue-600" />
                {category}
              </span>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2">
            {blogPosts.map((post) => (
              <article key={post.slug} className="card-premium flex flex-col p-6">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">{post.primaryKeyword}</p>
                <h2 className="mb-2 text-xl font-extrabold text-slate-900">{post.title}</h2>
                <p className="mb-4 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>
                <div className="mb-5 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
                    <Clock3 className="h-3.5 w-3.5" />
                    {post.readingTime}
                  </span>
                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold capitalize">
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

          <section className="card-premium p-6">
            <h2 className="text-2xl font-extrabold text-slate-900">Rutas de aprendizaje recomendadas</h2>
            <p className="mt-1 text-sm text-slate-600">
              Temas clave para empresas y pymes que quieren cotizar, mejorar o planificar su presencia digital.
            </p>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {suggestedArticles.map((article) => (
                <div key={article} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                  <span>{article}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
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
