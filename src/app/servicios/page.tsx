import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Rocket, BarChart3, MonitorSmartphone, Globe, Server, Headphones, Shield, Zap, Code2, TrendingUp, Check, ArrowRight, ChevronRight } from "lucide-react";

const categories = [
  {
    icon: <Rocket className="h-6 w-6" />,
    title: "Desarrollo Web",
    desc: "Plataformas digitales de alto rendimiento adaptadas a los objetivos de tu empresa.",
    iconBg: "bg-blue-50", iconColor: "text-blue-700", border: "hover:border-blue-200",
    items: ["Landing pages de conversión", "Sitios corporativos multi-sección", "Portales empresariales", "Ecommerce y tiendas en línea", "Integraciones con CRM y sistemas", "Diseño responsive y accesible"],
    cta: "/paquetes",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "SEO Técnico Avanzado",
    desc: "Posicionamiento real en Google con estrategias enterprise: técnica, contenido y autoridad.",
    iconBg: "bg-violet-50", iconColor: "text-violet-700", border: "hover:border-violet-200",
    items: ["Auditoría SEO técnica completa", "Optimización on-page avanzada", "Schema JSON-LD estructurado", "Core Web Vitals y performance", "SEO local para ciudades Chile", "Estrategia de contenidos y linking"],
    cta: "/planes",
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Dominios y Correos",
    desc: "Infraestructura de comunicación profesional con seguridad y confiabilidad.",
    iconBg: "bg-emerald-50", iconColor: "text-emerald-700", border: "hover:border-emerald-200",
    items: ["Registro y gestión de dominios", "Correos corporativos profesionales", "DNS seguro con protección DNSSEC", "Certificados SSL incluidos", "Redirecciones y configuración MX", "Panel de administración"],
    cta: "/paquetes",
  },
  {
    icon: <Headphones className="h-6 w-6" />,
    title: "Soporte & Mantención",
    desc: "Tu aliado tecnológico permanente: soporte técnico rápido y mantención preventiva.",
    iconBg: "bg-amber-50", iconColor: "text-amber-700", border: "hover:border-amber-200",
    items: ["Soporte remoto prioritario", "Visitas técnicas presenciales", "Mantención y actualización web", "Monitoreo de disponibilidad 24/7", "Backups automatizados", "Resolución de incidentes críticos"],
    cta: "/contacto",
  },
  {
    icon: <MonitorSmartphone className="h-6 w-6" />,
    title: "Hardware Empresarial",
    desc: "Equipos tecnológicos configurados y listos para operar desde el primer día.",
    iconBg: "bg-rose-50", iconColor: "text-rose-700", border: "hover:border-rose-200",
    items: ["Notebooks de oficina configurados", "PCs de escritorio empresariales", "Packs empresariales completos", "Instalación y configuración en sitio", "Soporte post-venta incluido", "Garantía y servicio técnico"],
    cta: "/productos",
  },
  {
    icon: <Server className="h-6 w-6" />,
    title: "Infraestructura Cloud",
    desc: "Hosting, servidores y configuración de infraestructura cloud para alto rendimiento.",
    iconBg: "bg-cyan-50", iconColor: "text-cyan-700", border: "hover:border-cyan-200",
    items: ["Hosting SSD de alta velocidad", "Configuración de servidores VPS", "CDN y optimización de entrega", "Firewall y hardening de seguridad", "Certificados SSL automáticos", "Monitoreo y alertas proactivas"],
    cta: "/paquetes",
  },
];

const faqs = [
  { q: "¿Pueden trabajar con mi hosting actual?", a: "Sí. Auditamos tu infraestructura actual y optimizamos o migramos a una solución más rápida si es necesario. Siempre sin pérdida de datos." },
  { q: "¿Incluyen SLA de soporte?", a: "Soporte remoto con respuesta en 24h hábiles. Soporte urgente y visitas presenciales se pactan en el plan Premium o como extra adicional." },
  { q: "¿Cómo manejan la seguridad web?", a: "Actualizaciones automáticas, backups diarios, hardening básico de servidor, monitoreo de uptime y políticas de acceso por rol." },
  { q: "¿Qué pasa si necesito más funcionalidades después?", a: "Nuestra arquitectura es escalable por diseño. Podemos agregar blog, ciudades, módulos de pago, reservas y más en etapas posteriores." },
];

export default function ServiciosPage() {
  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-hero-pattern border-b border-slate-200 py-20">
        <Container className="relative z-10 space-y-5">
          <div className="badge-blue">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Servicios
          </div>
          <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
            Servicios digitales{" "}
            <span className="text-gradient-blue">diseñados para vender</span>
          </h1>
          <p className="max-w-2xl text-lg text-slate-600">
            Desarrollamos y mantenemos plataformas web, SEO, infraestructura y soporte TI para empresas en Chile con foco en performance, seguridad y conversión real.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold btn-primary-glow">
              <Link href="/paquetes">Cotizar servicios <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50 font-semibold">
              <Link href="/contacto">Hablar con un experto</Link>
            </Button>
          </div>
        </Container>
      </section>

      {/* Services Grid */}
      <section className="py-20 section-alt">
        <Container className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900">Nuestras áreas de especialidad</h2>
            <p className="text-slate-600">Soluciones integrales para cada aspecto de tu presencia digital.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => (
              <div key={cat.title} className={`card-premium flex flex-col p-6 ${cat.border}`}>
                <div className={`service-icon ${cat.iconBg} ${cat.iconColor}`}>{cat.icon}</div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">{cat.title}</h3>
                <p className="mb-4 text-sm text-slate-600 leading-relaxed">{cat.desc}</p>
                <ul className="mb-6 space-y-1.5 flex-1">
                  {cat.items.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                      <Check className={`h-3.5 w-3.5 shrink-0 ${cat.iconColor}`} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" size="sm" className="w-full border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5">
                  <Link href={cat.cta}>
                    Cotizar este servicio <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Coverage band */}
      <section className="py-12 section-blue">
        <Container>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between text-white">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Cobertura Chile</p>
              <h2 className="text-2xl font-extrabold">Remoto a todo Chile · Presencial en RM</h2>
              <p className="max-w-xl text-sm text-blue-100">
                Atendemos empresas desde Arica hasta Punta Arenas vía soporte remoto. Visitas técnicas en Santiago, Valparaíso, Concepción, Antofagasta y principales ciudades previa agenda.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
              <Button asChild className="bg-white text-blue-800 hover:bg-blue-50 font-bold gap-2">
                <Link href="/contacto">Agendar llamada <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                <Link href="/paquetes">Ver paquetes</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <Container>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <Shield className="h-5 w-5" />, title: "Sin permanencia", desc: "Sin contratos forzosos. Trabajamos con plazos acordados." },
              { icon: <Zap className="h-5 w-5" />, title: "Respuesta rápida", desc: "Respuesta en menos de 24h hábiles garantizado." },
              { icon: <TrendingUp className="h-5 w-5" />, title: "ROI medible", desc: "Reportes de rendimiento y métricas claras de resultado." },
              { icon: <Code2 className="h-5 w-5" />, title: "Código limpio", desc: "Código mantenible y documentado sin dependencias ocultas." },
            ].map((feat) => (
              <div key={feat.title} className="card-premium p-5 space-y-2">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  {feat.icon}
                </div>
                <p className="text-sm font-bold text-slate-900">{feat.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-16 section-alt">
        <Container className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">FAQ</p>
            <h2 className="text-2xl font-extrabold text-slate-900">Preguntas frecuentes</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.q} className="card-premium p-6">
                <h3 className="mb-2 text-sm font-bold text-slate-900">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
