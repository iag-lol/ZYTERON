import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Target, Code2, TrendingUp, Shield, Zap, Globe, Users, Award, ArrowRight } from "lucide-react";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Agencia de Diseño Web en Chile | Nosotros | Zyteron",
  description:
    "Conoce a Zyteron, agencia chilena de diseño web y desarrollo web para empresas con foco en SEO técnico y conversión.",
  path: "/nosotros",
  keywords: ["agencia diseño web chile", "equipo desarrollo web chile", "empresa web santiago"],
});

const values = [
  { icon: <Target className="h-6 w-6" />, title: "Claridad comercial", body: "Traducimos lo técnico al lenguaje de negocio. Cada decisión tiene un impacto claro en tu ROI.", iconBg: "bg-blue-50", iconColor: "text-blue-700" },
  { icon: <Code2 className="h-6 w-6" />, title: "SEO técnico real", body: "Metadatos, schema, performance y contenidos alineados a intención de búsqueda real. Sin trucos.", iconBg: "bg-violet-50", iconColor: "text-violet-700" },
  { icon: <Shield className="h-6 w-6" />, title: "Entrega confiable", body: "Procesos, QA y monitoreo en cada proyecto. Soporte remoto y presencial según tu plan.", iconBg: "bg-emerald-50", iconColor: "text-emerald-700" },
  { icon: <TrendingUp className="h-6 w-6" />, title: "Escalabilidad real", body: "Arquitectura preparada para agregar blog, ciudades, productos y módulos sin romper lo existente.", iconBg: "bg-amber-50", iconColor: "text-amber-700" },
  { icon: <Zap className="h-6 w-6" />, title: "Velocidad de respuesta", body: "Menos de 24h hábiles para propuestas y consultas. Soporte urgente disponible según plan.", iconBg: "bg-rose-50", iconColor: "text-rose-700" },
  { icon: <Globe className="h-6 w-6" />, title: "Foco en Chile", body: "Conocemos el mercado local: dominios .cl, proveedores nacionales, SEO para Chile y tributación.", iconBg: "bg-cyan-50", iconColor: "text-cyan-700" },
];

const stats = [
  { value: "50+", label: "Proyectos entregados" },
  { value: "8+", label: "Años en el mercado" },
  { value: "99%", label: "Tasa de satisfacción" },
  { value: "< 24h", label: "Tiempo de respuesta" },
];

const cities = ["Santiago", "Valparaíso", "Concepción", "Antofagasta", "La Serena", "Temuco", "Iquique", "Rancagua", "Puerto Montt", "Arica"];

const teamMembers = [
  {
    name: "Eduardo Ávila",
    role: "Fundador y líder de proyectos",
    photo: "/public/equipo/eduardo-avila/perfil.jpg",
    bio: "Trabajo ayudando a negocios, emprendedores y pymes con soluciones tecnológicas claras, prácticas y profesionales.",
    focus:
      "Desde desarrollo web hasta soporte TI, redes y soluciones digitales, mi enfoque es entregar un servicio cercano, ordenado y útil para cada cliente.",
    contact: "eduardo.avila@zyteron.cl",
  },
  {
    name: "Víctor",
    role: "Desarrollo y soporte TI",
    photo: "/equipo/victor/perfil.jpgpublic",
    bio: "Profesional enfocado en entregar soluciones web y TI claras, funcionales y orientadas a resultados.",
    focus:
      "Lidera áreas de desarrollo, soporte técnico, mantenimiento de sistemas e implementación de herramientas TI para empresas.",
  },
  {
    name: "Leonel",
    role: "Análisis, desarrollo y calidad",
    photo: "/equipo/leonel/perfil.jpgpublic",
    bio: "Profesional enfocado en entregar soluciones web y TI claras, funcionales y orientadas a resultados.",
    focus:
      "Trabaja en análisis, desarrollo de aplicaciones, gestión de bases de datos, integración de sistemas, automatización y control de calidad.",
  },
];

export default function NosotrosPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="nosotros-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/nosotros",
          title: "Agencia de Diseño Web en Chile | Nosotros | Zyteron",
          description:
            "Equipo de diseño y desarrollo web para empresas chilenas con enfoque en resultados.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Nosotros", path: "/nosotros" },
          ],
        })}
      />
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-pattern border-b border-slate-200 py-20">
        <Container className="relative z-10 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <div className="badge-blue w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Nosotros
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Tecnología con{" "}
              <span className="text-gradient-blue">foco en ventas</span>
            </h1>
            <p className="text-lg text-slate-600 leading-relaxed">
              Somos un equipo de desarrollo, SEO y soporte TI con base en Chile. Diseñamos plataformas que posicionan, convierten y se mantienen estables en producción.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold btn-primary-glow">
                <Link href="/contacto">Contactar ahora <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50 font-semibold">
                <Link href="/servicios">Ver servicios</Link>
              </Button>
            </div>
          </div>

          {/* Stats card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 space-y-4">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Resultados que hablan</p>
            <div className="grid grid-cols-2 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center space-y-1">
                  <p className="text-3xl font-extrabold text-gradient-blue">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-100 p-4">
              <Award className="h-5 w-5 text-blue-700 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900">Empresa chilena 100%</p>
                <p className="text-xs text-slate-500">Conocemos el mercado local a fondo</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Mission */}
      <section className="py-16 section-alt border-b border-slate-200">
        <Container className="grid gap-8 md:grid-cols-2">
          <div className="space-y-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Target className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Nuestra misión</p>
            <h2 className="text-2xl font-extrabold text-slate-900">Hacer que la tecnología trabaje para tu negocio</h2>
            <p className="text-slate-600 leading-relaxed text-sm">
              Creemos que toda empresa chilena merece una presencia digital que realmente convierta. No construimos sitios bonitos — construimos máquinas de generación de leads y ventas.
            </p>
          </div>
          <div className="space-y-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <Globe className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Nuestra visión</p>
            <h2 className="text-2xl font-extrabold text-slate-900">La plataforma digital de referencia en Chile</h2>
            <p className="text-slate-600 leading-relaxed text-sm">
              Ser el socio tecnológico de largo plazo de las empresas chilenas más ambiciosas: desde su primera landing hasta su ecosistema digital completo.
            </p>
          </div>
        </Container>
      </section>

      {/* Team */}
      <section className="py-20 bg-white border-b border-slate-200">
        <Container className="space-y-10">
          <div className="text-center space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Quiénes somos</p>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Equipo Zyteron: cercano, técnico y orientado a resultados
            </h2>
            <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-600">
              En Zyteron creemos en la tecnología bien aplicada: simple, segura y útil para que cada negocio pueda
              avanzar con confianza.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {teamMembers.map((member) => (
              <article key={member.name} className="card-premium p-6 space-y-3">
                <div className="relative mb-2 aspect-[4/3] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  <Image
                    src={member.photo}
                    alt={`Foto de ${member.name}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover object-center"
                    priority={member.name === "Eduardo Ávila"}
                  />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{member.role}</p>
                <h3 className="text-xl font-extrabold text-slate-900">{member.name}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{member.bio}</p>
                <p className="text-sm leading-relaxed text-slate-600">{member.focus}</p>
                {member.contact && (
                  <p className="text-sm text-slate-700">
                    Contacto:{" "}
                    <a href={`mailto:${member.contact}`} className="font-semibold text-blue-700 hover:text-blue-900">
                      {member.contact}
                    </a>
                  </p>
                )}
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-6 text-center">
            <p className="text-sm leading-relaxed text-slate-700">
              Contáctanos y conversemos sobre cómo podemos apoyar a tu empresa en{" "}
              <span className="font-semibold text-slate-900">zyteron.cl</span>.
            </p>
          </div>
        </Container>
      </section>

      {/* Values */}
      <section className="py-20 bg-white">
        <Container className="space-y-10">
          <div className="text-center space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Nuestros valores</p>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Por qué eligen{" "}
              <span className="text-gradient-blue">trabajar con nosotros</span>
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => (
              <div key={v.title} className="card-premium p-6 space-y-3">
                <div className={`service-icon ${v.iconBg} ${v.iconColor}`}>{v.icon}</div>
                <p className="text-base font-bold text-slate-900">{v.title}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Coverage */}
      <section className="py-16 section-alt">
        <Container className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Cobertura Chile</p>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Operamos en todo Chile,{" "}
                <span className="text-gradient-blue">con mirada regional</span>
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed">
                Soporte remoto a todas las regiones del país. Visitas técnicas presenciales en Santiago, Valparaíso, Concepción y principales ciudades previa agenda.
              </p>
              <p className="text-slate-600 text-sm leading-relaxed">
                SEO local optimizado para búsquedas por ciudad: landing pages para cada región que quieras conquistar.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Ciudades principales</p>
              <div className="flex flex-wrap gap-2">
                {cities.map((city) => (
                  <span key={city} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                    {city}
                  </span>
                ))}
                <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  + todo Chile remoto
                </span>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Team CTA */}
      <section className="py-16 bg-white">
        <Container>
          <div className="rounded-2xl section-blue p-8 md:p-12 text-white text-center space-y-5">
            <Users className="h-12 w-12 text-blue-200 mx-auto" />
            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold">Trabajemos juntos</h3>
              <p className="text-blue-100 mx-auto max-w-lg text-sm leading-relaxed">
                Contáctanos hoy y recibe una propuesta personalizada para tu empresa sin ningún costo ni compromiso.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="gap-2 bg-white text-blue-800 hover:bg-blue-50 font-bold">
                <Link href="/contacto">Iniciar conversación <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                <Link href="/planes">Ver planes y precios</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
