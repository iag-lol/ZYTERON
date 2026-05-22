import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, MessageCircle, MonitorSmartphone, Settings, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { buildServicesListJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { seoServicePages } from "@/content/seo-service-pages";

const WHATSAPP_URL =
  "https://wa.me/56984752936?text=Hola%20Zyteron%2C%20quiero%20orientaci%C3%B3n%20sobre%20un%20servicio%20digital%20para%20mi%20empresa.";

export const metadata: Metadata = createPageMetadata({
  title: "Servicios digitales para empresas y pymes",
  description:
    "Servicios de ZYTERON en Chile: desarrollo web, sistemas internos, automatización, soporte TI y soluciones tecnológicas para negocios.",
  path: "/servicios",
});

const introParagraphs = [
  "En Zyteron desarrollamos soluciones digitales para empresas, pymes y emprendedores en Chile que necesitan mejorar su presencia online, ordenar procesos internos y avanzar con tecnología útil. Nuestro trabajo combina desarrollo web, tiendas online, sistemas web, automatización, soporte TI y optimización web con un enfoque práctico: resolver problemas reales del negocio.",
  "Cada servicio se define según alcance, prioridad y etapa de la empresa. No todos los proyectos necesitan una solución compleja desde el inicio; algunas pymes requieren una página web clara para generar confianza, mientras otras necesitan un sistema web para controlar datos, documentación, ventas, inventario o tareas operativas.",
  "El objetivo es ayudarte a elegir una alternativa profesional, escalable y coherente con lo que quieres lograr. Por eso trabajamos con diagnóstico inicial, propuesta clara, diseño responsive, estructura SEO base, rutas de contacto visibles y acompañamiento posterior según el tipo de proyecto.",
];

const serviceGroups = [
  {
    title: "A) Desarrollo Web",
    description: "Presencia digital profesional para captar clientes y fortalecer la confianza comercial.",
    icon: <MonitorSmartphone className="h-5 w-5" />,
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
    title: "B) Sistemas y automatización",
    description: "Soluciones para ordenar procesos internos y mejorar productividad operativa.",
    icon: <Settings className="h-5 w-5" />,
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
    title: "C) Soporte TI y soluciones tecnológicas",
    description: "Soporte para operación diaria, continuidad técnica y crecimiento con menor fricción.",
    icon: <ShieldCheck className="h-5 w-5" />,
    items: [
      "Soporte técnico",
      "Redes",
      "Configuración de equipos",
      "Asesoría tecnológica",
      "Productos TI como complemento",
    ],
  },
];

const detailedServices = [
  {
    title: "Desarrollo web",
    href: "/desarrollo-web",
    description:
      "Desarrollamos páginas web profesionales para empresas, pymes y emprendedores que necesitan una presencia digital clara, moderna y confiable. Este servicio ayuda a presentar productos, servicios, información corporativa y canales de contacto de forma ordenada, mejorando la imagen de marca y facilitando nuevas oportunidades comerciales.",
  },
  {
    title: "Tiendas online",
    href: "/tiendas-online",
    description:
      "Creamos tiendas online y catálogos digitales para negocios que quieren vender productos o recibir pedidos de forma más estructurada. Es una solución útil para pymes que hoy venden por redes sociales o WhatsApp y necesitan un canal propio con fichas de producto, categorías, contacto y una experiencia responsive.",
  },
  {
    title: "Sistemas web a medida",
    href: "/sistemas-web",
    description:
      "Desarrollamos sistemas web para empresas que necesitan ordenar procesos internos, controlar registros, gestionar usuarios, generar reportes o centralizar información. Aplica cuando una planilla, papel o flujo manual ya no entrega trazabilidad suficiente para operar con seguridad y tomar mejores decisiones.",
  },
  {
    title: "Automatización de procesos",
    href: "/automatizacion",
    description:
      "Automatizamos tareas repetitivas, formularios, notificaciones y flujos digitales para reducir carga operativa. Este servicio es útil si tu empresa pierde tiempo copiando datos, respondiendo lo mismo por WhatsApp, derivando solicitudes manualmente o revisando procesos sin seguimiento claro.",
  },
  {
    title: "Soporte TI",
    href: "/soporte-ti",
    description:
      "Entregamos soporte TI para empresas y pymes que necesitan asistencia tecnológica, configuración, mantención y orientación para mantener continuidad operativa. Ayudamos con requerimientos técnicos, correos, herramientas, equipos, sistemas y decisiones tecnológicas sin sobrecomplicar la operación.",
  },
  {
    title: "SEO y optimización web",
    href: "/servicios/seo-para-empresas-chile",
    description:
      "Optimizamos estructura, metadata, contenido, rendimiento y señales técnicas para mejorar la lectura del sitio por Google y usuarios reales. Es recomendable para empresas que ya tienen web, pero no logran posicionarse, explicar bien sus servicios o convertir visitas en contactos de calidad.",
  },
  {
    title: "Mantención web",
    href: "/servicios/mantencion-web-chile",
    description:
      "La mantención web permite cuidar estabilidad, seguridad, contenido, rendimiento y mejoras continuas después de publicar. Es útil para empresas que dependen de su sitio como canal comercial y necesitan soporte para cambios, ajustes técnicos o evolución gradual sin rehacer todo desde cero.",
  },
  {
    title: "Landing pages",
    href: "/servicios/landing-pages-para-empresas",
    description:
      "Diseñamos landing pages para campañas, servicios específicos o lanzamientos que requieren una ruta de conversión directa. Este tipo de página concentra el mensaje, reduce distracciones y guía al usuario hacia una acción concreta como cotizar, agendar o hablar por WhatsApp.",
  },
];

const serviceSelector = [
  "Si necesitas presencia digital y confianza comercial, lo más adecuado suele ser desarrollo web.",
  "Si quieres vender productos o mostrar catálogo, conviene evaluar una tienda online.",
  "Si necesitas ordenar procesos, registros, documentos o reportes, corresponde un sistema web.",
  "Si pierdes tiempo en tareas repetitivas, formularios o seguimiento manual, puede servir una automatización.",
  "Si necesitas ayuda tecnológica continua, configuración o mantención operativa, revisemos soporte TI.",
];

export default function ServiciosPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="servicios-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/servicios",
          title: "Servicios digitales para empresas y pymes",
          description: "Portafolio de servicios de desarrollo web, sistemas y soporte TI en Chile.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Servicios", path: "/servicios" },
          ],
        })}
      />
      <JsonLd
        id="servicios-list-schema"
        data={buildServicesListJsonLd({
          path: "/servicios",
          title: "Servicios principales ZYTERON",
          services: [
            {
              name: "Desarrollo web",
              description: "Páginas web profesionales para empresas y pymes.",
              path: "/desarrollo-web",
            },
            {
              name: "Tiendas online",
              description: "Tiendas online y catálogos digitales para venta en Chile.",
              path: "/tiendas-online",
            },
            {
              name: "Sistemas web a medida",
              description: "Sistemas internos y paneles administrativos personalizados.",
              path: "/sistemas-web",
            },
            {
              name: "Automatización empresarial",
              description: "Automatización de WhatsApp y tareas operativas de atención.",
              path: "/automatizacion",
            },
            {
              name: "Soporte TI",
              description: "Soporte TI para empresas y pymes en Santiago y Chile.",
              path: "/soporte-ti",
            },
            {
              name: "SEO técnico",
              description: "Optimización técnica, estructura on-page y crecimiento orgánico para empresas.",
              path: "/servicios/seo-para-empresas-chile",
            },
          ],
        })}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-5 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Servicios principales
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">Servicios claros para necesidades reales de negocio</h1>
          <p className="mx-auto max-w-3xl text-base text-slate-600 sm:text-lg">
            Trabajamos con empresas, pymes y emprendedores en Chile. Cada servicio se cotiza según alcance,
            funcionalidades y prioridad del proyecto.
          </p>
        </Container>
      </section>

      <section className="bg-white py-14">
        <Container className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Soluciones digitales en Chile</p>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Desarrollo web, sistemas, ecommerce, automatización y soporte para empresas
            </h2>
          </div>
          <div className="space-y-4">
            {introParagraphs.map((paragraph) => (
              <p key={paragraph} className="text-sm leading-relaxed text-slate-600 sm:text-base">
                {paragraph}
              </p>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-8">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Servicios SEO</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Páginas específicas por necesidad de búsqueda
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Si ya sabes qué necesita tu empresa, revisa el servicio específico y solicita una propuesta con contexto.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {seoServicePages.map((service) => (
              <Link key={service.path} href={service.path} className="card-premium p-5 transition-colors hover:border-blue-200">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">{service.primaryKeyword}</p>
                <h3 className="text-lg font-extrabold text-slate-900">{service.navLabel}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{service.metaDescription}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                  Ver servicio <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-6 lg:grid-cols-3">
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
            </article>
          ))}
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-8">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Detalle de servicios</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Qué resuelve cada servicio de Zyteron
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Estas líneas de trabajo pueden contratarse por separado o combinarse en una solución mayor según el problema que tu empresa necesita resolver.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {detailedServices.map((service) => (
              <Link key={service.href} href={service.href} className="card-premium p-6 transition-colors hover:border-blue-200">
                <h3 className="text-xl font-extrabold text-slate-900">{service.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{service.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                  Revisar servicio <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <article className="card-premium p-6">
            <h2 className="text-2xl font-extrabold text-slate-900">¿Qué servicio necesita tu empresa?</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Si todavía no tienes claro qué cotizar, podemos ayudarte a identificar la solución más conveniente según objetivo, presupuesto, urgencia y complejidad operativa.
            </p>
          </article>
          <div className="grid gap-3 md:grid-cols-2">
            {serviceSelector.map((item) => (
              <div key={item} className="card-premium flex items-start gap-3 p-4">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                <p className="text-sm leading-relaxed text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="rounded-2xl section-blue p-8 text-center text-white">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Conversemos sobre la solución que necesita tu empresa</h2>
          <p className="mx-auto mt-2 max-w-3xl text-sm text-blue-100 sm:text-base">
            Cuéntanos qué problema quieres resolver y te orientamos con una alternativa clara, profesional y escalable.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white font-bold text-blue-800 hover:bg-blue-50">
              <Link href="/paquetes">
                Solicitar cotización <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/planes">Ver planes</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/demos">Ver demos</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/casos-exito">Ver casos</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 bg-transparent text-white hover:bg-white/10 hover:text-white">
              <Link href="/contacto">Hablar con un especialista</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
