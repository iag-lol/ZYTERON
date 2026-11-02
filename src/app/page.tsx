import type { Metadata } from "next";
import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Globe,
  LayoutDashboard,
  MapPin,
  MonitorSmartphone,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { siteConfig } from "@/config/site";
import { PLAN_PRICE_AMOUNTS } from "@/config/pricing";
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
import { Reveal } from "@/components/home/reveal";
import { CountUp } from "@/components/home/count-up";
import { ScrollProgress } from "@/components/home/scroll-progress";
import { HomeFaqAccordion } from "@/components/home/home-faq";
import { CoverageMarquee } from "@/components/home/coverage-marquee";
import { ScrollScenes } from "@/components/home/scroll-scenes";
import { HeroStage } from "@/components/home/hero-stage";
import { DashboardMockup } from "@/components/home/dashboard-mockup";
import { cssVars } from "@/components/home/css-vars";
import "@/components/home/cinematic.css";

export const revalidate = 3600;

const WHATSAPP_BASE =
  `${siteConfig.social.whatsapp}?text=Hola%20Zyteron%2C%20quiero%20cotizar%20una%20p%C3%A1gina%20web%20para%20mi%20empresa.`;

/** Monto de pricing.ts en formato chileno: "$219.990". */
const clpAmount = (id: keyof typeof PLAN_PRICE_AMOUNTS) =>
  `$${PLAN_PRICE_AMOUNTS[id].toLocaleString("es-CL")}`;

/**
 * Formato visible de precio: "Desde $XXX.XXX CLP + IVA". Toda la escalera de
 * pricing.ts se publica "Desde", porque el valor final depende del alcance.
 */
const planPriceClp = (id: keyof typeof PLAN_PRICE_AMOUNTS) =>
  `Desde ${clpAmount(id)} CLP + IVA`;

export const metadata: Metadata = createPageMetadata({
  title: "Páginas Web Profesionales en Chile para Empresas y Pymes",
  description:
    "Creamos páginas web profesionales para empresas y pymes de Santiago, Región Metropolitana y todo Chile: sitios rápidos, con base SEO técnica y enfocados en generar cotizaciones.",
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
    value: 3,
    suffix: "",
    label: "Vistas adaptadas: celular, tablet y computador",
  },
  {
    value: processSteps.length,
    suffix: "",
    label: "Etapas documentadas, de cotización a post-entrega",
  },
];

const coverageSignals = [
  "Oficina en Antonio Bellet 193, Providencia: reuniones presenciales para proyectos en Santiago y la Región Metropolitana.",
  "Atendemos empresas, pymes y emprendedores en todas las regiones de Chile con trabajo remoto y reuniones online.",
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
    title: "Páginas web para empresas",
    icon: <MonitorSmartphone className="h-5 w-5" />,
    href: "/desarrollo-web",
    description:
      "Nuestro servicio principal: páginas web profesionales para presentar tu empresa, posicionarte en Google y recibir cotizaciones.",
    items: [
      "Sitios web corporativos",
      "Páginas web para pymes",
      "Landing pages comerciales",
      "Diseño responsive para celular",
      "Base SEO técnica incluida",
      "Formularios y WhatsApp integrados",
      "Optimización de velocidad",
    ],
  },
  {
    title: "Tiendas online y catálogos",
    icon: <Globe className="h-5 w-5" />,
    href: "/tiendas-online",
    description:
      "Cuando tu web además necesita vender: catálogo administrable, carrito y pagos online.",
    items: [
      "Catálogo digital administrable",
      "Carrito y checkout",
      "Pagos con Webpay, Flow o Mercado Pago",
      "Venta asistida por WhatsApp",
      "Fichas de producto con SEO",
    ],
  },
  {
    title: "Sistemas y automatización",
    icon: <Settings className="h-5 w-5" />,
    href: "/sistemas-web",
    description:
      "Desde un panel administrativo hasta intranets y plataformas corporativas: ordena procesos internos y reduce tareas manuales.",
    items: [
      "Paneles administrativos",
      "Sistemas internos a medida",
      "Intranets corporativas y portales internos",
      "Plataformas de control operacional multisucursal",
      "Cotizadores con PDF",
      "Asistentes con IA para ventas y atención",
      "Automatización de WhatsApp",
      "Integración de pagos",
      "Soporte TI para continuidad",
    ],
  },
];

const demoCards = [
  {
    name: "Demo tienda online de ropa",
    desc: "Demo visual para marcas que quieren vender online con diseño personalizado y responsive.",
    tech: `${planPriceClp("ecommerce")} · Catálogo, carrito y pagos online`,
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
    price: planPriceClp("web-basica"),
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
    price: planPriceClp("pyme"),
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
    price: planPriceClp("empresa"),
    includes: [
      "Arquitectura extensa",
      "Formularios y funciones adicionales",
      "Bloques estratégicos de conversión",
      "Soporte inicial ampliado",
    ],
  },
  {
    name: "Plan Sistema",
    target: "Soluciones a medida para operaciones más exigentes",
    price: planPriceClp("sistema"),
    includes: [
      "Diagnóstico técnico y funcional",
      "Alcance personalizado",
      "Módulos por etapa",
      "Roadmap de implementación",
    ],
  },
];

/**
 * Nivel corporativo de la escalera de pricing.ts. No entra a la grilla de 4
 * tarjetas: se muestra como bloque aparte para no romper el layout.
 */
const corporatePlans: { name: string; id: keyof typeof PLAN_PRICE_AMOUNTS; detail: string }[] = [
  {
    name: "Intranet Corporativa Pro",
    id: "intranet",
    detail: "Perfiles, documentación, solicitudes y aprobaciones para toda la organización.",
  },
  {
    name: "Plataforma de Control Operacional",
    id: "operacional",
    detail: "Sucursales, activos, tareas en terreno y KPI en un solo lugar.",
  },
  {
    name: "Plataforma Corporativa Integrada",
    id: "corporativa",
    detail: "Varias áreas y departamentos operando sobre la misma plataforma.",
  },
  {
    name: "Enterprise 360",
    id: "enterprise",
    detail: "Arquitectura empresarial a medida, con tus sistemas conectados entre sí.",
  },
];

const homeFaqs = [
  {
    q: "¿Cuánto cuesta el diseño de una página web profesional?",
    a: `Una página web profesional parte desde ${clpAmount("web-basica")} CLP + IVA en su versión básica. Un sitio para pyme parte desde ${clpAmount("pyme")} CLP + IVA y un sitio corporativo más completo desde ${clpAmount("empresa")} CLP + IVA. Si además necesitas vender, una tienda online con carrito y pagos parte desde ${clpAmount("ecommerce")} CLP + IVA, y un sistema web a medida desde ${clpAmount("sistema")} CLP + IVA. El valor final depende del alcance, y siempre recibes una cotización formal con el detalle antes de iniciar.`,
  },
  {
    q: "¿Cuánto demora una página web?",
    a: "Una landing puede estar publicada en 1 a 2 semanas y un sitio corporativo más completo entre 3 y 6 semanas. En la cotización te confirmamos el plazo exacto para tu proyecto.",
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
    a: "Sí. Cada web se entrega responsive para que tus clientes naveguen y coticen con comodidad desde celular, tablet o computador.",
  },
  {
    q: "¿Hacen tiendas online?",
    a: `Sí. Un catálogo digital con venta por WhatsApp parte desde ${clpAmount("catalogo")} CLP + IVA y una tienda online con carrito y pagos, desde ${clpAmount("ecommerce")} CLP + IVA, adaptada a tu tipo de negocio y forma de vender.`,
  },
  {
    q: "¿Integran pagos?",
    a: "Sí. Se puede integrar pasarela de pago según requerimientos técnicos y comerciales.",
  },
  {
    q: "¿Incluyen SEO?",
    a: "Sí. Cada web se entrega con base SEO técnica y on-page lista para posicionar en Google: estructura, metadata, sitemap y contenido organizado por intención de búsqueda.",
  },
  {
    q: "¿Hacen sistemas personalizados?",
    a: `Sí. Diseñamos sistemas internos y paneles a medida, desde ${clpAmount("sistema")} CLP + IVA, y sistemas avanzados con varios módulos, roles e integraciones desde ${clpAmount("avanzado")} CLP + IVA, con módulos por etapa según el alcance de tu operación.`,
  },
  {
    q: "¿Desarrollan intranets y plataformas corporativas?",
    a: `Sí. Cuando la operación crece, la escalera continúa con intranet corporativa desde ${clpAmount("intranet")} CLP + IVA, plataforma de control operacional para sucursales y personal en terreno desde ${clpAmount("operacional")} CLP + IVA, plataforma corporativa integrada desde ${clpAmount("corporativa")} CLP + IVA y arquitectura Enterprise 360 desde ${clpAmount("enterprise")} CLP + IVA. Cada proyecto parte con un levantamiento funcional y se construye por etapas, con entregas revisables.`,
  },
  {
    q: "¿Entregan soporte después?",
    a: "Sí. Incluimos soporte post-entrega y planes de continuidad según necesidad.",
  },
  {
    q: "¿Dónde están ubicados y puedo reunirme con ustedes?",
    a: "Nuestra oficina está en Antonio Bellet 193, Providencia, Santiago. Coordinamos reuniones presenciales para proyectos en la Región Metropolitana y videollamadas para el resto de Chile.",
  },
  {
    q: "¿Diseñan páginas web para empresas de todo Chile?",
    a: "Sí. Trabajamos con pymes, emprendedores y empresas de todas las regiones de Chile, con atención remota, reuniones online y seguimiento por etapas.",
  },
  {
    q: "¿Emiten factura o boleta?",
    a: "Sí. Emitimos boleta o factura según el servicio contratado, para que respaldes la inversión de tu empresa con documento tributario.",
  },
  {
    q: "¿Qué necesito para comenzar?",
    a: "Solo el objetivo de tu proyecto y la información base de tu negocio. Con eso preparamos una cotización formal, sin compromiso y con el alcance detallado.",
  },
];

const solutionsByNeed = [
  {
    title: "Mi empresa está en Santiago",
    description:
      "Creamos páginas web para empresas y pymes de Santiago y la Región Metropolitana, con reuniones presenciales en nuestra oficina de Providencia.",
    href: "/paginas-web-santiago",
    cta: "Ver páginas web Santiago",
  },
  {
    title: "Necesito una página web profesional",
    description:
      "Diseñamos webs corporativas con propuesta de valor clara, estructura comercial y foco en generación de consultas.",
    href: "/desarrollo-web",
    cta: "Cotizar página web",
  },
  {
    title: "Tengo una pyme y necesito presencia digital",
    description:
      "Páginas web administrables y fáciles de mantener para pymes que hoy dependen solo de redes sociales o referidos.",
    href: "/paginas-web-para-pymes",
    cta: "Ver páginas web pymes",
  },
  {
    title: "Necesito vender online",
    description:
      "Implementamos tiendas online y catálogos para ordenar tu oferta, vender por web y complementar la venta por WhatsApp.",
    href: "/tiendas-online",
    cta: "Cotizar tienda online",
  },
  {
    title: "Busco algo específico para mi rubro",
    description:
      "Tenemos páginas web pensadas para transporte y logística, constructoras, servicios profesionales e industria B2B.",
    href: "/paginas-web/industria-b2b",
    cta: "Ver páginas web por rubro",
  },
  {
    title: "Quiero aparecer en Google",
    description:
      "Trabajamos SEO técnico y de contenido para que tu web aparezca en las búsquedas de tu rubro y ciudad.",
    href: "/servicios/seo-para-empresas-chile",
    cta: "Ver SEO para empresas",
  },
  {
    title: "Necesito ordenar procesos internos",
    description:
      "Sumamos sistemas web y paneles administrativos a tu solución web para controlar estados y reducir tareas manuales.",
    href: "/sistemas-web",
    cta: "Ver sistemas web",
  },
  {
    title: "Mi operación necesita una plataforma corporativa",
    description:
      "Desarrollamos intranets, control operacional multisucursal y plataformas que integran varias áreas, con levantamiento previo y entrega por etapas.",
    href: "/sistemas-web",
    cta: "Ver desarrollo corporativo",
  },
];

const clientTypes = [
  {
    title: "Páginas web para pymes en Chile",
    description:
      "Sitios claros, rápidos y con contacto directo para pequeñas y medianas empresas que necesitan dejar de depender solo de redes sociales o referidos.",
    href: "/paginas-web-para-pymes",
  },
  {
    title: "Páginas web para empresas en Chile",
    description:
      "Webs corporativas para presentar servicios, respaldo y procesos con una estructura preparada para captar consultas B2B.",
    href: "/paginas-web-para-empresas",
  },
  {
    title: "Tiendas online para negocios",
    description:
      "Tiendas online, catálogos y flujos de venta asistida por WhatsApp para vender con estructura.",
    href: "/tiendas-online",
  },
  {
    title: "Sistemas web para empresas",
    description:
      "Paneles, intranets y automatizaciones para controlar información, procesos, documentos y reportes internos.",
    href: "/sistemas-web",
  },
  {
    title: "Páginas web para transporte y logística",
    description:
      "Webs que presentan flota, cobertura y servicios logísticos con formularios pensados para captar carga y contratos.",
    href: "/paginas-web/transporte-logistica",
  },
  {
    title: "Páginas web para constructoras",
    description:
      "Sitios que muestran obras, especialidades y respaldo técnico para participar en licitaciones y captar mandantes.",
    href: "/paginas-web/constructoras",
  },
  {
    title: "Páginas web para servicios profesionales",
    description:
      "Webs para consultoras, estudios y especialistas que necesitan transmitir confianza y agendar reuniones.",
    href: "/paginas-web/servicios-profesionales",
  },
  {
    title: "Páginas web para industria B2B",
    description:
      "Sitios industriales con fichas técnicas y catálogo de productos para generar cotizaciones entre empresas.",
    href: "/paginas-web/industria-b2b",
  },
];

/** Titular del hero dividido en palabras para la entrada con máscara. */
const headlineAccent = ["Páginas", "web", "profesionales"];
const headlineRest = ["para", "empresas", "que", "necesitan", "vender"];

/** Cinta de capacidades que se desplaza con el scroll (decorativa). */
const tickerRows: { dir: "left" | "right"; items: string[] }[] = [
  {
    dir: "left",
    items: ["Sitios corporativos", "Landing pages", "Tiendas online", "SEO técnico", "Paneles administrativos"],
  },
  {
    dir: "right",
    items: ["Sistemas a medida", "Intranets", "Automatización", "Integración de pagos", "Soporte TI"],
  },
];

const manifestoWords =
  `Más de ${siteConfig.business.experienceYears} años en tecnología nos enseñaron algo simple: una página web no es solo diseño, es una herramienta para vender. Por eso trabajamos con cotización formal, etapas documentadas, revisión en cada entrega y soporte después de publicar.`.split(
    " ",
  );
const manifestoAccent = new Set(["herramienta", "vender."]);

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="cx-eyebrow">{children}</p>;
}

function TickerStar() {
  return (
    <svg className="cx-ticker-star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0c.6 6.6 5.4 11.4 12 12-6.6.6-11.4 5.4-12 12-.6-6.6-5.4-11.4-12-12C6.6 11.4 11.4 6.6 12 0Z" />
    </svg>
  );
}

/** Ilustración breve por línea de servicio (decorativa). */
function ServiceVisual({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="cx-visual aspect-[16/6] p-4 sm:p-5" aria-hidden="true">
        <div className="h-full overflow-hidden rounded-xl border border-white bg-white shadow-lg shadow-blue-900/10">
          <div className="flex gap-1 border-b border-slate-100 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
          </div>
          <div className="grid h-full grid-cols-[1fr_1.1fr] gap-4 p-4">
            <div className="space-y-2.5">
              <span className="cx-skel block h-3 w-11/12 !bg-slate-800" />
              <span className="cx-skel block h-3 w-3/5 !bg-slate-800" />
              <span className="cx-skel block h-2 w-4/5" />
              <span className="mt-3 inline-block h-6 w-20 rounded-md bg-blue-600" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 pb-8">
              <span className="rounded-md bg-gradient-to-br from-blue-200 to-sky-100" />
              <span className="rounded-md bg-sky-100" />
              <span className="rounded-md bg-indigo-100" />
              <span className="rounded-md bg-blue-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="cx-visual grid aspect-[16/6] grid-cols-4 gap-2.5 p-4 sm:p-5" aria-hidden="true">
        {["bg-blue-100", "bg-sky-100", "bg-indigo-100", "bg-blue-50"].map((tone, item) => (
          <div key={tone} className="flex flex-col rounded-xl border border-white bg-white p-2 shadow-md shadow-blue-900/5">
            <span className={`flex-1 rounded-lg ${tone}`} />
            <span className="mt-2 flex items-center justify-between">
              <span className="cx-skel h-1.5 w-1/2" />
              <span className="text-[9px] font-bold text-blue-700">{item % 2 ? "Agregar" : "Comprar"}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="cx-visual grid aspect-[16/6] grid-cols-[0.9fr_1.1fr] gap-2.5 p-4 sm:p-5" aria-hidden="true">
      <div className="grid grid-rows-3 gap-2">
        {["bg-blue-600", "bg-sky-500", "bg-indigo-500"].map((tone) => (
          <div key={tone} className="rounded-lg border border-white bg-white p-2 shadow-sm">
            <span className={`block h-1.5 w-6 rounded-full ${tone}`} />
            <span className="cx-skel mt-2 block h-2.5 w-3/4 !bg-slate-700" />
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1.5 rounded-lg border border-white bg-white p-2.5 shadow-sm">
        {[40, 62, 48, 80, 66, 92].map((height) => (
          <span
            key={height}
            className="flex-1 rounded-sm bg-gradient-to-t from-blue-700 to-sky-400"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default async function Home() {
  const [reviews, featuredCases] = await Promise.all([
    getApprovedReviewsSnapshot(),
    getFeaturedCaseItems(4),
  ]);

  return (
    <main className="cx-root overflow-x-clip">
      <ScrollProgress />
      <ScrollScenes />
      <JsonLd
        id="home-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/",
          title: "Páginas Web Profesionales en Chile | Zyteron",
          description:
            "Desarrollo de páginas web para empresas y pymes de Santiago, Región Metropolitana y todo Chile, con tiendas online y sistemas como complemento.",
          breadcrumbs: [{ name: "Inicio", path: "/" }],
        })}
      />
      <JsonLd
        id="home-localbusiness-schema"
        data={buildLocalBusinessJsonLd(
          "/",
          "Desarrollo de páginas web profesionales para empresas y pymes en Santiago, Región Metropolitana y todo Chile, con tiendas online, sistemas y automatización como complemento.",
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
              name: "Páginas web en Santiago",
              description: "Creación de páginas web para empresas y pymes de Santiago y la Región Metropolitana.",
              path: "/paginas-web-santiago",
            },
            {
              name: "Páginas web para empresas",
              description: "Sitios web corporativos para presentar servicios y captar consultas B2B.",
              path: "/paginas-web-para-empresas",
            },
            {
              name: "Páginas web para pymes",
              description: "Páginas web profesionales y administrables para pymes chilenas.",
              path: "/paginas-web-para-pymes",
            },
            {
              name: "Desarrollo web",
              description: "Diseño y desarrollo de páginas web profesionales para empresas y pymes en Chile.",
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
              name: "SEO para empresas",
              description: "Optimización técnica y estructura SEO para empresas en Chile.",
              path: "/servicios/seo-para-empresas-chile",
            },
            {
              name: "Automatización empresarial",
              description: "Automatización de flujos y atención por WhatsApp para empresas.",
              path: "/automatizacion",
            },
          ],
        })}
      />

      {/* ── Hero: titular con máscara + escenario 3D que se endereza ── */}
      <section data-scene="exit" className="cx-hero">
        <div aria-hidden="true">
          <div className="cx-hero-grid" />
          <div className="cx-aurora cx-aurora-a" />
          <div className="cx-aurora cx-aurora-b" />
          <div className="cx-aurora cx-aurora-c" />
        </div>

        <Container className="relative pb-20 pt-14 sm:pt-20 lg:pb-28 lg:pt-24">
          <div data-scene="exit" className="cx-hero-copy mx-auto max-w-4xl text-center">
            <div className="cx-fade cx-pill" style={cssVars({ "--d": "0ms" })}>
              <span className="cx-live-dot" />
              Santiago · Región Metropolitana · Todo Chile
            </div>

            <h1 className="cx-h1 mt-7">
              {headlineAccent.map((word, index) => (
                <Fragment key={word}>
                  <span className="cx-mask">
                    <span className="cx-word cx-grad" style={cssVars({ "--i": index })}>
                      {word}
                    </span>
                  </span>{" "}
                </Fragment>
              ))}
              {headlineRest.map((word, index) => (
                <Fragment key={word}>
                  <span className="cx-mask">
                    <span className="cx-word" style={cssVars({ "--i": index + headlineAccent.length })}>
                      {word}
                    </span>
                  </span>
                  {index < headlineRest.length - 1 ? " " : null}
                </Fragment>
              ))}
            </h1>

            <p className="cx-fade cx-lead mx-auto mt-7 max-w-2xl" style={cssVars({ "--d": "550ms" })}>
              Creamos sitios web rápidos, modernos y orientados a generar contactos para empresas y pymes de
              Santiago, Región Metropolitana y todo Chile. Diseño profesional, base SEO técnica y una estructura
              pensada para convertir visitas en cotizaciones.
            </p>

            <div
              className="cx-fade mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
              style={cssVars({ "--d": "700ms" })}
            >
              <Link href="/cotizador" className="cx-btn cx-btn-primary w-full sm:w-auto">
                Cotizar página web <ArrowRight className="cx-arrow h-4 w-4" />
              </Link>
              <Link href="/planes" className="cx-btn cx-btn-ghost w-full sm:w-auto">
                Ver planes
              </Link>
              <Link
                href={WHATSAPP_BASE}
                target="_blank"
                rel="noopener noreferrer"
                className="cx-btn cx-btn-wa w-full sm:w-auto"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Hablar por WhatsApp
              </Link>
            </div>

            <ul
              className="cx-fade mx-auto mt-9 grid max-w-3xl gap-x-8 gap-y-2.5 text-left sm:grid-cols-2"
              style={cssVars({ "--d": "850ms" })}
            >
              {heroTrustSignals.map((signal) => (
                <li key={signal} className="flex items-start gap-2.5 text-sm font-medium text-slate-600">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  {signal}
                </li>
              ))}
            </ul>

            <nav
              aria-label="Secciones destacadas"
              className="cx-fade mt-7 flex flex-wrap justify-center gap-1"
              style={cssVars({ "--d": "950ms" })}
            >
              {heroAnchors.map((anchor) => (
                <a key={anchor.href} href={anchor.href} className="cx-anchor">
                  {anchor.label}
                </a>
              ))}
            </nav>
          </div>

          <HeroStage />
        </Container>
      </section>

      {/* ── Cifras ── */}
      <section aria-label="Zyteron en cifras" className="cx-stats bg-white">
        <Container>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {heroStats.map((stat, index) => (
              <Reveal
                key={stat.label}
                delay={index * 90}
                className="cx-stat px-4 py-10 text-center sm:px-6 sm:py-14"
              >
                <p className="cx-stat-value">
                  <CountUp value={stat.value} suffix={stat.suffix} className="cx-grad" />
                </p>
                <p className="mx-auto mt-3 max-w-[210px] text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
                  {stat.label}
                </p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Cinta de capacidades ligada al scroll ── */}
      <div data-scene="view" className="cx-ticker space-y-3" aria-hidden="true">
        {tickerRows.map((row) => (
          <div key={row.dir} className="cx-ticker-row" data-dir={row.dir}>
            {[...row.items, ...row.items].map((item, index) => (
              <Fragment key={`${item}-${index}`}>
                <span className={index % 2 ? "cx-ticker-outline" : "cx-ticker-solid"}>{item}</span>
                <TickerStar />
              </Fragment>
            ))}
          </div>
        ))}
      </div>

      {/* ── Manifiesto fijado: las palabras se encienden al avanzar ── */}
      <section data-scene="pin" className="cx-pin" aria-labelledby="manifiesto-title">
        <div className="cx-pin-sticky">
          <div className="cx-pin-glow" aria-hidden="true" />
          <Container className="max-w-5xl">
            <h2 id="manifiesto-title" className="cx-eyebrow">
              Por qué elegir Zyteron
            </h2>
            <p className="cx-manifesto mt-8" style={cssVars({ "--n": manifestoWords.length })}>
              {manifestoWords.map((word, index) => (
                <Fragment key={`${word}-${index}`}>
                  <span
                    className={`cx-mword${manifestoAccent.has(word) ? " cx-mword-accent" : ""}`}
                    style={cssVars({ "--i": index })}
                  >
                    {word}
                  </span>
                  {index < manifestoWords.length - 1 ? " " : null}
                </Fragment>
              ))}
            </p>
          </Container>
        </div>
      </section>

      {/* ── Servicios: tarjetas que se apilan ── */}
      <section
        id="servicios"
        data-scene="pin"
        className="scroll-mt-24 bg-white pb-24 pt-8 lg:pb-36"
        style={cssVars({ "--n": serviceGroups.length })}
      >
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
          <Reveal className="space-y-6 lg:sticky lg:top-40 lg:self-start">
            <Eyebrow>Servicios</Eyebrow>
            <h2 className="cx-h2 lg:text-[2.85rem]">Diseño web, sistemas y soporte organizados para decidir mejor</h2>
            <p className="cx-lead">
              Separamos cada línea de trabajo para que puedas cotizar exactamente lo que tu negocio necesita.
            </p>
            <Link href="/desarrollo-web" className="cx-btn cx-btn-primary">
              Ver desarrollo web detallado <ArrowRight className="cx-arrow h-4 w-4" />
            </Link>
          </Reveal>

          <div className="space-y-6 lg:space-y-[16vh]">
            {serviceGroups.map((group, index) => (
              <article key={group.title} className="cx-stack-card" style={cssVars({ "--i": index })}>
                <div className="cx-stack-panel p-6 sm:p-8">
                  <ServiceVisual index={index} />
                  <div className="mt-7">
                    <div className="flex items-center justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-900 text-white shadow-lg shadow-blue-700/30">
                        {group.icon}
                      </span>
                      <span className="text-xs font-semibold tabular-nums tracking-widest text-slate-400">
                        0{index + 1} / 0{serviceGroups.length}
                      </span>
                    </div>
                    <h3 className="cx-h3 mt-6">{group.title}</h3>
                    <p className="mt-3 text-[0.95rem] leading-relaxed text-slate-600">{group.description}</p>
                    <ul className="mt-6 flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <li key={item} className="cx-tag">
                          <Check className="h-3.5 w-3.5 text-blue-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link href={group.href} className="cx-link mt-7">
                      Ver {group.title.toLowerCase()} <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Soluciones según necesidad: galería horizontal fijada ── */}
      <section
        data-scene="pin"
        data-hscroll
        className="cx-hs bg-[#f4f8ff]"
        aria-labelledby="necesidades-title"
      >
        <div data-hscroll-viewport className="cx-hs-viewport py-24">
          <Container className="mb-10 flex flex-col gap-6 lg:mb-14 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-5">
              <Eyebrow>Soluciones según necesidad</Eyebrow>
              <h2 id="necesidades-title" className="cx-h2">
                Qué necesitas resolver hoy
              </h2>
            </div>
            <div className="hidden w-64 space-y-3 lg:block" aria-hidden="true">
              <p className="text-right text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Sigue bajando
              </p>
              <div className="cx-hs-progress">
                <span />
              </div>
            </div>
            <p className="text-sm font-medium text-slate-500 lg:hidden" aria-hidden="true">
              Desliza para ver más →
            </p>
          </Container>

          <ul data-hscroll-track className="cx-hs-track">
            {solutionsByNeed.map((solution, index) => (
              <li key={solution.title} className="cx-hs-card">
                <article className="cx-need">
                  <span className="cx-need-index" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-8 text-xl font-bold tracking-tight text-slate-900">{solution.title}</h3>
                  <p className="mt-3 flex-1 text-[0.95rem] leading-relaxed text-slate-600">{solution.description}</p>
                  <Link href={solution.href} className="cx-link mt-6">
                    {solution.cta} <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Demos con parallax por columnas ── */}
      <section className="bg-white py-24 lg:py-36">
        <Container>
          <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl space-y-5">
              <Eyebrow>Portafolio y demos</Eyebrow>
              <h2 className="cx-h2">Demos funcionales para evaluar antes de contratar</h2>
              <p className="cx-lead">
                Demos funcionales creados por nuestro equipo para que evalúes calidad, estructura y estilo antes de
                cotizar tu proyecto.
              </p>
            </div>
            <Link href="/demos" className="cx-btn cx-btn-ghost shrink-0">
              Ver todos los demos <ArrowRight className="cx-arrow h-4 w-4" />
            </Link>
          </Reveal>

          <div className="mt-20 space-y-28 lg:space-y-40">
            {demoCards.map((demo, index) => (
              <article
                key={demo.name}
                data-scene="view"
                className="cx-demo grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20"
              >
                <Reveal className={index % 2 ? "lg:order-2" : undefined}>
                  <span className="text-sm font-semibold tabular-nums tracking-widest text-blue-600">
                    0{index + 1}
                  </span>
                  <h3 className="cx-h3 mt-4">{demo.name}</h3>
                  <p className="mt-4 leading-relaxed text-slate-600">{demo.desc}</p>
                  <p className="mt-4 border-l-2 border-blue-200 pl-4 text-sm text-slate-500">{demo.tech}</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/demos" className="cx-btn cx-btn-ghost">
                      Ver demo
                    </Link>
                    <Link
                      href={`/contacto?origen=demo&item=${encodeURIComponent(demo.name)}`}
                      className="cx-btn cx-btn-primary"
                    >
                      Cotizar algo similar <ArrowRight className="cx-arrow h-4 w-4" />
                    </Link>
                  </div>
                </Reveal>

                <div className="grid grid-cols-2 gap-4 sm:gap-5">
                  {[0, 1].map((column) => (
                    <div
                      key={column}
                      className={`cx-collage-col space-y-4 sm:space-y-5 ${column ? "mt-14" : ""}`}
                      style={cssVars({ "--shift": column ? "90px" : "-90px" })}
                    >
                      {demo.gallery
                        .filter((_, imageIndex) => imageIndex % 2 === column)
                        .map((src) => {
                          const imageIndex = demo.gallery.indexOf(src);
                          return (
                            <div key={src} className="cx-shot aspect-[4/3]">
                              <Image
                                src={src}
                                alt={`Captura ${imageIndex + 1} de ${demo.name} para pymes en Chile y evaluación de desarrollo web`}
                                fill
                                sizes="(max-width: 1024px) 48vw, 340px"
                                quality={80}
                                loading="lazy"
                                placeholder="blur"
                                blurDataURL={softBlueBlurDataUrl}
                                className="object-cover object-top"
                              />
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Cobertura: el encuadre se abre con el scroll ── */}
      <section id="cobertura" className="scroll-mt-24 bg-white pb-24 lg:pb-32">
        <div data-scene="enter" className="mx-auto max-w-[90rem] px-3 sm:px-6">
          <div className="cx-cinema-frame aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9]">
            <Image
              src="/hero-bg.png"
              alt=""
              fill
              sizes="(max-width: 1440px) 100vw, 1440px"
              quality={75}
              className="cx-cinema-img object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />
          </div>
        </div>

        <Container className="relative -mt-40 sm:-mt-48 lg:-mt-56">
          <Reveal>
            <div className="cx-glass grid gap-10 rounded-[2rem] p-7 sm:p-10 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:p-14">
              <div className="space-y-5">
                <Eyebrow>Cobertura nacional</Eyebrow>
                <h2 className="cx-h2">Diseño de páginas web para todo Chile</h2>
                <p className="cx-lead">
                  De Arica a Punta Arenas: trabajamos 100% online con reuniones, avances por etapas y comunicación
                  directa, para que tu empresa tenga una web profesional sin importar la región donde opere.
                </p>
                <Link href="/cotizador" className="cx-btn cx-btn-primary">
                  Cotizar mi página web ahora <ArrowRight className="cx-arrow h-4 w-4" />
                </Link>
              </div>
              <ul className="divide-y divide-slate-200/80 self-center">
                {coverageSignals.map((signal, index) => (
                  <li key={signal} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      {index === 0 ? <MapPin className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                    </span>
                    <p className="text-[0.95rem] leading-relaxed text-slate-700">{signal}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </Container>

        <div className="mt-14">
          <CoverageMarquee />
        </div>
      </section>

      {/* ── Tipo de cliente ── */}
      <section className="bg-[#f8fafc] py-24 lg:py-32">
        <Container className="space-y-14">
          <Reveal className="mx-auto max-w-3xl space-y-5 text-center">
            <div className="flex justify-center">
              <Eyebrow>Soluciones por tipo de negocio</Eyebrow>
            </div>
            <h2 className="cx-h2">Elige la página web o solución según tu empresa</h2>
            <p className="cx-lead">
              Atendemos proyectos para pymes, emprendedores y empresas de distintas regiones de Chile, con foco en
              soluciones claras, escalables y alineadas a la etapa real del negocio.
            </p>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {clientTypes.map((client, index) => (
              <Reveal key={client.title} delay={(index % 4) * 80} className="h-full">
                <Link href={client.href} className="cx-card group">
                  <h3 className="text-lg font-bold leading-snug tracking-tight text-slate-900">{client.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{client.description}</p>
                  <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                    Ver solución
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Panel administrativo ── */}
      <section className="bg-white py-24 lg:py-36">
        <Container className="grid items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal className="space-y-6">
            <Eyebrow>Panel administrativo</Eyebrow>
            <h2 className="cx-h2">Paneles administrativos para que controles tu negocio</h2>
            <p className="cx-lead">
              Desarrollamos paneles y sistemas internos para que tu empresa gestione su información en tiempo real.
              La idea es simple: que actualices tu información cuando lo necesites, sin depender de terceros.
            </p>
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm leading-relaxed text-slate-700">
              <LayoutDashboard className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
              Dashboard con métricas, reportes y control operacional adaptado al tamaño de tu empresa.
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Capacidades frecuentes</h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {adminPanelFeatures.map((feature) => (
                  <li key={feature} className="cx-tag">
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/contacto?tipo=sistema" className="cx-btn cx-btn-primary">
              Cotizar un sistema <ArrowRight className="cx-arrow h-4 w-4" />
            </Link>
          </Reveal>

          <DashboardMockup />
        </Container>
      </section>

      {/* ── Confianza ── */}
      <section className="bg-[#f8fafc] py-24 lg:py-32">
        <Container className="grid gap-14 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
          <Reveal className="space-y-6 lg:sticky lg:top-40 lg:self-start">
            <Eyebrow>Confianza empresarial</Eyebrow>
            <h2 className="cx-h2">Por qué confiar en Zyteron</h2>
            <div className="flex flex-col items-start gap-3 sm:flex-row lg:flex-col">
              <Link href="/quienes-somos" className="cx-btn cx-btn-ghost">
                Ver quién está detrás de Zyteron
              </Link>
              <Link href="/contacto" className="cx-btn cx-btn-primary">
                Hablar con un especialista <ArrowRight className="cx-arrow h-4 w-4" />
              </Link>
            </div>
          </Reveal>

          <ul className="grid gap-x-10 sm:grid-cols-2">
            {trustPoints.map((point, index) => (
              <Reveal
                key={point}
                as="li"
                delay={(index % 2) * 90}
                className="flex items-start gap-4 border-t border-slate-200 py-6"
              >
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                <p className="text-[0.95rem] leading-relaxed text-slate-700">{point}</p>
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      {/* ── Proceso: línea de tiempo que se llena ── */}
      <section id="proceso" className="scroll-mt-24 bg-white py-24 lg:py-36">
        <Container className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <Reveal className="space-y-6 lg:sticky lg:top-40 lg:self-start">
            <Eyebrow>Cómo trabajamos</Eyebrow>
            <h2 className="cx-h2">Proceso claro de inicio a entrega</h2>
            <p className="cx-lead">
              {processSteps.length} etapas documentadas, desde el diagnóstico hasta el soporte post-entrega. Revisas
              cada avance antes de pasar a la siguiente.
            </p>
          </Reveal>

          <div data-scene="line" className="cx-tl">
            <div className="cx-tl-track" aria-hidden="true" />
            <div className="cx-tl-fill" aria-hidden="true" />
            <ol className="relative space-y-3">
              {processSteps.map((step, index) => (
                <li key={step} data-scene="enter" className="flex items-center gap-6 py-3">
                  <span className="cx-tl-dot" data-n={String(index + 1).padStart(2, "0")} aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="cx-tl-title text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                    {step}
                  </h3>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* ── Planes ── */}
      <section id="planes" className="scroll-mt-24 bg-[#f8fafc] py-24 lg:py-32">
        <Container className="space-y-14">
          <Reveal className="mx-auto max-w-3xl space-y-5 text-center">
            <div className="flex justify-center">
              <Eyebrow>Planes y precios</Eyebrow>
            </div>
            <h2 className="cx-h2">Planes claros para distintos niveles de necesidad</h2>
          </Reveal>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {planCards.map((plan, index) => (
              <Reveal key={plan.name} delay={(index % 4) * 80} className="h-full">
                <article className={`cx-plan${index === 1 ? " cx-plan-accent" : ""}`}>
                  <h3 className="text-lg font-bold tracking-tight text-slate-900">{plan.name}</h3>
                  <p className="mt-1.5 min-h-[2.5rem] text-sm leading-snug text-slate-500">{plan.target}</p>
                  <p className="mt-5 text-xl font-bold tracking-tight text-blue-700">{plan.price}</p>
                  <div className="my-6 h-px bg-slate-200" />
                  <ul className="flex-1 space-y-3">
                    {plan.includes.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/planes"
                    className={`cx-btn mt-8 w-full ${index === 1 ? "cx-btn-primary" : "cx-btn-ghost"}`}
                  >
                    Ver planes
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="max-w-2xl space-y-4">
                  <Eyebrow>Desarrollo corporativo</Eyebrow>
                  <h3 className="cx-h3">Cuando tu empresa necesita una plataforma, no una web</h3>
                  <p className="leading-relaxed text-slate-600">
                    En Zyteron también desarrollamos intranets y plataformas de gestión para organizaciones con varias
                    áreas, sucursales o sistemas que deben conversar entre sí. Partimos con un levantamiento funcional
                    y construimos por etapas, para que veas resultados en cada entrega.
                  </p>
                </div>
                <Link href="/planes" className="cx-btn cx-btn-primary shrink-0">
                  Ver desarrollo corporativo <ArrowRight className="cx-arrow h-4 w-4" />
                </Link>
              </div>

              <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
                {corporatePlans.map((plan) => (
                  <div key={plan.id} className="bg-white p-6 transition-colors hover:bg-blue-50/40">
                    <p className="font-bold tracking-tight text-slate-900">{plan.name}</p>
                    <p className="mt-2 text-sm font-bold text-blue-700">{planPriceClp(plan.id)}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">{plan.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <p className="text-center text-xs text-slate-500">
            Los valores pueden variar según requerimientos, funcionalidades, integraciones y alcance del proyecto.
          </p>
        </Container>
      </section>

      <ClientReviewsSection reviews={reviews} />

      {featuredCases.length > 0 ? (
        <section className="bg-white py-24 lg:py-32">
          <Container className="space-y-12">
            <Reveal className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-3xl space-y-5">
                <Eyebrow>Casos documentados</Eyebrow>
                <h2 className="cx-h2">Pruebas comerciales de soluciones aplicadas</h2>
                <p className="cx-lead">
                  Casos de empresas reales en sistemas, automatizaciones, ecommerce y SEO implementados para resolver
                  problemas de operación y presencia digital.
                </p>
              </div>
              <Link href="/casos-exito" className="cx-btn cx-btn-ghost shrink-0">
                Ver todos los casos <ArrowRight className="cx-arrow h-4 w-4" />
              </Link>
            </Reveal>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featuredCases.map((caseItem, index) => (
                <Reveal key={caseItem.slug} delay={(index % 4) * 80} className="h-full">
                  <Link href={`/casos-exito/${caseItem.slug}`} className="cx-card group">
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-blue-600">
                      {caseItem.badgePrimary}
                    </p>
                    <h3 className="mt-3 text-base font-bold leading-snug tracking-tight text-slate-900">
                      {caseItem.heading}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{caseItem.summary}</p>
                    <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700">
                      Ver caso
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      {/* ── FAQ ── */}
      <section id="preguntas-frecuentes" className="scroll-mt-24 bg-[#f8fafc] py-24 lg:py-32">
        <Container className="space-y-12">
          <Reveal className="mx-auto max-w-3xl space-y-5 text-center">
            <div className="flex justify-center">
              <Eyebrow>Preguntas frecuentes</Eyebrow>
            </div>
            <h2 className="cx-h2">Respuestas para cotizar con claridad</h2>
          </Reveal>

          <Reveal>
            <HomeFaqAccordion faqs={homeFaqs} />
          </Reveal>

          <Reveal className="text-center">
            <Link href="/faq" className="cx-btn cx-btn-ghost">
              Ver todas las preguntas frecuentes
            </Link>
          </Reveal>
        </Container>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-white py-24 lg:py-32">
        <Container>
          <Reveal>
            <div className="cx-cta">
              <div className="cx-cta-inner px-6 py-14 text-center sm:px-12 lg:py-20">
                <Eyebrow>Hablemos de tu proyecto</Eyebrow>
                <h2 className="cx-h2 mx-auto mt-6 max-w-3xl">
                  ¿Listo para cotizar <span className="cx-grad">tu proyecto?</span>
                </h2>
                <p className="cx-lead mx-auto mt-6 max-w-2xl">
                  Si necesitas una web corporativa, una tienda online o un sistema interno, conversemos y preparamos una
                  propuesta concreta para tu negocio, estés en la región que estés.
                </p>

                <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
                  <Link href="/cotizador" className="cx-btn cx-btn-primary w-full sm:w-auto">
                    Cotizar una web para mi empresa <ArrowRight className="cx-arrow h-4 w-4" />
                  </Link>
                  <Link href="/demos" className="cx-btn cx-btn-ghost w-full sm:w-auto">
                    Ver demos
                  </Link>
                  <Link
                    href={WHATSAPP_BASE}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cx-btn cx-btn-wa w-full sm:w-auto"
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                    Hablar por WhatsApp
                  </Link>
                </div>

                <ul className="mx-auto mt-10 grid max-w-4xl gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    "Cotización formal y sin compromiso.",
                    "Atención a empresas, pymes y emprendedores.",
                    "Avanzamos por etapas y revisas cada entrega.",
                    "Te acompañamos después de la entrega.",
                  ].map((item) => (
                    <li key={item} className="flex items-start justify-center gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
