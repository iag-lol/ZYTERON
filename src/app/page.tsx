import { HomeQuotePreview } from "@/components/manual-quote/home-preview";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { ContactLeadForm } from "@/components/forms/contact-lead-form";
import { HomeFaqAccordion } from "@/components/home/home-faq";
import { ClientReviewsSection } from "@/components/home/client-reviews-section";
import { getApprovedReviewsSnapshot } from "@/lib/web-control";
import { ProjectGallery } from "@/components/projects/project-gallery";
import { fromPrice, PLAN_PRICE_AMOUNTS } from "@/config/pricing";
import { OFFER_CONDITIONS, planDeadline } from "@/config/commercial-offer";
import { siteConfig } from "@/config/site";
import { SolutionFamilies, IndustrySolutions } from "@/components/commercial/solution-families";
import { solutionFamilies } from "@/content/solutions";
import { buildServicesListJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const revalidate = 3600;
export const metadata: Metadata = createPageMetadata({
  title: "Desarrollo de Software y Soluciones Digitales en Chile",
  description:
    "Software a medida, sistemas empresariales, ecommerce y páginas web profesionales en Chile. Soluciones para gestionar, presentar y hacer crecer tu negocio.",
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
    description: "Ecommerce con carrito, pagos y gestión de pedidos según alcance.",
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
    q: "¿Desarrollan solo páginas web?",
    a: "Desarrollamos software a medida, plataformas empresariales, herramientas para personas y operaciones, ecommerce, catálogos, sitios web e integraciones. Podemos abordar un proyecto completo o una necesidad específica, según los procesos, usuarios y objetivos de cada empresa o profesional.",
  },
  {
    q: "¿Pueden crear herramientas de recursos humanos y control de operaciones?",
    a: "Sí. Evaluamos gestión de personal, solicitudes, documentación, tareas, turnos, flotas y trabajo en terreno. Son desarrollos a medida: definimos los módulos y validamos las integraciones y requisitos antes de comprometer su implementación. Equipos e instalación se cotizan por separado cuando son necesarios.",
  },
  {
    q: "¿Una web puede servir solo para presentar mi empresa o profesión?",
    a: "Sí. Puede informar, mostrar trayectoria, servicios, productos o proyectos y transmitir confianza, sin incorporar compra online. Elegimos la estructura y las acciones según el objetivo del sitio.",
  },
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
    "Qué necesitas presentar, comercializar o gestionar; revisamos procesos, usuarios y herramientas actuales.",
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

export default async function Home() {
  const reviews = await getApprovedReviewsSnapshot();
  return (
    <main className="home-page overflow-x-clip">
      <JsonLd
        id="home-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/",
          title: "Desarrollo de Software y Soluciones Digitales en Chile | Zyteron",
          description: siteConfig.description,
          breadcrumbs: [{ name: "Inicio", path: "/" }],
        })}
      />
      <JsonLd
        id="home-services-list-schema"
        data={buildServicesListJsonLd({
          path: "/",
          title: "Servicios principales Zyteron",
          services: solutionFamilies.map((family) => ({
            name: family.name,
            description: family.description,
            path: `/servicios#${family.id}`,
          })),
        })}
      />
      <section className="home-hero">
        <Container>
          <div className="hero-overline">
            <p className="eyebrow">Software y desarrollo digital para empresas y profesionales</p>
            <span>Santiago, Chile · Desde 2019</span>
          </div>
          <h1>
            Desarrollo de software <span>y soluciones digitales a medida</span>
          </h1>
          <div className="hero-bottom">
            <p className="hero-note">
              Desde presentar tu empresa hasta conectar y gestionar su operación.
            </p>
            <div className="hero-intro">
              <p>
                Creamos sistemas empresariales, plataformas de gestión, ecommerce y sitios web para
                empresas y profesionales. Desarrollamos herramientas para gestionar personas,
                recursos humanos, flotas, productos y operaciones, con integraciones y
                automatizaciones adaptadas a cada proyecto.
              </p>
              <div className="hero-actions">
                <Link href="/contacto?origen=inicio" className="design-button">
                  Conversemos sobre tu proyecto <ArrowUpRight size={18} />
                </Link>
                <Link href="#cotizar" className="text-link">
                  Cotizar con precio definido <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
      <HomeQuotePreview />
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

      <section id="soluciones" className="border-y border-slate-200 py-16 sm:py-24">
        <Container>
          <span id="servicios" />
          <p className="eyebrow">02 / Familias de soluciones</p>
          <h2 className="mt-3 max-w-3xl text-3xl sm:text-4xl">
            Tecnología para lo que tu negocio necesita hacer.
          </h2>
          <SolutionFamilies />
        </Container>
      </section>
      <section className="py-16 sm:py-24" id="necesidades">
        <Container>
          <p className="eyebrow">03 / Un punto de partida</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">¿Qué necesitas resolver?</h2>
          <div className="needs-grid">
            {[
              [
                "Presentar mejor lo que haces",
                "Una empresa, una profesión, un servicio o un proyecto: información clara y una presencia que dé confianza.",
                "/desarrollo-web",
                "Explorar sitios web",
              ],
              [
                "Ordenar productos y pedidos",
                "Un catálogo para mostrar o cotizar, una tienda para cobrar online o una conexión con tu inventario.",
                "/servicios#comercio-digital",
                "Explorar comercio digital",
              ],
              [
                "Coordinar equipos y operaciones",
                "Reunir datos, documentos y tareas para que cada persona conozca sus pendientes y pueda seguir su avance.",
                "/servicios#personas-operaciones",
                "Explorar gestión",
              ],
              [
                "Conectar herramientas y ahorrar pasos",
                "Evitar volver a digitar una solicitud, preparar documentos y avisar al equipo cuando cambia un estado.",
                "/automatizacion",
                "Explorar automatizaciones",
              ],
            ].map(([title, text, href, label]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link className="text-link" href={href}>
                  {label}
                  <ArrowUpRight size={16} />
                </Link>
              </article>
            ))}
          </div>
        </Container>
      </section>
      <section className="border-y border-slate-200 bg-white py-16 sm:py-24" id="rubros">
        <Container>
          <p className="eyebrow">04 / Soluciones por rubro</p>
          <h2 className="mt-3 text-3xl sm:text-4xl">
            Distintas actividades. Necesidades concretas.
          </h2>
          <IndustrySolutions />
        </Container>
      </section>

      <section id="proceso" className="py-16 sm:py-24">
        <Container>
          <p className="text-xs font-bold tracking-widest text-blue-700 uppercase">
            05 / Cómo trabajamos
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
      <section id="implementacion" className="border-y border-slate-200 bg-white py-16">
        <Container className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">06 / Implementación y continuidad</p>
            <h2 className="mt-3 text-3xl">El alcance y los costos, por escrito.</h2>
            <p className="mt-5 leading-7 text-slate-600">
              La propuesta distingue desarrollo e implementación de infraestructura, equipamiento,
              mantenimiento, licencias, renovaciones y consumos externos. Define responsables,
              plazos y entregables por etapa.
            </p>
            <Link id="planes" href="/planes" className="text-link mt-4">
              Revisar precios y alcances <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="space-y-5 text-sm leading-7 text-slate-600">
            <p>
              <strong className="text-slate-900">Sistemas empresariales. </strong>
              {fromPrice(PLAN_PRICE_AMOUNTS.sistema)} como referencia del Sistema Web Profesional:
              usuarios, registros, roles, panel y reportes. Módulos, datos, migración e
              integraciones modifican el presupuesto.
            </p>
            <p>{OFFER_CONDITIONS.recurring}</p>
            <p>{OFFER_CONDITIONS.delivery}</p>
            <Link className="text-link" href="/sistemas-web/control-flota">
              Ver alcance específico de Control de Flota <ArrowUpRight size={16} />
            </Link>
          </div>
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
              08 / Conversemos
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
