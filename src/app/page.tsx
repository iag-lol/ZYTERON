import Link from "next/link";
import {
  ArrowRight,
  Rocket,
  BarChart3,
  MonitorSmartphone,
  CloudCog,
  Check,
  Star,
  Shield,
  Zap,
  Globe,
  TrendingUp,
  Users,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/layout/container";

/* ── DATA ── */
const stats = [
  { value: "50+", label: "Proyectos entregados" },
  { value: "99%", label: "Clientes satisfechos" },
  { value: "< 24h", label: "Tiempo de respuesta" },
  { value: "8+", label: "Años de experiencia" },
];

const services = [
  {
    icon: <Rocket className="h-6 w-6" />,
    title: "Desarrollo Web",
    desc: "Landing pages, sitios corporativos, portales y ecommerce con performance máximo y arquitectura escalable.",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-700",
    hoverBorder: "hover:border-blue-200",
    link: "/servicios",
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "SEO Avanzado",
    desc: "SEO técnico nivel enterprise: on-page, schema JSON-LD, Core Web Vitals, contenidos y SEO local en Chile.",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-700",
    hoverBorder: "hover:border-violet-200",
    link: "/servicios",
  },
  {
    icon: <CloudCog className="h-6 w-6" />,
    title: "Infra & Soporte TI",
    desc: "Dominios, correos corporativos, hosting, monitoreo y soporte técnico remoto y presencial.",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
    hoverBorder: "hover:border-emerald-200",
    link: "/servicios",
  },
  {
    icon: <MonitorSmartphone className="h-6 w-6" />,
    title: "Hardware Empresarial",
    desc: "Notebooks, PCs de escritorio, combos digitales y equipos configurados para tu oficina.",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
    hoverBorder: "hover:border-amber-200",
    link: "/productos",
  },
];

const plans = [
  {
    name: "PYME Básico",
    price: "$69.990",
    period: "pago único",
    desc: "Catálogo simple para mostrar productos fijos con derivación directa a WhatsApp.",
    features: [
      "Página de visualización de productos fijos",
      "Botón a WhatsApp por producto o CTA general",
      "Secciones héroe, catálogo y contacto",
      "SSL, performance base y diseño responsive",
      "Precio cerrado, sin extras obligatorios",
    ],
    gifts: ["Asesoría de arranque 1h"],
    cta: "Hablar por WhatsApp",
    featured: false,
    badge: "Ahorro PYME",
  },
  {
    name: "PYME Medio",
    price: "$139.980",
    period: "pago único",
    desc: "Incluye dominio y hosting gestionado el primer año para que solo te enfoques en vender.",
    features: [
      "Dominio .cl o .com incluido 1 año",
      "Hosting gestionado + SSL 1 año",
      "Catálogo PYME Básico + formulario de leads",
      "Analítica y eventos de conversión configurados",
      "Precio cerrado, sin extras obligatorios",
    ],
    gifts: ["Soporte prioritario 30 días"],
    cta: "Hablar por WhatsApp",
    featured: false,
    badge: "Listo para despegar",
  },
  {
    name: "PYME Avanzado",
    price: "$209.970",
    period: "pago único",
    desc: "Suite completa con panel administrativo para gestionar productos, descuentos y métricas.",
    features: [
      "Dominio + hosting 1 año incluidos",
      "Panel admin: alta, baja y edición de productos",
      "Gestión de precios, stock y descuentos",
      "Dashboard con resumen de ventas e informes",
      "Sección de reseñas y moderación",
      "Catálogo responsive para PC y móviles",
      "Precio cerrado, sin extras obligatorios",
    ],
    gifts: ["Capacitación 1 sesión", "Soporte 60 días"],
    cta: "Hablar por WhatsApp",
    featured: true,
    badge: "Más completo PYME",
  },
];

const faqs = [
  {
    q: "¿Cuánto demora un proyecto web?",
    a: "Landing: 1–2 semanas. Sitio corporativo: 3–5 semanas. Ecommerce: 5–7 semanas según alcance y contenidos provistos.",
  },
  {
    q: "¿Incluyen dominio y correos corporativos?",
    a: "El Plan Pro incluye dominio + 1 correo por 1 año. En otros planes se agregan como extra o combo según necesidad.",
  },
  {
    q: "¿Puedo personalizar un paquete a medida?",
    a: "Sí. El cotizador permite elegir plan base y sumar extras: dominio, correos, SEO, soporte, equipos, paneles y más.",
  },
  {
    q: "¿Cómo garantizan el posicionamiento SEO?",
    a: "Arquitectura semántica, metadatos por página, schema JSON-LD, velocidad Core Web Vitals y contenidos alineados a intención de búsqueda.",
  },
  {
    q: "¿Tienen soporte post-entrega?",
    a: "Todos los planes incluyen al menos 1 mes de atención básica. Planes de mantención mensual disponibles como extra.",
  },
  {
    q: "¿Trabajan con empresas fuera de Santiago?",
    a: "Soporte remoto a todo Chile. Visitas técnicas en RM y regiones principales con agenda previa.",
  },
];

const WspIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

/* WhatsApp helper */
const whatsappNumber = "56984752936";
type ChatIntent = "plan" | "producto";
const getWaLink = (name: string, price: string, intent: ChatIntent = "plan") => {
  const message =
    intent === "plan"
      ? `Hola, estoy interesado en el plan ${name} (${price}) para mi pyme. ¿Podemos avanzar?`
      : `Hola, quiero comprar ${name} (${price}, IVA incluido). ¿Disponibilidad y envío a mi dirección?`;
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
};

/* ── PAGE ── */
export default function Home() {
  return (
    <main className="overflow-hidden">

      {/* ═══════════════════════ HERO ═══════════════════════ */}
      <section className="relative overflow-hidden bg-hero-pattern">
        <Container className="relative z-10 grid items-center gap-12 py-20 lg:grid-cols-[1.15fr_0.85fr] lg:py-28">
          {/* Left column */}
          <div className="space-y-7">
            {/* Badge */}
            <div className="badge-blue">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
              Plataforma digital empresarial · Chile
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl xl:text-[3.5rem]">
              <span className="text-slate-900">Tecnología que</span>{" "}
              <span className="text-gradient-hero">impulsa ventas</span>{" "}
              <span className="text-slate-900">y posiciona tu empresa</span>
            </h1>

            {/* Subtext */}
            <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Sitios web de alto rendimiento, SEO técnico nivel enterprise, soporte TI y hardware corporativo.
              Diseñado para Core Web Vitals, conversión y escalabilidad en Chile.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold px-6 shadow-blue-700/30 shadow-md btn-primary-glow">
                <Link href="/paquetes">
                  Armar mi paquete <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Link
                href="https://wa.me/56984752936?text=Hola%20Zyteron%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20sus%20servicios"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-[#25d366]/40 bg-[#25d366]/10 px-5 py-2.5 text-sm font-bold text-[#18a34d] transition-all hover:bg-[#25d366]/20"
              >
                <WspIcon />
                Escribir por WhatsApp
              </Link>
            </div>

            {/* Trust tags */}
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-blue-600" />
                Sin permanencia obligatoria
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-blue-600" />
                Respuesta en menos de 24h
              </div>
              <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-blue-600" />
                Cobertura nacional Chile
              </div>
            </div>
          </div>

          {/* Right column — premium card */}
          <div className="animate-float">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Panel de servicios</p>
                  <p className="mt-0.5 text-lg font-extrabold text-slate-900">Zyteron Platform</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Activo
                </span>
              </div>

              <div className="space-y-2">
                {[
                  { icon: <Rocket className="h-4 w-4" />, label: "Desarrollo web", val: "Landing · Corporativo · Ecommerce", iconBg: "bg-blue-50", iconC: "text-blue-700" },
                  { icon: <BarChart3 className="h-4 w-4" />, label: "SEO Técnico", val: "On-page · Schema · Core Web Vitals", iconBg: "bg-violet-50", iconC: "text-violet-700" },
                  { icon: <CloudCog className="h-4 w-4" />, label: "Infra & TI", val: "Hosting · Correos · Soporte", iconBg: "bg-emerald-50", iconC: "text-emerald-700" },
                  { icon: <MonitorSmartphone className="h-4 w-4" />, label: "Hardware", val: "Notebooks · PCs · Combos", iconBg: "bg-amber-50", iconC: "text-amber-700" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition-colors hover:bg-slate-50">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${row.iconBg} ${row.iconC}`}>{row.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800">{row.label}</p>
                      <p className="text-xs text-slate-500 truncate">{row.val}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  </div>
                ))}
              </div>

              <Link
                href="/paquetes"
                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-700 to-blue-800 p-4 transition-all hover:from-blue-800 hover:to-blue-900"
              >
                <div>
                  <p className="text-sm font-bold text-white">Cotizador avanzado</p>
                  <p className="text-xs text-blue-200">Arma tu paquete en 3 pasos</p>
                </div>
                <ArrowRight className="h-5 w-5 text-white" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════ STATS ═══════════════════════ */}
      <section className="border-y border-slate-200 bg-white">
        <Container className="py-10">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-1 text-center">
                <span className="text-3xl font-extrabold text-gradient-blue">{stat.value}</span>
                <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ═══════════════════════ SERVICES ═══════════════════════ */}
      <section className="py-20 section-alt">
        <Container className="space-y-10">
          <div className="space-y-3 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Servicios</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Cobertura digital{" "}
              <span className="text-gradient-blue">integral para tu empresa</span>
            </h2>
            <p className="mx-auto max-w-xl text-slate-600 text-base">
              Desde la estrategia hasta la ejecución — diseñamos, desarrollamos y mantenemos tu presencia digital.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((svc) => (
              <Link
                key={svc.title}
                href={svc.link}
                className={`group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md ${svc.hoverBorder}`}
              >
                <div className={`service-icon ${svc.iconBg} ${svc.iconColor}`}>{svc.icon}</div>
                <h3 className="mb-2 text-base font-bold text-slate-900">{svc.title}</h3>
                <p className="text-sm leading-relaxed text-slate-600 flex-1">{svc.desc}</p>
                <div className={`mt-4 flex items-center gap-1 text-xs font-bold ${svc.iconColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  Ver más <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link href="/servicios" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 transition-colors hover:text-blue-900">
              Ver todos los servicios <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════ PLANS ═══════════════════════ */}
      <section className="py-20 bg-white">
        <Container className="space-y-10">
          <div className="space-y-3 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Planes</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Planes claros,{" "}
              <span className="text-gradient-blue">resultados reales</span>
            </h2>
            <p className="mx-auto max-w-xl text-slate-600">
              Elige el plan que se adapta a tu empresa y potencia con extras en el cotizador.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {plans.map((plan) => {
              const waLink = getWaLink(plan.name, plan.price);
              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl p-7 transition-all duration-300 ${
                    plan.featured
                      ? "card-featured text-white"
                      : "card-premium"
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-blue-600 px-4 py-1 text-xs font-bold text-white shadow-blue-600/40 shadow-md">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  <div className="space-y-1 mb-5">
                    <p className={`text-xs font-bold uppercase tracking-widest ${plan.featured ? "text-blue-200" : "text-slate-400"}`}>{plan.name}</p>
                    <p className={`text-3xl font-extrabold ${plan.featured ? "text-white" : "text-slate-900"}`}>{plan.price}</p>
                    <p className={`text-xs ${plan.featured ? "text-blue-200" : "text-slate-400"}`}>{plan.period}</p>
                    <p className={`text-sm mt-2 ${plan.featured ? "text-blue-100" : "text-slate-600"}`}>{plan.desc}</p>
                  </div>

                  <div className="mb-5 space-y-1.5">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-2.5 ${plan.featured ? "text-emerald-300" : "text-emerald-600"}`}>Incluye gratis</p>
                    {plan.gifts.map((g) => (
                      <div key={g} className={`flex items-center gap-2 text-sm ${plan.featured ? "text-emerald-200" : "text-emerald-700"}`}>
                        <Star className="h-3.5 w-3.5 shrink-0" />
                        {g}
                      </div>
                    ))}
                  </div>

                  <div className="mb-6 space-y-2 flex-1">
                    {plan.features.map((f) => (
                      <div key={f} className={`flex items-start gap-2 text-sm ${plan.featured ? "text-blue-100" : "text-slate-600"}`}>
                        <Check className={`h-4 w-4 shrink-0 mt-0.5 ${plan.featured ? "text-blue-300" : "text-blue-600"}`} />
                        {f}
                      </div>
                    ))}
                  </div>

                  <Button
                    asChild
                    className={`w-full font-bold ${
                      plan.featured
                        ? "bg-white text-blue-800 hover:bg-blue-50"
                        : "bg-blue-700 hover:bg-blue-800 text-white btn-primary-glow"
                    }`}
                  >
                    <a href={waLink} target="_blank" rel="noopener noreferrer">{plan.cta}</a>
                  </Button>
                  <p className={`mt-2 text-center text-xs ${plan.featured ? "text-blue-100" : "text-slate-500"}`}>
                    Respuesta en menos de 24h. Precio cerrado, sin extras obligatorios.
                  </p>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <Link href="/planes" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:text-blue-900 transition-colors">
              Ver comparativa detallada <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════ PACKAGE BUILDER CTA ═══════════════════════ */}
      <section className="py-16 bg-white">
        <Container>
          <div className="relative overflow-hidden rounded-2xl section-blue p-8 md:p-12 text-white">
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-400/10 rounded-full blur-[60px] pointer-events-none" />
            <div className="relative z-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div className="space-y-4">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Cotizador avanzado</p>
                <h3 className="text-2xl font-extrabold sm:text-3xl">
                  Arma tu paquete ideal en 3 pasos
                </h3>
                <div className="space-y-3">
                  {[
                    "Elige tu plan base: PYME Básico, PYME Medio o PYME Avanzado.",
                    "Suma extras: dominio adicional, correos, SEO, soporte, equipos.",
                    "Revisa el total, beneficios gratis y envía la cotización.",
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white mt-0.5">
                        {i + 1}
                      </span>
                      <p className="text-sm text-blue-100">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <Button asChild size="lg" className="w-full gap-2 bg-white text-blue-800 hover:bg-blue-50 font-bold">
                  <Link href="/paquetes">
                    Abrir cotizador <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Link
                  href="https://wa.me/56984752936?text=Hola%2C%20quiero%20cotizar%20un%20paquete%20Zyteron"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-white/20"
                >
                  <WspIcon />
                  O escríbenos por WhatsApp
                </Link>
                <p className="text-center text-xs text-blue-200">
                  Ejecutivo responde en <strong className="text-white">menos de 24h hábiles</strong>
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ═══════════════════════ FAQ ═══════════════════════ */}
      <section className="py-20 section-alt">
        <Container className="space-y-10">
          <div className="space-y-3 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">FAQ</p>
            <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
              Preguntas{" "}
              <span className="text-gradient-blue">frecuentes</span>
            </h2>
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

      {/* ═══════════════════════ FINAL WHATSAPP CTA ═══════════════════════ */}
      <section className="py-20 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-dot-light opacity-80 pointer-events-none" />
        <Container className="relative z-10 flex flex-col items-center gap-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[#25d366]/10 text-[#18a34d] border border-[#25d366]/25">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">¿Tienes dudas? Hablemos ahora</h2>
            <p className="mx-auto max-w-lg text-slate-600">
              Escríbenos directamente por WhatsApp y un ejecutivo especializado te responde sin compromiso.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="https://wa.me/56984752936?text=Hola%20Zyteron%2C%20me%20interesa%20conocer%20m%C3%A1s%20sobre%20sus%20servicios"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-[#25d366] px-6 py-3 text-sm font-bold text-white transition-all hover:bg-[#20b858] hover:shadow-lg hover:shadow-[#25d366]/25 wsp-pulse"
            >
              <WspIcon />
              +56 9 8475 2936 — WhatsApp
            </Link>
            <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50 font-semibold">
              <Link href="/contacto">Enviar formulario</Link>
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> SEO técnico real</div>
            <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Equipo especializado</div>
            <div className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Sin letras pequeñas</div>
          </div>
        </Container>
      </section>
    </main>
  );
}
