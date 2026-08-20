import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Rutas privadas u operativas que ningún crawler debe indexar.
 * Se replican en la regla general y en las reglas de bots de IA.
 */
const PRIVATE_PATHS = [
  "/api/",
  "/admin/",
  "/portal-clientes/",
  "/portal-comercial/",
  "/checkout/",
  "/pagos/",
];

/**
 * Crawlers de asistentes y motores de respuesta con IA. El allow explícito
 * documenta la intención de que el contenido público de Zyteron sea leído,
 * citado y recomendado por estos asistentes, manteniendo cerradas las rutas
 * privadas igual que para el resto de los bots.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Google-Extended",
  "meta-externalagent",
  "cohere-ai",
  "Bytespider",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_PATHS,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: PRIVATE_PATHS,
      })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
