import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import { buildArticleJsonLd, buildFaqJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

const path = "/recursos/wordpress-vs-web-a-medida-chile";

export const metadata: Metadata = createPageMetadata({
  title: "WordPress vs desarrollo a medida en Chile: cuál conviene",
  description:
    "WordPress o desarrollo a medida para tu empresa en Chile: costos iniciales y de mantención, velocidad, seguridad y cuándo conviene cada opción.",
  path,
});

const comparisonRows = [
  {
    criterion: "Costo inicial",
    wordpress:
      "Menor si se usa una plantilla y pocos plugins. Sube rápido cuando el diseño se personaliza o se agregan funcionalidades comerciales.",
    custom:
      "Mayor al inicio, porque todo se construye para el negocio. El precio refleja diseño propio, funcionalidades exactas y base técnica limpia.",
  },
  {
    criterion: "Costo de mantención",
    wordpress:
      "Requiere actualizar núcleo, tema y plugins de forma constante; las licencias de plugins premium se pagan cada año y una actualización puede romper otra pieza.",
    custom:
      "Menos piezas de terceros que mantener. La mantención se concentra en el hosting y en mejoras del propio sitio, con un costo mensual más predecible.",
  },
  {
    criterion: "Velocidad de carga",
    wordpress:
      "Depende del tema y de cuántos plugins cargue cada página. Con optimización dedicada puede rendir bien, pero es un trabajo permanente.",
    custom:
      "El código incluye solo lo que el sitio necesita, por lo que es más fácil lograr y sostener buenos tiempos de carga y Core Web Vitals.",
  },
  {
    criterion: "Seguridad",
    wordpress:
      "Es la plataforma más atacada del mundo por su masividad; la mayoría de las vulnerabilidades entra por plugins desactualizados.",
    custom:
      "Menor superficie de ataque al no depender de plugins públicos. Sigue necesitando buenas prácticas, pero los vectores comunes desaparecen.",
  },
  {
    criterion: "Autonomía para editar contenido",
    wordpress:
      "Su editor es conocido y hay miles de tutoriales; ideal si el equipo ya sabe usarlo y publica con mucha frecuencia.",
    custom:
      "Se construye un panel de administración con los campos exactos que el negocio edita, sin opciones de más que confundan al equipo.",
  },
  {
    criterion: "Escalabilidad y funciones a medida",
    wordpress:
      "Funciona mientras exista un plugin que haga lo que necesitas; las integraciones muy específicas (sistemas internos, APIs chilenas) se vuelven forzadas.",
    custom:
      "Crece con el negocio: cotizadores, portales de clientes, integraciones con Webpay, Flow o sistemas propios se agregan sin pelear contra la plataforma.",
  },
  {
    criterion: "Dependencia de terceros",
    wordpress:
      "Dependes de que los autores de tu tema y plugins sigan manteniéndolos; si uno se abandona, migrar cuesta.",
    custom:
      "Dependes de quien desarrolló el sitio, por eso importa que el código y los accesos queden a tu nombre y documentados.",
  },
];

const wordpressWins = [
  "Necesitas un blog o sitio editorial con publicación muy frecuente y un equipo que ya domina su editor.",
  "El presupuesto solo alcanza para una plantilla y el sitio es una presencia simple sin integraciones.",
  "Ya tienes un sitio WordPress sano, con mantención al día, y solo necesita mejoras puntuales.",
];

const customWins = [
  "El sitio es un canal comercial: necesitas velocidad, buen SEO técnico y formularios o cotizadores que conviertan.",
  "Requieres funcionalidades propias: portal de clientes, reservas, catálogos administrables, integraciones con pagos o sistemas internos.",
  "Quieres mantención predecible y no depender de actualizaciones de plugins que pueden romper el sitio.",
  "El proyecto va a crecer: hoy es una web informativa, mañana un sistema con usuarios y procesos del negocio.",
];

const faqs = [
  {
    question: "¿WordPress es gratis?",
    answer:
      "El software es gratuito, pero un sitio WordPress profesional no: se paga plantilla o diseño, plugins premium con licencia anual, hosting adecuado y, sobre todo, mantención permanente. Al comparar opciones conviene mirar el costo total a 2 o 3 años, no solo el precio inicial.",
  },
  {
    question: "¿Un sitio a medida posiciona mejor en Google?",
    answer:
      "Ninguna tecnología posiciona por sí sola: Google evalúa contenido, autoridad y experiencia de uso. Lo que sí ayuda del desarrollo a medida es que la base técnica (velocidad, datos estructurados, URLs, Core Web Vitals) queda bien construida de fábrica, sin depender de plugins de SEO configurados a medias.",
  },
  {
    question: "¿Puedo migrar de WordPress a un desarrollo a medida?",
    answer:
      "Sí, y es una migración frecuente cuando el sitio se vuelve lento o difícil de mantener. Se rescata el contenido y el posicionamiento existente cuidando las redirecciones de cada URL, para no perder el tráfico que ya ganaste.",
  },
  {
    question: "¿Qué usa Zyteron y por qué?",
    answer:
      "Desarrollamos a medida con tecnología moderna porque nuestros clientes suelen necesitar sitios rápidos, seguros y con funcionalidades comerciales propias. Aun así, si tu caso calza mejor con WordPress —por ejemplo un blog editorial con publicación diaria y equipo entrenado— te lo vamos a decir en la primera conversación.",
  },
];

export default function WordpressVsWebAMedidaChilePage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="wordpress-vs-medida-webpage-schema"
        data={buildWebPageJsonLd({
          path,
          title: "WordPress vs desarrollo a medida en Chile",
          description:
            "Comparativa de costos, velocidad, seguridad y escalabilidad entre WordPress y el desarrollo web a medida, con recomendaciones según cada tipo de proyecto.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Recursos", path: "/recursos" },
            { name: "WordPress vs desarrollo a medida", path },
          ],
        })}
      />
      <JsonLd
        id="wordpress-vs-medida-article-schema"
        data={buildArticleJsonLd({
          path,
          title: "WordPress vs desarrollo a medida en Chile: cuál conviene",
          description:
            "Comparativa honesta de costos iniciales y de mantención, velocidad, seguridad y escalabilidad entre WordPress y el desarrollo web a medida.",
          datePublished: "2026-08-20T12:00:00-04:00",
          dateModified: "2026-08-20T12:00:00-04:00",
          authorName: siteConfig.representative.name,
          authorType: "Person",
          authorUrl: `${siteConfig.url}/quienes-somos`,
          authorId: `${siteConfig.url}/quienes-somos#eduardo-avila`,
        })}
      />
      <JsonLd id="wordpress-vs-medida-faq-schema" data={buildFaqJsonLd(faqs)} />

      <section className="border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Comparativa para decidir</p>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            WordPress vs desarrollo a medida en Chile: cuál conviene
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            La respuesta corta: WordPress conviene para sitios editoriales simples con publicación frecuente y presupuesto acotado; el desarrollo a medida conviene cuando el sitio es un canal comercial que necesita velocidad, seguridad, integraciones o funcionalidades propias. Abajo comparamos ambos caminos criterio por criterio, con la experiencia de proyectos reales del equipo de Zyteron.
          </p>
          <p className="text-sm font-semibold text-slate-500">
            Publicado por Eduardo Ávila · Zyteron SpA · 20 de agosto de 2026
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-10">
          <section className="space-y-4">
            <h2 className="text-2xl font-extrabold text-slate-900">Tabla comparativa</h2>
            <div className="card-premium overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th scope="col" className="p-4 font-extrabold text-slate-900">Criterio</th>
                    <th scope="col" className="p-4 font-extrabold text-slate-900">WordPress</th>
                    <th scope="col" className="p-4 font-extrabold text-slate-900">Desarrollo a medida</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.criterion} className="border-b border-slate-100 align-top">
                      <th scope="row" className="p-4 font-bold text-slate-900">{row.criterion}</th>
                      <td className="p-4 leading-relaxed text-slate-700">{row.wordpress}</td>
                      <td className="p-4 leading-relaxed text-slate-700">{row.custom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="card-premium p-6 sm:p-8">
              <h2 className="text-2xl font-extrabold text-slate-900">Cuándo conviene WordPress</h2>
              <ul className="mt-4 space-y-3">
                {wordpressWins.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section className="card-premium p-6 sm:p-8">
              <h2 className="text-2xl font-extrabold text-slate-900">Cuándo conviene un desarrollo a medida</h2>
              <ul className="mt-4 space-y-3">
                {customWins.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="card-premium p-6 sm:p-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Cómo decidir para tu proyecto</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              Compara el costo total a 2 o 3 años (desarrollo más mantención y licencias), lista las funcionalidades que tu negocio necesitará y evalúa quién mantendrá el sitio. Si quieres una referencia concreta de precios y alcances a medida, revisa nuestros planes o cuéntanos tu caso: te diremos con honestidad qué camino conviene, aunque no sea el nuestro.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href="/desarrollo-web">
                  Ver desarrollo web a medida <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/sistemas-web">Sistemas web a medida</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/planes">Planes y precios</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/cotizador">Cotizar mi proyecto</Link>
              </Button>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-extrabold text-slate-900">Preguntas frecuentes</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {faqs.map((faq) => (
                <article key={faq.question} className="card-premium p-5">
                  <h3 className="font-bold text-slate-900">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-2xl font-extrabold text-slate-900">Sigue con estas guías</h2>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/recursos/como-elegir-empresa-desarrollo-web-chile">Cómo elegir una empresa de desarrollo web</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/recursos/checklist-seo-pymes-chile">Checklist SEO para pymes</Link>
              </Button>
            </div>
          </section>
        </Container>
      </section>
    </main>
  );
}
