import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Check,
  FileText,
  LayoutDashboard,
  MonitorSmartphone,
  Settings,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import {
  buildFaqJsonLd,
  buildReviewsJsonLd,
  buildServicesListJsonLd,
  buildWebPageJsonLd,
  createPageMetadata,
} from "@/lib/seo";
import { getApprovedReviewsSnapshot } from "@/lib/web-control";
import { ClientReviewsSection } from "@/components/home/client-reviews-section";
import { caseStudies } from "@/content/case-studies";
import { softBlueBlurDataUrl } from "@/lib/image-placeholders";

export const dynamic = "force-dynamic";

const WHATSAPP_BASE =
  "https://wa.me/56984752936?text=Hola%20ZYTERON%2C%20quiero%20cotizar%20una%20soluci%C3%B3n%20para%20mi%20empresa.";

export const metadata: Metadata = createPageMetadata({
  title: "Desarrollo Web y Sistemas Digitales | ZYTERON · Santiago, Chile",
  description:
    "Creamos desarrollo web, sistemas digitales, tiendas online, automatización y soporte TI para empresas en Chile. Cotiza sin compromiso con Zyteron.",
  path: "/",
  keywords: [
    "desarrollo web Chile",
    "sistemas web a medida",
    "tiendas online para pymes",
    "automatización de procesos",
    "soporte TI para pymes",
  ],
});

const trustPoints = [
  "Más de 7 años de experiencia ligada a tecnología, procesos y soluciones digitales.",
  "Cotización formal antes de iniciar.",
  "Proceso de trabajo ordenado y documentado.",
  "Entrega por etapas con revisión del cliente.",
  "Soporte post-entrega según alcance contratado.",
  "Comunicación directa durante todo el proyecto.",
  "Soluciones adaptadas al tamaño de cada negocio.",
  "Desarrollo enfocado en resultados, no solo diseño.",
  "Posibilidad de emitir documento tributario cuando corresponde.",
  "Atención a empresas, pymes y emprendedores en Chile.",
];

const serviceGroups = [
  {
    title: "Desarrollo Web",
    icon: <MonitorSmartphone className="h-5 w-5" />,
    href: "/desarrollo-web",
    description:
      "Sitios profesionales para presentar, posicionar y vender tus servicios o productos.",
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
    tech: "Desde $299.990 CLP · Catálogo, carrito y estructura para pagos",
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
    q: "¿Cuánto cuesta una página web profesional?",
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
    q: "¿Trabajan con empresas fuera de Santiago?",
    a: "Sí. Atendemos proyectos para pymes, emprendedores y empresas de distintas regiones de Chile mediante atención remota.",
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

const localSignals = [
  "Atendemos proyectos para pymes, emprendedores y empresas de distintas regiones de Chile.",
  "Base operativa en Santiago y foco en empresas de la Región Metropolitana cuando el proyecto requiere contexto local.",
  "Trabajo remoto, seguimiento por etapas y comunicación directa para avanzar sin depender de reuniones innecesarias.",
  "Enfoque comercial, técnico y operativo para que la solución no sea solo diseño, sino una herramienta útil para el negocio.",
];

export default async function Home() {
  const reviews = await getApprovedReviewsSnapshot();

  return (
    <main className="overflow-hidden bg-white">
      <JsonLd
        id="home-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/",
          title: "Zyteron | Desarrollo Web, Sistemas y Soluciones Digitales para Empresas",
          description:
            "Creamos páginas web, tiendas online, sistemas web y soluciones digitales para empresas, pymes y emprendedores en Chile.",
          breadcrumbs: [{ name: "Inicio", path: "/" }],
        })}
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
          title: "Servicios principales ZYTERON",
          services: [
            {
              name: "Desarrollo web",
              description: "Páginas web profesionales para empresas y pymes en Chile.",
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
      <JsonLd id="home-review-schema" data={buildReviewsJsonLd(reviews)} />

      <section className="relative overflow-hidden bg-hero-pattern">
        <Container className="relative z-10 grid items-center gap-12 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div className="space-y-6">
            <div className="badge-blue">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Empresas · Pymes · Emprendedores · Chile
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
              Desarrollo web, sistemas digitales y soluciones tecnológicas para empresas en Chile
            </h1>

            <p className="max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              En Zyteron creamos páginas web profesionales, tiendas online, sistemas internos,
              automatizaciones y soluciones digitales para pymes, empresas y emprendedores que buscan
              crecer con tecnología seria, clara y escalable.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="btn-primary-glow gap-2 bg-blue-700 px-6 font-bold text-white hover:bg-blue-800">
                <Link href="/paquetes">
                  Solicitar cotización <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                <Link href="/desarrollo-web">Ver desarrollo web</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                <Link href="/nosotros">Conocer Zyteron</Link>
              </Button>
              <Link
                href={WHATSAPP_BASE}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-[#25d366]/35 bg-[#25d366]/10 px-5 py-2.5 text-sm font-bold text-[#18a34d] hover:bg-[#25d366]/20"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Hablar por WhatsApp
              </Link>
            </div>

            <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
              <p>Respuesta dentro de horario laboral.</p>
              <p>Cotización formal según requerimiento.</p>
              <p>Atención a empresas, pymes y emprendedores.</p>
              <p>No iniciamos trabajo sin definir alcance y condiciones.</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
              Qué resuelve ZYTERON
            </p>
            <div className="space-y-3">
              {[
                "Presencia digital profesional para vender servicios reales.",
                "Sistemas internos para ordenar procesos y datos.",
                "Automatizaciones y soporte TI para continuidad operativa.",
                "Acompañamiento desde cotización hasta post-entrega.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <p className="text-sm text-slate-700">{item}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Desarrollo responsivo para computador, tablet y celular.
            </p>
          </div>
        </Container>
      </section>

      <section className="border-y border-slate-200 bg-white py-10">
        <Container className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <FileText className="h-5 w-5 text-blue-700" />,
              title: "Cotización y alcance claros",
              desc: "Definimos condiciones, entregables y etapas antes de comenzar.",
            },
            {
              icon: <Workflow className="h-5 w-5 text-blue-700" />,
              title: "Proceso ordenado",
              desc: "Ejecución por hitos con revisión del cliente en cada etapa clave.",
            },
            {
              icon: <Users className="h-5 w-5 text-blue-700" />,
              title: "Comunicación directa",
              desc: "Canales activos para resolver avances, dudas y ajustes del proyecto.",
            },
          ].map((item) => (
            <div key={item.title} className="card-premium p-5">
              <div className="mb-3 inline-flex rounded-lg bg-blue-50 p-2">{item.icon}</div>
              <h2 className="text-base font-bold text-slate-900">{item.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
            </div>
          ))}
        </Container>
      </section>

      <section className="section-alt py-20">
        <Container className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Servicios</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Servicios organizados para decidir mejor
            </h2>
            <p className="mx-auto max-w-3xl text-sm text-slate-600 sm:text-base">
              Separamos cada línea de trabajo para que puedas cotizar exactamente lo que tu negocio necesita.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {serviceGroups.map((group) => (
              <article key={group.title} className="card-premium p-6">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {group.icon}
                  {group.title}
                </div>
                <p className="mb-4 text-sm text-slate-600">{group.description}</p>
                <div className="space-y-2">
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
            ))}
          </div>

          <div className="text-center">
            <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/desarrollo-web">Ver desarrollo web detallado</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="border-y border-slate-200 bg-white py-20">
        <Container className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Confianza empresarial</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Por qué confiar en ZYTERON</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {trustPoints.map((point) => (
              <div key={point} className="card-premium flex items-start gap-3 p-4">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <p className="text-sm text-slate-700">{point}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/nosotros">Ver quién está detrás de Zyteron</Link>
            </Button>
            <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">Hablar con un especialista</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="section-alt py-20">
        <Container className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Soluciones según necesidad</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Qué necesitas resolver hoy
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {solutionsByNeed.map((solution) => (
              <article key={solution.title} className="card-premium flex flex-col p-6">
                <h3 className="text-lg font-bold text-slate-900">{solution.title}</h3>
                <p className="mt-2 flex-1 text-sm text-slate-600">{solution.description}</p>
                <Button asChild variant="outline" className="mt-4 border-slate-300 text-slate-800 hover:bg-slate-50">
                  <Link href={solution.href}>{solution.cta}</Link>
                </Button>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-20">
        <Container className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Tipo de cliente</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Soluciones digitales para empresas en Chile
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Atendemos proyectos para pymes, emprendedores y empresas de distintas regiones de Chile, con foco
              en soluciones claras, escalables y alineadas a la etapa real del negocio.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {clientTypes.map((client) => (
              <Link key={client.title} href={client.href} className="card-premium p-6 transition-colors hover:border-blue-200">
                <h3 className="text-lg font-extrabold text-slate-900">{client.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{client.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                  Ver solución <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6">
            <h2 className="text-xl font-extrabold text-slate-900">Cobertura local y forma de trabajo</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {localSignals.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="section-alt py-20">
        <Container className="space-y-10">
          <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Portafolio y demos</p>
              <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Demos funcionales para evaluar antes de contratar
              </h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-600 sm:text-base">
                Estos ejemplos son demos funcionales de referencia. No representan clientes reales si no se indica explícitamente.
              </p>
            </div>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/demos">Ver todos los demos</Link>
            </Button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {demoCards.map((demo) => (
              <article key={demo.name} className="card-premium overflow-hidden">
                <div className="bg-grid-light border-b border-slate-200 p-5">
                  <div className="grid aspect-[16/9] grid-cols-2 gap-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {demo.gallery.slice(0, 4).map((src, index) => (
                      <div key={src} className="relative">
                        <Image
                          src={src}
                          alt={`Captura ${index + 1} de ${demo.name} para evaluar desarrollo web y tienda online`}
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
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-20">
        <Container className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Panel administrativo</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Paneles administrativos para que controles tu negocio
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              Desarrollamos paneles y sistemas internos para que tu empresa gestione su información en tiempo real.
              La idea es simple: no dependas de terceros para actualizar tu información.
            </p>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700">
              Dashboard con métricas, reportes y control operacional adaptado al tamaño de tu empresa.
            </div>
          </div>

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
        </Container>
      </section>

      <section className="section-alt py-20">
        <Container className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Planes y precios</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Planes claros para distintos niveles de necesidad</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {planCards.map((plan) => (
              <article key={plan.name} className="card-premium flex flex-col p-6">
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
            ))}
          </div>

          <p className="text-center text-xs text-slate-500">
            Los valores pueden variar según requerimientos, funcionalidades, integraciones y alcance del proyecto.
          </p>
        </Container>
      </section>

      <section className="bg-white py-20">
        <Container className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Cómo trabajamos</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Proceso claro de inicio a entrega</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {processSteps.map((step, index) => (
              <article key={step} className="card-premium border-t-4 border-t-blue-200 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Etapa {index + 1}</p>
                <h3 className="mt-1 text-base font-bold text-slate-900">{step}</h3>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <ClientReviewsSection reviews={reviews} />

      <section className="bg-white py-16">
        <Container className="space-y-8">
          <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Casos documentados</p>
              <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Pruebas comerciales de soluciones aplicadas
              </h2>
              <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                Casos anónimos de sistemas, automatizaciones, ecommerce y SEO implementados para resolver problemas reales de operación y presencia digital.
              </p>
            </div>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/casos-exito">Ver todos los casos</Link>
            </Button>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {caseStudies.slice(0, 4).map((caseStudy) => (
              <Link key={caseStudy.slug} href={`/casos-exito/${caseStudy.slug}`} className="card-premium p-5 transition-colors hover:border-blue-200">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">{caseStudy.industry}</p>
                <h3 className="text-base font-extrabold leading-snug text-slate-900">{caseStudy.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{caseStudy.summary}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                  Ver caso <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt py-20">
        <Container className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Preguntas frecuentes</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Respuestas para cotizar con claridad</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {homeFaqs.map((faq) => (
              <article key={faq.q} className="card-premium p-6">
                <h3 className="mb-2 text-sm font-bold text-slate-900">{faq.q}</h3>
                <p className="text-sm text-slate-600">{faq.a}</p>
              </article>
            ))}
          </div>
          <div className="text-center">
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/faq">Ver todas las preguntas frecuentes</Link>
            </Button>
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-white py-20">
        <Container className="relative z-10 rounded-3xl section-blue p-8 text-center text-white md:p-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <Briefcase className="h-7 w-7 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold">¿Listo para cotizar tu proyecto?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-blue-100 sm:text-base">
            Si necesitas una web corporativa, una tienda online o un sistema interno, conversemos y preparamos
            una propuesta concreta para tu negocio.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-white font-bold text-blue-800 hover:bg-blue-50">
              <Link href="/paquetes">Cotizar una web para mi empresa</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/demos">Ver demos</Link>
            </Button>
            <Link
              href={WHATSAPP_BASE}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Hablar por WhatsApp
            </Link>
          </div>

          <div className="mt-4 grid gap-2 text-xs text-blue-100 sm:grid-cols-2 lg:grid-cols-4">
            <p>Cotización formal antes de iniciar.</p>
            <p>Atención a empresas, pymes y emprendedores.</p>
            <p>Proceso por etapas con revisión.</p>
            <p>Soporte post-entrega según alcance.</p>
          </div>
        </Container>
      </section>
    </main>
  );
}
