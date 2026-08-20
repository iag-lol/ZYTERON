import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { siteConfig } from "@/config/site";
import { PLAN_PRICES } from "@/config/pricing";
import { buildArticleJsonLd, buildFaqJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

const path = "/recursos/como-elegir-empresa-desarrollo-web-chile";

export const metadata: Metadata = createPageMetadata({
  title: "Cómo elegir una empresa de desarrollo web en Chile (2026)",
  description:
    "12 criterios verificables para elegir una empresa de desarrollo web en Chile: portafolio real, precios publicados, contrato, propiedad del código y alertas.",
  path,
});

const criteria = [
  {
    title: "Portafolio con sitios reales en línea",
    detail:
      "Pide las URLs de proyectos publicados y visítalas: que carguen rápido, funcionen en el celular y sigan activas. Un portafolio de puras capturas o maquetas no demuestra trabajo entregado.",
  },
  {
    title: "Precios publicados o rangos referenciales",
    detail:
      "Una empresa que publica sus precios te permite comparar antes de la primera reunión y reduce la posibilidad de cotizaciones infladas según el cliente. Si todo es \"depende\", exige al menos rangos por tipo de proyecto.",
  },
  {
    title: "Empresa formal: RUT, contrato y factura",
    detail:
      "Verifica que exista una razón social con RUT vigente, que emita factura y que el acuerdo quede en un contrato firmado. Sin eso no tienes cómo exigir cumplimiento ni respaldar el gasto ante el SII.",
  },
  {
    title: "Alcance y plazos por escrito",
    detail:
      "La cotización debe listar páginas, funcionalidades, rondas de revisión y fechas de entrega. Lo que no está escrito termina cobrándose aparte o no entregándose.",
  },
  {
    title: "Propiedad del código, dominio y hosting a tu nombre",
    detail:
      "El dominio debe registrarse a nombre de tu empresa (en NIC Chile si es .cl) y el contrato debe decir que el código y los accesos quedan contigo al pagar. Si la agencia retiene el dominio, quedas amarrado a ella.",
  },
  {
    title: "Accesos administrables desde el día uno",
    detail:
      "Pide usuario propio al hosting, al administrador de contenidos y a las cuentas asociadas (Google Search Console, Analytics). Depender de terceros para cada cambio menor sale caro.",
  },
  {
    title: "Soporte y garantía post-entrega definidos",
    detail:
      "Pregunta qué pasa si algo falla la semana después del lanzamiento: cuánto dura la garantía por errores, qué incluye la mantención mensual y cuánto cuesta. Debe estar en la cotización, no en promesas verbales.",
  },
  {
    title: "SEO técnico incluido en el desarrollo",
    detail:
      "Titles y descriptions por página, sitemap, datos estructurados, URLs limpias y buena velocidad de carga deben venir de fábrica. Si el SEO básico se cobra como \"extra\", el sitio nace cojo.",
  },
  {
    title: "Diseño responsive y rendimiento medibles",
    detail:
      "Prueba los sitios del portafolio con PageSpeed Insights y en tu propio teléfono. En Chile la mayoría del tráfico es móvil: un sitio lento o roto en celular pierde clientes todos los días.",
  },
  {
    title: "Proceso de trabajo claro",
    detail:
      "Una empresa seria explica sus etapas: levantamiento, propuesta, diseño, desarrollo, revisiones y lanzamiento, con una contraparte identificable que responde tus dudas durante el proyecto.",
  },
  {
    title: "Tecnología explicada sin humo",
    detail:
      "Debe poder decirte qué tecnología usará y por qué conviene para tu caso, en lenguaje simple. Desconfía de quien esconde el stack o recita siglas sin explicar qué ganas tú con ellas.",
  },
  {
    title: "Comunicación y tiempos de respuesta",
    detail:
      "Fíjate cómo responden durante la venta: si demoran días en contestar una cotización, imagina el soporte después de pagar. Canales claros (correo, WhatsApp, reuniones) son parte del servicio.",
  },
];

const redFlags = [
  "Piden el 100 % del pago por adelantado sin contrato ni factura.",
  "El dominio o el hosting quedan a nombre de la agencia y no del cliente.",
  "Prometen \"primer lugar en Google garantizado\" o resultados SEO en días.",
  "No pueden mostrar ninguna URL real en producción de un cliente anterior.",
  "La cotización es una cifra única sin detalle de alcance, plazos ni revisiones.",
  "Solo se comunican por chat informal y no existe razón social verificable.",
];

/** Convierte "Desde $X + IVA" en "$X + IVA" para usar el precio dentro de una frase. */
const priceAmount = (price: string) => price.replace(/^Desde\s+/i, "");

const faqs = [
  {
    question: "¿Cuánto cobra una empresa de desarrollo web en Chile?",
    answer:
      `Depende del alcance. Como referencia de mercado, en Zyteron una web básica de presentación parte en ${priceAmount(PLAN_PRICES["web-basica"])}, un sitio corporativo para pyme desde ${priceAmount(PLAN_PRICES.pyme)}, un ecommerce con carrito y pagos desde ${priceAmount(PLAN_PRICES.ecommerce)} y un sistema web a medida desde ${priceAmount(PLAN_PRICES.sistema)}, todos valores en pesos chilenos (CLP). Cualquier cotización seria debe indicar si incluye IVA y qué cubre exactamente el precio.`,
  },
  {
    question: "¿Qué debe incluir una cotización de desarrollo web?",
    answer:
      "Alcance detallado (páginas y funcionalidades), plazos por etapa, rondas de revisión incluidas, forma de pago, garantía post-entrega, costos de mantención, y una cláusula clara sobre la propiedad del código, el dominio y los accesos. Si falta alguno de esos puntos, pídelo por escrito antes de firmar.",
  },
  {
    question: "¿Conviene una agencia o un freelancer?",
    answer:
      "Un freelancer puede ser más económico para un proyecto simple y acotado, pero concentra todo el conocimiento en una persona: si deja de responder, quedas sin soporte. Una empresa formal ofrece continuidad, contrato, factura y equipo. Lo importante en ambos casos es aplicar los mismos criterios: trabajo demostrable, acuerdo escrito y propiedad de tus activos.",
  },
  {
    question: "¿Cuánto demora el desarrollo de una página web?",
    answer:
      "Una web informativa bien acotada suele tomar entre 1 y 3 semanas; una tienda online, entre 3 y 6 semanas; y un sistema a medida, desde 6 semanas y por etapas según la complejidad. Más importante que la cifra es que el plazo esté por escrito y con etapas verificables.",
  },
];

export default function ComoElegirEmpresaDesarrolloWebChilePage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="elegir-empresa-web-webpage-schema"
        data={buildWebPageJsonLd({
          path,
          title: "Cómo elegir una empresa de desarrollo web en Chile",
          description:
            "Guía práctica con 12 criterios verificables y señales de alerta para contratar un desarrollo web con seguridad.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Recursos", path: "/recursos" },
            { name: "Cómo elegir una empresa de desarrollo web", path },
          ],
        })}
      />
      <JsonLd
        id="elegir-empresa-web-article-schema"
        data={buildArticleJsonLd({
          path,
          title: "Cómo elegir una empresa de desarrollo web en Chile (2026)",
          description:
            "12 criterios verificables, señales de alerta y preguntas frecuentes para contratar un desarrollo web en Chile con seguridad.",
          datePublished: "2026-08-20T12:00:00-04:00",
          dateModified: "2026-08-20T12:00:00-04:00",
          authorName: siteConfig.representative.name,
          authorType: "Person",
          authorUrl: `${siteConfig.url}/quienes-somos`,
          authorId: `${siteConfig.url}/quienes-somos#eduardo-avila`,
        })}
      />
      <JsonLd id="elegir-empresa-web-faq-schema" data={buildFaqJsonLd(faqs)} />

      <section className="border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-700">Guía para empresas y pymes</p>
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Cómo elegir una empresa de desarrollo web en Chile (2026)
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            Para elegir bien una empresa de desarrollo web en Chile, verifica cinco cosas antes de pagar: portafolio con sitios reales en línea, precios o rangos publicados, contrato con factura, plazos y alcance por escrito, y que el dominio y el código queden a tu nombre. Esta guía desarrolla esos puntos en 12 criterios verificables, más las señales de alerta que anticipan un mal proyecto.
          </p>
          <p className="text-sm font-semibold text-slate-500">
            Publicado por Eduardo Ávila · Zyteron SpA · 20 de agosto de 2026
          </p>
        </Container>
      </section>

      <section className="py-16">
        <Container className="space-y-10">
          <section className="space-y-4">
            <h2 className="text-2xl font-extrabold text-slate-900">Los 12 criterios antes de contratar</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
              Todos estos criterios se pueden comprobar antes de firmar: visitando sitios publicados, leyendo la cotización y haciendo las preguntas correctas. Úsalos como checklist con cada empresa que estés evaluando.
            </p>
            <div className="grid gap-5 lg:grid-cols-2">
              {criteria.map((criterion, index) => (
                <article key={criterion.title} className="card-premium p-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-600" />
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900">
                        {index + 1}. {criterion.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">{criterion.detail}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="card-premium border-amber-200 bg-amber-50/50 p-6 sm:p-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Señales de alerta</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              Si aparece cualquiera de estas señales durante la cotización, pide explicaciones por escrito o busca otra alternativa.
            </p>
            <ul className="mt-5 space-y-3">
              {redFlags.map((flag) => (
                <li key={flag} className="flex gap-3 text-sm leading-relaxed text-slate-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>{flag}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card-premium p-6 sm:p-8">
            <h2 className="text-2xl font-extrabold text-slate-900">Cómo usar esta guía</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
              Pide cotización a dos o tres empresas y evalúalas con los mismos 12 criterios. La que cumpla más puntos de forma verificable —no la más barata ni la que promete más— suele ser la mejor decisión a mediano plazo. Si quieres una referencia concreta, en Zyteron publicamos precios, plazos y alcance de cada plan para que puedas comparar con esta misma lista.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href="/planes">
                  Ver planes y precios <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/cotizador">Cotizar mi proyecto</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/casos-exito">Ver casos reales</Link>
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
                <Link href="/recursos/wordpress-vs-web-a-medida-chile">WordPress vs desarrollo a medida</Link>
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
