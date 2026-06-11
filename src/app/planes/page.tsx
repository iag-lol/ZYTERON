import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { ArrowRight, Check, CircleDollarSign } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildFaqJsonLd,
  buildPlanPriceSpecificationJsonLd,
  buildWebPageJsonLd,
  createPageMetadata,
} from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Planes web, ecommerce y sistemas para empresas",
  description:
    "Revisa planes y precios referenciales para páginas web, ecommerce, sistemas y soporte, con alcance claro para cada etapa del negocio.",
  path: "/planes",
});

type ProjectTypeValue =
  | "web-basica"
  | "web-profesional"
  | "tienda-online"
  | "sistema-web";

type PlanTone = "default" | "starter" | "featured" | "critical";

type PlanCard = {
  id: string;
  name: string;
  price: string;
  priceNote?: string;
  tag: string;
  tone?: PlanTone;
  audience: string;
  description: string;
  commercialCopy: string;
  includes: string[];
  excludes: string[];
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
  "https://wa.me/56939526626?text=Hola%20ZYTERON%2C%20quiero%20orientaci%C3%B3n%20sobre%20sus%20planes";

function buildQuoteHref(projectType: ProjectTypeValue, presetPlan: string) {
  return `/cotizador?tipo=${projectType}&plan=${presetPlan}`;
}

function planToneClasses(tone: PlanTone = "default") {
  if (tone === "starter") {
    return {
      card: "border-blue-200 bg-gradient-to-b from-blue-50 to-white shadow-blue-100/70",
      badge: "border-blue-200 bg-white text-blue-700",
      price: "text-blue-700",
    };
  }

  if (tone === "featured") {
    return {
      card: "border-cyan-300 bg-gradient-to-b from-cyan-50 via-white to-white shadow-cyan-100/80 ring-1 ring-cyan-100",
      badge: "border-cyan-200 bg-cyan-100 text-cyan-800",
      price: "text-cyan-700",
    };
  }

  if (tone === "critical") {
    return {
      card: "border-slate-300 bg-gradient-to-b from-slate-100 to-white shadow-slate-200/80",
      badge: "border-slate-300 bg-slate-900 text-white",
      price: "text-slate-900",
    };
  }

  return {
    card: "border-slate-200 bg-white shadow-slate-100/80",
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    price: "text-blue-700",
  };
}

const plans: PlanCard[] = [
  {
    id: "web-basica",
    name: "Web Básica de Presentación",
    price: "$35.990 CLP",
    priceNote: "pago único",
    tag: "Ideal para comenzar",
    tone: "starter",
    audience:
      "Emprendedores, profesionales independientes y negocios pequeños que recién comienzan y necesitan presencia online seria sin una inversión alta.",
    description:
      "Una página simple, profesional y clara para mostrar tu negocio, generar confianza y recibir contactos por WhatsApp.",
    commercialCopy:
      "Pensado para quienes necesitan salir rápido con una presencia digital formal, clara y fácil de entender.",
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
    ctaLabel: "Solicitar web básica",
    projectType: "web-basica",
    presetPlan: "web-basica-presentacion",
  },
  {
    id: "emprendedor",
    name: "Plan Emprendedor",
    price: "Desde $69.990",
    tag: "Web inicial",
    audience:
      "Para emprendedores, técnicos, servicios pequeños, negocios locales y profesionales independientes que necesitan una web inicial más completa que una página básica.",
    description:
      "Una propuesta inicial con más estructura visual, más flexibilidad de secciones y mejor base comercial que la web básica.",
    commercialCopy:
      "Ideal cuando ya necesitas una landing más completa o un sitio simple con mejor presentación, claridad de servicios y llamado a la acción.",
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
    ctaLabel: "Cotizar plan emprendedor",
    projectType: "web-profesional",
    presetPlan: "plan-emprendedor",
  },
  {
    id: "pyme",
    name: "Plan Pyme",
    price: "Desde $129.990",
    tag: "Más solicitado",
    tone: "featured",
    audience:
      "Para negocios que necesitan una web más completa, ordenada y enfocada en generar confianza, mostrar servicios, responder dudas y recibir consultas.",
    description:
      "Es el plan recomendado cuando la web ya debe cumplir un rol comercial claro y sostener la imagen del negocio.",
    commercialCopy:
      "Pensado para pymes que necesitan vender mejor, responder objeciones frecuentes y verse más confiables frente a clientes reales.",
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
    ctaLabel: "Cotizar plan pyme",
    projectType: "web-profesional",
    presetPlan: "plan-pyme",
  },
  {
    id: "empresa",
    name: "Plan Empresa",
    price: "Desde $249.990",
    tag: "Mayor estructura",
    audience:
      "Para empresas, colegios, instituciones, oficinas, clínicas, talleres, transportes, constructoras y servicios B2B.",
    description:
      "Una presencia digital más seria, con mayor estructura, páginas internas y preparación para analítica y comunicación formal.",
    commercialCopy:
      "Pensado para organizaciones que deben proyectar más confianza, más orden y una base profesional de contenido.",
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
    ctaLabel: "Solicitar propuesta formal",
    projectType: "web-profesional",
    presetPlan: "plan-empresa",
  },
  {
    id: "tienda",
    name: "Catálogo / Tienda Online",
    price: "Desde $299.990",
    tag: "Venta digital",
    audience:
      "Para negocios que venden productos o necesitan un catálogo digital claro, ordenado y preparado para escalar.",
    description:
      "Puede funcionar como catálogo por WhatsApp, tienda simple, tienda con carrito o tienda con pagos online según cotización.",
    commercialCopy:
      "Pensado para vender mejor sin prometer funcionalidades que dependen del alcance, volumen y medios de pago elegidos.",
    includes: [
      "Catálogo por WhatsApp o tienda online base",
      "Categorías y fichas de productos",
      "Diseño responsive",
      "Botón de compra o contacto",
      "Carga inicial limitada de productos",
      "Integración con WhatsApp",
      "Estructura SEO para productos",
      "Preparación o integración de medios de pago según alcance",
    ],
    excludes: [
      "Carga masiva de productos",
      "Panel administrativo completo",
      "Cupones o descuentos avanzados",
      "Facturación externa automática",
      "Pasarela de pago incluida siempre",
    ],
    ctaLabel: "Cotizar tienda online",
    projectType: "tienda-online",
    presetPlan: "catalogo-tienda-online",
  },
  {
    id: "sistema",
    name: "Sistema Web / Panel Administrativo",
    price: "Desde $399.990",
    tag: "Procesos internos",
    audience:
      "Para empresas, pymes o instituciones que necesitan paneles administrativos, usuarios, registros, reportes y control de procesos.",
    description:
      "Este plan aplica cuando ya no basta una web comercial y se necesita operar datos, roles, estados y documentos internos.",
    commercialCopy:
      "Adecuado para procesos con base de datos, exportaciones, paneles y necesidades de trazabilidad operacional.",
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
    ctaLabel: "Agendar diagnóstico",
    projectType: "sistema-web",
    presetPlan: "sistema-web-panel-administrativo",
  },
  {
    id: "avanzado",
    name: "Sistema Avanzado / Desarrollo a medida",
    price: "Desde $749.990",
    tag: "Proyecto crítico",
    tone: "critical",
    audience:
      "Para empresas con procesos más complejos, múltiples módulos, integraciones, automatizaciones y operación crítica.",
    description:
      "Aquí hablamos de soluciones a medida con arquitectura más robusta, etapas de implementación y mayor análisis funcional.",
    commercialCopy:
      "Pensado para empresas que necesitan reducir trabajo manual, conectar sistemas y sostener una operación digital más sensible.",
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
    ctaLabel: "Solicitar evaluación técnica",
    projectType: "sistema-web",
    presetPlan: "sistema-avanzado",
  },
];

const additionalCategories: AdditionalCategory[] = [
  {
    title: "Funcionalidades para sitios web",
    items: [
      { name: "Sección adicional", price: "Desde $19.990" },
      { name: "Página adicional", price: "Desde $29.990" },
      { name: "Formulario avanzado", price: "Desde $39.990" },
      { name: "Login de usuarios", price: "Desde $199.990" },
    ],
  },
  {
    title: "Ecommerce",
    items: [
      { name: "Carga de productos hasta 20", price: "Desde $19.990" },
      { name: "Carga de productos hasta 50", price: "Desde $49.990" },
      { name: "Catálogo administrable", price: "Desde $99.990" },
    ],
  },
  {
    title: "Paneles y sistemas",
    items: [
      { name: "Mini panel administrativo", price: "Desde $149.990" },
      { name: "Panel administrativo completo", price: "Desde $399.990" },
      { name: "Sistema de reservas", price: "Desde $249.990" },
    ],
  },
  {
    title: "Integraciones",
    items: [
      { name: "Integración Flow, Webpay o Mercado Pago estándar", price: "Desde $89.990" },
      { name: "Integración API personalizada", price: "Desde $199.990" },
      { name: "Automatización WhatsApp", price: "Desde $99.990" },
    ],
  },
  {
    title: "SEO y reportes",
    items: [
      { name: "SEO inicial avanzado", price: "Desde $99.990" },
      { name: "Generador de PDF", price: "Desde $149.990" },
      { name: "Reportes o dashboard", price: "Desde $199.990" },
      { name: "Exportación Excel/PDF", price: "Desde $49.990" },
    ],
  },
];

const maintenancePlans = [
  {
    name: "Mantención básica",
    price: "Desde $29.990/mes",
    description: "Para sitios simples que necesitan continuidad, ajustes menores y soporte base.",
  },
  {
    name: "Mantención profesional",
    price: "Desde $59.990/mes",
    description: "Para negocios que necesitan más seguimiento, mejoras y soporte técnico periódico.",
  },
  {
    name: "Mantención ecommerce o sistema web",
    price: "Desde $99.990/mes",
    description: "Para tiendas y plataformas con mayor complejidad, más riesgo operativo y más tareas técnicas.",
  },
  {
    name: "Soporte prioritario",
    price: "Desde $69.990/mes",
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

export default function PlanesPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="planes-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/planes",
          title: "Planes flexibles para cada etapa de tu negocio",
          description:
            "Desde una web simple de presentación hasta un sistema completo, con valores base claros y cotización formal según alcance.",
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
            Planes flexibles para cada etapa de tu negocio
          </h1>
          <p className="mx-auto max-w-4xl text-base text-slate-600 sm:text-lg">
            Desde una web simple de presentación hasta un sistema completo, en ZYTERON trabajamos con valores base claros y cotización formal según el alcance real de cada proyecto.
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
            <h2 className="text-3xl font-extrabold text-slate-900">Elige una base clara para partir</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Ordenamos los planes para que sea más fácil distinguir una web de entrada, una web comercial más completa, una solución para empresa y un sistema interno.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            {plans.map((plan) => {
              const tone = planToneClasses(plan.tone);
              return (
                <article
                  key={plan.id}
                  className={`flex h-full flex-col rounded-[2rem] border p-6 shadow-sm ${tone.card}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] ${tone.badge}`}
                    >
                      {plan.tag}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h2 className="text-2xl font-extrabold text-slate-900">{plan.name}</h2>
                    <div className="mt-2 flex flex-wrap items-end gap-2">
                      <p className={`text-2xl font-extrabold ${tone.price}`}>{plan.price}</p>
                      {plan.priceNote ? (
                        <p className="text-sm font-semibold text-slate-500">{plan.priceNote}</p>
                      ) : null}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
                    <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/70 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Ideal para</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{plan.audience}</p>
                    </div>
                  </div>

                  <div className="mt-5 hidden flex-1 grid-cols-1 gap-4 md:grid">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Incluye</p>
                      <div className="mt-2 space-y-2">
                        {plan.includes.map((item) => (
                          <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-rose-700">No incluye</p>
                      <div className="mt-2 space-y-2">
                        {plan.excludes.map((item) => (
                          <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 md:hidden">
                    <details className="rounded-2xl border border-slate-200 bg-white/80 p-4" open>
                      <summary className="cursor-pointer list-none text-sm font-bold text-emerald-700">
                        Incluye
                      </summary>
                      <div className="mt-3 space-y-2">
                        {plan.includes.map((item) => (
                          <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                    <details className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                      <summary className="cursor-pointer list-none text-sm font-bold text-rose-700">
                        No incluye
                      </summary>
                      <div className="mt-3 space-y-2">
                        {plan.excludes.map((item) => (
                          <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>

                  {plan.notes?.length ? (
                    <div className="mt-5 space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      {plan.notes.map((note) => (
                        <p key={note}>{note}</p>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5">
                    <Button asChild className="w-full bg-blue-700 text-white hover:bg-blue-800">
                      <Link href={buildQuoteHref(plan.projectType, plan.presetPlan)}>
                        {plan.ctaLabel} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                </article>
              );
            })}
          </div>

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
