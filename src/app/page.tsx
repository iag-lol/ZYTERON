import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Check,
  Globe,
  LayoutDashboard,
  MonitorSmartphone,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { siteConfig } from "@/config/site";
import {
  buildFaqJsonLd,
  buildLocalBusinessJsonLd,
  buildServicesListJsonLd,
  buildWebPageJsonLd,
  createPageMetadata,
} from "@/lib/seo";
import { getApprovedReviewsSnapshot } from "@/lib/web-control";
import { ClientReviewsSection } from "@/components/home/client-reviews-section";
import { getFeaturedCaseItems } from "@/lib/content/cases-merge";
import { softBlueBlurDataUrl } from "@/lib/image-placeholders";
import { getPublishedScholarshipProfiles } from "@/lib/becas/public-profiles";
import { PublicShowcaseCarousel } from "@/components/becas/public-showcase-carousel";
import { Reveal } from "@/components/home/reveal";
import { CountUp } from "@/components/home/count-up";
import { ScrollProgress } from "@/components/home/scroll-progress";
import { CoverageMarquee } from "@/components/home/coverage-marquee";
import { ClientLogosMarquee } from "@/components/home/client-logos-marquee";
import { HomeFaqAccordion } from "@/components/home/home-faq";

export const revalidate = 300;

const WHATSAPP_BASE =
  `${siteConfig.social.whatsapp}?text=Hola%20ZYTERON%2C%20quiero%20cotizar%20una%20soluci%C3%B3n%20para%20mi%20empresa.`;

export const metadata: Metadata = createPageMetadata({
  title: "Diseño de páginas web en Chile para empresas y pymes",
  description:
    "Diseño de páginas web profesionales para empresas y pymes en todo Chile. Sitios rápidos, responsivos y con SEO real para captar clientes. Cotiza gratis hoy.",
  path: "/",
});

const heroAnchors = [
  { label: "Servicios", href: "#servicios" },
  { label: "Cobertura", href: "#cobertura" },
  { label: "Planes", href: "#planes" },
  { label: "Proceso", href: "#proceso" },
  { label: "Preguntas frecuentes", href: "#preguntas-frecuentes" },
];

const heroTrustSignals = [
  "Te respondemos dentro del horario laboral.",
  "Cotización formal y sin compromiso.",
  "Diseño responsivo para celular, tablet y computador.",
  "Sabrás exactamente qué incluye tu proyecto antes de comenzar.",
];

const processSteps = [
  "Diagnóstico inicial",
  "Levantamiento de requerimientos",
  "Cotización formal",
  "Diseño y estructura",
  "Desarrollo web o sistema",
  "Revisión con el cliente",
  "Ajustes finales",
  "Entrega del proyecto",
  "Soporte post-entrega",
];

const heroStats = [
  {
    value: siteConfig.business.experienceYears,
    suffix: "+",
    label: "Años de experiencia en tecnología y desarrollo",
  },
  {
    value: 16,
    suffix: "",
    label: "Regiones de Chile con atención remota",
  },
  {
    value: 100,
    suffix: "%",
    label: "Proyectos entregados con diseño responsivo",
  },
  {
    value: processSteps.length,
    suffix: "",
    label: "Etapas documentadas, de cotización a post-entrega",
  },
];

const coverageSignals = [
  "Atendemos empresas, pymes y emprendedores en todas las regiones de Chile con trabajo remoto y reuniones online.",
  "Base operativa en Santiago para proyectos que requieren contexto local en la Región Metropolitana.",
  "Seguimiento por etapas y comunicación directa para avanzar con tu proyecto estés donde estés.",
  "Cada web se entrega con base SEO técnica para que tu negocio aparezca en las búsquedas de tu ciudad y rubro.",
];

const trustPoints = [
  `Más de ${siteConfig.business.experienceYears} años de experiencia en tecnología, procesos y soluciones digitales.`,
  "Cotización formal y sin compromiso antes de iniciar.",
  "Proceso de trabajo ordenado y documentado.",
  "Entrega por etapas con revisión del cliente.",
  "Soporte post-entrega para que tu solución siga funcionando.",
  "Comunicación directa durante todo el proyecto.",
  "Soluciones adaptadas al tamaño de cada negocio.",
  "Desarrollo enfocado en resultados, no solo diseño.",
  "Emitimos boleta o factura según el servicio contratado.",
  "Atención a empresas, pymes y emprendedores en Chile.",
];

const serviceGroups = [
  {
    title: "Desarrollo Web",
    icon: <MonitorSmartphone className="h-5 w-5" />,
    href: "/desarrollo-web",
    description:
      "Diseño de páginas web profesionales para presentar, posicionar y vender tus servicios o productos.",
    items: [
      "Sitios web corporativos",
      "Landing pages",
      "Tiendas online",
      "Catálogos digitales",
      "Webs responsivas",
      "SEO básico",
      "Optimización de velocidad",
    ],
  },
  {
    title: "Sistemas y automatización",
    icon: <Settings className="h-5 w-5" />,
    href: "/sistemas-web",
    description:
      "Herramientas para ordenar procesos y reducir tareas manuales dentro de tu empresa.",
    items: [
      "Sistemas internos",
      "Paneles administrativos",
      "Cotizadores",
      "Generación de PDF",
      "Control de registros",
      "Automatización de WhatsApp",
      "Integración de pagos",
    ],
  },
  {
    title: "Soporte TI y soluciones tecnológicas",
    icon: <ShieldCheck className="h-5 w-5" />,
    href: "/soporte-ti",
    description:
      "Acompañamiento técnico para mantener continuidad operativa en tu negocio.",
    items: [
      "Soporte técnico",
      "Redes",
      "Configuración de equipos",
      "Asesoría tecnológica",
      "Productos TI como complemento",
    ],
  },
];

const demoCards = [
  {
    name: "Demo tienda online de ropa",
    desc: "Demo visual para marcas que quieren vender online con diseño personalizado y responsive.",
    tech: "Desde $599.990 CLP + IVA · Catálogo, carrito y pagos online",
    gallery: [
      "/demos/tienda-ropa/tienda-ropa-01.png",
      "/demos/tienda-ropa/tienda-ropa-02.png",
      "/demos/tienda-ropa/tienda-ropa-03.png",
      "/demos/tienda-ropa/tienda-ropa-04.png",
    ],
  },
  {
    name: "Demo estudio jurídico",
    desc: "Web profesional para estudios jurídicos orientada a consultas y posicionamiento de servicios legales.",
    tech: "Servicios legales, equipo, formulario de consulta, SEO local",
    gallery: [
      "/demos/estudio-juridico/estudio-juridico-01.png",
      "/demos/estudio-juridico/estudio-juridico-02.png",
      "/demos/estudio-juridico/estudio-juridico-03.png",
      "/demos/estudio-juridico/estudio-juridico-04.png",
    ],
  },
];

const adminPanelFeatures = [
  "Gestión de productos",
  "Gestión de servicios",
  "Gestión de reservas",
  "Gestión de usuarios",
  "Reportes",
  "Estados de pedidos",
  "Formularios",
  "Registros internos",
  "Generación de PDF",
  "Control de información",
  "Dashboard con métricas",
];

const planCards = [
  {
    name: "Plan Básico",
    target: "Para presencia inicial",
    includes: [
      "Sitio base profesional",
      "Secciones esenciales",
      "Diseño responsivo",
      "Formulario de contacto",
    ],
  },
  {
    name: "Plan Medio",
    target: "Para negocios que necesitan una web más completa",
    includes: [
      "Más secciones y contenidos",
      "Mejor estructura comercial",
      "Optimización de velocidad",
      "Base SEO y seguimiento",
    ],
  },
  {
    name: "Plan Avanzado",
    target: "Para empresas que requieren mayor alcance funcional",
    includes: [
      "Arquitectura extensa",
      "Formularios y funciones adicionales",
      "Bloques estratégicos de conversión",
      "Soporte inicial ampliado",
    ],
  },
  {
    name: "Plan Sistema",
    target: "Desde precio referencial para soluciones a medida",
    includes: [
      "Diagnóstico técnico y funcional",
      "Alcance personalizado",
      "Módulos por etapa",
      "Roadmap de implementación",
    ],
  },
];

const homeFaqs = [
  {
    q: "¿Cuánto cuesta el diseño de una página web profesional?",
    a: "Depende del alcance, cantidad de secciones, contenido, integraciones y soporte. Publicamos valores referenciales y siempre entregamos cotización formal antes de iniciar.",
  },
  {
    q: "¿Cuánto demora una página web?",
    a: "Depende del alcance. Una landing puede tomar 1 a 2 semanas y un sitio corporativo más completo 3 a 6 semanas.",
  },
  {
    q: "¿Puedo pagar por etapas?",
    a: "Sí. Podemos definir pagos por hitos según avance y entregables del proyecto.",
  },
  {
    q: "¿Incluye dominio y hosting?",
    a: "Podemos incluirlo según plan. Se detalla explícitamente en la cotización formal.",
  },
  {
    q: "¿Puedo administrar mi web?",
    a: "Sí. Podemos implementar un panel para que gestiones contenidos y datos sin depender de terceros.",
  },
  {
    q: "¿La web queda adaptada a celular?",
    a: "Sí. Todo proyecto web se trabaja responsive para celular, tablet y escritorio.",
  },
  {
    q: "¿Hacen tiendas online?",
    a: "Sí, desarrollamos tiendas online adaptadas al tipo de negocio y catálogo.",
  },
  {
    q: "¿Integran pagos?",
    a: "Sí. Se puede integrar pasarela de pago según requerimientos técnicos y comerciales.",
  },
  {
    q: "¿Incluyen SEO?",
    a: "Incluimos base SEO técnica y on-page: estructura, metadata, sitemap, robots, schema cuando corresponde y contenido organizado.",
  },
  {
    q: "¿Hacen sistemas personalizados?",
    a: "Sí. Diseñamos sistemas internos y soluciones a medida por módulo y alcance.",
  },
  {
    q: "¿Entregan soporte después?",
    a: "Sí. Incluimos soporte post-entrega y planes de continuidad según necesidad.",
  },
  {
    q: "¿Diseñan páginas web para empresas de todo Chile?",
    a: "Sí. Trabajamos con pymes, emprendedores y empresas de todas las regiones de Chile, de Arica a Punta Arenas, con atención remota, reuniones online y seguimiento por etapas.",
  },
  {
    q: "¿Emiten factura o boleta?",
    a: "Cuando corresponde, podemos emitir documento tributario según el servicio contratado.",
  },
  {
    q: "¿Qué necesito para comenzar?",
    a: "Objetivo del proyecto, información base del negocio y alcance inicial para preparar una cotización formal.",
  },
];

const solutionsByNeed = [
  {
    title: "Necesito una página web profesional",
    description:
      "Diseñamos webs corporativas con propuesta de valor clara, estructura comercial y foco en generación de consultas.",
    href: "/desarrollo-web",
    cta: "Ver servicio",
  },
  {
    title: "Necesito vender online",
    description:
      "Implementamos tiendas online y catálogos para ordenar productos, vender por web y complementar venta por WhatsApp.",
    href: "/tiendas-online",
    cta: "Cotizar tienda",
  },
  {
    title: "Necesito ordenar procesos internos",
    description:
      "Desarrollamos sistemas web y paneles administrativos para registrar información, controlar estados y reducir tareas manuales.",
    href: "/sistemas-web",
    cta: "Ver solución",
  },
  {
    title: "Necesito automatizar tareas o WhatsApp",
    description:
      "Creamos flujos de automatización para responder más rápido, filtrar solicitudes y mejorar trazabilidad comercial.",
    href: "/automatizacion",
    cta: "Cotizar automatización",
  },
  {
    title: "Necesito soporte TI para mi empresa",
    description:
      "Entregamos soporte técnico para continuidad operativa en pymes y empresas con atención en Santiago y otras regiones.",
    href: "/soporte-ti",
    cta: "Solicitar soporte",
  },
];

const clientTypes = [
  {
    title: "Pymes que quieren profesionalizarse",
    description:
      "Sitios claros, rápidos y con contacto directo para negocios que necesitan mejorar confianza y ordenar su presencia digital.",
    href: "/paginas-web-para-pymes",
  },
  {
    title: "Empresas con operación interna",
    description:
      "Sistemas web, paneles y automatizaciones para controlar información, procesos, documentos y reportes.",
    href: "/sistemas-web",
  },
  {
    title: "Negocios que venden productos",
    description:
      "Tiendas online, catálogos y flujos de venta asistida por WhatsApp para vender con estructura.",
    href: "/tiendas-online",
  },
  {
    title: "Equipos que necesitan continuidad TI",
    description:
      "Soporte, configuración y acompañamiento técnico para reducir fricciones en la operación diaria.",
    href: "/soporte-ti",
  },
];

export default async function Home() {
  const reviews = await getApprovedReviewsSnapshot();
  const featuredCases = await getFeaturedCaseItems(4);
  const publishedScholarshipProfiles = await getPublishedScholarshipProfiles(5);

  return (
    <main className="overflow-hidden bg-white">
      <ScrollProgress />
      <JsonLd
        id="home-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/",
          title: "Zyteron | Diseño de páginas web en Chile para empresas y pymes",
          description:
            "Diseño de páginas web profesionales, tiendas online, sistemas y soporte TI para empresas y pymes en todo Chile, con SEO técnico y foco comercial.",
          breadcrumbs: [{ name: "Inicio", path: "/" }],
        })}
      />
      <JsonLd
        id="home-localbusiness-schema"
        data={buildLocalBusinessJsonLd(
          "/",
          "Diseño de páginas web, desarrollo web, tiendas online, sistemas, automatización y soporte TI para empresas, pymes y emprendedores en todo Chile.",
        )}
      />
      <JsonLd
        id="home-faq-schema"
        data={buildFaqJsonLd(
          homeFaqs.map((faq) => ({
            question: faq.q,
            answer: faq.a,
          })),
        )}
      />
      <JsonLd
        id="home-services-list-schema"
        data={buildServicesListJsonLd({
          path: "/",
          title: "Servicios principales Zyteron",
          services: [
            {
              name: "Desarrollo web",
              description: "Diseño de páginas web profesionales para empresas y pymes en Chile.",
              path: "/desarrollo-web",
            },
            {
              name: "Tiendas online",
              description: "Implementación de ecommerce y catálogos digitales para venta en línea.",
              path: "/tiendas-online",
            },
            {
              name: "Sistemas web a medida",
              description: "Sistemas internos y paneles administrativos adaptados al negocio.",
              path: "/sistemas-web",
            },
            {
              name: "Automatización empresarial",
              description: "Automatización de flujos y atención por WhatsApp para empresas.",
              path: "/automatizacion",
            },
            {
              name: "Soporte TI",
              description: "Soporte técnico y continuidad operativa para pymes y empresas.",
              path: "/soporte-ti",
            },
            {
              name: "SEO técnico",
              description: "Optimización técnica y estructura SEO para empresas en Chile.",
              path: "/servicios/seo-para-empresas-chile",
            },
          ],
        })}
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-hero-pattern">
        {/*
          IMAGEN DE FONDO DEL HERO
          Sube tu imagen a: public/hero-bg.png  (queda accesible como /hero-bg.png)
          Recomendado: 2400×1400 px aprox, liviana. Next la optimiza a WebP/AVIF y la
          sirve en el tamaño justo, así carga rápido. Si el archivo no existe, se ve el
          patrón de fondo actual sin romper nada.
        */}
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          <Image
            src="/hero-bg.png"
            alt=""
            fill
            priority
            sizes="100vw"
            quality={70}
            className="object-cover object-center"
          />
          {/* Overlay: solo lo justo para que el texto de la izquierda sea legible;
              a la derecha la imagen se ve nítida. */}
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/60 to-white/15 lg:from-white/95 lg:via-white/45 lg:to-transparent" />
        </div>
        <Container className="relative z-10 grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div className="space-y-6">
            <div className="badge-blue">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Empresas · Pymes · Emprendedores · Todo Chile
            </div>

            <h1 className="text-balance text-[2rem] font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.3rem]">
              Diseño de{" "}
              <span className="text-gradient-hero animate-gradient">páginas web profesionales</span>{" "}
              para empresas en todo Chile
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Creamos páginas web, tiendas online, sistemas internos y automatizaciones para pymes,
              empresas y emprendedores de Arica a Punta Arenas: diseño moderno, base SEO real y una
              estructura pensada para convertir visitas en clientes.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                size="lg"
                className="btn-primary-glow w-full gap-2 bg-blue-700 px-6 font-bold text-white hover:bg-blue-800 sm:w-auto"
              >
                <Link href="/cotizador">
                  Solicitar cotización <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full border-slate-300 text-slate-800 hover:bg-slate-50 sm:w-auto"
              >
                <Link href="/desarrollo-web">Ver desarrollo web</Link>
              </Button>
              <Link
                href={WHATSAPP_BASE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#25d366]/35 bg-[#25d366]/10 px-5 py-2.5 text-sm font-bold text-[#18a34d] transition-colors hover:bg-[#25d366]/20 sm:w-auto"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Hablar por WhatsApp
              </Link>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {heroTrustSignals.map((signal) => (
                <p key={signal} className="flex items-start gap-2 text-xs text-slate-600">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                  {signal}
                </p>
              ))}
            </div>

            <nav aria-label="Secciones destacadas" className="flex flex-wrap gap-2 pt-1">
              {heroAnchors.map((anchor) => (
                <a
                  key={anchor.href}
                  href={anchor.href}
                  className="rounded-full border border-blue-100 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-50"
                >
                  {anchor.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Mockup de navegador con chips flotantes */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="hero-blob -right-8 -top-10 h-44 w-44 bg-sky-300/50" aria-hidden="true" />
            <div className="hero-blob -bottom-12 -left-10 h-56 w-56 bg-blue-400/30" aria-hidden="true" />

            <div className="animate-float relative z-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-blue-900/15">
              <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 flex-1 truncate rounded-md border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-wide text-slate-500">
                  https://www.tu-empresa.cl
                </span>
              </div>

              <div className="space-y-4 p-5 sm:p-6">
                <span className="badge-blue">Tu nueva página web</span>
                <div className="space-y-2">
                  <div className="animate-shimmer h-4 w-11/12 rounded-full" />
                  <div className="h-4 w-3/5 rounded-full bg-slate-200" />
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex h-9 items-center rounded-lg bg-blue-700 px-4 text-[11px] font-bold text-white shadow-md shadow-blue-700/30">
                    Cotizar ahora
                  </span>
                  <span className="inline-flex h-9 items-center rounded-lg border border-slate-300 bg-white px-4 text-[11px] font-bold text-slate-600">
                    WhatsApp
                  </span>
                </div>
                <div className="bg-grid-light flex h-24 items-center justify-center rounded-xl border border-slate-200 sm:h-28">
                  <MonitorSmartphone className="h-8 w-8 text-blue-300" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["Rápida", "Responsiva", "SEO real"].map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg border border-blue-100 bg-blue-50 py-2 text-center text-[11px] font-bold text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="animate-float-delayed absolute -right-2 top-20 z-20 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg shadow-blue-900/10 sm:-right-4">
              <span className="rounded-lg bg-blue-50 p-1.5 text-blue-700">
                <Search className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[11px] font-extrabold text-slate-900">SEO real</span>
                <span className="block text-[10px] text-slate-500">Listo para Google</span>
              </span>
            </div>
            <div className="animate-float-delayed absolute -bottom-4 left-0 z-20 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg shadow-blue-900/10 sm:-left-4">
              <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
                <TrendingUp className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[11px] font-extrabold text-slate-900">Más consultas</span>
                <span className="block text-[10px] text-slate-500">Web enfocada en convertir</span>
              </span>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Cifras ── */}
      <section className="border-y border-slate-200 bg-white py-10">
        <Container>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 text-center lg:grid-cols-4">
            {heroStats.map((stat, index) => (
              <Reveal key={stat.label} delay={index * 80}>
                <p className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                  <CountUp value={stat.value} suffix={stat.suffix} className="text-gradient-blue" />
                </p>
                <p className="mx-auto mt-2 max-w-[220px] text-xs font-semibold leading-relaxed text-slate-500 sm:text-sm">
                  {stat.label}
                </p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Empresas que confían ── */}
      <section className="bg-white py-14">
        <Container className="space-y-8">
          <Reveal className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Confianza real</p>
            <h2 className="text-balance text-2xl font-extrabold text-slate-900 sm:text-3xl">
              Empresas que ya trabajaron con Zyteron
            </h2>
            <p className="mx-auto max-w-2xl text-sm text-slate-600 sm:text-base">
              Sistemas internos, plataformas y páginas web desarrolladas para operaciones reales en Chile.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <ClientLogosMarquee />
          </Reveal>
        </Container>
      </section>

      {/* ── Cobertura nacional ── */}
      <section id="cobertura" className="section-alt scroll-mt-24 py-20">
        <Container className="space-y-10">
          <Reveal className="space-y-3 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Cobertura nacional</p>
            <h2 className="text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Diseño de páginas web para todo Chile
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              De Arica a Punta Arenas: trabajamos 100% online con reuniones, avances por etapas y
              comunicación directa, para que tu empresa tenga una web profesional sin importar la región
              donde opere.
            </p>
          </Reveal>

          <Reveal>
            <CoverageMarquee />
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2">
            {coverageSignals.map((signal, index) => (
              <Reveal key={signal} delay={(index % 2) * 90} className="h-full">
                <div className="card-premium flex h-full items-start gap-3 p-5">
                  <span className="rounded-lg bg-blue-50 p-2 text-blue-700">
                    <Globe className="h-4 w-4" />
                  </span>
                  <p className="text-sm leading-relaxed text-slate-700">{signal}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="text-center">
            <Button asChild className="btn-primary-glow bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/cotizador">Cotizar mi página web ahora</Link>
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* ── Servicios ── */}
      <section id="servicios" className="scroll-mt-24 bg-white py-20">
        <Container className="space-y-10">
          <Reveal className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Servicios</p>
            <h2 className="text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Diseño web, sistemas y soporte organizados para decidir mejor
            </h2>
            <p className="mx-auto max-w-3xl text-sm text-slate-600 sm:text-base">
              Separamos cada línea de trabajo para que puedas cotizar exactamente lo que tu negocio necesita.
            </p>
          </Reveal>

          <div className="grid gap-5 lg:grid-cols-3">
            {serviceGroups.map((group, index) => (
              <Reveal key={group.title} delay={index * 100} className="h-full">
                <article className="card-premium flex h-full flex-col p-6">
                  <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    {group.icon}
                    {group.title}
                  </div>
                  <p className="mb-4 text-sm text-slate-600">{group.description}</p>
                  <div className="flex-1 space-y-2">
                    {group.items.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild variant="outline" className="mt-5 w-full border-slate-300 text-slate-800 hover:bg-slate-50">
                    <Link href={group.href}>Ver {group.title.toLowerCase()}</Link>
                  </Button>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal className="text-center">
            <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/desarrollo-web">Ver desarrollo web detallado</Link>
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* ── Soluciones según necesidad ── */}
      <section className="section-alt py-20">
        <Container className="space-y-10">
          <Reveal className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Soluciones según necesidad</p>
            <h2 className="text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Qué necesitas resolver hoy
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {solutionsByNeed.map((solution, index) => (
              <Reveal key={solution.title} delay={(index % 3) * 90} className="h-full">
                <article className="card-premium flex h-full flex-col p-6">
                  <h3 className="text-lg font-bold text-slate-900">{solution.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-slate-600">{solution.description}</p>
                  <Button asChild variant="outline" className="mt-4 border-slate-300 text-slate-800 hover:bg-slate-50">
                    <Link href={solution.href}>{solution.cta}</Link>
                  </Button>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Tipo de cliente ── */}
      <section className="bg-white py-20">
        <Container className="space-y-10">
          <Reveal className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Tipo de cliente</p>
            <h2 className="text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Soluciones digitales para empresas en Chile
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Atendemos proyectos para pymes, emprendedores y empresas de distintas regiones de Chile, con foco
              en soluciones claras, escalables y alineadas a la etapa real del negocio.
            </p>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {clientTypes.map((client, index) => (
              <Reveal key={client.title} delay={(index % 4) * 80} className="h-full">
                <Link
                  href={client.href}
                  className="card-premium block h-full p-6 transition-colors hover:border-blue-200"
                >
                  <h3 className="text-lg font-extrabold text-slate-900">{client.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{client.description}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                    Ver solución <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Confianza ── */}
      <section className="section-alt py-20">
        <Container className="space-y-10">
          <Reveal className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Confianza empresarial</p>
            <h2 className="text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Por qué confiar en ZYTERON
            </h2>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2">
            {trustPoints.map((point, index) => (
              <Reveal key={point} delay={(index % 2) * 90} className="h-full">
                <div className="card-premium flex h-full items-start gap-3 p-4">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                  <p className="text-sm text-slate-700">{point}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/quienes-somos">Ver quién está detrás de Zyteron</Link>
            </Button>
            <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">Hablar con un especialista</Link>
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* ── Demos ── */}
      <section className="bg-white py-20">
        <Container className="space-y-10">
          <Reveal className="flex flex-col gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Portafolio y demos</p>
              <h2 className="text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Demos funcionales para evaluar antes de contratar
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
                Demos funcionales creados por nuestro equipo para que evalúes calidad, estructura y estilo antes de cotizar tu proyecto.
              </p>
            </div>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/demos">Ver todos los demos</Link>
            </Button>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2">
            {demoCards.map((demo, index) => (
              <Reveal key={demo.name} delay={index * 110} className="h-full">
                <article className="card-premium h-full overflow-hidden">
                  <div className="bg-grid-light border-b border-slate-200 p-5">
                    <div className="grid aspect-[16/9] grid-cols-2 gap-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {demo.gallery.slice(0, 4).map((src, imageIndex) => (
                        <div key={src} className="relative">
                          <Image
                            src={src}
                            alt={`Captura ${imageIndex + 1} de ${demo.name} para pymes en Chile y evaluación de desarrollo web`}
                            fill
                            sizes="(max-width: 768px) 45vw, (max-width: 1280px) 260px, 300px"
                            quality={80}
                            loading="lazy"
                            placeholder="blur"
                            blurDataURL={softBlueBlurDataUrl}
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3 p-5">
                    <h3 className="text-base font-bold text-slate-900">{demo.name}</h3>
                    <p className="text-sm text-slate-600">{demo.desc}</p>
                    <p className="text-xs text-slate-500">{demo.tech}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button asChild size="sm" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                        <Link href="/demos">Ver demo</Link>
                      </Button>
                      <Button asChild size="sm" className="bg-blue-700 text-white hover:bg-blue-800">
                        <Link href={`/contacto?origen=demo&item=${encodeURIComponent(demo.name)}`}>
                          Cotizar algo similar
                        </Link>
                      </Button>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {publishedScholarshipProfiles.length > 0 ? (
        <section className="section-alt py-20">
          <Container>
            <PublicShowcaseCarousel
              profiles={publishedScholarshipProfiles}
              badge="Becas Web Pyme"
              title="Una vitrina profesional para negocios que quieren crecer"
              description="Además de la vitrina completa, en la portada destacamos automáticamente algunos emprendimientos publicados para reforzar confianza y movimiento real dentro del programa."
              ctaHref="/becas-web-pyme"
              ctaLabel="Ver programa completo"
            />
          </Container>
        </section>
      ) : null}

      {/* ── Panel administrativo ── */}
      <section className="bg-white py-20">
        <Container className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <Reveal className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Panel administrativo</p>
            <h2 className="text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Paneles administrativos para que controles tu negocio
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              Desarrollamos paneles y sistemas internos para que tu empresa gestione su información en tiempo real.
              La idea es simple: que actualices tu información cuando lo necesites, sin depender de terceros.
            </p>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
              Dashboard con métricas, reportes y control operacional adaptado al tamaño de tu empresa.
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="card-premium p-6">
              <div className="mb-4 flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5 text-blue-700" />
                <h3 className="text-lg font-bold text-slate-900">Capacidades frecuentes</h3>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {adminPanelFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Button asChild className="mt-5 w-full bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href="/contacto?tipo=sistema">Cotizar un sistema</Link>
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Planes ── */}
      <section id="planes" className="section-alt scroll-mt-24 py-20">
        <Container className="space-y-10">
          <Reveal className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Planes y precios</p>
            <h2 className="text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Planes claros para distintos niveles de necesidad
            </h2>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {planCards.map((plan, index) => (
              <Reveal key={plan.name} delay={(index % 4) * 80} className="h-full">
                <article className="card-premium flex h-full flex-col p-6">
                  <h3 className="text-lg font-extrabold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{plan.target}</p>
                  <div className="my-4 h-px bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    {plan.includes.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild className="mt-5 bg-blue-700 text-white hover:bg-blue-800">
                    <Link href="/planes">Ver planes</Link>
                  </Button>
                </article>
              </Reveal>
            ))}
          </div>

          <p className="text-center text-xs text-slate-500">
            Los valores pueden variar según requerimientos, funcionalidades, integraciones y alcance del proyecto.
          </p>
        </Container>
      </section>

      {/* ── Proceso ── */}
      <section id="proceso" className="scroll-mt-24 bg-white py-20">
        <Container className="space-y-10">
          <Reveal className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Cómo trabajamos</p>
            <h2 className="text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Proceso claro de inicio a entrega
            </h2>
          </Reveal>

          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {processSteps.map((step, index) => (
              <Reveal key={step} as="li" delay={(index % 3) * 90} className="h-full">
                <article className="card-premium flex h-full items-center gap-4 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-sm font-extrabold text-white shadow-md shadow-blue-700/30">
                    {index + 1}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{step}</h3>
                </article>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      <ClientReviewsSection reviews={reviews} />

      {featuredCases.length > 0 ? (
        <section className="bg-white py-16">
          <Container className="space-y-8">
            <Reveal className="flex flex-col gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Casos documentados</p>
                <h2 className="text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
                  Pruebas comerciales de soluciones aplicadas
                </h2>
                <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  Casos de empresas reales en sistemas, automatizaciones, ecommerce y SEO implementados para resolver problemas de operación y presencia digital.
                </p>
              </div>
              <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                <Link href="/casos-exito">Ver todos los casos</Link>
              </Button>
            </Reveal>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featuredCases.map((caseItem, index) => (
                <Reveal key={caseItem.slug} delay={(index % 4) * 80} className="h-full">
                  <Link
                    href={`/casos-exito/${caseItem.slug}`}
                    className="card-premium block h-full p-5 transition-colors hover:border-blue-200"
                  >
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">{caseItem.badgePrimary}</p>
                    <h3 className="text-base font-extrabold leading-snug text-slate-900">{caseItem.heading}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{caseItem.summary}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                      Ver caso <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* ── FAQ ── */}
      <section id="preguntas-frecuentes" className="section-alt scroll-mt-24 py-20">
        <Container className="space-y-10">
          <Reveal className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Preguntas frecuentes</p>
            <h2 className="text-balance text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Respuestas para cotizar con claridad
            </h2>
          </Reveal>

          <Reveal>
            <HomeFaqAccordion faqs={homeFaqs} />
          </Reveal>

          <Reveal className="text-center">
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/faq">Ver todas las preguntas frecuentes</Link>
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* ── CTA final ── */}
      <section className="relative overflow-hidden bg-white py-20">
        <Container>
          <Reveal>
            <div className="section-blue relative z-10 rounded-3xl p-8 text-center text-white md:p-12">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                <Briefcase className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-balance text-3xl font-extrabold">¿Listo para cotizar tu proyecto?</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
                Si necesitas una web corporativa, una tienda online o un sistema interno, conversemos y preparamos
                una propuesta concreta para tu negocio, estés en la región que estés.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="bg-white font-bold text-blue-800 hover:bg-blue-50">
                  <Link href="/cotizador">Cotizar una web para mi empresa</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  <Link href="/demos">Ver demos</Link>
                </Button>
                <Link
                  href={WHATSAPP_BASE}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  Hablar por WhatsApp
                </Link>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-blue-100 sm:grid-cols-2 lg:grid-cols-4">
                <p>Cotización formal y sin compromiso.</p>
                <p>Atención a empresas, pymes y emprendedores.</p>
                <p>Avanzamos por etapas y revisas cada entrega.</p>
                <p>Te acompañamos después de la entrega.</p>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
