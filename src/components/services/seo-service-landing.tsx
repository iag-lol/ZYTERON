import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircle, SearchCheck } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import type { SeoServicePage } from "@/content/seo-service-pages";
import { caseStudies } from "@/content/case-studies";
import {
  buildFaqJsonLd,
  buildProfessionalServiceJsonLd,
  buildServiceJsonLd,
  buildWebPageJsonLd,
} from "@/lib/seo";

const WHATSAPP_PHONE = "56984752936";

type DeepServiceContent = {
  serviceLabel: string;
  whyParagraphs: string[];
  technologyParagraphs: string[];
  methodologyBullets: string[];
  caseStudySlugs: string[];
  comparisonRows: Array<[string, string, string, string]>;
  offer: {
    name: string;
    lowPrice: number;
    highPrice?: number;
    description: string;
  };
};

const deepContentBySlug: Record<string, DeepServiceContent> = {
  "desarrollo-web": {
    serviceLabel: "desarrollo web",
    whyParagraphs: [
      "En Chile, una empresa que no logra explicar su oferta en pocos segundos pierde oportunidades antes de iniciar la conversación comercial. El desarrollo web profesional permite presentar servicios, diferenciar beneficios, responder objeciones frecuentes y dirigir al visitante hacia contacto, cotización o WhatsApp sin depender solo de redes sociales o referidos.",
      "Para pymes y negocios B2B, la web funciona como una base comercial propia. Puede recibir tráfico desde Google, campañas, LinkedIn, tarjetas digitales, propuestas y recomendaciones. Cuando la estructura está bien desarrollada, cada sección cumple un rol: generar confianza, ordenar la decisión, mostrar evidencia y facilitar una acción concreta.",
      "También es clave para crecer con control. Una web construida con arquitectura limpia puede sumar blog, páginas de servicio, landing pages, integraciones, analítica, formularios avanzados, automatizaciones y sistemas internos sin rehacer todo desde cero. Esa escalabilidad baja el costo total de evolución.",
    ],
    technologyParagraphs: [
      "Trabajamos con Next.js, TypeScript, componentes reutilizables y una estructura semántica preparada para SEO técnico. Priorizamos páginas rápidas, URLs limpias, metadata clara, schema cuando corresponde, sitemap, canonical y experiencia responsive desde el inicio.",
      "La metodología combina discovery comercial, arquitectura de información, diseño de secciones, desarrollo por etapas, revisión con el cliente, pruebas responsive y salida a producción con checklist técnico. No se trata solo de programar pantallas: se trata de ordenar el mensaje y reducir fricción de contacto.",
      "Cuando el proyecto lo requiere, integramos formularios, WhatsApp, analítica, eventos de conversión, paneles simples, contenido editable o conexiones posteriores con sistemas internos. La decisión técnica se toma según el alcance real, no por moda tecnológica.",
    ],
    methodologyBullets: [
      "Mapa de objetivos comerciales, servicios prioritarios y público objetivo.",
      "Estructura H1/H2, metadata, canonical y Open Graph por página.",
      "Diseño responsive con foco en lectura móvil y claridad de CTA.",
      "Optimización de imágenes, carga inicial y componentes above-the-fold.",
      "QA de enlaces, formularios, eventos y publicación.",
    ],
    caseStudySlugs: [
      "web-empresa-combustible-seo",
      "tienda-online-articulos-personalizados",
      "web-cotizaciones-personalizadas-pdf",
    ],
    comparisonRows: [
      ["Control del mensaje", "Arquitectura, contenido y CTA alineados a tu negocio", "Diseño genérico con textos adaptados superficialmente", "La propuesta queda dispersa entre redes, PDFs y mensajes manuales"],
      ["SEO técnico", "Base indexable con metadata, schema, sitemap y performance", "Puede quedar limitado a instalación visual sin estrategia", "No existe activo orgánico propio para captar búsquedas"],
      ["Escalabilidad", "Preparada para blog, servicios, sistemas o automatizaciones", "Cambios futuros dependen del proveedor y plantilla", "Cada mejora parte desde cero o se resuelve manualmente"],
      ["Conversión", "Rutas claras a cotización, WhatsApp y formularios medibles", "CTA básicos sin medición completa", "Clientes potenciales no encuentran una vía clara de contacto"],
    ],
    offer: {
      name: "Desarrollo web profesional",
      lowPrice: 250000,
      highPrice: 2000000,
      description: "Rango referencial según cantidad de páginas, contenido, integraciones y soporte.",
    },
  },
  "tiendas-online": {
    serviceLabel: "tiendas online",
    whyParagraphs: [
      "Vender online en Chile exige más que publicar fotos de productos. Una tienda online debe ordenar catálogo, categorías, fichas, precios, condiciones, confianza y canales de atención. Para muchas pymes, el desafío real no es solo cobrar por internet, sino reducir preguntas repetidas y dar al cliente una experiencia clara antes de comprar.",
      "Una tienda propia permite depender menos de redes sociales y mensajes manuales. El negocio puede enviar enlaces directos a productos, trabajar campañas, medir consultas, posicionar categorías y preparar una operación más formal para venta asistida, carrito o pagos online según madurez comercial.",
      "También ayuda a proyectar confianza. Cuando el catálogo está organizado y el proceso de compra o cotización es simple, el cliente percibe seriedad. Esto es especialmente importante para marcas nuevas, negocios locales y empresas que venden productos personalizados o inventario variable.",
    ],
    technologyParagraphs: [
      "Diseñamos tiendas con estructura responsive, fichas de producto legibles, navegación por categorías, CTAs claros, integración con WhatsApp y preparación para pagos cuando el alcance lo justifica. La tecnología se define según volumen de productos, necesidad de administración, stock y flujo de compra.",
      "Podemos construir catálogos iniciales, tiendas con carrito, flujos de cotización, integración de pasarelas, paneles de gestión o módulos progresivos. En proyectos pequeños, suele ser más conveniente partir con catálogo y venta asistida; en proyectos con mayor volumen, se evalúa carrito, pagos y administración avanzada.",
      "La metodología incluye levantamiento de productos, definición de categorías, campos mínimos de ficha, revisión de fotografías, estructura SEO básica, pruebas de compra o contacto y capacitación inicial para operar sin depender de cambios técnicos menores.",
    ],
    methodologyBullets: [
      "Normalización de categorías, productos, precios y atributos relevantes.",
      "Fichas de producto con contenido útil y alt descriptivo para imágenes.",
      "Flujos de compra, cotización o WhatsApp según modelo comercial.",
      "Preparación para medios de pago y políticas comerciales cuando aplica.",
      "Revisión mobile para navegación, filtros, botones y formularios.",
    ],
    caseStudySlugs: [
      "tienda-online-articulos-personalizados",
      "control-ventas-inventario-efectivo",
      "web-cotizaciones-personalizadas-pdf",
    ],
    comparisonRows: [
      ["Catálogo", "Categorías y fichas pensadas para tu operación", "Plantilla adaptada con límites de personalización", "Productos dispersos en redes o documentos"],
      ["Venta asistida", "WhatsApp, formularios y pedidos conectados al flujo real", "Botones básicos sin trazabilidad", "Consultas manuales repetidas y poco ordenadas"],
      ["Crecimiento", "Escala a pagos, stock, reportes o panel por etapas", "Dependencia del proveedor o plataforma elegida", "Cada nuevo producto aumenta el desorden operativo"],
      ["Confianza", "Experiencia propia, responsive y preparada para campañas", "Diseño similar a muchas tiendas genéricas", "Baja percepción profesional frente a compradores nuevos"],
    ],
    offer: {
      name: "Tienda online o catálogo digital",
      lowPrice: 500000,
      highPrice: 2000000,
      description: "Rango referencial según catálogo, pagos, carga inicial y administración requerida.",
    },
  },
  "sistemas-web": {
    serviceLabel: "sistemas web",
    whyParagraphs: [
      "Cuando una pyme crece, Excel, papel y mensajes sueltos empiezan a generar errores, duplicidad y falta de trazabilidad. Un sistema web permite centralizar información, definir estados, asignar responsables, consultar historial y generar reportes que apoyan decisiones reales.",
      "En empresas chilenas con operación diaria, el mayor costo suele estar en tareas repetitivas: copiar datos, buscar documentos, revisar versiones, armar reportes o perseguir información. Un sistema propio no tiene que partir enorme; puede iniciar con un módulo crítico y crecer según impacto.",
      "La ventaja de un sistema web a medida es que se adapta al proceso, no al revés. Esto es útil para control de asistencia, checklist operativos, inventario, ventas, combustible, cotizaciones, documentos, solicitudes internas o cualquier flujo donde el negocio necesita orden y evidencia.",
    ],
    technologyParagraphs: [
      "Trabajamos con Next.js, TypeScript, bases de datos relacionales, Prisma, Supabase o infraestructura equivalente según requerimiento. Implementamos formularios, validaciones, roles, paneles, filtros, estados, generación de documentos y componentes reutilizables para evolución modular.",
      "La metodología comienza con levantamiento funcional: qué datos se capturan, quién los usa, qué estados existen, qué reportes importan y qué restricciones hay. Luego definimos una primera versión viable para disminuir riesgo y validar adopción interna antes de ampliar módulos.",
      "Cuando corresponde, sumamos autenticación, permisos, auditoría básica, exportaciones, PDF, notificaciones por correo o WhatsApp, dashboards y conexión con formularios públicos. Cada integración se evalúa por valor operativo y costo de mantención.",
    ],
    methodologyBullets: [
      "Mapa de proceso actual, usuarios, datos, estados y decisiones críticas.",
      "Diseño de modelo de datos y flujo mínimo viable por módulo.",
      "Construcción iterativa con pruebas de escenarios reales.",
      "Capacitación, documentación breve y soporte de estabilización.",
      "Roadmap de mejoras por impacto y complejidad.",
    ],
    caseStudySlugs: [
      "app-checklist-revision-buses",
      "control-asistencia-personal",
      "control-flota-combustible",
      "control-ventas-inventario-efectivo",
    ],
    comparisonRows: [
      ["Trazabilidad", "Registros, estados y responsables consultables", "Herramienta genérica que no refleja todo el proceso", "Información dispersa, difícil de auditar o reconstruir"],
      ["Adopción", "Módulos diseñados según la operación real", "El equipo debe adaptarse a reglas externas", "Cada persona resuelve con su propio método"],
      ["Reportes", "Datos preparados para KPIs, exportaciones o PDF", "Reportes limitados al producto contratado", "Indicadores manuales, tardíos o incompletos"],
      ["Evolución", "Crecimiento por módulos y prioridades", "Cambios dependen del roadmap de otro proveedor", "La operación escala aumentando carga administrativa"],
    ],
    offer: {
      name: "Sistema web a medida",
      lowPrice: 800000,
      highPrice: 2000000,
      description: "Rango referencial para primera etapa con diagnóstico técnico incluido.",
    },
  },
  automatizacion: {
    serviceLabel: "automatización",
    whyParagraphs: [
      "La automatización es clave cuando una empresa recibe solicitudes repetidas, copia información entre canales o depende de seguimiento manual para tareas simples. En Chile, muchas pymes operan con WhatsApp, formularios, correo y planillas; conectar esos puntos puede mejorar respuesta sin reemplazar el criterio humano.",
      "Un flujo automatizado permite capturar datos de forma más ordenada, enviar avisos, derivar solicitudes, generar documentos, activar recordatorios o preparar información para un panel. Esto reduce errores y libera tiempo del equipo para atender casos de mayor valor.",
      "La automatización también mejora experiencia de cliente. Una respuesta inicial clara, un formulario bien diseñado o una derivación correcta puede marcar diferencia entre una consulta perdida y una oportunidad comercial bien gestionada.",
    ],
    technologyParagraphs: [
      "Usamos formularios estructurados, eventos, APIs, notificaciones, lógica de negocio, integraciones con WhatsApp cuando corresponde y sistemas web para controlar estados. La solución puede ser simple o avanzada según volumen, criticidad y canales involucrados.",
      "La metodología parte identificando tareas repetitivas y puntos de pérdida: mensajes frecuentes, datos incompletos, retrasos, errores de copia o falta de seguimiento. Luego definimos reglas claras, responsables y métricas para saber si el flujo realmente mejora la operación.",
      "No toda automatización requiere inteligencia artificial ni herramientas complejas. Muchas mejoras de alto impacto se logran con formularios correctos, emails automáticos, registros centralizados, generación de PDF, plantillas de respuesta y paneles con estados.",
    ],
    methodologyBullets: [
      "Identificación de tareas repetitivas y puntos de fricción operativa.",
      "Diseño de reglas, mensajes, estados y responsables.",
      "Integración con formularios, correo, WhatsApp o panel interno.",
      "Pruebas con casos reales antes de activar el flujo.",
      "Medición de tiempo ahorrado, errores evitados y solicitudes ordenadas.",
    ],
    caseStudySlugs: [
      "web-cotizaciones-personalizadas-pdf",
      "control-asistencia-personal",
      "app-checklist-revision-buses",
    ],
    comparisonRows: [
      ["Tiempo operativo", "Flujos repetitivos documentados y medibles", "Automatizaciones aisladas sin contexto del proceso", "Horas perdidas en copiar, responder y revisar manualmente"],
      ["Calidad de datos", "Campos, validaciones y estados definidos", "Datos capturados según límites de la herramienta", "Información incompleta o repartida entre canales"],
      ["Seguimiento", "Alertas y responsables visibles", "Notificaciones genéricas", "Casos olvidados o sin trazabilidad"],
      ["Escalabilidad", "Puede conectarse con sistemas, PDF o reportes", "Dependencia de licencias o conectores externos", "El crecimiento aumenta la carga del equipo"],
    ],
    offer: {
      name: "Automatización de procesos",
      lowPrice: 300000,
      highPrice: 1200000,
      description: "Rango referencial según canales, reglas, integraciones y pruebas requeridas.",
    },
  },
  "soporte-ti": {
    serviceLabel: "soporte TI",
    whyParagraphs: [
      "El soporte TI es clave para empresas que dependen de correos, equipos, herramientas web, formularios, sistemas y conectividad para vender o atender. Un incidente pequeño puede detener respuestas comerciales, afectar productividad o generar desconfianza frente a clientes.",
      "Para muchas pymes en Santiago y otras regiones, no tiene sentido contratar un equipo TI interno completo, pero sí necesitan una contraparte que diagnostique, priorice y resuelva problemas con criterio. El valor está en combinar soporte reactivo con recomendaciones preventivas.",
      "Un servicio ordenado de soporte permite registrar requerimientos, identificar recurrencias, mantener continuidad y tomar mejores decisiones antes de comprar herramientas, migrar correos, cambiar hosting o implementar sistemas nuevos.",
    ],
    technologyParagraphs: [
      "Apoyamos configuración de correos, dominios, hosting, herramientas, formularios, cuentas, equipos, respaldos básicos y continuidad de soluciones digitales. Cuando el requerimiento excede soporte puntual, proponemos una ruta de mejora o proyecto separado.",
      "La metodología prioriza diagnóstico, impacto, urgencia y documentación de acciones. No todos los problemas requieren la misma respuesta: diferenciamos incidentes críticos, ajustes menores, mantención, seguridad básica y oportunidades de mejora.",
      "El soporte se puede complementar con mantención web, desarrollo, automatización o sistemas internos. Esto permite resolver problemas técnicos actuales y, al mismo tiempo, preparar una infraestructura más estable para crecimiento.",
    ],
    methodologyBullets: [
      "Evaluación inicial del problema, impacto y urgencia.",
      "Registro de acciones realizadas y recomendaciones preventivas.",
      "Soporte remoto y coordinación presencial cuando el alcance lo permite.",
      "Revisión de continuidad para correos, web, formularios y herramientas.",
      "Priorización de mejoras para reducir incidentes repetidos.",
    ],
    caseStudySlugs: [
      "control-flota-combustible",
      "app-checklist-revision-buses",
      "web-empresa-combustible-seo",
    ],
    comparisonRows: [
      ["Continuidad", "Diagnóstico y priorización según impacto del negocio", "Mesa de ayuda genérica con poco contexto", "Incidentes se resuelven tarde o quedan sin dueño"],
      ["Prevención", "Recomendaciones para evitar recurrencias", "Corrección puntual sin mejora de fondo", "Los mismos problemas vuelven a repetirse"],
      ["Contexto", "Conexión entre web, correos, sistemas y operación", "Visión limitada al ticket individual", "Decisiones tecnológicas tomadas sin evaluación"],
      ["Escalabilidad", "Puede evolucionar a mantención, sistemas o automatización", "Dependencia de múltiples proveedores desconectados", "Cada crecimiento aumenta riesgo técnico"],
    ],
    offer: {
      name: "Soporte TI para pymes",
      lowPrice: 49990,
      highPrice: 300000,
      description: "Rango referencial mensual o por requerimiento según carga, criticidad y cobertura.",
    },
  },
};

type Props = {
  page: SeoServicePage;
};

export function SeoServiceLanding({ page }: Props) {
  const deepContent = deepContentBySlug[page.slug];
  const serviceLabel = deepContent?.serviceLabel ?? page.navLabel.toLowerCase();
  const relatedCaseStudies = deepContent
    ? deepContent.caseStudySlugs
        .map((slug) => caseStudies.find((caseStudy) => caseStudy.slug === slug))
        .filter((caseStudy): caseStudy is NonNullable<typeof caseStudy> => Boolean(caseStudy))
    : [];
  const whatsappUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(
    `Hola Zyteron, quiero cotizar ${page.navLabel} para mi empresa.`,
  )}`;

  return (
    <main className="bg-white">
      <JsonLd
        id={`${page.slug}-webpage-schema`}
        data={buildWebPageJsonLd({
          path: page.path,
          title: page.metaTitle,
          description: page.metaDescription,
          breadcrumbs: [
            { name: "Inicio", path: "/" },
            { name: "Servicios", path: "/servicios" },
            { name: page.navLabel, path: page.path },
          ],
        })}
      />
      <JsonLd
        id={`${page.slug}-professional-service-schema`}
        data={buildProfessionalServiceJsonLd({
          path: page.path,
          description: page.metaDescription,
        })}
      />
      <JsonLd
        id={`${page.slug}-service-schema`}
        data={buildServiceJsonLd({
          path: page.path,
          name: page.heroTitle,
          description: page.metaDescription,
          serviceType: page.serviceType,
          offers: deepContent ? [deepContent.offer] : undefined,
        })}
      />
      <JsonLd id={`${page.slug}-faq-schema`} data={buildFaqJsonLd(page.faqs)} />

      <section className="relative overflow-hidden border-b border-slate-200 bg-hero-pattern py-18 sm:py-20">
        <Container className="space-y-6">
          <nav aria-label="Breadcrumb" className="text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-blue-700">
              Inicio
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <Link href="/servicios" className="hover:text-blue-700">
              Servicios
            </Link>
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-slate-700">{page.navLabel}</span>
          </nav>

          <div className="badge-blue w-fit">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
            Servicio SEO prioritario
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="space-y-5">
              <h1 className="max-w-5xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                {page.heroTitle}
              </h1>
              <p className="max-w-4xl text-base leading-relaxed text-slate-600 sm:text-lg">
                {page.heroDescription}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-blue-700 font-bold text-white hover:bg-blue-800">
                  <Link href={`/contacto?servicio=${page.slug}`}>
                    {page.primaryCta} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                  <Link href="/planes">Ver planes</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-slate-300 text-slate-800 hover:bg-slate-50">
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4" /> Hablar por WhatsApp
                  </a>
                </Button>
              </div>
            </div>

            <aside className="card-premium p-6">
              <p className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
                <SearchCheck className="h-5 w-5 text-blue-700" />
                Enfoque del servicio
              </p>
              <div className="flex flex-wrap gap-2">
                {[page.primaryKeyword, ...page.secondaryKeywords].map((keyword) => (
                  <span key={keyword} className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {keyword}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Atendemos proyectos para pymes, emprendedores y empresas de Santiago, Región Metropolitana y distintas regiones de Chile.
              </p>
            </aside>
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <article className="card-premium p-6">
            <h2 className="text-2xl font-extrabold text-slate-900">{page.problemTitle}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
              {page.problemDescription}
            </p>
          </article>

          <div className="grid gap-4 md:grid-cols-2">
            {page.benefits.map((benefit) => (
              <div key={benefit} className="card-premium flex items-start gap-3 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <p className="text-sm leading-relaxed text-slate-700">{benefit}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="section-alt py-16">
        <Container className="grid gap-6 lg:grid-cols-3">
          <article className="card-premium p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Qué incluye</h2>
            <div className="space-y-2">
              {page.includes.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card-premium p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Para quién es</h2>
            <div className="space-y-2">
              {page.audience.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-700" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="card-premium p-6">
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">Enlaces internos útiles</h2>
            <div className="space-y-2">
              {page.relatedLinks.slice(0, 5).map((link) => (
                <Link key={`${link.href}-${link.label}`} href={link.href} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-blue-200 hover:bg-white">
                  <span className="text-sm font-bold text-slate-900">{link.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">{link.description}</span>
                </Link>
              ))}
            </div>
          </article>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="space-y-8">
          <div className="space-y-2 text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Metodología</p>
            <h2 className="text-3xl font-extrabold text-slate-900">Proceso de trabajo claro y por etapas</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {page.process.map((step, index) => (
              <article key={step.title} className="card-premium border-t-4 border-t-blue-200 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Paso {index + 1}</p>
                <h3 className="mt-1 text-base font-extrabold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      {deepContent ? (
        <>
          <section className="section-alt py-16">
            <Container className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Contexto local</p>
                <h2 className="text-3xl font-extrabold text-slate-900">
                  ¿Por qué {serviceLabel} es clave para tu negocio en Chile?
                </h2>
              </div>
              <div className="space-y-4">
                {deepContent.whyParagraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-relaxed text-slate-700 sm:text-base">
                    {paragraph}
                  </p>
                ))}
              </div>
            </Container>
          </section>

          <section className="bg-white py-16">
            <Container className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
              <article className="card-premium p-6">
                <h2 className="text-2xl font-extrabold text-slate-900">¿Qué tecnologías y metodologías usamos?</h2>
                <div className="mt-4 space-y-3">
                  {deepContent.technologyParagraphs.map((paragraph) => (
                    <p key={paragraph} className="text-sm leading-relaxed text-slate-600 sm:text-base">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
              <aside className="card-premium p-6">
                <h3 className="text-lg font-extrabold text-slate-900">Criterios de ejecución</h3>
                <div className="mt-4 space-y-2">
                  {deepContent.methodologyBullets.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </aside>
            </Container>
          </section>

          <section className="section-alt py-16">
            <Container className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Comparativa</p>
                <h2 className="text-3xl font-extrabold text-slate-900">Comparativa para decidir con claridad</h2>
                <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  Esta tabla resume diferencias prácticas entre construir una solución propia con Zyteron,
                  contratar outsourcing genérico o seguir operando sin este servicio.
                </p>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-bold">Criterio</th>
                      <th className="px-4 py-3 font-bold">Opción propia con Zyteron</th>
                      <th className="px-4 py-3 font-bold">Outsourcing genérico</th>
                      <th className="px-4 py-3 font-bold">No tener el servicio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deepContent.comparisonRows.map(([criterion, ownOption, outsourced, missing]) => (
                      <tr key={criterion} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-bold text-slate-900">{criterion}</td>
                        <td className="px-4 py-3 text-slate-700">{ownOption}</td>
                        <td className="px-4 py-3 text-slate-700">{outsourced}</td>
                        <td className="px-4 py-3 text-slate-700">{missing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Container>
          </section>

          <section className="bg-white py-16">
            <Container className="space-y-8">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Aplicaciones reales</p>
                <h2 className="text-3xl font-extrabold text-slate-900">Casos de uso reales</h2>
                <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  Usamos casos anónimos documentados para mostrar problemas frecuentes sin exponer datos de clientes,
                  métricas confidenciales ni información operativa sensible.
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                {relatedCaseStudies.map((caseStudy) => (
                  <Link
                    key={caseStudy.slug}
                    href={`/casos-exito/${caseStudy.slug}`}
                    className="card-premium p-5 transition-colors hover:border-blue-200"
                  >
                    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">{caseStudy.industry}</p>
                    <h3 className="text-base font-extrabold leading-snug text-slate-900">{caseStudy.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{caseStudy.summary}</p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-blue-700">
                      Ver caso anónimo <ArrowRight className="h-4 w-4" />
                    </span>
                  </Link>
                ))}
              </div>
            </Container>
          </section>
        </>
      ) : null}

      <section className="section-alt py-16">
        <Container className="space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">FAQ</p>
            <h2 className="text-3xl font-extrabold text-slate-900">Preguntas frecuentes sobre {serviceLabel}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {page.faqs.map((faq) => (
              <article key={faq.question} className="card-premium p-5">
                <h3 className="text-sm font-extrabold text-slate-900">{faq.question}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-white py-16">
        <Container className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl section-blue p-8 text-white md:p-10">
            <h2 className="text-2xl font-extrabold sm:text-3xl">{page.finalCtaTitle}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-blue-100 sm:text-base">
              {page.finalCtaCopy}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="bg-white font-bold text-blue-800 hover:bg-blue-50">
                <Link href={`/contacto?servicio=${page.slug}`}>
                  Solicitar asesoría <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/35 text-white hover:bg-white/10 hover:text-white">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  Hablar por WhatsApp
                </a>
              </Button>
            </div>
          </div>

          <aside className="card-premium p-6">
            <h2 className="text-xl font-extrabold text-slate-900">Más recursos para decidir</h2>
            <div className="mt-4 space-y-2">
              {page.relatedLinks.slice(5).map((link) => (
                <Link key={`${link.href}-${link.label}`} href={link.href} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-blue-200 hover:bg-white">
                  <span className="text-sm font-bold text-slate-900">{link.label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">{link.description}</span>
                </Link>
              ))}
            </div>
          </aside>
        </Container>
      </section>
    </main>
  );
}
