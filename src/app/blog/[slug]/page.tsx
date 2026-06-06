import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { blogPosts, getBlogPostBySlug } from "@/content/blog-posts";
import {
  buildArticleJsonLd,
  buildFaqJsonLd,
  buildWebPageJsonLd,
  createPageMetadata,
} from "@/lib/seo";
import { formatStableLongDateEsCl } from "@/lib/stable-date";

type BlogDetailProps = {
  params: Promise<{
    slug: string;
  }>;
};

const mainServiceLinks = [
  {
    key: "desarrollo-web",
    label: "Desarrollo web",
    href: "/desarrollo-web",
    summary: "Sitios corporativos, landing pages y presencia digital profesional para empresas.",
  },
  {
    key: "tiendas-online",
    label: "Tiendas online",
    href: "/tiendas-online",
    summary: "Ecommerce, catálogos y venta asistida por WhatsApp para pymes.",
  },
  {
    key: "sistemas-web",
    label: "Sistemas web",
    href: "/sistemas-web",
    summary: "Paneles administrativos, registros, reportes y software a medida.",
  },
  {
    key: "automatizacion",
    label: "Automatización",
    href: "/automatizacion",
    summary: "Flujos digitales, formularios, WhatsApp y tareas repetitivas automatizadas.",
  },
  {
    key: "soporte-ti",
    label: "Soporte TI",
    href: "/soporte-ti",
    summary: "Mantención, configuración, continuidad operativa y asistencia tecnológica.",
  },
];

function getBlogServiceLinks(post: NonNullable<ReturnType<typeof getBlogPostBySlug>>) {
  const signals = [
    post.title,
    post.primaryKeyword,
    ...post.secondaryKeywords,
    ...post.relatedServices,
  ]
    .join(" ")
    .toLowerCase();

  const selected = new Set<string>();
  const add = (key: string) => selected.add(key);

  if (/tienda|ecommerce|shopify|cat[aá]logo|inventario|vender online|venta por whatsapp/.test(signals)) {
    add("tiendas-online");
  }
  if (/sistema|software|panel|excel|gesti[oó]n|cotizador|pdf|administrativo|interno/.test(signals)) {
    add("sistemas-web");
  }
  if (/automat|whatsapp|reserva|flujo|tarea repetitiva/.test(signals)) {
    add("automatizacion");
  }
  if (/soporte|seguridad|mantenci[oó]n|ti\b|correo|continuidad/.test(signals)) {
    add("soporte-ti");
  }
  if (/web|p[aá]gina|landing|wordpress|next\\.js|saas|diseño|seo|b2b|empresa/.test(signals)) {
    add("desarrollo-web");
  }

  for (const fallback of ["desarrollo-web", "sistemas-web", "automatizacion", "tiendas-online", "soporte-ti"]) {
    if (selected.size >= 3) break;
    add(fallback);
  }

  return mainServiceLinks.filter((service) => selected.has(service.key));
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: BlogDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return createPageMetadata({
      title: "Artículo no encontrado",
      description: "El artículo solicitado no existe.",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }

  return createPageMetadata({
    title: post.metaTitle,
    description: post.metaDescription,
    path: `/blog/${post.slug}`,
    ogImagePath: `/blog/${post.slug}/opengraph-image`,
    ogImageAlt: `${post.title} | ZYTERON`,
    keywords: [post.primaryKeyword, ...post.secondaryKeywords],
  });
}

export default async function BlogDetailPage({ params }: BlogDetailProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const relatedServiceLinks = getBlogServiceLinks(post);

  const relatedPosts = blogPosts
    .filter((item) => item.slug !== post.slug)
    .slice(0, 3);

  const postPath = `/blog/${post.slug}`;
  const publishedDate = formatStableLongDateEsCl(post.publishedAt);
  const modifiedDate = formatStableLongDateEsCl(post.updatedAt ?? post.publishedAt);
  const tableOfContents = post.sections.map((section) => ({
    heading: section.heading,
    id: section.heading
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  }));

  return (
    <main className="bg-white">
      <JsonLd
        id={`blog-webpage-schema-${post.slug}`}
        data={buildWebPageJsonLd({
          path: postPath,
          title: post.metaTitle,
          description: post.metaDescription,
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: postPath },
          ],
        })}
      />
      <JsonLd
        id={`blog-article-schema-${post.slug}`}
        data={buildArticleJsonLd({
          path: postPath,
          title: post.title,
          description: post.excerpt,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          image: `/blog/${post.slug}/opengraph-image`,
          authorName: post.authorName ?? "Zyteron",
        })}
      />
      <JsonLd
        id={`blog-faq-schema-${post.slug}`}
        data={buildFaqJsonLd(post.faqs)}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="relative z-10 space-y-5">
          <Link href="/blog" className="badge-blue w-fit hover:opacity-90">
            Volver al blog
          </Link>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            {post.title}
          </h1>
          <p className="max-w-3xl text-lg text-slate-600">{post.excerpt}</p>
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
              {post.readingTime}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold">
              Autor: {post.authorName ?? "Zyteron"}
            </span>
          </div>
        </Container>
      </section>

      <article className="py-16">
        <Container className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="space-y-8">
            {post.sections.map((section, index) => (
              <section key={section.heading} id={tableOfContents[index].id} className="card-premium p-6">
                <h2 className="mb-4 text-2xl font-extrabold text-slate-900">{section.heading}</h2>
                <div className="space-y-3">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-relaxed text-slate-700">
                      {paragraph}
                    </p>
                  ))}
                </div>
                {section.table ? (
                  <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[680px] text-left text-sm">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          {section.table.headers.map((header) => (
                            <th key={header} className="px-4 py-3 font-bold">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row) => (
                          <tr key={row.join("|")} className="border-t border-slate-200">
                            {row.map((cell) => (
                              <td key={cell} className="px-4 py-3 text-slate-700">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {section.bullets?.length ? (
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}

            <section className="card-premium p-6">
              <h2 className="mb-4 text-2xl font-extrabold text-slate-900">Preguntas frecuentes</h2>
              <div className="space-y-4">
                {post.faqs.map((faq) => (
                  <div key={faq.question}>
                    <h3 className="mb-1 text-sm font-bold text-slate-900">{faq.question}</h3>
                    <p className="text-sm text-slate-600">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl section-blue p-6 text-white">
              <h2 className="text-2xl font-extrabold">¿Quieres aplicar esto en tu empresa?</h2>
              <p className="mt-2 text-sm text-blue-100">
                Podemos revisar tu web y definir una hoja de ruta de mejoras priorizada para SEO técnico y conversión.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button asChild className="bg-white font-bold text-blue-800 hover:bg-blue-50">
                  <Link href="/contacto">Solicitar diagnóstico</Link>
                </Button>
                <Button asChild variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Link href="/desarrollo-web">Ver desarrollo web</Link>
                </Button>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            {tableOfContents.length > 3 ? (
              <div className="card-premium p-5">
                <h2 className="mb-3 text-lg font-extrabold text-slate-900">Tabla de contenidos</h2>
                <ul className="space-y-2 text-sm">
                  {tableOfContents.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="text-blue-700 transition-colors hover:text-blue-900">
                        {item.heading}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="card-premium p-5">
              <h2 className="mb-3 text-lg font-extrabold text-slate-900">Servicios relacionados</h2>
              <ul className="space-y-2 text-sm">
                {relatedServiceLinks.map((service) => (
                  <li key={service.key}>
                    <Link
                      href={service.href}
                      className="text-blue-700 transition-colors hover:text-blue-900"
                    >
                      {service.label}
                    </Link>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{service.summary}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-premium p-5">
              <h2 className="mb-3 text-lg font-extrabold text-slate-900">Siguiente lectura</h2>
              <ul className="space-y-2 text-sm">
                {relatedPosts.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/blog/${item.slug}`}
                      className="text-blue-700 transition-colors hover:text-blue-900"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card-premium p-5">
              <h2 className="mb-2 text-lg font-extrabold text-slate-900">¿Quieres aplicarlo en tu sitio?</h2>
              <p className="mb-4 text-sm text-slate-600">
                Agenda una revisión y define un plan priorizado para mejorar posicionamiento y leads.
              </p>
              <Button asChild className="w-full gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href="/contacto">
                  Solicitar diagnóstico <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </aside>
        </Container>
      </article>
    </main>
  );
}
