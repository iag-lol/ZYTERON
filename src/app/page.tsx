import { HomeQuotePreview } from "@/components/manual-quote/home-preview";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Monitor,
  ShieldCheck,
  ShoppingBag,
  Users,
  Workflow,
} from "lucide-react";
import { HeroVisual } from "@/components/home/hero-visual";
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
import { SolutionFamilies } from "@/components/commercial/solution-families";
import {
  HomeIndustriesSection,
  HomeIntegrationsSection,
} from "@/components/home/home-ecosystem";
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

const needs = [
  {
    title: "Presentar mejor lo que haces",
    text: "Una empresa, una profesión, un servicio o un proyecto: información clara y una presencia que dé confianza.",
    href: "/desarrollo-web",
    label: "Explorar sitios web",
    icon: Monitor,
  },
  {
    title: "Ordenar productos y pedidos",
    text: "Un catálogo para mostrar o cotizar, una tienda para cobrar online o una conexión con tu inventario.",
    href: "/servicios#comercio-digital",
    label: "Explorar comercio digital",
    icon: ShoppingBag,
  },
  {
    title: "Coordinar equipos y operaciones",
    text: "Reunir datos, documentos y tareas para que cada persona conozca sus pendientes y pueda seguir su avance.",
    href: "/servicios#personas-operaciones",
    label: "Explorar gestión",
    icon: Users,
  },
  {
    title: "Conectar herramientas y ahorrar pasos",
    text: "Evitar volver a digitar una solicitud, preparar documentos y avisar al equipo cuando cambia un estado.",
    href: "/automatizacion",
    label: "Explorar automatizaciones",
    icon: Workflow,
  },
];
const heroDelay = (ms: number) => ({ "--hero-delay": `${ms}ms` }) as React.CSSProperties;

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
        <Container className="hero-grid">
          <div className="hero-copy">
            <div className="hero-overline hero-in">
              <p className="eyebrow">Software y desarrollo digital para empresas y profesionales</p>
              <span>Santiago, Chile · Desde 2019</span>
            </div>
            <h1 className="hero-in" style={heroDelay(70)}>
              Desarrollo de software <span>y soluciones digitales a medida</span>
            </h1>
            <div className="hero-bottom">
              <p className="hero-note hero-in" style={heroDelay(150)}>
                Desde presentar tu empresa hasta conectar y gestionar su operación.
              </p>
              <div className="hero-intro hero-in" style={heroDelay(220)}>
                <p>
                  Creamos sistemas empresariales, plataformas de gestión, ecommerce y sitios web
                  para empresas y profesionales. Desarrollamos herramientas para gestionar personas,
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
          </div>
          <HeroVisual />
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

      <section id="soluciones" className="home-section is-tinted">
        <Container className="split">
          <div className="split-head">
            <span id="servicios" />
            <p className="eyebrow">02 / Familias de soluciones</p>
            <h2>Tecnología para lo que tu negocio necesita hacer.</h2>
          </div>
          <SolutionFamilies />
        </Container>
      </section>
      <section className="home-section" id="necesidades">
        <Container>
          <div className="home-section-head">
            <div>
              <p className="eyebrow">03 / Un punto de partida</p>
              <h2>¿Qué necesitas resolver?</h2>
            </div>
          </div>
          <div className="needs-grid">
            {needs.map(({ title, text, href, label, icon: Icon }) => (
              <article key={title}>
                <span className="need-icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
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
      <HomeIndustriesSection />
      <HomeIntegrationsSection />

      <section id="proceso" className="home-section">
        <Container>
          <div className="home-section-head">
            <div>
              <p className="eyebrow">06 / Cómo trabajamos</p>
              <h2>Sabes qué se construye y qué recibes.</h2>
            </div>
          </div>
          <ol className="process-steps">
            {steps.map(([number, title, copy]) => (
              <li key={number}>
                <span className="process-num">{number}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </li>
            ))}
          </ol>
          <p className="process-note">
            <ShieldCheck className="h-5 w-5" />
            <span>
              {OFFER_CONDITIONS.ownership} <Link href="/terminos">Revisar condiciones</Link>.
            </span>
          </p>
        </Container>
      </section>
      <section id="implementacion" className="home-section is-tinted">
        <Container>
          <div className="impl-panel">
            <div>
              <p className="eyebrow">07 / Implementación y continuidad</p>
              <h2>El alcance y los costos, por escrito.</h2>
              <p>
                La propuesta distingue desarrollo e implementación de infraestructura, equipamiento,
                mantenimiento, licencias, renovaciones y consumos externos. Define responsables,
                plazos y entregables por etapa.
              </p>
              <Link id="planes" href="/planes" className="text-link mt-4">
                Revisar precios y alcances <ArrowUpRight size={17} />
              </Link>
            </div>
            <div className="impl-details">
              <p>
                <strong>Sistemas empresariales. </strong>
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
          </div>
        </Container>
      </section>
      {reviews.length > 0 && <ClientReviewsSection reviews={reviews} />}
      <section id="preguntas-frecuentes" className="home-section">
        <Container>
          <div className="faq-head">
            <h2>Antes de cotizar</h2>
          </div>
          <HomeFaqAccordion faqs={faqs} />
        </Container>
      </section>
      <section id="contacto" className="home-contact">
        <Container className="home-contact-grid">
          <div>
            <p className="eyebrow">09 / Conversemos</p>
            <h2>Cuéntanos qué necesita tu empresa.</h2>
            <p className="contact-lead">
              Con el objetivo y tus datos de contacto podemos comenzar. La especificación técnica se
              define después de revisar tu necesidad.
            </p>
            <p className="contact-meta">
              Atención de lunes a viernes, de 09:00 a 18:00. Revisamos la solicitud y coordinamos el
              siguiente paso por correo o WhatsApp.
            </p>
            <a
              href={siteConfig.social.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-whatsapp"
            >
              También puedes escribir por WhatsApp
            </a>
            <div id="cobertura" className="contact-coverage">
              <h3>Santiago y todo Chile</h3>
              <p>
                {siteConfig.address.display}. Reuniones coordinadas y atención remota para empresas
                de todo Chile.
              </p>
            </div>
          </div>
          <ContactLeadForm />
        </Container>
      </section>
      <section className="service-index">
        <Container>
          <h2>Encuentra la solución para tu empresa</h2>
          <nav aria-label="Servicios y recursos">
            {services.map((service) => (
              <Link key={service.path} href={service.path}>
                {service.name}
              </Link>
            ))}
            {[
              { path: "/desarrollo-web-santiago", name: "Integraciones y migración en Santiago" },
              { path: "/integraciones", name: "Integraciones de sistemas y API en Chile" },
              { path: "/paginas-web/industria-b2b", name: "Soluciones para industria B2B" },
              { path: "/soporte-ti", name: "Soporte TI" },
              { path: "/calculadora-precio-pagina-web", name: "Calcular inversión" },
              { path: "/blog", name: "Guías y comparativas" },
              { path: "/faq", name: "Preguntas frecuentes" },
              { path: "/servicios", name: "Todos los servicios" },
              { path: "/quienes-somos", name: "Conoce Zyteron" },
            ].map((link) => (
              <Link key={link.path} href={link.path}>
                {link.name}
              </Link>
            ))}
          </nav>
        </Container>
      </section>
    </main>
  );
}
