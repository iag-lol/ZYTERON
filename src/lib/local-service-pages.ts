import { siteConfig } from "@/config/site";
import type { Ubicacion } from "@/data/ubicaciones";

export type LocalServiceKey =
  | "desarrollo-web"
  | "diseno-web"
  | "paginas-web-para-pymes"
  | "soporte-ti"
  | "sistemas-web";

export type LocalServiceDefinition = {
  key: LocalServiceKey;
  basePath: string;
  serviceName: string;
  serviceType: string;
  metaTitlePrefix: string;
  heroTitlePrefix: string;
  primaryKeyword: string;
  intro: string;
  deliverables: string[];
  idealFor: string[];
  faqLead: string;
  relatedHref: string;
  relatedLabel: string;
};

export const localServiceDefinitions: Record<LocalServiceKey, LocalServiceDefinition> = {
  "desarrollo-web": {
    key: "desarrollo-web",
    basePath: "/desarrollo-web",
    serviceName: "Desarrollo web",
    serviceType: "Desarrollo Web",
    metaTitlePrefix: "Desarrollo web",
    heroTitlePrefix: "Desarrollo web",
    primaryKeyword: "desarrollo web",
    intro:
      "Diseñamos y desarrollamos sitios web con enfoque comercial, estructura clara y base técnica preparada para captar oportunidades reales.",
    deliverables: [
      "Arquitectura de páginas por servicio o línea de negocio.",
      "Diseño responsive para celular, tablet y escritorio.",
      "Metadata, estructura SEO base y rutas claras de contacto.",
      "Integración con formularios, WhatsApp y analítica cuando corresponde.",
    ],
    idealFor: [
      "Empresas que necesitan una presencia formal para vender mejor.",
      "Negocios B2B que requieren explicar servicios complejos con claridad.",
      "Pymes que ya no quieren depender solo de Instagram o referidos.",
    ],
    faqLead: "desarrollo web profesional",
    relatedHref: "/desarrollo-web",
    relatedLabel: "Ver servicio de desarrollo web",
  },
  "diseno-web": {
    key: "diseno-web",
    basePath: "/diseno-web",
    serviceName: "Diseño web",
    serviceType: "Diseño Web",
    metaTitlePrefix: "Diseño web",
    heroTitlePrefix: "Diseño web",
    primaryKeyword: "diseño web",
    intro:
      "Ordenamos el mensaje, la jerarquía visual y la experiencia de navegación para que tu sitio se vea profesional y ayude a convertir visitas en contactos.",
    deliverables: [
      "Jerarquía visual alineada a la propuesta de valor del negocio.",
      "Secciones pensadas para confianza, objeciones y CTA.",
      "Diseño adaptable a dispositivos y lectura rápida en mobile.",
      "Base lista para crecimiento con nuevas páginas o servicios.",
    ],
    idealFor: [
      "Empresas con web antigua o poco clara frente al cliente final.",
      "Negocios que necesitan mejorar percepción profesional.",
      "Servicios que requieren explicar bien su oferta antes de cotizar.",
    ],
    faqLead: "diseño web para empresas",
    relatedHref: "/diseno-web-empresas",
    relatedLabel: "Ver servicio de diseño web para empresas",
  },
  "paginas-web-para-pymes": {
    key: "paginas-web-para-pymes",
    basePath: "/paginas-web-para-pymes",
    serviceName: "Páginas web para pymes",
    serviceType: "Páginas Web para Pymes",
    metaTitlePrefix: "Páginas web para pymes",
    heroTitlePrefix: "Páginas web para pymes",
    primaryKeyword: "páginas web para pymes",
    intro:
      "Creamos sitios simples de administrar y bien estructurados para que una pyme pueda verse seria, explicar sus servicios y recibir consultas mejor calificadas.",
    deliverables: [
      "Sitio base con secciones esenciales y contenido organizado.",
      "Contacto visible por formulario, correo y WhatsApp.",
      "Diseño responsive y estructura comercial fácil de entender.",
      "Preparación para sumar SEO local, blog o nuevas páginas más adelante.",
    ],
    idealFor: [
      "Pymes que venden servicios o productos a nivel local o regional.",
      "Negocios que hoy dependen solo de WhatsApp o redes sociales.",
      "Equipos que necesitan cotizar con más seriedad y claridad.",
    ],
    faqLead: "página web pyme",
    relatedHref: "/paginas-web-para-pymes",
    relatedLabel: "Ver páginas web para pymes",
  },
  "soporte-ti": {
    key: "soporte-ti",
    basePath: "/soporte-ti",
    serviceName: "Soporte TI",
    serviceType: "Soporte TI",
    metaTitlePrefix: "Soporte TI",
    heroTitlePrefix: "Soporte TI",
    primaryKeyword: "soporte TI",
    intro:
      "Ayudamos a mantener continuidad operativa en correos, herramientas, formularios, hosting, equipos y soluciones digitales con un soporte técnico claro y priorizado.",
    deliverables: [
      "Diagnóstico técnico según impacto y urgencia.",
      "Registro de acciones, hallazgos y recomendaciones preventivas.",
      "Soporte remoto para herramientas web, correos y operación digital.",
      "Ruta de mejora cuando el problema requiere proyecto o mantención.",
    ],
    idealFor: [
      "Pymes sin equipo TI interno permanente.",
      "Empresas que necesitan una contraparte técnica confiable.",
      "Negocios con incidencias repetidas en correo, web o herramientas.",
    ],
    faqLead: "soporte TI para pymes",
    relatedHref: "/soporte-ti",
    relatedLabel: "Ver servicio de soporte TI",
  },
  "sistemas-web": {
    key: "sistemas-web",
    basePath: "/sistemas-web",
    serviceName: "Sistemas web",
    serviceType: "Sistemas Web",
    metaTitlePrefix: "Sistemas web",
    heroTitlePrefix: "Sistemas web",
    primaryKeyword: "sistemas web",
    intro:
      "Desarrollamos sistemas a medida para ordenar registros, estados, usuarios, documentos y reportes cuando Excel, papel o WhatsApp ya no alcanzan.",
    deliverables: [
      "Levantamiento funcional del proceso y prioridades del negocio.",
      "Paneles, formularios y módulos según operación real.",
      "Roles, permisos y trazabilidad básica cuando aplica.",
      "Roadmap de crecimiento por etapas para no sobredimensionar la primera versión.",
    ],
    idealFor: [
      "Empresas con procesos internos que ya generan errores o atrasos.",
      "Operaciones con documentos, control, reportes o trazabilidad.",
      "Equipos que necesitan pasar de planillas a una plataforma propia.",
    ],
    faqLead: "sistema web a medida",
    relatedHref: "/sistemas-web",
    relatedLabel: "Ver servicio de sistemas web",
  },
};

export type LocalServicePageViewModel = {
  path: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroDescription: string;
  introParagraphs: string[];
  deliverables: string[];
  idealFor: string[];
  localSignals: string[];
  faqs: Array<{ question: string; answer: string }>;
  service: LocalServiceDefinition;
  ubicacion: Ubicacion;
};

export function buildLocalServicePageModel(
  service: LocalServiceDefinition,
  ubicacion: Ubicacion,
): LocalServicePageViewModel {
  const path = `${service.basePath}/${ubicacion.slug}`;
  const cityRegion = `${ubicacion.nombre}, ${ubicacion.region}`;
  const locationIntro =
    ubicacion.descripcionLocal ||
    `Atendemos empresas y pymes en ${cityRegion} con modalidad remota y foco en resultados comerciales concretos.`;

  return {
    path,
    title: `${service.serviceName} en ${ubicacion.nombre} para empresas y pymes`,
    metaTitle: `${service.metaTitlePrefix} en ${ubicacion.nombre} para empresas | Zyteron`,
    metaDescription: `${service.serviceName} en ${ubicacion.nombre}, ${ubicacion.region}: estructura profesional, enfoque comercial y atención para empresas y pymes en Chile.`,
    heroTitle: `${service.heroTitlePrefix} en ${ubicacion.nombre} para empresas que necesitan avanzar con claridad`,
    heroDescription: `${service.intro} Atendemos proyectos en ${cityRegion} con diagnóstico inicial, propuesta clara y acompañamiento comercial desde ${siteConfig.address.city}.`,
    introParagraphs: [
      `${locationIntro}`,
      `Trabajamos con empresas, pymes y emprendedores en ${ubicacion.nombre} que necesitan mejorar su presencia digital, ordenar procesos o resolver fricción operativa sin sobrecomplicar la implementación.`,
      `El servicio de ${service.primaryKeyword} se adapta al alcance real del negocio: desde una primera versión enfocada en ventas hasta una solución más completa con soporte, automatización o panel interno.`,
    ],
    deliverables: service.deliverables,
    idealFor: service.idealFor,
    localSignals: [
      `Cobertura para ${ubicacion.nombre} y proyectos en ${ubicacion.region}.`,
      `Atención remota con reuniones online y coordinación formal por etapas.`,
      `Base operativa en Santiago, Chile, con soporte a todo el país.`,
    ],
    faqs: [
      {
        question: `¿Atienden proyectos de ${service.faqLead} en ${ubicacion.nombre} de forma remota?`,
        answer: `Sí. Trabajamos proyectos para ${ubicacion.nombre} con reuniones online, levantamiento remoto y seguimiento por etapas, manteniendo comunicación directa durante el proceso.`,
      },
      {
        question: `¿El servicio considera enfoque local para ${ubicacion.nombre}?`,
        answer: `Sí. Podemos orientar títulos, contenido, metadata, rutas de contacto y estructura comercial hacia búsquedas relacionadas con ${ubicacion.nombre} y ${ubicacion.region}.`,
      },
      {
        question: `¿Cómo se cotiza un proyecto de ${service.faqLead} en ${ubicacion.nombre}?`,
        answer: `La cotización depende del alcance, número de secciones o módulos, contenido disponible, integraciones y prioridad del proyecto. Primero revisamos el caso y luego enviamos una propuesta formal.`,
      },
    ],
    service,
    ubicacion,
  };
}
