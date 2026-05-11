import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, Mail, Target, Users, Wrench } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Nosotros | ZYTERON",
  description:
    "Conoce quién lidera ZYTERON, qué problemas resolvemos y cómo ayudamos a empresas, pymes y emprendedores en Chile con soluciones digitales prácticas.",
  path: "/nosotros",
  keywords: ["empresa desarrollo web chile", "nosotros zyteron", "soluciones digitales para empresas"],
});

const differentialPoints = [
  "Atención directa y personalizada durante el proyecto.",
  "Enfoque práctico: soluciones claras para problemas reales.",
  "Proceso ordenado desde cotización hasta entrega final.",
  "Capacidad de integrar desarrollo web, sistemas y soporte TI.",
  "Trabajo orientado a empresas, pymes y emprendedores en Chile.",
];

const teamMembers = [
  {
    name: "Eduardo Ávila",
    role: "Liderazgo y dirección de proyectos",
    photo: "/equipo/eduardo-avila/perfil.png",
    bio: "ZYTERON nace con el objetivo de ayudar a empresas, pymes y emprendedores a digitalizar, ordenar y mejorar sus procesos mediante soluciones web, soporte TI y herramientas tecnológicas prácticas.",
    focus:
      "Nuestro enfoque es entregar desarrollos claros, funcionales y adaptados a la realidad de cada negocio, manteniendo una comunicación cercana y un proceso de trabajo ordenado desde la cotización hasta la entrega final.",
    contact: "eduardo.avila@zyteron.cl",
  },
  {
    name: "Víctor",
    role: "Desarrollo y soporte TI",
    photo: "/equipo/victor/perfil.png",
    bio: "Participa en implementación técnica, continuidad operativa y soporte para clientes.",
    focus: "Acompaña proyectos web y tecnológicos con foco en estabilidad y resultados prácticos.",
  },
  {
    name: "Leonel",
    role: "Análisis, desarrollo y calidad",
    photo: "/equipo/leonel/perfil.png",
    bio: "Participa en análisis de requerimientos, desarrollo e integración técnica.",
    focus: "Trabaja en control de calidad, automatización y mejoras funcionales de sistemas.",
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
          title: "Nosotros | ZYTERON",
          description: "Presentación de equipo, enfoque y forma de trabajo de ZYTERON.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Nosotros", path: "/nosotros" },
          ],
        })}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <div className="badge-blue w-fit">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              Sobre ZYTERON
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Tecnología aplicada con enfoque comercial y operativo
            </h1>
            <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
              Ayudamos a empresas, pymes y emprendedores en Chile a implementar soluciones web y sistemas
              prácticos para vender mejor, ordenar procesos y tomar decisiones con mayor control.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-blue-700 font-bold text-white hover:bg-blue-800">
                <Link href="/contacto">
                  Contacto profesional <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                <Link href="/servicios">Ver servicios</Link>
              </Button>
            </div>
          </div>

          <div className="card-premium p-6">
            <h2 className="mb-4 text-lg font-extrabold text-slate-900">Qué problema resuelve ZYTERON</h2>
            <div className="space-y-3">
              {[
                {
                  icon: <Target className="h-4 w-4" />,
                  title: "Digitalización con foco",
                  desc: "Pasar de procesos improvisados a flujos digitales ordenados.",
                },
                {
                  icon: <Wrench className="h-4 w-4" />,
                  title: "Ejecución técnica real",
                  desc: "Implementar soluciones que sí se usan en la operación diaria.",
                },
                {
                  icon: <Users className="h-4 w-4" />,
                  title: "Acompañamiento cercano",
                  desc: "Soporte y comunicación directa para avanzar con claridad.",
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <span className="text-blue-700">{item.icon}</span>
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      <section className="section-alt border-b border-slate-200 py-16">
        <Container className="grid gap-5 md:grid-cols-2">
          <article className="card-premium p-6">
            <h2 className="mb-3 text-xl font-extrabold text-slate-900">Qué nos diferencia</h2>
            <div className="space-y-2">
              {differentialPoints.map((point) => (
                <div key={point} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card-premium p-6">
            <h2 className="mb-3 text-xl font-extrabold text-slate-900">Tipo de clientes que apoyamos</h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Trabajamos con empresas que necesitan una web comercial más sólida, pymes que buscan ordenar su
              operación digital y emprendedores que requieren una base profesional para crecer.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Nos enfocamos en soluciones prácticas, escalables y alineadas al presupuesto y etapa de cada negocio.
            </p>
          </article>
        </Container>
      </section>

      <section className="bg-white py-20">
        <Container className="space-y-10">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Equipo</p>
            <h2 className="text-3xl font-extrabold text-slate-900">Quién lidera ZYTERON y equipo de apoyo</h2>
          </div>

          <article className="card-premium mx-auto max-w-4xl p-6 md:p-8">
            <div className="grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-start">
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <Image
                  src={leader.photo}
                  alt={`Foto de ${leader.name}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover object-[center_20%]"
                  priority
                />
              </div>
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">{leader.role}</p>
                <h3 className="text-2xl font-extrabold text-slate-900">{leader.name}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{leader.bio}</p>
                <p className="text-sm leading-relaxed text-slate-600">{leader.focus}</p>
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
                      alt={`Foto de ${member.name}`}
                      fill
                      sizes="110px"
                      className="object-cover object-[center_20%]"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-blue-600">{member.role}</p>
                    <h3 className="text-xl font-extrabold text-slate-900">{member.name}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{member.bio}</p>
                    <p className="text-sm leading-relaxed text-slate-600">{member.focus}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="rounded-2xl section-blue p-8 text-center text-white md:p-12">
          <h2 className="text-2xl font-extrabold sm:text-3xl">Conversemos tu próximo proyecto</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">
            Te ayudamos a definir alcance, prioridades y plan de implementación para avanzar con seguridad.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-white font-bold text-blue-800 hover:bg-blue-50">
              <Link href="/paquetes">Solicitar cotización</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/35 text-white hover:bg-white/10 hover:text-white">
              <Link href="/contacto">Contacto profesional</Link>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
