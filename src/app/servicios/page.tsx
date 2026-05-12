import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, MonitorSmartphone, Settings, ShieldCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { Button } from "@/components/ui/button";
import { buildServicesListJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Servicios digitales para empresas y pymes",
  description:
    "Servicios de ZYTERON en Chile: desarrollo web, sistemas internos, automatización, soporte TI y soluciones tecnológicas para negocios.",
  path: "/servicios",
  keywords: [
    "páginas web para empresas",
    "desarrollo de sistemas web",
    "soporte ti para empresas",
    "automatización para empresas",
    "tiendas online chile",
  ],
});

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
              path: "/desarrollo-web-santiago",
            },
            {
              name: "Tiendas online",
              description: "Tiendas online y catálogos digitales para venta en Chile.",
              path: "/tiendas-online-chile",
            },
            {
              name: "Sistemas web a medida",
              description: "Sistemas internos y paneles administrativos personalizados.",
              path: "/sistemas-web-a-medida",
            },
            {
              name: "Automatización empresarial",
              description: "Automatización de WhatsApp y tareas operativas de atención.",
              path: "/automatizacion-whatsapp-empresas",
            },
            {
              name: "Soporte TI",
              description: "Soporte TI para empresas y pymes en Santiago y Chile.",
              path: "/soporte-ti-pymes-santiago",
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
        <Container className="rounded-2xl section-blue p-8 text-center text-white">
          <h2 className="text-2xl font-extrabold sm:text-3xl">¿Qué servicio necesitas cotizar?</h2>
          <p className="mx-auto mt-2 max-w-3xl text-sm text-blue-100 sm:text-base">
            Definimos contigo alcance, etapas, plazos y condiciones para entregar una propuesta seria y ejecutable.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white font-bold text-blue-800 hover:bg-blue-50">
              <Link href="/paquetes">
                Solicitar cotización <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 text-white hover:bg-white/10 hover:text-white">
              <Link href="/planes">Ver planes</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 text-white hover:bg-white/10 hover:text-white">
              <Link href="/demos">Ver demos</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 text-white hover:bg-white/10 hover:text-white">
              <Link href="/contacto">Hablar con un especialista</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
