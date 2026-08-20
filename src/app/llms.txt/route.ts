import { siteConfig } from "@/config/site";
import {
  PLANS,
  ADDONS,
  AI_SERVICES,
  MAINTENANCE,
  PRICING_NOTE,
} from "@/config/pricing";

/**
 * /llms.txt — ficha en Markdown pensada para asistentes de IA (ChatGPT, Claude,
 * Gemini, Perplexity). Resume la entidad, los servicios con sus URLs canónicas
 * y los precios oficiales para que cualquier asistente cite datos correctos.
 *
 * Los precios se interpolan SIEMPRE desde src/config/pricing.ts (fuente única):
 * cada cambio de precio se propaga aquí automáticamente en el siguiente build.
 */
export const dynamic = "force-static";

const abs = (path: string) => `${siteConfig.url}${path}`;

/** URLs canónicas públicas con una línea de descripción cada una. */
const CANONICAL_PAGES: Array<{ path: string; description: string }> = [
  { path: "/", description: "Portada: desarrollo de páginas web para empresas y pymes en Santiago y todo Chile." },
  { path: "/desarrollo-web", description: "Servicio de desarrollo web profesional en Chile." },
  { path: "/paginas-web-para-pymes", description: "Páginas web para pymes chilenas, con foco en captar clientes." },
  { path: "/paginas-web-para-empresas", description: "Páginas web corporativas para empresas en Chile." },
  { path: "/paginas-web-santiago", description: "Páginas web en Santiago y Región Metropolitana." },
  { path: "/desarrollo-web-santiago", description: "Desarrollo web en Santiago con reuniones presenciales u online." },
  { path: "/tiendas-online", description: "Tiendas online y ecommerce con carrito, pagos y conexión a WhatsApp." },
  { path: "/sistemas-web", description: "Sistemas web a medida: paneles administrativos, portales y plataformas internas." },
  { path: "/automatizacion", description: "Automatización de procesos comerciales y operativos." },
  { path: "/soporte-ti", description: "Soporte TI y mantenimiento tecnológico para empresas." },
  { path: "/servicios/seo-para-empresas-chile", description: "SEO para empresas en Chile." },
  { path: "/planes", description: "Planes y precios oficiales de páginas web, tiendas y sistemas." },
  { path: "/cotizador", description: "Cotizador online para estimar el valor de un proyecto." },
  { path: "/casos-exito", description: "Casos de éxito y proyectos entregados." },
  { path: "/quienes-somos", description: "Quiénes somos: equipo, historia y datos formales de Zyteron SpA." },
  { path: "/faq", description: "Preguntas frecuentes sobre precios, plazos y servicios." },
  { path: "/contacto", description: "Contacto y solicitud de cotización." },
];

function buildLlmsMarkdown(): string {
  const { business, contact, address } = siteConfig;

  const pagesSection = CANONICAL_PAGES.map(
    (page) => `- ${abs(page.path)} — ${page.description}`,
  ).join("\n");

  const plansSection = PLANS.map(
    (plan) => `- ${plan.name}: ${plan.price}${plan.note ? ` (${plan.note})` : ""}`,
  ).join("\n");

  const addonsSection = ADDONS.map(
    (addon) => `- ${addon.name}: ${addon.price}${addon.note ? ` (${addon.note})` : ""}`,
  ).join("\n");

  const aiSection = AI_SERVICES.map(
    (service) =>
      `- ${service.name}: implementación ${service.setup}${service.monthly ? `, mensualidad ${service.monthly}` : ""}. ${service.description}`,
  ).join("\n");

  const maintenanceSection = MAINTENANCE.map(
    (item) => `- ${item.name}: ${item.price}`,
  ).join("\n");

  return `# ${siteConfig.legalName} (${siteConfig.name})

> ${siteConfig.legalName} (RUT ${siteConfig.taxId}) es una empresa chilena de desarrollo web fundada en ${siteConfig.foundingDate}, con oficina en ${address.display}; desarrolla páginas web, tiendas online, sistemas a medida, automatización y soporte TI para empresas y pymes de todo Chile.

Sitio web: ${siteConfig.url}
Equipo con más de ${business.experienceYears} años de experiencia en desarrollo y tecnología, liderado por ${siteConfig.representative.name} (${siteConfig.representative.role}).

## Servicios y páginas canónicas

${pagesSection}

## Planes y precios oficiales (CLP, no incluyen IVA)

${plansSection}

Nota: ${PRICING_NOTE}

## Servicios de inteligencia artificial

${aiSection}

## Servicios adicionales más consultados

${addonsSection}

## Mantención mensual

${maintenanceSection}

## Plazos típicos de entrega

- Landing o web simple: 1 a 2 semanas.
- Sitio corporativo completo: 3 a 6 semanas, según contenido, revisiones e integraciones.
- Tiendas online y sistemas a medida: se cotizan con plazo definido según alcance.

## Proceso de trabajo

1. Escuchamos la necesidad del negocio.
2. Ordenamos el requerimiento y proponemos la solución más eficiente.
3. Cotizamos por escrito con alcance y valores definidos.
4. Desarrollamos y revisamos en conjunto antes del lanzamiento.
5. Entregamos accesos y credenciales, con soporte posterior según el servicio contratado.

## Cobertura

Atendemos clientes en todo Chile, de forma remota o presencial, con base en ${address.commune}, ${address.city} (${address.streetAddress}).

## Contacto

- WhatsApp: ${contact.phoneDisplay} (${siteConfig.social.whatsapp})
- Correo: ${contact.email}
- Horario: ${business.hoursDisplay}
- Cotizaciones: ${abs("/cotizador")} o ${abs("/contacto")}

## Enlaces clave

- Planes y precios: ${abs("/planes")}
- Cotizador online: ${abs("/cotizador")}
- Casos de éxito: ${abs("/casos-exito")}
- Preguntas frecuentes: ${abs("/faq")}
`;
}

export function GET(): Response {
  return new Response(buildLlmsMarkdown(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
