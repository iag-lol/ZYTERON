import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  CheckCircle2,
  Building2,
  Cpu,
  MonitorSmartphone,
  ShoppingCart,
  LayoutDashboard,
  Zap,
  LifeBuoy,
  TrendingUp,
  Users,
  Workflow,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { softBlueBlurDataUrl } from "@/lib/image-placeholders";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = createPageMetadata({
  title: "Quiénes somos | Zyteron SpA - Desarrollo web y soluciones digitales en Chile",
  description:
    "Conoce Zyteron SpA, empresa chilena de desarrollo web, sistemas digitales, automatización y soporte tecnológico para pymes, emprendedores y negocios en Chile.",
  path: "/quienes-somos",
});

const WHATSAPP_ADVISORY_URL = `${siteConfig.social.whatsapp}?text=${encodeURIComponent(
  "Hola, vengo de la página de Zyteron y necesito asesoría para un proyecto digital",
)}`;

const leaderExpertise = [
  { icon: Cpu, label: "Tecnología" },
  { icon: Workflow, label: "Análisis de procesos" },
  { icon: Users, label: "Liderazgo operativo" },
  { icon: MonitorSmartphone, label: "Soluciones digitales" },
  { icon: Building2, label: "Negocios reales" },
];

const teamMembers = [
  {
    name: "Eduardo Ávila",
    role: "Fundador y líder de proyectos",
    photo: "/equipo/eduardo-avila/perfil-web.png",
    bio: "Con experiencia en tecnología, análisis de procesos, liderazgo operativo y desarrollo de soluciones digitales para empresas, lidera Zyteron con una visión práctica: crear herramientas claras, profesionales y útiles para negocios reales.",
    // NAP unificado: usamos el correo oficial centralizado en siteConfig en vez de un correo personal.
    contact: siteConfig.contact.email,
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

const services = [
  {
    title: "Desarrollo web",
    desc: "Páginas web profesionales, landing pages comerciales y sitios corporativos optimizados para dar confianza y captar clientes.",
    icon: <MonitorSmartphone className="h-6 w-6" />,
  },
  {
    title: "Tiendas online y e-commerce",
    desc: "Catálogos con carrito de compra, integración de medios de pago y conexión a WhatsApp como canal directo de ventas.",
    icon: <ShoppingCart className="h-6 w-6" />,
  },
  {
    title: "Sistemas web personalizados",
    desc: "Paneles administrativos, portales para clientes, gestión de registros y plataformas a medida para procesos internos.",
    icon: <LayoutDashboard className="h-6 w-6" />,
  },
  {
    title: "Automatización de procesos",
    desc: "Notificaciones automáticas y formularios conectados a correo o WhatsApp para agilizar cotizaciones y comunicación.",
    icon: <Zap className="h-6 w-6" />,
  },
  {
    title: "Soporte TI y acompañamiento",
    desc: "Mantenimiento web, configuración de correos corporativos y acompañamiento técnico continuo para que nunca estés solo.",
    icon: <LifeBuoy className="h-6 w-6" />,
  },
  {
    title: "Marketing digital básico",
    desc: "Optimización SEO, configuración de Google Business y estructuración de contenido pensado en conversión comercial.",
    icon: <TrendingUp className="h-6 w-6" />,
  },
];

const workSteps = [
  { title: "Escuchamos", desc: "Entendemos la necesidad real de tu negocio y lo que buscas lograr." },
  { title: "Ordenamos", desc: "Estructuramos el requerimiento para encontrar la solución más eficiente." },
  { title: "Proponemos", desc: "Presentamos un plan de trabajo claro y sin tecnicismos innecesarios." },
  { title: "Cotizamos", desc: "Entregamos valores con un alcance definido para evitar sorpresas." },
  { title: "Desarrollamos", desc: "Construimos tu proyecto con herramientas modernas y enfoque profesional." },
  { title: "Revisamos", desc: "Ajustamos detalles en conjunto antes del lanzamiento final." },
  { title: "Entregamos", desc: "Publicamos el proyecto y te entregamos los accesos y credenciales." },
  { title: "Acompañamos", desc: "Ofrecemos soporte técnico y mejoras según el servicio contratado." },
];

const reasons = [
  "Atención directa y humana desde el primer mensaje.",
  "Soluciones pensadas para la realidad y el presupuesto de las pymes chilenas.",
  "Claridad total en precios, alcance y condiciones comerciales.",
  "Diseños orientados a la conversión y la confianza del cliente final.",
  "Acompañamiento técnico posterior al lanzamiento.",
  "Comunicación formal, ordenada y respetuosa en todo momento.",
];

export default function QuienesSomosPage() {
  const [leader, ...team] = teamMembers;

  return (
    <main className="bg-white">
      <JsonLd
        id="quienes-somos-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/quienes-somos",
          title: "Quiénes somos | Zyteron SpA",
          description:
            "Conoce Zyteron SpA, empresa chilena de desarrollo web, sistemas digitales, automatización y soporte tecnológico.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Quiénes somos", path: "/quienes-somos" },
          ],
        })}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50 py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-slate-50 to-white" />
        <Container className="relative space-y-6 text-center">
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
            <Sparkles className="h-4 w-4" />
            Empresa chilena de tecnología
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Soluciones digitales profesionales para empresas, pymes y emprendedores en Chile.
          </h1>

          <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-600 sm:text-lg">
            No solo creamos páginas web. Desarrollamos herramientas, tiendas y sistemas pensados para que tu negocio
            tenga una presencia formal, capte clientes y automatice sus procesos de venta.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/contacto">Solicitar cotización</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href={WHATSAPP_ADVISORY_URL} target="_blank" rel="noopener">
                <MessageCircle className="mr-2 h-4 w-4" />
                Hablar por WhatsApp
              </Link>
            </Button>
          </div>
        </Container>
      </section>

      {/* Quiénes Somos */}
      <section className="py-16">
        <Container className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Quiénes somos</h2>
            <div className="space-y-4 text-base leading-relaxed text-slate-600">
              <p>
                Somos <strong>Zyteron SpA</strong>, una empresa tecnológica chilena dedicada al desarrollo web,
                creación de sistemas digitales, automatización operativa y soporte tecnológico.
              </p>
              <p>
                Nacimos para ayudar a emprendedores, profesionales independientes y pymes a profesionalizar su presencia
                en internet y ordenar sus procesos operativos. Entendemos que una página web o un sistema interno no es
                un gasto, sino una herramienta comercial que debe generar confianza, facilitar ventas y simplificar el
                trabajo diario.
              </p>
              <p>
                Por eso, nuestro enfoque es 100% real y práctico: hablamos claro, cotizamos con alcance definido y
                acompañamos técnica y formalmente cada proyecto desde la idea inicial hasta su puesta en marcha.
              </p>
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
            <h3 className="mb-4 text-xl font-extrabold text-slate-900">Nuestro compromiso</h3>
            <p className="text-sm leading-relaxed text-slate-600">
              Hablamos claro y cumplimos lo que prometemos: soluciones útiles, responsables y funcionales. Cuidamos los
              detalles y respetamos los tiempos acordados porque sabemos que detrás de cada proyecto hay un negocio que
              busca crecer, verse mejor y vender más.
            </p>
          </div>
        </Container>
      </section>

      {/* Equipo */}
      <section className="bg-slate-50 py-20 text-slate-900">
        <Container className="space-y-16">
          <div className="space-y-4 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Nuestro Equipo</p>
            <h2 className="text-3xl font-extrabold sm:text-4xl text-slate-900">Personas detrás del código</h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              Unimos diseño, tecnología y estrategia operativa para hacer crecer tu empresa.
            </p>
          </div>

          {/* Tarjeta Líder (Destacada) */}
          <article className="group relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md transition-shadow hover:shadow-xl">
            <div className="grid md:grid-cols-[0.8fr_1.2fr]">
              <div className="relative w-full overflow-hidden bg-slate-100 aspect-[4/5] sm:aspect-auto">
                <Image
                  src={leader.photo}
                  alt={`Foto profesional de ${leader.name}, ${leader.role}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  quality={95}
                  placeholder="blur"
                  blurDataURL={softBlueBlurDataUrl}
                  className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  priority
                />
              </div>

              <div className="relative z-20 flex flex-col justify-center p-8 md:p-12">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Representante</p>
                <h3 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">{leader.name}</h3>
                <p className="mt-1 text-base font-semibold text-blue-700">{leader.role}</p>

                <p className="mt-6 leading-relaxed text-slate-600">{leader.bio}</p>

                <ul className="mt-8 flex flex-wrap gap-2">
                  {leaderExpertise.map(({ icon: Icon, label }) => (
                    <li
                      key={label}
                      className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Icon className="h-4 w-4 text-blue-600" aria-hidden />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          {/* Tarjetas Resto del Equipo */}
          <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
            {team.map((member) => (
              <article
                key={member.name}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                  <Image
                    src={member.photo}
                    alt={`Foto de ${member.name}, ${member.role}`}
                    fill
                    sizes="(max-width: 640px) 100vw, 50vw"
                    quality={85}
                    loading="lazy"
                    placeholder="blur"
                    blurDataURL={softBlueBlurDataUrl}
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600">{member.role}</p>
                  <h3 className="mt-1 text-2xl font-extrabold text-slate-900">{member.name}</h3>
                  <p className="mt-4 leading-relaxed text-slate-600">{member.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* Qué hacemos */}
      <section className="py-20">
        <Container className="space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Qué hacemos en Zyteron</h2>
            <p className="mt-4 text-lg text-slate-600">Desarrollo web y soluciones para negocios reales.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article
                key={service.title}
                className="rounded-3xl border border-slate-200 bg-white p-8 transition-shadow hover:shadow-lg"
              >
                <div className="mb-6 inline-flex rounded-xl bg-blue-50 p-3 text-blue-700">
                  {service.icon}
                </div>
                <h3 className="mb-3 text-xl font-extrabold text-slate-900">{service.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{service.desc}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {/* Cómo trabajamos */}
      <section className="bg-slate-50 py-20">
        <Container className="space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Cómo trabajamos</h2>
            <p className="mt-4 text-lg text-slate-600">Procesos claros desde la cotización hasta la entrega.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {workSteps.map((step, idx) => (
              <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="text-xs font-extrabold text-blue-600">PASO {idx + 1}</span>
                <h3 className="mt-2 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Por qué elegirnos */}
      <section className="py-20">
        <Container className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Por qué elegir Zyteron</h2>
            <p className="text-base text-slate-600">
              No somos una agencia más, somos tu aliado tecnológico.
            </p>
            <ul className="space-y-4">
              {reasons.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-3 text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-900 p-8 text-white sm:p-12">
            <h3 className="text-2xl font-extrabold text-white">Respaldo y Formalidad</h3>
            <ul className="mt-8 space-y-4 text-slate-300">
              <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-blue-400" /> Empresa formalmente constituida (ZYTERON SpA).</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-blue-400" /> Facturación electrónica en todos nuestros servicios.</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-blue-400" /> Atención oficial por correo corporativo.</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-blue-400" /> Canal de comunicación directa vía WhatsApp Business.</li>
              <li className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-blue-400" /> Propuestas y cotizaciones formales por escrito.</li>
            </ul>
          </div>
        </Container>
      </section>

      {/* CTA Final */}
      <section className="bg-white pb-20">
        <Container className="rounded-3xl bg-blue-50 border border-blue-100 p-10 text-center sm:p-16">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Hablemos de tu proyecto</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Cuéntanos qué necesitas y te ayudaremos a encontrar una solución clara, profesional y acorde a la realidad de tu negocio.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-blue-700 font-bold text-white hover:bg-blue-800 shadow-xl shadow-blue-700/20">
              <Link href="/contacto">Solicitar cotización</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50">
              <Link href={WHATSAPP_ADVISORY_URL} target="_blank" rel="noopener">
                <MessageCircle className="mr-2 h-4 w-4" /> Hablar por WhatsApp
              </Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
