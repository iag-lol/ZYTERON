import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight, Check, CircleDollarSign } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { PlansShowcase, type ShowcasePlan } from "@/components/planes/plans-showcase";
import { siteConfig } from "@/config/site";
import { PLAN_PRICES, PRICING_NOTE } from "@/config/pricing";
import {
  buildFaqJsonLd,
  buildPlanPriceSpecificationJsonLd,
  buildWebPageJsonLd,
  createPageMetadata,
} from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Planes y Precios de Páginas Web en Chile",
  description:
    "Precios de páginas web en Chile: web básica, plan pyme, sitio corporativo, ecommerce y sistemas. Valores referenciales, alcance por plan y calculadora de precio.",
  path: "/planes",
});

type ProjectTypeValue =
  | "web-basica"
  | "web-profesional"
  | "tienda-online"
  | "sistema-web";

type PlanCard = {
  id: string;
  name: string;
  price: string;
  priceNote?: string;
  tag: string;
  audience: string;
  description: string;
  includes: string[];
  excludes: string[];
  availableAddons?: string[];
  notes?: string[];
  ctaLabel: string;
  projectType: ProjectTypeValue;
  presetPlan: string;
};

type AdditionalCategory = {
  title: string;
  items: Array<{ name: string; price: string }>;
};

const WHATSAPP_URL =
  `${siteConfig.social.whatsapp}?text=Hola%20ZYTERON%2C%20quiero%20orientaci%C3%B3n%20sobre%20sus%20planes`;

function buildQuoteHref(projectType: ProjectTypeValue, presetPlan: string) {
  return `/cotizador?tipo=${projectType}&plan=${presetPlan}`;
}

const plans: PlanCard[] = [
  {
    id: "web-basica",
    name: "Web Básica de Presentación",
    price: PLAN_PRICES["web-basica"],
    priceNote: "pago único",
    tag: "Ideal para comenzar",
    audience:
      "Emprendedores, profesionales independientes y negocios pequeños que recién comienzan y necesitan presencia online seria sin una inversión alta.",
    description:
      "Una página simple, profesional y clara para mostrar tu negocio, generar confianza y recibir contactos por WhatsApp.",
    includes: [
      "Una sola página tipo presentación",
      "Diseño profesional en modo claro",
      "Diseño responsivo para celular, tablet y computador",
      "Sección de inicio",
      "Sección de servicios o información del negocio",
      "Sección de contacto",
      "Botón directo a WhatsApp",
      "Enlaces a redes sociales",
      "Formulario simple de contacto",
      "SEO básico inicial",
      "Optimización básica de carga",
      "Publicación inicial",
    ],
    excludes: [
      "Dominio",
      "Hosting externo pagado",
      "Tienda online",
      "Carrito de compras",
      "Pasarela de pago",
      "Panel administrativo",
      "Blog",
      "Login de usuarios",
      "Sistemas internos",
      "Automatizaciones avanzadas",
      "Redacción completa de textos",
      "Carga masiva de contenido",
      "Mantención mensual",
    ],
    notes: [
      "Dominio .cl o .com se cotiza aparte según disponibilidad.",
      "Puedes comenzar con este plan y luego mejorar tu web cuando tu negocio crezca.",
    ],
    availableAddons: ["Dominio y hosting", "Secciones adicionales", "Formulario avanzado"],
    ctaLabel: "Solicitar web básica",
    projectType: "web-basica",
    presetPlan: "web-basica-presentacion",
  },
  {
    id: "emprendedor",
    name: "Plan Emprendedor",
    price: PLAN_PRICES["emprendedor"],
    tag: "Web inicial",
    audience:
      "Para emprendedores, técnicos, servicios pequeños, negocios locales y profesionales independientes que necesitan una web inicial más completa que una página básica.",
    description:
      "Una propuesta inicial con más estructura visual, más flexibilidad de secciones y mejor base comercial que la web básica.",
    includes: [
      "Landing page más completa o sitio simple",
      "Más estructura visual que la web básica",
      "Secciones adicionales según alcance",
      "Formulario de contacto",
      "WhatsApp",
      "Redes sociales",
      "SEO inicial",
      "Asesoría de estructura",
      "Diseño responsive",
      "Publicación inicial",
    ],
    excludes: [
      "Tienda online",
      "Panel administrativo",
      "Login de usuarios",
      "Sistemas internos",
      "Automatizaciones complejas",
      "Pasarelas de pago",
    ],
    availableAddons: ["Secciones extra", "SEO inicial avanzado", "Dominio y correos corporativos"],
    ctaLabel: "Cotizar plan emprendedor",
    projectType: "web-profesional",
    presetPlan: "plan-emprendedor",
  },
  {
    id: "pyme",
    name: "Plan Pyme",
    price: PLAN_PRICES["pyme"],
    tag: "Más solicitado",
    audience:
      "Para negocios que necesitan una web más completa, ordenada y enfocada en generar confianza, mostrar servicios, responder dudas y recibir consultas.",
    description:
      "Es el plan recomendado cuando la web ya debe cumplir un rol comercial claro y sostener la imagen del negocio.",
    includes: [
      "Sitio web corporativo o comercial",
      "Varias secciones informativas",
      "Diseño profesional y responsive",
      "Formulario de contacto",
      "Botón WhatsApp",
      "Galería, servicios o catálogo básico",
      "Estructura SEO inicial",
      "Integración con redes sociales",
      "Optimización visual y comercial",
      "Sección de preguntas frecuentes",
      "Llamados a la acción estratégicos",
    ],
    excludes: [
      "Panel administrativo completo",
      "Pasarela de pago incluida siempre",
      "Tienda online avanzada",
      "Automatizaciones complejas",
      "Sistemas internos personalizados",
    ],
    availableAddons: ["Catálogo administrable", "Integración de pagos", "Reportes o dashboard"],
    ctaLabel: "Cotizar plan pyme",
    projectType: "web-profesional",
    presetPlan: "plan-pyme",
  },
  {
    id: "empresa",
    name: "Plan Empresa",
    price: PLAN_PRICES["empresa"],
    tag: "Mayor estructura",
    audience:
      "Para empresas, colegios, instituciones, oficinas, clínicas, talleres, transportes, constructoras y servicios B2B.",
    description:
      "Una presencia digital más seria, con mayor estructura, páginas internas y preparación para analítica y comunicación formal.",
    includes: [
      "Web corporativa completa",
      "Páginas internas estructuradas",
      "Secciones de confianza y respaldo",
      "Formularios más completos",
      "SEO inicial",
      "Optimización responsive",
      "Redacción base profesional",
      "Integración con WhatsApp y redes",
      "Preparación para analítica web",
      "Capacitación básica si corresponde",
    ],
    excludes: [
      "Desarrollo de sistema a medida",
      "Login de usuarios",
      "Reportes internos",
      "Flujos automatizados avanzados",
      "Integraciones complejas",
    ],
    availableAddons: ["Panel administrativo", "Automatización de formularios", "Integraciones API"],
    ctaLabel: "Solicitar propuesta formal",
    projectType: "web-profesional",
    presetPlan: "plan-empresa",
  },
  {
    id: "catalogo",
    name: "Catálogo por WhatsApp",
    price: PLAN_PRICES["catalogo"],
    tag: "Venta por WhatsApp",
    audience:
      "Para negocios que quieren mostrar sus productos de forma ordenada y recibir pedidos directamente por WhatsApp.",
    description:
      "Catálogo digital claro con fichas de productos y contacto directo por WhatsApp, sin carrito ni pagos online.",
    includes: [
      "Catálogo con categorías y fichas de productos",
      "Diseño responsive",
      "Botón de pedido o contacto por WhatsApp",
      "Carga inicial limitada de productos",
      "Estructura SEO para productos",
    ],
    excludes: [
      "Carrito de compras",
      "Pagos en línea",
      "Panel administrativo completo",
      "Carga masiva de productos",
    ],
    availableAddons: ["Carga adicional de productos", "Catálogo administrable"],
    notes: [
      "El cliente entrega fotografías, precios, stock, categorías y descripciones correctamente organizadas.",
    ],
    ctaLabel: "Cotizar catálogo",
    projectType: "tienda-online",
    presetPlan: "catalogo-whatsapp",
  },
  {
    id: "ecommerce",
    name: "Ecommerce con carrito y pagos",
    price: PLAN_PRICES["ecommerce"],
    tag: "Venta online",
    audience:
      "Para negocios que quieren vender online con carrito de compras y pagos en línea integrados.",
    description:
      "Tienda con carrito, gestión de productos y pagos online (Flow, Webpay o Mercado Pago) según alcance.",
    includes: [
      "Tienda con carrito de compras",
      "Gestión de productos y categorías",
      "Integración de medios de pago",
      "Diseño responsive",
      "Estructura SEO para productos",
      "Carga inicial limitada de productos",
    ],
    excludes: [
      "Carga masiva de productos",
      "Cupones o descuentos avanzados",
      "Facturación electrónica automática",
      "Integraciones externas no definidas",
    ],
    availableAddons: ["Gestión de stock", "Cupones y descuentos", "Integración de despacho", "Catálogo administrable"],
    notes: [
      "El cliente entrega fotografías, precios, stock, categorías y descripciones correctamente organizadas.",
    ],
    ctaLabel: "Cotizar ecommerce",
    projectType: "tienda-online",
    presetPlan: "ecommerce-carrito-pagos",
  },
  {
    id: "sistema",
    name: "Sistema Web / Panel Administrativo",
    price: PLAN_PRICES["sistema"],
    tag: "Procesos internos",
    audience:
      "Para empresas, pymes o instituciones que necesitan paneles administrativos, usuarios, registros, reportes y control de procesos.",
    description:
      "Este plan aplica cuando ya no basta una web comercial y se necesita operar datos, roles, estados y documentos internos.",
    includes: [
      "Paneles administrativos",
      "Usuarios y roles",
      "Registros y formularios internos",
      "Reportes",
      "PDF y Excel según alcance",
      "Base de datos",
      "Estados de procesos",
      "Seguridad básica",
      "Capacitación de uso",
    ],
    excludes: [
      "Integraciones complejas no definidas",
      "Automatizaciones avanzadas fuera de alcance",
      "Múltiples módulos críticos sin diagnóstico previo",
    ],
    availableAddons: ["Exportación Excel/PDF", "Roles avanzados", "Mini paneles adicionales"],
    ctaLabel: "Agendar diagnóstico",
    projectType: "sistema-web",
    presetPlan: "sistema-web-panel-administrativo",
  },
  {
    id: "avanzado",
    name: "Sistema Avanzado / Desarrollo a medida",
    price: PLAN_PRICES["avanzado"],
    tag: "Proyecto crítico",
    audience:
      "Para empresas con procesos más complejos, múltiples módulos, integraciones, automatizaciones y operación crítica.",
    description:
      "Aquí hablamos de soluciones a medida con arquitectura más robusta, etapas de implementación y mayor análisis funcional.",
    includes: [
      "Arquitectura personalizada",
      "Múltiples módulos",
      "Integraciones externas",
      "Automatizaciones",
      "Reportes avanzados",
      "Paneles por perfil de usuario",
      "Exportación Excel/PDF",
      "Gestión documental y notificaciones",
      "Roadmap por etapas según prioridad",
    ],
    excludes: [
      "Precio cerrado sin levantamiento técnico",
      "Implementación total sin diagnóstico previo",
    ],
    availableAddons: ["Fases por módulo", "Integraciones externas", "Notificaciones y documentos automáticos"],
    ctaLabel: "Solicitar evaluación técnica",
    projectType: "sistema-web",
    presetPlan: "sistema-avanzado",
  },
];

const additionalCategories: AdditionalCategory[] = [
  {
    title: "Inteligencia Artificial y atención automatizada",
    items: [
      { name: "Chat IA informativo para web", price: "Desde $399.990 + IVA · operación desde $49.990/mes" },
      { name: "Asistente IA de ventas 24/7 (Más solicitado)", price: "Desde $899.990 + IVA · operación desde $99.990/mes" },
      { name: "Asistente IA para cotizaciones o pedidos (Recomendado)", price: "Desde $1.290.000 + IVA · operación desde $149.990/mes" },
      { name: "Asistente IA omnicanal Web y WhatsApp", price: "Desde $1.690.000 + IVA · operación desde $199.990/mes" },
    ],
  },
  {
    title: "WhatsApp y comunicación",
    items: [
      { name: "Botón personalizado de WhatsApp", price: "Desde $39.990 + IVA" },
      { name: "Formulario conectado a WhatsApp", price: "Desde $79.990 + IVA" },
      { name: "Notificaciones automáticas por WhatsApp Business API", price: "Desde $249.990 + IVA · soporte desde $49.990/mes" },
      { name: "Chatbot de WhatsApp con menú automático", price: "Desde $399.990 + IVA · soporte desde $59.990/mes" },
      { name: "Automatización de seguimiento de clientes", price: "Desde $349.990 + IVA" },
    ],
  },
  {
    title: "Funcionalidades para sitios web",
    items: [
      { name: "Sección adicional", price: "Desde $39.990 + IVA" },
      { name: "Página adicional", price: "Desde $59.990 + IVA" },
      { name: "Formulario avanzado", price: "Desde $79.990 + IVA" },
      { name: "Formulario multipaso", price: "Desde $149.990 + IVA" },
      { name: "Login de usuarios", price: "Desde $299.990 + IVA" },
      { name: "Blog administrable", price: "Desde $199.990 + IVA" },
    ],
  },
  {
    title: "Ecommerce",
    items: [
      { name: "Carga de productos hasta 20", price: "Desde $59.990 + IVA" },
      { name: "Carga de productos hasta 50", price: "Desde $119.990 + IVA" },
      { name: "Catálogo administrable", price: "Desde $249.990 + IVA" },
      { name: "Gestión de stock", price: "Desde $249.990 + IVA" },
      { name: "Cupones y descuentos", price: "Desde $99.990 + IVA" },
    ],
  },
  {
    title: "Paneles y sistemas",
    items: [
      { name: "Mini panel administrativo", price: "Desde $349.990 + IVA" },
      { name: "Panel administrativo completo", price: "Desde $990.000 + IVA" },
      { name: "Sistema de reservas", price: "Desde $499.990 + IVA" },
      { name: "Dashboard y estadísticas", price: "Desde $399.990 + IVA" },
    ],
  },
  {
    title: "Integraciones",
    items: [
      { name: "Integración Flow, Webpay o Mercado Pago estándar", price: "Desde $149.990 + IVA" },
      { name: "Integración API personalizada", price: "Desde $349.990 + IVA" },
      { name: "Integración con CRM", price: "Desde $299.990 + IVA" },
      { name: "Automatización por WhatsApp", price: "Desde $249.990 + IVA (más consumo)" },
    ],
  },
  {
    title: "SEO, analítica y documentos",
    items: [
      { name: "SEO inicial avanzado", price: "Desde $179.990 + IVA" },
      { name: "SEO mensual", price: "Desde $149.990 + IVA / mes" },
      { name: "Generador de PDF", price: "Desde $249.990 + IVA" },
      { name: "Dashboard y reportes", price: "Desde $399.990 + IVA" },
      { name: "Exportación Excel o PDF", price: "Desde $99.990 + IVA" },
    ],
  },
];

const maintenancePlans = [
  {
    name: "Mantención básica",
    price: "Desde $39.990 + IVA / mes",
    description: "Para sitios simples que necesitan continuidad, ajustes menores y soporte base.",
  },
  {
    name: "Mantención profesional",
    price: "Desde $79.990 + IVA / mes",
    description: "Para negocios que necesitan más seguimiento, mejoras y soporte técnico periódico.",
  },
  {
    name: "Mantención ecommerce o sistema web",
    price: "Desde $129.990 + IVA / mes",
    description: "Para tiendas y plataformas con mayor complejidad, más riesgo operativo y más tareas técnicas.",
  },
  {
    name: "Soporte prioritario",
    price: "Desde $99.990 + IVA / mes",
    description: "Para empresas que necesitan atención más rápida y prioridad frente a incidencias.",
  },
];

const planGuide = [
  "Si solo necesitas una página simple para mostrar tu negocio: Web Básica de Presentación.",
  "Si quieres una web inicial más completa: Plan Emprendedor.",
  "Si tienes una pyme y necesitas generar confianza: Plan Pyme.",
  "Si representas una empresa, colegio o institución: Plan Empresa.",
  "Si vendes productos o necesitas catálogo: Catálogo / Tienda Online.",
  "Si necesitas usuarios, registros, reportes o procesos internos: Sistema Web.",
  "Si necesitas integraciones, automatizaciones o múltiples módulos: Sistema Avanzado.",
];

const priceFaqs = [
  {
    q: "¿Cuánto cuesta una página web en Chile?",
    a: `Los valores publicados por Zyteron son: Web Básica, ${PLAN_PRICES["web-basica"]}; Plan Pyme, ${PLAN_PRICES.pyme}; y Plan Empresa, ${PLAN_PRICES.empresa}. Son referencias: el precio final depende de páginas, contenido, administración e integraciones.`,
  },
  {
    q: "¿Los precios publicados son finales?",
    a: "No. Son valores base para proyectos referenciales. El precio final depende del alcance real, secciones, integraciones, contenido, soporte requerido y nivel de personalización.",
  },
  {
    q: "¿La web básica incluye dominio?",
    a: "No. El dominio .cl o .com se cotiza aparte según disponibilidad y necesidad del proyecto.",
  },
  {
    q: "¿El Plan Emprendedor es igual a la Web Básica?",
    a: "No. La Web Básica es una sola página de entrada. El Plan Emprendedor permite una estructura más completa y mayor flexibilidad de secciones.",
  },
  {
    q: "¿La tienda online incluye pagos en línea siempre?",
    a: "No siempre. La preparación o integración de medios de pago se define según alcance, proveedor y complejidad del proyecto.",
  },
  {
    q: "¿Un sitio web incluye panel administrativo?",
    a: "No necesariamente. Los paneles, usuarios, reportes, bases de datos y procesos internos pertenecen a planes de sistema o se cotizan aparte.",
  },
  {
    q: "¿Puedo partir con un plan simple y luego crecer?",
    a: "Sí. De hecho, la Web Básica y el Plan Emprendedor están pensados para comenzar con orden y luego evolucionar según el crecimiento del negocio.",
  },
  {
    q: "¿Trabajan con empresas y proyectos complejos?",
    a: "Sí. ZYTERON desarrolla webs empresariales, sistemas internos, automatizaciones, paneles y soluciones a medida según diagnóstico técnico.",
  },
];

/**
 * Los tres planes que se muestran de entrada: el recorrido natural de compra,
 * de tener presencia a vender en línea. El resto del catálogo queda tras el
 * botón "ver más". Cambiar este arreglo cambia la vitrina.
 */
const FEATURED_IDS = ["web-basica", "pyme", "ecommerce"];

/** Adapta un plan del catálogo al formato resumido de la vitrina. */
function toShowcase(id: string): ShowcasePlan {
  const plan = plans.find((item) => item.id === id);
  if (!plan) throw new Error(`Plan desconocido en la vitrina: ${id}`);
  return {
    id: plan.id,
    name: plan.name,
    price: plan.price,
    priceNote: plan.priceNote,
    tag: plan.tag,
    audience: plan.audience,
    description: plan.description,
    includes: plan.includes,
    quoteHref: buildQuoteHref(plan.projectType, plan.presetPlan),
  };
}

export default function PlanesPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="planes-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/planes",
          title: "Precios de páginas web en Chile: planes y valores",
          description:
            "Precios referenciales para páginas web, ecommerce y sistemas, con alcance claro y cotización formal según cada proyecto.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Planes", path: "/planes" },
          ],
        })}
      />
      <JsonLd
        id="planes-faq-schema"
        data={buildFaqJsonLd(
          priceFaqs.map((item) => ({
            question: item.q,
            answer: item.a,
          })),
        )}
      />
      <JsonLd id="planes-price-specification-schema" data={buildPlanPriceSpecificationJsonLd("/planes")} />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-6 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Planes y cotización profesional
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Precios de páginas web en Chile y planes para cada negocio
          </h1>
          <p className="mx-auto max-w-4xl text-base text-slate-600 sm:text-lg">
            Compara desde una web simple de presentación hasta un sitio corporativo, ecommerce o sistema. Publicamos valores base claros y confirmamos cada proyecto mediante una cotización formal.
          </p>
          <div className="mx-auto max-w-4xl rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-slate-700">
            Los valores publicados son referenciales para proyectos base. El precio final puede variar según secciones, funcionalidades, contenido, integraciones, soporte requerido y nivel de personalización.
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/cotizador">Cotizar ahora</Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Hablar por WhatsApp
              </a>
            </Button>
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Planes principales</p>
            <h2 className="text-3xl font-extrabold text-slate-900">Planes y valores de páginas web para comenzar</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Ordenamos los planes para que sea más fácil distinguir una web de entrada, una web comercial más completa, una solución para empresa y un sistema interno.
            </p>
          </div>

          <PlansShowcase
            featured={FEATURED_IDS.map(toShowcase)}
            rest={plans.filter((plan) => !FEATURED_IDS.includes(plan.id)).map((plan) => toShowcase(plan.id))}
          />

          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Cada valor es referencial y se confirma según alcance, contenido, integraciones, soporte y complejidad real del proyecto.
          </p>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Adicionales</p>
            <h2 className="text-3xl font-extrabold text-slate-900">Funcionalidades y servicios opcionales</h2>
            <p className="max-w-4xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Si tu proyecto necesita más alcance, estas mejoras se cotizan aparte según complejidad y volumen real.
            </p>
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <tbody>
                {additionalCategories.map((category) => (
                  <Fragment key={category.title}>
                    <tr key={`${category.title}-title`} className="border-t border-slate-200 first:border-t-0 bg-slate-100">
                      <th colSpan={2} className="px-5 py-3 text-sm font-extrabold text-slate-900">
                        {category.title}
                      </th>
                    </tr>
                    {category.items.map((item) => (
                      <tr key={item.name} className="border-t border-slate-100">
                        <td className="px-5 py-3 text-slate-700">{item.name}</td>
                        <td className="px-5 py-3 text-right font-bold text-blue-700">{item.price}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {additionalCategories.map((category) => (
              <article key={category.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900">{category.title}</h3>
                <div className="mt-3 space-y-2">
                  {category.items.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <span className="text-sm text-slate-700">{item.name}</span>
                      <span className="text-sm font-bold text-blue-700">{item.price}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            Valores referenciales. El precio final puede variar según complejidad, vistas, integraciones, volumen de contenido y soporte requerido.
          </p>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] text-cyan-700">
              <CircleDollarSign className="h-4 w-4" />
              Mantención mensual
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Mantenciones mensuales claras y coherentes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Evitamos precios contradictorios y dejamos una estructura simple para sitios, ecommerce y sistemas.
            </p>
            <div className="mt-5 grid gap-3">
              {maintenancePlans.map((plan) => (
                <div
                  key={plan.name}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <h3 className="text-base font-extrabold text-slate-900">{plan.name}</h3>
                    <p className="text-base font-extrabold text-blue-700">{plan.price}</p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{plan.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm">
            <h3 className="text-xl font-extrabold text-slate-900">Qué considerar antes de contratar mantención</h3>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              {[
                "El alcance depende del tipo de proyecto y frecuencia de intervención.",
                "No incluye rediseños completos ni desarrollo de nuevas plataformas.",
                "Automatizaciones, integraciones complejas y nuevos módulos se cotizan aparte.",
                "Puede incluir soporte técnico, continuidad operativa y mejoras menores según el plan.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Button asChild className="bg-blue-700 text-white hover:bg-blue-800">
                <Link href="/cotizador?tipo=soporte-ti">Cotizar soporte</Link>
              </Button>
              <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-white">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Consultar mantención
                </a>
              </Button>
            </div>
          </article>

          <p className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-relaxed text-slate-500">
            {PRICING_NOTE}
          </p>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="space-y-6">
          <h2 className="text-2xl font-extrabold text-slate-900">¿Qué plan necesito?</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {planGuide.map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>

          <article className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <h3 className="text-lg font-extrabold text-slate-900">¿No sabes qué plan elegir?</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Podemos revisar tu caso y recomendar una estructura según objetivo, presupuesto y funcionalidades necesarias.
            </p>
            <Button asChild className="mt-4 bg-blue-700 text-white hover:bg-blue-800">
              <Link href="/cotizador?tipo=no-seguro">Solicitar orientación</Link>
            </Button>
          </article>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-5">
          <h2 className="text-2xl font-extrabold text-slate-900">Preguntas frecuentes sobre planes y precios</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {priceFaqs.map((item) => (
              <article key={item.q} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">{item.q}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.a}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-blue py-16 text-white">
        <Container className="space-y-4 text-center">
          <h2 className="text-3xl font-extrabold">Solicita una propuesta formal</h2>
          <p className="mx-auto max-w-3xl text-sm text-blue-100 sm:text-base">
            Si tu negocio necesita una web más clara, una tienda online o un sistema interno, podemos preparar una propuesta alineada con el alcance real.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-white text-blue-800 hover:bg-blue-50">
              <Link href="/cotizador">
                Ir al cotizador <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                Hablar por WhatsApp
              </a>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
