import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Handshake,
  Lightbulb,
  Mail,
  MonitorSmartphone,
  SearchCheck,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Target,
  Users,
  Workflow,
  Wrench,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { softBlueBlurDataUrl } from "@/lib/image-placeholders";

export const metadata: Metadata = createPageMetadata({
  title: "Nosotros, Desarrollo Web y Soluciones Digitales en Chile",
  description:
    "Conoce Zyteron, empresa chilena enfocada en desarrollo web, sistemas digitales, automatización y soluciones tecnológicas para empresas y pymes.",
  path: "/nosotros",
});

const workSteps = [
  {
    title: "Diagnóstico inicial",
    description:
      "Primero entendemos el negocio, sus objetivos, problemas actuales, clientes y necesidades reales.",
  },
  {
    title: "Propuesta clara",
    description:
      "Luego definimos una solución concreta, con estructura, funcionalidades, tiempos estimados y alcance del proyecto.",
  },
  {
    title: "Diseño y desarrollo",
    description:
      "Creamos una solución visualmente profesional, funcional y adaptada al rubro del cliente.",
  },
  {
    title: "Revisión y mejoras",
    description:
      "Probamos, revisamos y ajustamos cada parte para que el resultado sea claro, rápido y fácil de usar.",
  },
  {
    title: "Entrega y acompañamiento",
    description:
      "Entregamos el proyecto y orientamos al cliente para que pueda usarlo correctamente. También podemos apoyar con mantención, mejoras y nuevas funcionalidades.",
  },
];

const services = [
  { title: "Páginas web corporativas", icon: <MonitorSmartphone className="h-5 w-5" />, href: "/desarrollo-web" },
  { title: "Landing pages", icon: <Target className="h-5 w-5" />, href: "/servicios/landing-pages-para-empresas" },
  { title: "Tiendas online", icon: <ShoppingCart className="h-5 w-5" />, href: "/tiendas-online" },
  { title: "Sistemas web administrativos", icon: <Workflow className="h-5 w-5" />, href: "/sistemas-web" },
  { title: "Paneles de gestión", icon: <Settings className="h-5 w-5" />, href: "/sistemas-web" },
  { title: "Automatización de procesos", icon: <Workflow className="h-5 w-5" />, href: "/automatizacion" },
  { title: "Formularios, correos y WhatsApp", icon: <Mail className="h-5 w-5" />, href: "/automatizacion" },
  { title: "Soporte TI para empresas", icon: <Wrench className="h-5 w-5" />, href: "/soporte-ti" },
  { title: "Optimización SEO básica y técnica", icon: <SearchCheck className="h-5 w-5" />, href: "/servicios/seo-para-empresas-chile" },
  { title: "Asesoría digital para pymes", icon: <Users className="h-5 w-5" />, href: "/paginas-web-para-pymes" },
];

const values = [
  {
    title: "Claridad",
    icon: <Compass className="h-5 w-5" />,
    description: "Explicamos cada proyecto de forma simple, directa y transparente.",
  },
  {
    title: "Responsabilidad",
    icon: <ShieldCheck className="h-5 w-5" />,
    description: "Cuidamos los detalles, los tiempos y la calidad de cada entrega.",
  },
  {
    title: "Profesionalismo",
    icon: <CheckCircle2 className="h-5 w-5" />,
    description: "Trabajamos con estructura, diseño limpio y soluciones pensadas para empresas reales.",
  },
  {
    title: "Innovación práctica",
    icon: <Lightbulb className="h-5 w-5" />,
    description: "No aplicamos tecnología porque sí. Buscamos soluciones útiles que generen valor.",
  },
  {
    title: "Compromiso",
    icon: <Handshake className="h-5 w-5" />,
    description: "Acompañamos cada proyecto con seriedad, comunicación y foco en el resultado.",
  },
  {
    title: "Confianza",
    icon: <ShieldCheck className="h-5 w-5" />,
    description: "Construimos relaciones claras, honestas y orientadas al largo plazo.",
  },
  {
    title: "Mejora continua",
    icon: <Workflow className="h-5 w-5" />,
    description: "Buscamos optimizar cada solución para que pueda crecer junto al negocio.",
  },
];

export default function NosotrosPage() {

  return (
    <main className="bg-white">
      <JsonLd
        id="nosotros-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/nosotros",
          title: "Nosotros | Zyteron, desarrollo web y soluciones digitales en Chile",
          description: "Presentación de Zyteron, enfoque, trayectoria y forma de trabajo.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Nosotros", path: "/nosotros" },
          ],
        })}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500">
              <Link href="/" className="hover:text-blue-700">
                Inicio
              </Link>
              <span className="mx-2 text-slate-300">/</span>
              <span className="text-slate-700">Nosotros</span>
            </nav>
            <div className="badge-blue w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Empresa chilena de tecnología
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Somos Zyteron, una empresa chilena enfocada en desarrollo web, software y soluciones digitales para empresas
            </h1>
            <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
              En Zyteron ayudamos a empresas, pymes y emprendedores a transformar sus procesos, servicios e ideas en soluciones digitales profesionales. Creamos páginas web, tiendas online, sistemas internos, plataformas administrativas, automatizaciones y herramientas tecnológicas pensadas para mejorar la presencia digital, ordenar la operación y facilitar el crecimiento de cada negocio.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href="/contacto">
                  Solicitar asesoría <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                <Link href="/quienes-somos">Conoce al equipo</Link>
              </Button>
            </div>
          </div>

          <div className="card-premium p-6">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Enfoque</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
              Tecnología pensada para negocios que necesitan claridad y ejecución
            </h2>
            <div className="mt-5 space-y-3">
              {[
                "Desarrollo personalizado según alcance real.",
                "Diseño responsive y experiencia de usuario limpia.",
                "Enfoque comercial, técnico y operativo.",
                "Acompañamiento y comunicación clara durante el proyecto.",
                "Soluciones escalables para crecer por etapas.",
              ].map((point) => (
                <div key={point} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
              Información comercial y tributaria disponible para clientes y procesos contractuales. No publicamos datos incompletos ni antecedentes no verificados en esta página.
            </p>
          </div>
        </Container>
      </section>



      <section className="bg-white py-16">
        <Container className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Cómo trabajamos</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Proceso ordenado desde el diagnóstico hasta la entrega</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {workSteps.map((step, index) => (
              <article key={step.title} className="card-premium border-t-4 border-t-blue-200 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Paso {index + 1}</p>
                <h3 className="mt-1 text-base font-extrabold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Qué hacemos</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Servicios digitales para empresas, pymes y emprendedores</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {services.map((service) => (
              <Link key={service.title} href={service.href} className="card-premium p-5 transition-colors hover:border-blue-200">
                <div className="mb-3 inline-flex rounded-xl bg-blue-50 p-2 text-blue-700">{service.icon}</div>
                <h3 className="text-sm font-extrabold text-slate-900">{service.title}</h3>
              </Link>
            ))}
          </div>
        </Container>
      </section>

      <section className="relative overflow-hidden bg-slate-50 py-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-white" />
        <Container className="relative space-y-16">
          <div className="space-y-4 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Nuestros Valores</p>
            <h2 className="text-3xl font-extrabold sm:text-5xl text-slate-900">Principios que guían cada proyecto</h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              No solo escribimos código, construimos soluciones basadas en la confianza y el profesionalismo.
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {values.map((value, index) => (
              <article 
                key={value.title} 
                className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 transition-all hover:-translate-y-2 hover:shadow-xl hover:shadow-blue-900/5 ${index === values.length - 1 ? 'xl:col-start-2' : ''}`}
              >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-50 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:bg-blue-100" />
                <div className="relative z-10">
                  <div className="mb-6 inline-flex rounded-2xl bg-blue-50 p-4 text-blue-700 transition-all duration-300 group-hover:scale-110 group-hover:bg-blue-700 group-hover:text-white">
                    {value.icon}
                  </div>
                  <h3 className="mb-3 text-xl font-extrabold text-slate-900 transition-colors group-hover:text-blue-700">{value.title}</h3>
                  <p className="leading-relaxed text-slate-600">{value.description}</p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Confianza</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Una empresa pensada para negocios que quieren crecer con tecnología
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
              Sabemos que una web o sistema no es solo diseño. Es presentación, confianza, ventas, control, administración y experiencia para el cliente. Por eso en Zyteron trabajamos cada proyecto con enfoque comercial, técnico y operativo.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Desarrollo personalizado",
              "Diseño responsive",
              "Enfoque comercial",
              "Acompañamiento",
              "Soluciones escalables",
              "Comunicación clara",
            ].map((item) => (
              <div key={item} className="card-premium flex items-center gap-3 p-4">
                <ShieldCheck className="h-5 w-5 text-blue-700" />
                <p className="text-sm font-semibold text-slate-700">{item}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16" aria-labelledby="cta-segmentacion">
        <Container className="space-y-10">
          <div className="text-center space-y-4">
            <h2 id="cta-segmentacion" className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Soluciones a la medida de tu negocio
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Entendemos que un emprendimiento no necesita lo mismo que una gran corporación. Elige tu perfil para descubrir cómo impulsamos tu crecimiento.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* CTA para PYMEs */}
            <article className="group relative overflow-hidden rounded-3xl border border-blue-100 bg-blue-50/50 p-8 sm:p-10 transition-all hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5">
              <div className="relative z-10 flex flex-col h-full">
                <span className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-700 w-fit">
                  Para PYMEs y Emprendedores
                </span>
                <h3 className="mb-4 text-2xl font-extrabold text-slate-900">
                  Desarrollo Web y Tiendas Online Rápidas
                </h3>
                <p className="mb-8 leading-relaxed text-slate-600 flex-1">
                  Paquetes de diseño web accesibles, tiendas e-commerce optimizadas para SEO y herramientas de gestión básicas para que empieces a vender y digitalizarte sin complicaciones.
                </p>
                <div className="flex flex-wrap gap-3 mt-auto">
                  <Button asChild size="lg" className="bg-blue-700 font-bold text-white hover:bg-blue-800">
                    <Link href="/paginas-web-para-pymes" title="Ver páginas web para pymes">
                      Ver planes para PYMEs
                    </Link>
                  </Button>
                </div>
              </div>
            </article>

            {/* CTA para Grandes Empresas */}
            <article className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 p-8 sm:p-10 text-white transition-all hover:shadow-2xl hover:shadow-slate-900/20">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-blue-900/40 via-transparent to-transparent" />
              <div className="relative z-10 flex flex-col h-full">
                <span className="mb-4 inline-block rounded-full bg-slate-800 border border-slate-700 px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-400 w-fit">
                  Para Empresas Corporativas
                </span>
                <h3 className="mb-4 text-2xl font-extrabold text-white">
                  Sistemas a Medida y Automatización
                </h3>
                <p className="mb-8 leading-relaxed text-slate-300 flex-1">
                  Consultoría TI, desarrollo de software administrativo, integraciones de sistemas, automatización de procesos operativos e infraestructura cloud para alta demanda.
                </p>
                <div className="flex flex-wrap gap-3 mt-auto">
                  <Button asChild size="lg" className="bg-white font-bold text-slate-900 hover:bg-slate-100">
                    <Link href="/contacto" title="Agendar consultoría para desarrollo de software">
                      Agendar consultoría técnica
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800 hover:text-white">
                    <Link href="/sistemas-web" title="Sistemas web para empresas">
                      Ver sistemas a medida
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          </div>
        </Container>
      </section>
    </main>
  );
}
