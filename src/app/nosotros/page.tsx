import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Eye,
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

const teamMembers = [
  {
    name: "Eduardo Ávila",
    role: "Fundador y líder de proyectos de Zyteron",
    photo: "/equipo/eduardo-avila/perfil-web.png",
    bio:
      "Con experiencia en tecnología, análisis de procesos, liderazgo operativo y desarrollo de soluciones digitales para empresas, lidera Zyteron con una visión práctica: crear herramientas claras, profesionales y útiles para negocios reales.",
    contact: "eduardo.avila@zyteron.cl",
  },
  {
    name: "Víctor",
    role: "Desarrollo y soporte TI",
    photo: "/equipo/victor/perfil-web.png",
    bio: "Profesional enfocado en desarrollo web, soporte técnico, mantenimiento de sistemas e implementación TI.",
  },
  {
    name: "Leonel",
    role: "Análisis, desarrollo y calidad",
    photo: "/equipo/leonel/perfil-web.png",
    bio: "Profesional enfocado en análisis, desarrollo de aplicaciones, integración de sistemas, automatización y control de calidad.",
  },
];

export default function NosotrosPage() {
  const [leader, ...team] = teamMembers;

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
                <Link href="/servicios">Ver servicios</Link>
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

      <section className="section-alt py-16">
        <Container className="grid gap-6 lg:grid-cols-3">
          <article className="card-premium p-6 lg:col-span-1">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Trayectoria</p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Más de 7 años ligados al mundo tecnológico</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Contamos con más de 7 años de experiencia ligada al mundo tecnológico, desarrollo de soluciones digitales, análisis de procesos, soporte operativo y creación de herramientas para empresas. Esta experiencia nos permite entender no solo el diseño de una web, sino también la lógica real detrás de un negocio: operación, clientes, ventas, administración, control, reportes y crecimiento.
            </p>
          </article>

          <article className="card-premium p-6">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <Target className="h-4 w-4" /> Misión
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Soluciones digitales claras y funcionales</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Nuestra misión es entregar soluciones digitales claras, funcionales y profesionales que ayuden a empresas y pymes a mejorar su presencia online, ordenar sus procesos y aprovechar la tecnología como una herramienta real de crecimiento.
            </p>
          </article>

          <article className="card-premium p-6">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <Eye className="h-4 w-4" /> Visión
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-900">Tecnología confiable, moderna y accesible</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Nuestra visión es convertirnos en una empresa tecnológica reconocida en Chile por crear soluciones digitales confiables, modernas y accesibles para negocios que necesitan avanzar, profesionalizarse y competir mejor en el mundo digital.
            </p>
          </article>
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

      <section className="bg-white py-16">
        <Container className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Valores</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Principios que guían cada proyecto</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {values.map((value) => (
              <article key={value.title} className="card-premium p-5">
                <div className="mb-3 inline-flex rounded-xl bg-blue-50 p-2 text-blue-700">{value.icon}</div>
                <h3 className="text-base font-extrabold text-slate-900">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{value.description}</p>
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

      <section className="bg-white py-20">
        <Container className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Equipo</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Quién está detrás de Zyteron</h2>
          </div>

          <article className="card-premium mx-auto max-w-5xl p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-[0.85fr_1.15fr] md:items-start">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <Image
                  src={leader.photo}
                  alt={`Foto profesional de ${leader.name}, ${leader.role}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 45vw"
                  quality={90}
                  placeholder="blur"
                  blurDataURL={softBlueBlurDataUrl}
                  className="object-cover object-[center_20%]"
                  priority
                />
              </div>
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Representante de Zyteron</p>
                <h3 className="text-3xl font-extrabold text-slate-900">{leader.name}</h3>
                <p className="text-sm font-semibold text-slate-700">{leader.role}</p>
                <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{leader.bio}</p>
                <a href={`mailto:${leader.contact}`} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-900">
                  <Mail className="h-4 w-4" />
                  {leader.contact}
                </a>
              </div>
            </div>
          </article>

          <div className="grid gap-4 md:grid-cols-2">
            {team.map((member) => (
              <article key={member.name} className="card-premium p-5">
                <div className="grid gap-4 sm:grid-cols-[110px_1fr] sm:items-start">
                  <div className="relative mx-auto aspect-[4/5] w-full max-w-[110px] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 sm:mx-0">
                    <Image
                      src={member.photo}
                      alt={`Foto de ${member.name}, ${member.role}`}
                      fill
                      sizes="110px"
                      quality={80}
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL={softBlueBlurDataUrl}
                      className="object-cover object-[center_20%]"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600">{member.role}</p>
                    <h3 className="text-xl font-extrabold text-slate-900">{member.name}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{member.bio}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="rounded-2xl section-blue p-8 text-center text-white md:p-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Conversemos sobre tu proyecto</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-blue-100 sm:text-base">
            Cuéntanos qué necesita tu empresa y te ayudamos a definir una solución digital clara, profesional y escalable.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white font-bold text-blue-800 hover:bg-blue-50">
              <Link href="/contacto">Solicitar asesoría</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 text-white hover:bg-white/10 hover:text-white">
              <Link href="/servicios">Ver servicios</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 text-white hover:bg-white/10 hover:text-white">
              <Link href="/blog">Leer blog</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
