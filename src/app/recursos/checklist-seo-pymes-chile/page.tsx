import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import { buildArticleJsonLd, buildFaqJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

const path = "/recursos/checklist-seo-pymes-chile";

export const metadata: Metadata = createPageMetadata({
  title: "Checklist SEO para pymes en Chile: 25 controles",
  description:
    "Checklist SEO gratuito para pymes chilenas: revisa indexación, contenido, SEO local, autoridad, datos estructurados y conversiones de tu sitio web.",
  path,
  keywords: [
    "checklist seo pymes chile",
    "auditoria seo chile",
    "seo para pymes",
    "posicionamiento web chile",
  ],
});

const sections = [
  {
    title: "Indexación y base técnica",
    items: [
      "Cada página importante responde correctamente y tiene una URL estable.",
      "El sitemap contiene solo URLs canónicas, indexables y vigentes.",
      "Robots.txt permite rastrear páginas públicas y referencia el sitemap.",
      "Cada página tiene title, description, canonical y un solo H1 descriptivo.",
      "Las URLs eliminadas o reemplazadas redirigen de forma permanente a su equivalente.",
    ],
  },
  {
    title: "Contenido e intención de búsqueda",
    items: [
      "Cada servicio tiene una intención principal distinta y evita competir con otra página propia.",
      "El contenido responde precios, plazos, alcance, proceso, dudas y criterios de decisión reales.",
      "Los artículos aportan ejemplos, experiencia, datos o recursos que no repiten otras páginas.",
      "Los casos de éxito explican problema, solución y resultados verificables.",
      "Autor, fecha de publicación y fecha de actualización son visibles y coherentes.",
    ],
  },
  {
    title: "Enlazado interno",
    items: [
      "Los artículos enlazan de forma contextual al servicio relacionado.",
      "Cada servicio enlaza casos reales, preguntas frecuentes y contenidos de apoyo.",
      "Los textos de enlace describen el destino y no repiten siempre la misma palabra clave.",
      "No existen enlaces internos hacia redirecciones, páginas 404 o contenido no publicado.",
      "Las páginas estratégicas pueden alcanzarse en pocos clics desde navegación o hubs temáticos.",
    ],
  },
  {
    title: "Autoridad y SEO local",
    items: [
      "Nombre comercial, teléfono, web y cobertura son consistentes en todos los perfiles públicos.",
      "Google Business Profile está completo, actualizado y recibe reseñas reales de clientes.",
      "LinkedIn, directorios profesionales y perfiles sectoriales enlazan la URL canónica.",
      "Clientes y aliados pueden mencionar a la empresa mediante enlaces editoriales de marca.",
      "La empresa publica casos, estudios o herramientas que otras páginas tengan motivos para citar.",
    ],
  },
  {
    title: "Datos estructurados y medición",
    items: [
      "Organization y LocalBusiness describen una sola entidad con información verdadera.",
      "Service, Article, BreadcrumbList y Product se usan únicamente donde corresponde.",
      "El contenido declarado en JSON-LD también existe de forma visible en la página.",
      "Search Console mide consultas, páginas, países, dispositivos e indexación.",
      "Las conversiones orgánicas registran formularios, WhatsApp, llamadas y cotizaciones.",
    ],
  },
];

const faqs = [
  {
    question: "¿Cuánto tarda una mejora SEO en mostrar resultados?",
    answer:
      "Las correcciones técnicas pueden ser detectadas en días o semanas. El crecimiento de autoridad y posiciones competitivas normalmente requiere trabajo sostenido, contenido útil y menciones reales.",
  },
  {
    question: "¿Necesito publicar artículos todas las semanas?",
    answer:
      "No. Para una pyme suele ser mejor publicar contenido menos frecuente, pero realmente útil, original y conectado con sus servicios y casos.",
  },
  {
    question: "¿Los directorios mejoran automáticamente la autoridad?",
    answer:
      "No todos. Conviene priorizar perfiles empresariales legítimos, completos y relacionados con el mercado, evitando registros masivos en sitios de baja calidad.",
  },
];

export default function ChecklistSeoPymesChilePage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="checklist-seo-webpage-schema"
        data={buildWebPageJsonLd({
          path,
          title: "Checklist SEO para pymes en Chile",
          description: "Recurso práctico de 25 controles para revisar la autoridad y base SEO de una pyme.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: "Checklist SEO para pymes", path },
          ],
        })}
      />
      <JsonLd
        id="checklist-seo-article-schema"
        data={buildArticleJsonLd({
          path,
          title: "Checklist SEO para pymes en Chile: 25 controles",
          description: "Checklist práctico para revisar indexación, contenido, autoridad y medición SEO.",
          datePublished: "2026-07-11T12:00:00-04:00",
          dateModified: "2026-07-11T12:00:00-04:00",
          authorName: siteConfig.representative.name,
          authorType: "Person",
          authorUrl: `${siteConfig.url}/quienes-somos`,
          authorId: `${siteConfig.url}/quienes-somos#eduardo-avila`,
        })}
      />
      <JsonLd id="checklist-seo-faq-schema" data={buildFaqJsonLd(faqs)} />

      <section className="border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Recurso gratuito para empresas</p>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Checklist SEO para pymes en Chile: 25 controles antes de invertir en posicionamiento
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            Usa esta lista para detectar problemas de indexación, contenido, enlazado, autoridad y medición que pueden limitar el crecimiento orgánico de una web empresarial.
          </p>
          <p className="text-sm font-semibold text-slate-500">Publicado por Eduardo Ávila · Zyteron SpA · 11 de julio de 2026</p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-10">
          <div className="grid gap-5 lg:grid-cols-2">
            {sections.map((section) => (
              <article key={section.title} className="card-premium p-6">
                <h2 className="text-xl font-extrabold text-slate-900">{section.title}</h2>
                <ul className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <section className="card-premium p-6 sm:p-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Cómo usar este checklist</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              Marca cada control como correcto, pendiente o no aplicable. Corrige primero errores de indexación, redirecciones y páginas duplicadas. Después fortalece contenido, casos, enlaces internos y menciones externas. Finalmente mide consultas y contactos para saber qué mejoras producen resultados comerciales.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href="/servicios/seo-para-empresas-chile">
                  Revisar servicio SEO <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/cotizador">Solicitar diagnóstico</Link>
              </Button>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-extrabold text-slate-900">Preguntas frecuentes</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {faqs.map((faq) => (
                <article key={faq.question} className="card-premium p-5">
                  <h3 className="font-bold text-slate-900">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </Container>
      </section>
    </main>
  );
}
