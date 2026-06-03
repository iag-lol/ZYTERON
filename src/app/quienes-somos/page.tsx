import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Cpu,
  Eye,
  Mail,
  MonitorSmartphone,
  Target,
  Users,
  Workflow,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { softBlueBlurDataUrl } from "@/lib/image-placeholders";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = createPageMetadata({
  title: "Quiénes Somos | El equipo detrás de Zyteron",
  description:
    "Conoce al equipo de Zyteron, nuestra trayectoria, misión y visión como empresa chilena especializada en soluciones digitales y tecnología.",
  path: "/quienes-somos",
});

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

export default function QuienesSomosPage() {
  const [leader, ...team] = teamMembers;

  return (
    <main className="bg-slate-50">
      <JsonLd
        id="quienes-somos-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/quienes-somos",
          title: "Quiénes Somos | El equipo detrás de Zyteron",
          description: "Conoce al equipo, la historia y la trayectoria de Zyteron.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Quiénes Somos", path: "/quienes-somos" },
          ],
        })}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-white py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white" />
        <Container className="relative space-y-6 text-center">
          <nav aria-label="Breadcrumb" className="mx-auto flex w-fit items-center text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-blue-700">Inicio</Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-700">Quiénes Somos</span>
          </nav>
          
          <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-sm font-semibold text-blue-700">
            <Sparkles className="h-4 w-4" />
            El lado humano de la tecnología
          </div>
          
          <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Personas construyendo soluciones digitales para personas
          </h1>
          
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Creemos que detrás de todo gran código, hay un equipo humano comprometido. Conoce a los profesionales que día a día transforman ideas complejas en plataformas digitales que funcionan.
          </p>
        </Container>
      </section>

      {/* Trayectoria, Misión y Visión */}
      <section className="py-16">
        <Container className="grid gap-6 lg:grid-cols-3">
          <article className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 transition-all hover:border-blue-200 hover:shadow-xl lg:col-span-1">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-50 opacity-50 blur-2xl transition-all group-hover:scale-150 group-hover:bg-blue-100" />
            <p className="relative text-xs font-bold uppercase tracking-widest text-blue-600">Trayectoria</p>
            <h2 className="relative mt-2 text-2xl font-extrabold text-slate-900">Más de 7 años ligados al mundo tecnológico</h2>
            <p className="relative mt-4 text-sm leading-relaxed text-slate-600">
              Contamos con amplia experiencia en desarrollo de soluciones digitales, análisis de procesos y soporte operativo. Entendemos no solo el diseño, sino la lógica real detrás de un negocio: operación, ventas, control y crecimiento.
            </p>
          </article>

          <article className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 transition-all hover:border-blue-200 hover:shadow-xl">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-50 opacity-50 blur-2xl transition-all group-hover:scale-150 group-hover:bg-indigo-100" />
            <p className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <Target className="h-4 w-4" /> Misión
            </p>
            <h2 className="relative mt-2 text-2xl font-extrabold text-slate-900">Soluciones claras y funcionales</h2>
            <p className="relative mt-4 text-sm leading-relaxed text-slate-600">
              Entregar herramientas profesionales que ayuden a empresas y pymes a mejorar su presencia online, ordenar sus procesos y aprovechar la tecnología como motor de crecimiento.
            </p>
          </article>

          <article className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-8 transition-all hover:border-blue-200 hover:shadow-xl">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-sky-50 opacity-50 blur-2xl transition-all group-hover:scale-150 group-hover:bg-sky-100" />
            <p className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600">
              <Eye className="h-4 w-4" /> Visión
            </p>
            <h2 className="relative mt-2 text-2xl font-extrabold text-slate-900">Tecnología accesible</h2>
            <p className="relative mt-4 text-sm leading-relaxed text-slate-600">
              Convertirnos en referentes en Chile por crear ecosistemas digitales confiables y modernos para negocios que necesitan profesionalizarse y competir al más alto nivel.
            </p>
          </article>
        </Container>
      </section>

      {/* Equipo */}
      <section className="bg-slate-50 py-20 text-slate-900">
        <Container className="space-y-16">
          <div className="space-y-4 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Nuestro Equipo</p>
            <h2 className="text-3xl font-extrabold sm:text-5xl text-slate-900">Conoce a los expertos</h2>
            <p className="mx-auto max-w-2xl text-slate-600">
              Unimos diseño, código y estrategia operativa para hacer crecer tu empresa.
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

                <Link
                  href="/contacto"
                  className="mt-10 inline-flex w-fit items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white transition-all hover:bg-blue-800 hover:shadow-lg hover:shadow-blue-500/25"
                >
                  <Mail className="h-5 w-5" aria-hidden />
                  Contactar directamente
                </Link>
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

      {/* CTA Section */}
      <section className="bg-white py-20">
        <Container className="rounded-3xl bg-blue-50 p-10 text-center border border-blue-100 sm:p-16">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">¿Listo para transformar tu negocio?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Nuestro equipo está listo para analizar tu proyecto, definir los requerimientos y ofrecerte una solución tecnológica superior.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-blue-700 text-lg font-bold text-white hover:bg-blue-800 shadow-xl shadow-blue-700/20">
              <Link href="/contacto">Hablemos hoy <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 text-lg text-slate-800 hover:bg-slate-100">
              <Link href="/nosotros">Conoce la empresa</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
