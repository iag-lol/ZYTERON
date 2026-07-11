import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, Tag } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { getBlogListItems, pickRecommendedFromPublished } from "@/lib/content/blog-merge";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Blog para empresas sobre web, sistemas y SEO",
  description:
    "Guías prácticas sobre desarrollo web, sistemas, soporte TI, ecommerce y SEO para empresas que necesitan decidir con mejor criterio.",
  path: "/blog",
});

// Lee siempre el contenido fresco desde Supabase (sin caché estática) para que
// los artículos publicados desde el admin aparezcan de inmediato.
export const dynamic = "force-dynamic";

const categories = [
  "Desarrollo web",
  "Pymes",
  "Automatización",
  "Soporte TI",
  "Tiendas online",
  "Seguridad digital",
  "Consejos para empresas",
];

export default async function BlogPage() {
  const posts = await getBlogListItems();
  // Recomendados dinámicos: sólo artículos realmente publicados (nunca un 404).
  const suggestedArticles = pickRecommendedFromPublished(posts);

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
          <article className="rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Recurso destacado</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              Checklist SEO para pymes en Chile: 25 controles
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
              Revisa indexación, contenido, enlazado, autoridad, datos estructurados y medición con una lista práctica.
            </p>
            <Button asChild className="mt-5 bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/recursos/checklist-seo-pymes-chile">
                Abrir checklist <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </article>

          {posts.length === 0 ? (
            <div className="card-premium p-8 text-center">
              <p className="text-sm text-slate-600">
                Aún no hay artículos publicados. Vuelve pronto para nuevas guías.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {posts.map((post) => (
                <article key={post.slug} className="card-premium flex flex-col p-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">
                    {post.label}
                  </p>
                  <h2 className="mb-2 text-xl font-extrabold text-slate-900">{post.title}</h2>
                  <p className="mb-4 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>
                  <div className="mb-5 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
                      <Clock3 className="h-3.5 w-3.5" />
                      {post.readingTime}
                    </span>
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
                      Actualizado {post.updatedLabel}
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
          )}

          {suggestedArticles.length > 0 ? (
            <section className="card-premium p-6">
              <h2 className="text-2xl font-extrabold text-slate-900">Rutas de aprendizaje recomendadas</h2>
              <p className="mt-1 text-sm text-slate-600">
                Temas clave para empresas y pymes que quieren cotizar, mejorar o planificar su presencia digital.
              </p>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {suggestedArticles.map((article) => (
                  <Link
                    key={article.slug}
                    href={`/blog/${article.slug}`}
                    className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700 transition-colors hover:border-blue-200 hover:bg-white"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                    <span>{article.title}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">
                Hablar con un especialista <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/servicios">Ver servicios principales</Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/cotizador">Ir al cotizador</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
