import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CircleDollarSign,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { buildFaqJsonLd, buildWebPageJsonLd, createPageMetadata } from "@/lib/seo";
import { OnlinePaymentLauncher } from "@/components/payments/online-payment-launcher";
import { SERVICE_PAYMENT_ITEMS } from "@/lib/payments/service-catalog";

export const metadata: Metadata = createPageMetadata({
  title: "Planes flexibles para cada etapa de tu negocio",
  description:
    "Planes y precios desde de ZYTERON para personas, emprendedores, pymes, empresas, colegios e instituciones. Cotización formal según alcance real.",
  path: "/planes",
  keywords: [
    "precios páginas web chile",
    "planes desarrollo web",
    "cotización sistema web",
    "tienda online chile precio",
    "panel administrativo chile",
  ],
});

const plans = [
  {
    id: "emprendedor",
    tag: "Para comenzar",
    name: "Plan Emprendedor",
    price: "Desde $69.990",
    audience:
      "Personas naturales, emprendedores, técnicos, servicios pequeños, barberías, negocios locales y profesionales independientes.",
    copy:
      "Ideal para comenzar con una presencia digital clara, profesional y lista para recibir contactos por WhatsApp o formulario.",
    includes: [
      "Landing page o sitio web simple",
      "Diseño responsive para celular, tablet y computador",
      "Botón directo a WhatsApp",
      "Secciones básicas",
      "Formulario de contacto simple",
      "Enlaces a redes sociales",
      "Optimización básica de carga",
      "SEO inicial básico",
      "Asesoría inicial sobre estructura de contenido",
    ],
    excludes: [
      "Panel administrativo avanzado",
      "Tienda online",
      "Integraciones de pago",
      "Login de usuarios",
      "Sistemas internos",
      "Automatizaciones complejas",
    ],
    primaryCta: { label: "Solicitar cotización", href: "/paquetes" },
    secondaryCta: { label: "Reservar proyecto", href: "#pagos-online" },
  },
  {
    id: "pyme",
    tag: "Más solicitado",
    name: "Plan Pyme",
    price: "Desde $149.990",
    audience:
      "Pymes, locales comerciales, pequeños negocios, servicios profesionales, tiendas pequeñas y emprendimientos en crecimiento.",
    copy:
      "Pensado para negocios que necesitan una web más completa, ordenada y enfocada en generar confianza y oportunidades de venta.",
    includes: [
      "Sitio web corporativo o comercial",
      "Varias secciones informativas",
      "Diseño profesional y responsive",
      "Formulario de contacto",
      "Botón WhatsApp",
      "Galería, servicios o catálogo básico",
      "Estructura SEO inicial",
      "Integración con redes sociales",
      "Optimización visual y comercial",
      "Sección de preguntas frecuentes",
      "Llamados a la acción estratégicos",
    ],
    excludes: [
      "Panel administrativo completo",
      "Pasarela de pago",
      "Tienda online avanzada",
      "Automatizaciones",
      "Sistemas internos personalizados",
    ],
    primaryCta: { label: "Solicitar cotización", href: "/paquetes" },
    secondaryCta: { label: "Pagar abono aprobado", href: "#pagos-online" },
  },
  {
    id: "empresa",
    tag: "Para empresas",
    name: "Plan Empresa",
    price: "Desde $299.990",
    audience:
      "Empresas, colegios, instituciones, oficinas, clínicas, talleres, transportes, constructoras y servicios B2B.",
    copy:
      "Para organizaciones que necesitan una presencia digital seria, estructurada y preparada para comunicar confianza desde el primer contacto.",
    includes: [
      "Web corporativa completa",
      "Páginas internas estructuradas",
      "Secciones para servicios, equipo, contacto, FAQ y confianza",
      "Formularios más completos",
      "SEO inicial",
      "Optimización responsive",
      "Enfoque comercial y corporativo",
      "Redacción base profesional",
      "Integración con WhatsApp y redes",
      "Preparación para analítica web",
      "Capacitación básica de uso si corresponde",
    ],
    excludes: [
      "Desarrollo de sistema a medida",
      "Login de usuarios",
      "Reportes internos",
      "Flujos automatizados avanzados",
      "Integraciones complejas",
    ],
    primaryCta: { label: "Solicitar propuesta formal", href: "/paquetes" },
    secondaryCta: { label: "Agendar diagnóstico", href: "#pagos-online" },
  },
  {
    id: "tienda",
    tag: "Venta digital",
    name: "Catálogo / Tienda Online",
    price: "Desde $399.990",
    audience:
      "Negocios que quieren mostrar productos, recibir pedidos, vender online o profesionalizar su catálogo digital.",
    copy:
      "Convierte tus productos en una experiencia digital clara, ordenada y fácil de cotizar o comprar.",
    includes: [
      "Catálogo de productos o tienda online base",
      "Categorías",
      "Fichas de productos",
      "Diseño responsive",
      "Botón de compra o contacto",
      "Carga inicial limitada de productos",
      "Integración con WhatsApp",
      "Estructura SEO para productos",
      "Preparación para medios de pago si corresponde",
    ],
    excludes: [
      "Stock administrable (si no se contrata)",
      "Panel administrativo completo",
      "Carga masiva de productos",
      "Cupones o descuentos",
      "Módulo de usuarios/clientes",
      "Facturación externa automática",
    ],
    primaryCta: { label: "Cotizar tienda online", href: "/paquetes" },
    secondaryCta: { label: "Pagar abono aprobado", href: "#pagos-online" },
  },
  {
    id: "sistema",
    tag: "A medida",
    name: "Sistema Web / Panel Administrativo",
    price: "Desde $450.000",
    audience:
      "Empresas, pymes o instituciones que necesitan administrar información, usuarios, registros y procesos internos.",
    copy:
      "Cuando tu negocio necesita más que una página web: desarrollamos sistemas digitales para ordenar, controlar y automatizar procesos.",
    includes: [
      "Login de usuarios",
      "Panel administrativo",
      "Dashboard",
      "Gestión de registros",
      "Formularios internos",
      "Roles de usuario",
      "Estados de procesos",
      "Generación de reportes",
      "Generación de PDF",
      "Base de datos",
      "Seguridad básica",
      "Capacitación de uso",
      "Soporte inicial",
    ],
    excludes: ["Se cotiza según requerimiento y alcance."],
    primaryCta: { label: "Agendar diagnóstico", href: "#pagos-online" },
    secondaryCta: { label: "Solicitar evaluación técnica", href: "/paquetes" },
  },
  {
    id: "avanzado",
    tag: "Proyecto crítico",
    name: "Sistema Avanzado / Desarrollo a medida",
    price: "Desde $900.000",
    audience:
      "Empresas que requieren soluciones complejas, múltiples usuarios, integraciones, automatizaciones y procesos críticos.",
    copy:
      "Desarrollamos soluciones a medida para empresas que necesitan centralizar información, reducir trabajo manual y mejorar control operativo.",
    includes: [
      "Arquitectura personalizada",
      "Múltiples módulos",
      "Integraciones externas",
      "Pasarelas de pago",
      "Automatización WhatsApp",
      "Reportes avanzados",
      "Paneles por perfil de usuario",
      "Historial de acciones",
      "Exportación Excel/PDF",
      "Control de flota y combustible",
      "Reservas",
      "Cotizadores",
      "Módulo de clientes y productos",
      "Gestión documental",
      "Notificaciones automáticas",
    ],
    excludes: ["Implementación por etapas según alcance y prioridad."],
    primaryCta: { label: "Solicitar propuesta formal", href: "/paquetes" },
    secondaryCta: { label: "Agendar reunión", href: "#pagos-online" },
  },
];

const extras = [
  ["Página adicional", "Desde $20.000"],
  ["Sección adicional", "Desde $15.000"],
  ["Formulario avanzado", "Desde $25.000"],
  ["Carga de productos hasta 20", "Desde $30.000"],
  ["Carga de productos hasta 50", "Desde $70.000"],
  ["Catálogo administrable", "Desde $80.000"],
  ["Mini panel administrativo", "Desde $120.000"],
  ["Panel administrativo completo", "Desde $300.000"],
  ["Integración Flow/Webpay/Mercado Pago", "Desde $120.000"],
  ["Generador de PDF", "Desde $120.000"],
  ["Sistema de reservas", "Desde $180.000"],
  ["Login de usuarios", "Desde $150.000"],
  ["Correos corporativos", "Desde $25.000 configuración"],
  ["SEO inicial avanzado", "Desde $80.000"],
  ["Automatización WhatsApp", "Desde $150.000"],
  ["Reportes o dashboard", "Desde $120.000"],
  ["Exportación Excel/PDF", "Desde $80.000"],
  ["Mantención mensual", "Desde $25.990"],
  ["Soporte prioritario", "Desde $49.990/mes"],
];

const priceFaqs = [
  {
    q: "¿Los precios son finales?",
    a: "No. Son valores base. El precio final depende del alcance, cantidad de secciones, funcionalidades, integraciones, contenido y soporte requerido.",
  },
  {
    q: "¿Puedo pagar por etapas?",
    a: "Sí. Según el tipo de proyecto, podemos definir pago inicial y pagos por avance o entrega.",
  },
  {
    q: "¿Qué pasa si necesito algo que no aparece en los planes?",
    a: "Se cotiza como proyecto personalizado. ZYTERON adapta la solución según requerimiento.",
  },
  {
    q: "¿Una página web incluye panel administrativo?",
    a: "No siempre. Los paneles administrativos se cotizan según la complejidad y funcionalidades requeridas.",
  },
  {
    q: "¿Una tienda online incluye pagos en línea?",
    a: "Puede incluirlos, pero la integración con pasarelas de pago se evalúa y cotiza según proveedor y alcance.",
  },
  {
    q: "¿Hacen sistemas para empresas?",
    a: "Sí. Desarrollamos sistemas web, paneles administrativos, cotizadores, reportes, generación de PDF, reservas y soluciones a medida.",
  },
  {
    q: "¿Atienden solo empresas?",
    a: "No. Trabajamos con personas, emprendedores, pymes, empresas, colegios, instituciones y negocios de distintos rubros.",
  },
  {
    q: "¿Incluyen dominio y hosting?",
    a: "Puede incluirse o gestionarse como adicional, según el plan y las necesidades del cliente.",
  },
  {
    q: "¿Cuánto demora un proyecto?",
    a: "Depende del alcance. Una web simple demora menos que un sistema con módulos personalizados. Los plazos se definen en cotización formal.",
  },
  {
    q: "¿Qué necesito para comenzar?",
    a: "Objetivo del negocio, información base, logo si existe, contenido disponible y una conversación inicial para definir alcance.",
  },
];

export default function PlanesPage() {
  return (
    <main className="bg-white">
      <JsonLd
        id="planes-webpage-schema"
        data={buildWebPageJsonLd({
          path: "/planes",
          title: "Planes flexibles para cada etapa de tu negocio",
          description: "Planes desde para web, ecommerce y sistemas. Cotización formal por alcance.",
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Planes", path: "/planes" },
          ],
        })}
      />
      <JsonLd
        id="planes-faq-schema"
        data={buildFaqJsonLd(
          priceFaqs.map((item) => ({
            question: item.q,
            answer: item.a,
          })),
        )}
      />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-20">
        <Container className="space-y-6 text-center">
          <div className="badge-blue mx-auto w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Planes y cotización profesional
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl">Planes flexibles para cada etapa de tu negocio</h1>
          <p className="mx-auto max-w-4xl text-base text-slate-600 sm:text-lg">
            Desde una web inicial hasta un sistema completo, en ZYTERON cotizamos según el alcance real de tu proyecto
            para entregar una solución justa, clara y profesional.
          </p>
          <div className="mx-auto max-w-4xl rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-slate-700">
            No todos los negocios necesitan lo mismo. Por eso trabajamos con valores base, levantamiento de
            requerimientos y cotización formal antes de iniciar. Así sabes qué incluye tu proyecto, cuánto cuesta y qué
            resultado recibirás.
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-blue-700 font-bold text-white hover:bg-blue-800">
              <Link href="/paquetes">Cotizar ahora</Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <Link href="/paquetes">Ver cotizador</Link>
            </Button>
            <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
              <a href="https://wa.me/56984752936?text=Hola%20ZYTERON%2C%20quiero%20cotizar%20mi%20proyecto" target="_blank" rel="noopener noreferrer">
                Hablar por WhatsApp
              </a>
            </Button>
          </div>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="space-y-4">
          <p className="text-sm text-slate-700">
            Los valores publicados son referenciales y corresponden a proyectos base. El precio final puede variar según
            cantidad de secciones, funcionalidades, carga de contenido, integraciones, panel administrativo, pasarela de
            pago, automatizaciones, soporte requerido y nivel de personalización.
          </p>
          <p className="text-sm text-slate-700">
            Cada proyecto se cotiza según su alcance real. Así evitamos cobros injustos, entregamos claridad desde el
            inicio y aseguramos una solución adaptada a las necesidades de cada cliente.
          </p>
          <p className="text-sm text-slate-700">
            Trabajamos con precios competitivos porque optimizamos el desarrollo con herramientas modernas, procesos
            claros y reutilización inteligente de componentes, sin sacrificar calidad ni profesionalismo.
          </p>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="grid gap-6 lg:grid-cols-2">
          {plans.map((plan) => (
            <article key={plan.id} className="card-premium flex flex-col p-6">
              <div className="mb-3 inline-flex w-fit rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {plan.tag}
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-xl font-bold text-blue-700">{plan.price}</p>
              <p className="mt-2 text-sm text-slate-600">{plan.audience}</p>
              <p className="mt-2 text-sm font-medium text-slate-700">{plan.copy}</p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Incluye</p>
                  <div className="mt-2 space-y-1.5">
                    {plan.includes.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-rose-700">No incluye</p>
                  <div className="mt-2 space-y-1.5">
                    {plan.excludes.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-600" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Button asChild className="bg-blue-700 text-white hover:bg-blue-800">
                  <Link href={plan.primaryCta.href}>{plan.primaryCta.label}</Link>
                </Button>
                <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                  <Link href={plan.secondaryCta.href}>{plan.secondaryCta.label}</Link>
                </Button>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Cotización formal según requerimiento. Valores base sujetos a evaluación.
              </p>
            </article>
          ))}
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="card-premium p-6">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-bold text-cyan-700">
              <CircleDollarSign className="h-4 w-4" />
              Opción mensual
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Plan Web Administrada</h2>
            <p className="mt-1 text-xl font-bold text-blue-700">Desde $25.990/mes</p>
            <p className="mt-2 text-sm text-slate-600">
              Una alternativa simple para quienes necesitan presencia digital sin realizar una inversión inicial alta.
            </p>
            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {[
                "Web básica activa",
                "Hosting incluido",
                "Soporte limitado",
                "Cambios menores mensuales",
                "Botón WhatsApp",
                "Formulario de contacto",
                "Mantención técnica básica",
                "Actualizaciones menores de contenido",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              No incluye desarrollo de sistemas personalizados, rediseños completos, integraciones de pago, carga masiva
              de productos, paneles administrativos avanzados ni automatizaciones complejas.
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Puede requerir permanencia mínima de 6 o 12 meses según el alcance inicial del proyecto.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button asChild className="bg-blue-700 text-white hover:bg-blue-800">
                <a href="#pagos-online">Contratar mensualidad</a>
              </Button>
              <Button asChild variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                <Link href="/contacto">Consultar condiciones</Link>
              </Button>
            </div>
          </article>

          <article className="card-premium p-6">
            <h3 className="text-xl font-extrabold text-slate-900">Abono inicial para iniciar tu proyecto</h3>
            <p className="mt-2 text-sm text-slate-600">
              Para iniciar un proyecto, ZYTERON puede solicitar un abono inicial. Este pago permite reservar el trabajo,
              cubrir configuraciones iniciales y comenzar la preparación técnica del servicio contratado.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              El abono inicial se descuenta del total del proyecto y queda asociado a la cotización aprobada.
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-700">
              <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-blue-700" />Proyectos pequeños: abono desde 40%</div>
              <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-blue-700" />Proyectos medianos: abono desde 50%</div>
              <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-blue-700" />Proyectos grandes: abono inicial + pagos por avance</div>
              <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-blue-700" />Servicios mensuales: primer mes pagado al contratar</div>
              <div className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 text-blue-700" />Servicios externos: pueden requerir pago previo</div>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-600">
              No se inicia ningún desarrollo personalizado sin aprobación del alcance y pago del abono correspondiente.
            </p>
          </article>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-5">
          <h2 className="text-2xl font-extrabold text-slate-900">Extras y funcionalidades adicionales</h2>
          <p className="text-sm text-slate-600">
            Los extras se agregan solo si el proyecto los requiere. Esto permite entregar precios justos y evitar cobrar
            funcionalidades innecesarias.
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-bold">Funcionalidad</th>
                  <th className="px-4 py-3 font-bold">Valor referencial</th>
                </tr>
              </thead>
              <tbody>
                {extras.map(([name, value]) => (
                  <tr key={name} className="border-t border-slate-200">
                    <td className="px-4 py-3 text-slate-700">{name}</td>
                    <td className="px-4 py-3 font-semibold text-blue-700">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      <section id="pagos-online" className="section-alt py-16">
        <Container className="space-y-6">
          <h2 className="text-2xl font-extrabold text-slate-900">Formas de pago flexibles</h2>
          <p className="text-sm text-slate-600">
            En ZYTERON facilitamos el inicio de tu proyecto con opciones de pago adaptadas al tipo de servicio.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              "Pago único para servicios simples",
              "Suscripción mensual para planes recurrentes",
              "Abono inicial para proyectos personalizados",
              "Pagos por etapa para desarrollos mayores",
              "Pago de saldo contra entrega",
              "Carro de compra para productos TI",
              "Pago online mediante Flow",
              "Transferencia bancaria si corresponde",
            ].map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>

          <OnlinePaymentLauncher items={SERVICE_PAYMENT_ITEMS} />

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="card-premium p-5">
              <h3 className="text-lg font-extrabold text-slate-900">Servicios disponibles para pago online</h3>
              <div className="mt-3 space-y-1.5 text-sm text-slate-700">
                {[
                  "Diagnóstico inicial",
                  "Reserva de proyecto",
                  "Plan Web Administrada mensual",
                  "Mantención mensual",
                  "Soporte mensual",
                  "Productos TI",
                  "Servicios cerrados",
                  "Abonos aprobados",
                  "Pagos por etapa",
                  "Saldos pendientes",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-700" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="card-premium p-5">
              <h3 className="text-lg font-extrabold text-slate-900">Servicios que requieren cotización previa</h3>
              <div className="mt-3 space-y-1.5 text-sm text-slate-700">
                {[
                  "Sistemas web",
                  "Paneles administrativos",
                  "Tiendas online personalizadas",
                  "Automatizaciones",
                  "Integraciones de pago",
                  "Desarrollo a medida",
                  "Proyectos para empresas, colegios o instituciones",
                  "Funcionalidades especiales",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-700" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-6">
          <h2 className="text-2xl font-extrabold text-slate-900">¿Qué plan necesito?</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              "Si solo necesitas presencia online y contacto por WhatsApp: Plan Emprendedor.",
              "Si tienes un negocio y necesitas mostrar servicios, generar confianza y recibir consultas: Plan Pyme.",
              "Si representas una empresa, colegio o institución y necesitas una web más estructurada: Plan Empresa.",
              "Si vendes productos o necesitas mostrar un catálogo: Catálogo / Tienda Online.",
              "Si necesitas administrar información, usuarios, registros, reservas o reportes: Sistema Web.",
              "Si necesitas integraciones, automatizaciones o módulos personalizados: Desarrollo a medida.",
            ].map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="space-y-5">
          <h2 className="text-2xl font-extrabold text-slate-900">Preguntas frecuentes sobre precios</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {priceFaqs.map((item) => (
              <article key={item.q} className="card-premium p-5">
                <h3 className="text-sm font-bold text-slate-900">{item.q}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.a}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-4">
          <h2 className="text-2xl font-extrabold text-slate-900">Condiciones comerciales generales</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              "Todo proyecto se inicia con alcance definido.",
              "Los valores publicados son referenciales.",
              "Funcionalidades adicionales se cotizan aparte.",
              "El cliente debe entregar contenido, imágenes, accesos y antecedentes necesarios.",
              "Cambios fuera del alcance pueden modificar plazo y valor.",
              "Dominio, hosting, licencias o servicios externos pueden tener costos adicionales.",
              "Integraciones con terceros dependen de disponibilidad y condiciones del proveedor.",
              "El soporte incluido depende del plan contratado.",
              "Para proyectos mayores se puede trabajar por etapas.",
            ].map((line) => (
              <div key={line} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {line}
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-blue py-16 text-white">
        <Container className="space-y-4 text-center">
          <h2 className="text-3xl font-extrabold">Solicita una propuesta formal</h2>
          <p className="mx-auto max-w-3xl text-sm text-blue-100 sm:text-base">
            Si representas una empresa, colegio, institución o negocio con requerimientos específicos, podemos preparar
            una propuesta formal adaptada a tus procesos, objetivos y presupuesto.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-white text-blue-800 hover:bg-blue-50">
              <Link href="/paquetes">
                Solicitar propuesta formal <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
              <a href="https://wa.me/56984752936?text=Hola%20ZYTERON%2C%20quiero%20agendar%20diagn%C3%B3stico" target="_blank" rel="noopener noreferrer">
                Agendar diagnóstico
              </a>
            </Button>
          </div>
        </Container>
      </section>
    </main>
  );
}
