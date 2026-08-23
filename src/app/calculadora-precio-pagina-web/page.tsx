import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Check, MessageCircle } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { PriceCalculator } from "@/components/tools/price-calculator";
import { siteConfig } from "@/config/site";
import {
  CORPORATE_SCOPE_NOTE,
  PLAN_CATALOG,
  PLAN_PRICE_AMOUNTS,
  PRICING_NOTE,
  clp,
  getPlan,
} from "@/config/pricing";
import { buildFaqJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

const PATH = "/calculadora-precio-pagina-web";

export const metadata: Metadata = createPageMetadata({
  title: "Calculadora de Precio de Página Web en Chile",
  description:
    "Calcula cuánto cuesta una página web en Chile según tipo de proyecto, páginas y funcionalidades. Estimación inmediata con precios referenciales reales y sin registro.",
  path: PATH,
});

const WHATSAPP_URL = `${siteConfig.social.whatsapp}?text=${encodeURIComponent(
  "Hola Zyteron, usé la calculadora de precio y quiero cotizar mi página web.",
)}`;

/**
 * La escalera publicada se lee completa desde `@/config/pricing`, así la tabla de
 * esta página nunca puede quedar desalineada con /planes ni con el estimador.
 */
const priceRanges = PLAN_CATALOG.map((plan) => ({
  type: plan.name,
  price: plan.price,
  time: plan.deadline,
  forWho: plan.audience,
}));

const CORPORATE_THRESHOLD_LABEL = clp(5_000_000);

const priceFactors = [
  {
    title: "Cantidad de páginas y contenido",
    detail:
      "No cuesta lo mismo un sitio de 4 secciones que uno de 20 con contenido por servicio y por rubro. Si el texto y las imágenes los entregas tú, el proyecto avanza más rápido y sale más barato.",
  },
  {
    title: "Funcionalidades reales",
    detail:
      "Un formulario de contacto es estándar. Un login de usuarios, un panel administrativo, reservas con agenda o un cotizador que genera PDF son desarrollos completos y mueven el precio de forma significativa.",
  },
  {
    title: "Integraciones con otros sistemas",
    detail:
      "Conectar la web con un ERP, un CRM, una pasarela de pago o una API externa implica trabajo técnico adicional y pruebas. Cada integración se cotiza por separado según su documentación.",
  },
  {
    title: "Diseño a medida o sobre estructura probada",
    detail:
      "Partir de una estructura validada abarata y acelera. Un diseño completamente original, con identidad visual creada desde cero, agrega horas de diseño y revisiones.",
  },
  {
    title: "Nivel de administración que necesitas",
    detail:
      "Si tu equipo va a editar contenidos, hay que construir el panel y capacitar. Si prefieres que nosotros mantengamos el sitio, eso pasa a una mantención mensual en vez de un costo inicial.",
  },
  {
    title: "SEO y posicionamiento",
    detail:
      "Toda web que entregamos incluye base SEO técnica. El posicionamiento continuo por keywords competitivas es un servicio mensual aparte, porque requiere trabajo sostenido de contenido y autoridad.",
  },
];

const hiddenCosts = [
  {
    item: "Dominio .cl",
    detail: "Aproximadamente $10.000 anuales, se paga a NIC Chile.",
  },
  {
    item: "Hosting",
    detail: "Entre $30.000 y $150.000 anuales según tráfico y requerimientos.",
  },
  {
    item: "Correos corporativos",
    detail: "Google Workspace o Microsoft 365 se cobran por usuario y por mes.",
  },
  {
    item: "Comisión de pasarela de pago",
    detail: "Webpay, Flow y Mercado Pago cobran un porcentaje por transacción.",
  },
  {
    item: "Mantención posterior",
    detail: "Actualizaciones, respaldos y cambios de contenido, si no los haces tú.",
  },
];

const faqs = [
  {
    question: "¿Cuánto cuesta una página web en Chile en 2026?",
    answer:
      `Una web básica de una página parte en ${clp(PLAN_PRICE_AMOUNTS["web-basica"])} + IVA. ` +
      `Una página web para pyme parte en ${clp(PLAN_PRICE_AMOUNTS.pyme)}, un sitio corporativo en ` +
      `${clp(PLAN_PRICE_AMOUNTS.empresa)}, una tienda online en ${clp(PLAN_PRICE_AMOUNTS.ecommerce)} y ` +
      `un sistema web a medida en ${clp(PLAN_PRICE_AMOUNTS.sistema)}. Las plataformas corporativas parten en ` +
      `${clp(PLAN_PRICE_AMOUNTS.intranet)} y llegan hasta ${clp(PLAN_PRICE_AMOUNTS.enterprise)} según arquitectura. ` +
      "Todos los valores son sin IVA y el precio final depende de páginas, funcionalidades e integraciones.",
  },
  {
    question: "¿Por qué hay agencias que cobran $50.000 y otras $2.000.000?",
    answer:
      "Porque no venden lo mismo. En el rango más bajo suele haber plantillas prearmadas sin estructura comercial, sin SEO y sin soporte posterior. En el rango alto hay levantamiento de requerimientos, diseño propio, desarrollo a medida, integraciones y acompañamiento. Lo importante es comparar alcance, no solo precio.",
  },
  {
    question: "¿La estimación de la calculadora es el precio final?",
    answer:
      "Es una estimación referencial construida con nuestros precios publicados, pensada para que tengas un orden de magnitud antes de conversar. El precio final se cierra después de una reunión de levantamiento y queda por escrito en una cotización formal sin costo. " +
      `Cuando la configuración supera ${CORPORATE_THRESHOLD_LABEL} + IVA, la calculadora ya no entrega una cifra automática: ese tipo de proyecto se define en un levantamiento técnico y comercial.`,
  },
  {
    question: "¿Qué costos adicionales debo considerar además del desarrollo?",
    answer:
      "Dominio (unos $10.000 anuales en NIC Chile), hosting (entre $30.000 y $150.000 al año), correos corporativos por usuario, comisiones de la pasarela de pago si vendes online, y mantención si no vas a administrar el sitio tú.",
  },
  {
    question: "¿Se puede pagar en cuotas?",
    answer:
      "Trabajamos con pagos por etapas asociados a hitos del proyecto: un anticipo para comenzar y el saldo contra entregas. El detalle queda definido en la cotización formal.",
  },
  {
    question: "¿Cuánto demora el desarrollo?",
    answer:
      `Una web básica toma ${getPlan("web-basica").deadline}. Una web de pyme ${getPlan("pyme").deadline}, ` +
      `un sitio corporativo ${getPlan("empresa").deadline}, una tienda online ${getPlan("ecommerce").deadline} y ` +
      `un sistema a medida ${getPlan("sistema").deadline.toLowerCase()}. Las plataformas corporativas avanzan por etapas ` +
      `(${getPlan("intranet").deadline.toLowerCase()}). El plazo real depende de la rapidez con que se aprueben contenidos y revisiones.`,
  },
];

export default function CalculadoraPrecioPaginaWebPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="calculadora-webpage-schema"
        data={buildWebPageJsonLd({
          path: PATH,
          title: "Calculadora de precio de página web en Chile",
          description:
            "Herramienta gratuita para estimar cuánto cuesta una página web en Chile según tipo de proyecto y funcionalidades.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Calculadora de precio", path: PATH },
          ],
        })}
      />
      <JsonLd id="calculadora-faq-schema" data={buildFaqJsonLd(faqs)} />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-16 sm:py-20">
        <Container className="space-y-5">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-blue-700">
              Inicio
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-700">Calculadora de precio</span>
          </nav>

          <div className="badge-blue w-fit">
            <Calculator className="h-3.5 w-3.5" />
            Herramienta gratuita · Sin registro
          </div>

          <h1 className="max-w-4xl text-balance text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Calculadora de precio de página web en Chile
          </h1>

          <p className="max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Arma tu proyecto y obtén una estimación inmediata con nuestros precios reales
            publicados. Sin formularios previos y sin dejar tus datos: primero el número, después
            conversamos.
          </p>
        </Container>
      </section>

      <section className="section-alt py-12 sm:py-16">
        <Container>
          <PriceCalculator />
        </Container>
      </section>

      <section className="cv-auto border-t border-slate-200 bg-white py-16">
        <Container className="space-y-8">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Referencia de mercado
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Cuánto cuesta cada tipo de proyecto en Chile
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Esta es la escalera completa con la que trabajamos, desde una presencia web inicial hasta
              una plataforma corporativa a medida. Los valores están en pesos chilenos, se expresan
              desde el precio indicado y no incluyen IVA.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th scope="col" className="p-3 font-extrabold text-slate-900">
                    Tipo de proyecto
                  </th>
                  <th scope="col" className="p-3 font-extrabold text-slate-900">
                    Precio referencial
                  </th>
                  <th scope="col" className="p-3 font-extrabold text-slate-900">
                    Plazo estimado
                  </th>
                  <th scope="col" className="p-3 font-extrabold text-slate-900">
                    Para quién
                  </th>
                </tr>
              </thead>
              <tbody>
                {priceRanges.map((row) => (
                  <tr key={row.type} className="border-b border-slate-100 align-top">
                    <td className="p-3 font-semibold text-slate-900">{row.type}</td>
                    <td className="p-3 font-semibold text-blue-700">{row.price}</td>
                    <td className="p-3 text-slate-600">{row.time}</td>
                    <td className="p-3 text-slate-600">{row.forWho}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-2">
            <p className="text-xs leading-relaxed text-slate-500">{PRICING_NOTE}</p>
            <p className="text-xs leading-relaxed text-slate-500">
              Sobre {CORPORATE_THRESHOLD_LABEL} + IVA el estimador deja de entregar una cifra automática:{" "}
              {CORPORATE_SCOPE_NOTE}
            </p>
          </div>
        </Container>
      </section>

      <section className="cv-auto section-alt py-16">
        <Container className="space-y-8">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Qué mueve el precio
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Seis factores que explican la diferencia de precio
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {priceFactors.map((factor) => (
              <article key={factor.title} className="card-premium p-5">
                <h3 className="text-base font-extrabold text-slate-900">{factor.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{factor.detail}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="cv-auto border-t border-slate-200 bg-white py-16">
        <Container className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Transparencia
            </p>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Costos que casi nadie te menciona antes de firmar
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              El desarrollo es un pago único, pero un sitio web tiene costos recurrentes asociados.
              Conviene tenerlos claros desde el principio para presupuestar bien el primer año.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild className="gap-2 bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href="/cotizador">
                  Cotizar página web <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-slate-300 font-semibold text-slate-800 hover:bg-slate-50"
              >
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
                </a>
              </Button>
            </div>
          </div>

          <div className="card-premium p-6">
            <ul className="space-y-4">
              {hiddenCosts.map((cost) => (
                <li key={cost.item} className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <span>
                    <span className="block text-sm font-bold text-slate-900">{cost.item}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
                      {cost.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <section className="cv-auto section-alt py-16">
        <Container className="space-y-8">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">FAQ</p>
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Preguntas frecuentes sobre el precio de una página web
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.question} className="card-premium p-6">
                <h3 className="mb-2 text-sm font-bold text-slate-900">{faq.question}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="cv-auto border-t border-slate-200 bg-white py-16">
        <Container className="space-y-6">
          <h2 className="text-2xl font-extrabold text-slate-900">Continúa por aquí</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Planes y precios detallados",
                description: "Qué incluye exactamente cada plan, con valores publicados.",
                href: "/planes",
              },
              {
                title: "Páginas web para empresas",
                description: "Sitios corporativos con estructura comercial y foco B2B.",
                href: "/paginas-web-para-empresas",
              },
              {
                title: "Páginas web en Santiago",
                description: "Atención presencial en Providencia y toda la Región Metropolitana.",
                href: "/paginas-web-santiago",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card-premium p-5 transition-colors hover:border-blue-200"
              >
                <h3 className="mb-2 text-base font-bold text-slate-900">{item.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                  Ver más <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
