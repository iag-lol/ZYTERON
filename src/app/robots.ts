import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/**
 * Sólo se bloquean endpoints sin contenido HTML útil. Las áreas privadas y las
 * páginas de resultado de pago ya emiten `noindex`; deben poder rastrearse para
 * que Google vea esa directiva y las retire del índice. robots.txt no reemplaza
 * la autenticación y bloquear allí una URL puede dejarla indexada sin snippet.
 */
const CRAWL_BLOCKED_PATHS = ["/api/"];

/**
 * Crawlers de asistentes y motores de respuesta con IA. El allow explícito
 * documenta la intención de que el contenido público de Zyteron sea leído,
 * citado y recomendado por estos asistentes. Los endpoints de API permanecen
 * fuera del rastreo igual que para el resto de los bots.
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
        disallow: CRAWL_BLOCKED_PATHS,
      },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: CRAWL_BLOCKED_PATHS,
      })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
