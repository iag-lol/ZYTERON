import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Globe, Layers3, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { ContactLeadForm } from "@/components/forms/contact-lead-form";
import { HomeFaqAccordion } from "@/components/home/home-faq";
import { ClientReviewsSection } from "@/components/home/client-reviews-section";
import { getApprovedReviewsSnapshot } from "@/lib/web-control";
import { ProjectGallery } from "@/components/projects/project-gallery";
import { PLAN_CATALOG, fromPrice, PLAN_PRICE_AMOUNTS } from "@/config/pricing";
import { OFFER_CONDITIONS, planDeadline } from "@/config/commercial-offer";
import { siteConfig } from "@/config/site";
import { planContactHref } from "@/lib/commercial/request-context";
import { buildServicesListJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const revalidate = 3600;
export const metadata: Metadata = createPageMetadata({
  title: "Páginas Web Profesionales en Chile para Empresas y Pymes",
  description:
    "Creamos páginas web profesionales para empresas y pymes de Santiago, Región Metropolitana y todo Chile: sitios rápidos, con base SEO técnica y enfocados en generar cotizaciones.",
  path: "/",
});

const services = [
  {
    name: "Páginas web en Santiago",
    path: "/paginas-web-santiago",
    description: "Sitios corporativos para empresas de Santiago y la Región Metropolitana.",
  },
  {
    name: "Páginas web para empresas",
    path: "/paginas-web-para-empresas",
    description: "Servicios, proyectos y consultas comerciales B2B.",
  },
  {
    name: "Páginas web para pymes",
    path: "/paginas-web-para-pymes",
    description: "Presencia profesional, contenido y contacto para negocios en crecimiento.",
  },
  {
    name: "Desarrollo web",
    path: "/desarrollo-web",
    description: "Webs corporativas y páginas de captación para todo Chile.",
  },
  {
    name: "Tiendas online",
    path: "/tiendas-online",
    description: "Catálogo WhatsApp o ecommerce con carrito y pagos según alcance.",
  },
  {
    name: "Sistemas web a medida",
    path: "/sistemas-web",
    description: "Usuarios, roles, documentos, inventario y procesos internos.",
  },
  {
    name: "SEO para empresas",
    path: "/servicios/seo-para-empresas-chile",
    description: "Optimización técnica y contenido para búsquedas comerciales.",
  },
  {
    name: "Automatización empresarial",
    path: "/automatizacion",
    description: "Conexión de formularios, cotizaciones, avisos y tareas repetitivas.",
  },
];
const faqs = [
  {
    q: "¿Cuánto cuesta una página web profesional?",
    a: `Web Básica: ${fromPrice(PLAN_PRICE_AMOUNTS["web-basica"])}. Plan Pyme: ${fromPrice(PLAN_PRICE_AMOUNTS.pyme)}. Plan Empresa: ${fromPrice(PLAN_PRICE_AMOUNTS.empresa)}. Cada alternativa tiene un alcance diferente; la cotización confirma páginas, contenidos, revisiones e integraciones.`,
  },
  {
    q: "¿Cuánto demora la entrega?",
    a: `Web Básica: ${planDeadline("web-basica")}; Plan Pyme: ${planDeadline("pyme")}; Plan Empresa: ${planDeadline("empresa")}; Ecommerce Profesional: ${planDeadline("ecommerce")}. ${OFFER_CONDITIONS.delivery}`,
  },
  {
    q: "¿Qué diferencia un catálogo WhatsApp de una tienda con pagos?",
    a: `El catálogo permite consultar productos y preparar un pedido para coordinarlo por WhatsApp, desde $${PLAN_PRICE_AMOUNTS.catalogo.toLocaleString("es-CL")} + IVA. El ecommerce incorpora carrito y pasarela de pago, ${fromPrice(PLAN_PRICE_AMOUNTS.ecommerce)}. Comisiones, contrato con la pasarela y operación del despacho se revisan por separado.`,
  },
  { q: "¿Qué se paga después de publicar?", a: OFFER_CONDITIONS.recurring },
  { q: "¿Cómo se definen la titularidad, la entrega y el soporte?", a: OFFER_CONDITIONS.ownership },
  {
    q: "¿Puedo administrar la web y crecer hacia un sistema?",
    a: "La administración se incluye según el plan y alcance acordados. Si necesitas roles, inventario, documentos o integraciones, el diagnóstico define módulos, datos, migración y continuidad por etapas.",
  },
  {
    q: "¿Incluyen SEO y adaptación a celulares?",
    a: "Los planes web incluyen diseño adaptable y base SEO técnica: estructura, metadatos, sitemap y enlaces rastreables. El posicionamiento y las ventas dependen de factores que requieren seguimiento; no se garantiza una posición en Google.",
  },
  {
    q: "¿Cómo comenzar y cómo se coordinan los pagos?",
    a: "Envía el objetivo de tu proyecto. Recibirás una propuesta con alcance, hitos, precio, calendario y condiciones de pago antes de contratar. Los pagos por etapas y el soporte se detallan en esa propuesta.",
  },
];
const steps = [
  [
    "01",
    "Definimos el objetivo",
    "Qué necesitas captar, vender u ordenar; revisamos tu situación y la información disponible.",
  ],
  [
    "02",
    "Acordamos el alcance",
    "Propuesta escrita con entregables, revisiones, calendario, inversión y costes externos.",
  ],
  [
    "03",
    "Construimos y revisamos",
    "Diseño y desarrollo por etapas, con pruebas de móvil, formularios e integraciones contratadas.",
  ],
  [
    "04",
    "Publicamos y acompañamos",
    "Entrega de accesos y documentación, soporte y continuidad según las condiciones acordadas.",
  ],
];
const action =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition-colors";

export default async function Home() {
  const reviews = await getApprovedReviewsSnapshot();
  const plans = ["web-basica", "pyme", "catalogo", "ecommerce"].map(
    (id) => PLAN_CATALOG.find((plan) => plan.id === id)!,
  );
  return (
    <main className="home-page overflow-x-clip">
      <JsonLd
        id="home-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/",
          title: "Páginas Web Profesionales en Chile | Zyteron",
          description:
            "Páginas web y ecommerce para captar clientes, sistemas y automatización para ordenar la operación.",
          breadcrumbs: [{ name: "Inicio", path: "/" }],
        })}
      />
      <JsonLd
        id="home-services-list-schema"
        data={buildServicesListJsonLd({
          path: "/",
          title: "Servicios principales Zyteron",
          services,
        })}
      />
      <section className="home-hero">
        <Container>
          <div className="hero-overline">
            <p className="eyebrow">Desarrollo digital para empresas</p>
            <span>Santiago, Chile · Desde 2019</span>
          </div>
          <h1>
            Páginas web profesionales <span>para empresas que necesitan vender</span>
          </h1>
          <div className="hero-bottom">
            <p className="hero-note">
              Diseño, desarrollo y operación.
              <br />
              Un equipo para conectar las tres.
            </p>
            <div className="hero-intro">
              <p>
                Creamos webs y tiendas para captar clientes. Conectamos sistemas y automatizaciones
                para que tu equipo pueda atenderlos con orden.
              </p>
              <div className="hero-actions">
                <Link href="/contacto?tipo=web&origen=inicio" className="design-button">
                  Hablemos de tu proyecto <ArrowUpRight size={18} />
                </Link>
                <Link href="#proyectos" className="text-link">
                  Explorar proyectos <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
      <section id="proyectos" className="work-section">
        <Container>
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 / Proyectos seleccionados</p>
              <h2>Trabajo que puedes ver.</h2>
            </div>
            <Link href="/casos-exito" className="text-link">
              Todos los proyectos <ArrowUpRight size={17} />
            </Link>
          </div>
          <ProjectGallery />
        </Container>
      </section>

      <section
        id="servicios"
        className="home-services border-y border-slate-200 bg-slate-50 py-16 sm:py-24"
      >
        <Container>
          <p className="text-xs font-bold tracking-widest text-blue-700 uppercase">
            02 / Servicios
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Captar clientes. Ordenar la operación.
          </h2>
          <div className="mt-9 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-blue-200 bg-white p-7 sm:p-9">
              <Globe className="h-8 w-8 text-blue-700" />
              <h3 className="mt-5 text-2xl font-bold text-slate-950">Páginas web y ecommerce</h3>
              <p className="mt-3 leading-7 text-slate-600">
                Presenta servicios, recibe consultas o vende productos. El alcance distingue
                páginas, contenidos, catálogo, pagos y administración.
              </p>
              <div id="planes" className="mt-6 divide-y divide-slate-200">
                {plans.map((plan) => (
                  <Link
                    key={plan.id}
                    href={planContactHref(plan.id, "inicio")}
                    className="flex flex-wrap items-center justify-between gap-2 py-4 text-sm"
                  >
                    <span className="font-bold text-slate-900">{plan.name}</span>
                    <span className="font-semibold text-blue-700">{plan.price} →</span>
                  </Link>
                ))}
              </div>
              <Link
                href="/planes"
                className="mt-5 inline-flex text-sm font-bold text-blue-700 underline"
              >
                Comparar inclusiones, plazos y mantenimiento
              </Link>
            </div>
            <div className="rounded-2xl bg-[#101e39] p-7 text-white sm:p-9">
              <Layers3 className="h-8 w-8 text-blue-300" />
              <h3 className="mt-5 text-2xl font-bold">Sistemas y automatización</h3>
              <p className="mt-3 leading-7 text-slate-300">
                Documentos, inventario, flota, aprobaciones o integraciones: partimos por una tarea
                concreta y definimos una primera etapa verificable.
              </p>
              <ul className="mt-6 space-y-4 text-sm text-slate-200">
                {[
                  "Usuarios, roles y permisos según el proceso.",
                  "Datos, migración e integración con herramientas existentes.",
                  "Módulos, validación, entrega y continuidad por etapas.",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-7 text-xl font-bold">{fromPrice(PLAN_PRICE_AMOUNTS.sistema)}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Referencia del Sistema Web Profesional: usuarios, registros, roles, panel y
                reportes. El diagnóstico confirma módulos, límites e integraciones.
              </p>
              <Link
                className={`${action} mt-7 bg-white text-blue-900 hover:bg-blue-50`}
                href="/contacto?tipo=sistema&origen=inicio"
              >
                Solicitar diagnóstico <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-5 text-sm">
                <Link href="/sistemas-web" className="text-blue-200 underline">
                  Explorar sistemas
                </Link>{" "}
                ·{" "}
                <Link href="/automatizacion" className="text-blue-200 underline">
                  Ver automatización
                </Link>
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
            <strong className="text-slate-900">Implementación y operación por separado. </strong>
            {OFFER_CONDITIONS.recurring} Todos los importes de implementación son referenciales y
            están expresados en CLP + IVA.
          </div>
        </Container>
      </section>

      <section id="proceso" className="py-16 sm:py-24">
        <Container>
          <p className="text-xs font-bold tracking-widest text-blue-700 uppercase">
            03 / Cómo trabajamos
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Sabes qué se construye y qué recibes.
          </h2>
          <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([number, title, copy]) => (
              <div key={number} className="border-t-2 border-blue-700 pt-5">
                <span className="text-sm font-bold text-blue-700">{number}</span>
                <h3 className="mt-4 text-lg font-bold text-slate-950">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{copy}</p>
              </div>
            ))}
          </div>
          <p className="mt-9 flex items-start gap-3 rounded-xl bg-slate-50 p-5 text-sm leading-7 text-slate-600">
            <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
            <span>
              {OFFER_CONDITIONS.ownership}{" "}
              <Link className="font-bold text-blue-700 underline" href="/terminos">
                Revisar condiciones
              </Link>
              .
            </span>
          </p>
        </Container>
      </section>
      {reviews.length > 0 && <ClientReviewsSection reviews={reviews} />}
      <section id="preguntas-frecuentes" className="bg-slate-50 py-16">
        <Container className="max-w-4xl">
          <h2 className="mb-8 text-3xl font-bold tracking-tight text-slate-950">
            Antes de cotizar
          </h2>
          <HomeFaqAccordion faqs={faqs} />
        </Container>
      </section>
      <section id="contacto" className="py-16 sm:py-24">
        <Container className="grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-bold tracking-widest text-blue-700 uppercase">
              04 / Conversemos
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">
              Cuéntanos qué necesita tu empresa.
            </h2>
            <p className="mt-5 leading-8 text-slate-600">
              Con el objetivo y tus datos de contacto podemos comenzar. La especificación técnica se
              define después de revisar tu necesidad.
            </p>
            <p className="mt-5 text-sm leading-7 text-slate-600">
              Atención de lunes a viernes, de 09:00 a 18:00. Revisamos la solicitud y coordinamos el
              siguiente paso por correo o WhatsApp.
            </p>
            <a
              href={siteConfig.social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex text-sm font-bold text-blue-700 underline"
            >
              También puedes escribir por WhatsApp
            </a>
            <div id="cobertura" className="mt-9 border-t border-slate-200 pt-6">
              <h3 className="font-bold text-slate-900">Santiago y todo Chile</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {siteConfig.address.display}. Reuniones coordinadas y atención remota para empresas
                de todo Chile.
              </p>
            </div>
          </div>
          <ContactLeadForm />
        </Container>
      </section>
      <section className="border-t border-slate-200 bg-slate-50 py-12">
        <Container>
          <h2 className="text-xl font-bold text-slate-950">
            Encuentra la solución para tu empresa
          </h2>
          <nav
            aria-label="Servicios y recursos"
            className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {services.map((service) => (
              <Link
                key={service.path}
                href={service.path}
                className="text-sm font-semibold text-slate-700 hover:text-blue-700"
              >
                {service.name}
              </Link>
            ))}
            {[
              { path: "/desarrollo-web-santiago", name: "Integraciones y migración en Santiago" },
              { path: "/paginas-web/industria-b2b", name: "Soluciones para industria B2B" },
              { path: "/soporte-ti", name: "Soporte TI" },
              { path: "/calculadora-precio-pagina-web", name: "Calcular inversión" },
              { path: "/blog", name: "Guías y comparativas" },
              { path: "/faq", name: "Preguntas frecuentes" },
              { path: "/servicios", name: "Todos los servicios" },
              { path: "/quienes-somos", name: "Conoce Zyteron" },
            ].map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className="text-sm font-semibold text-slate-700 hover:text-blue-700"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </Container>
      </section>
    </main>
  );
}
