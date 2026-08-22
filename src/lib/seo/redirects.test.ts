import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import nextConfig from "../../../next.config";

type RedirectRule = {
  source: string;
  destination: string;
  permanent?: boolean;
  has?: unknown;
};

const APP_DIR = path.join(process.cwd(), "src", "app");

async function loadRedirects(): Promise<RedirectRule[]> {
  const redirects = nextConfig.redirects;
  assert.ok(typeof redirects === "function", "next.config debe exponer redirects()");
  return (await redirects()) as RedirectRule[];
}

/**
 * Rutas servidas desde la base de datos: existen como segmento dinámico, no
 * como carpeta propia. Un redirect no debe apuntar aquí, porque si la fila no
 * está publicada el destino responde 404.
 */
const DB_BACKED_PREFIXES = ["/blog/", "/casos-exito/"];

/**
 * Resuelve una ruta pública contra el árbol del App Router. Acepta segmentos
 * dinámicos (`[slug]`), porque rutas como /servicios/seo-para-empresas-chile se
 * prerenderizan desde generateStaticParams y no tienen carpeta propia.
 */
function hasStaticRoute(destination: string): boolean {
  const clean = destination.split("?")[0].split("#")[0];
  const segments = clean.split("/").filter(Boolean);

  let dir = APP_DIR;
  for (const segment of segments) {
    const literal = path.join(dir, segment);
    if (existsSync(literal)) {
      dir = literal;
      continue;
    }
    const dynamic = readdirSync(dir, { withFileTypes: true }).find(
      (entry) => entry.isDirectory() && entry.name.startsWith("[") && entry.name.endsWith("]"),
    );
    if (!dynamic) return false;
    dir = path.join(dir, dynamic.name);
  }

  return existsSync(path.join(dir, "page.tsx"));
}

describe("redirecciones · integridad de la tabla", () => {
  it("no encadena redirecciones: ningún destino es a su vez un origen", async () => {
    const redirects = await loadRedirects();
    // Solo las reglas literales pueden compararse por igualdad; las que llevan
    // parámetros (:slug) o condiciones de host se resuelven en runtime.
    const literalSources = new Set(
      redirects.filter((r) => !r.source.includes(":") && !r.has).map((r) => r.source),
    );

    for (const rule of redirects) {
      const destination = rule.destination.split("?")[0];
      if (!destination.startsWith("/")) continue;
      assert.ok(
        !literalSources.has(destination),
        `cadena de redirección: ${rule.source} -> ${destination} -> (otra regla)`,
      );
    }
  });

  it("no tiene ciclos", async () => {
    const redirects = await loadRedirects();
    const map = new Map(
      redirects.filter((r) => !r.source.includes(":") && !r.has).map((r) => [r.source, r.destination]),
    );

    for (const start of map.keys()) {
      const visited = new Set<string>();
      let current: string | undefined = start;
      while (current && map.has(current)) {
        assert.ok(!visited.has(current), `ciclo de redirección detectado en ${current}`);
        visited.add(current);
        current = map.get(current);
      }
    }
  });

  it("usa 308/301 permanentes: ninguna migración definitiva queda temporal", async () => {
    const redirects = await loadRedirects();
    for (const rule of redirects) {
      assert.equal(
        rule.permanent,
        true,
        `${rule.source} debe ser permanente para conservar señales SEO`,
      );
    }
  });

  it("ningún destino depende de la base de datos", async () => {
    const redirects = await loadRedirects();
    for (const rule of redirects) {
      const isDbBacked = DB_BACKED_PREFIXES.some((prefix) => rule.destination.startsWith(prefix));
      assert.ok(
        !isDbBacked,
        `${rule.source} apunta a ${rule.destination}, que sólo existe si la fila está publicada: un despublicado lo convierte en 404`,
      );
    }
  });

  it("todo destino literal corresponde a una página real del App Router", async () => {
    const redirects = await loadRedirects();
    for (const rule of redirects) {
      const destination = rule.destination;
      // Los destinos con parámetros o absolutos (canonicalización de host) se
      // resuelven fuera del árbol de archivos.
      if (!destination.startsWith("/") || destination.includes(":")) continue;
      assert.ok(
        hasStaticRoute(destination),
        `${rule.source} -> ${destination}: no existe page.tsx para ese destino`,
      );
    }
  });
});

describe("redirecciones · destinos bajo /servicios", () => {
  it("apunta sólo a slugs que /servicios/[slug] prerenderiza", async () => {
    const redirects = await loadRedirects();
    const { servicePages } = await import("../../content/service-pages");
    const publicados = new Set(servicePages.map((service) => service.slug));

    // Un destino que apunte a un slug consolidado encadenaría redirecciones, y
    // uno inexistente daría 404: ambos se detectan aquí.
    const consolidados = new Set(
      redirects
        .filter((rule) => rule.source.startsWith("/servicios/"))
        .map((rule) => rule.source.replace("/servicios/", "")),
    );

    for (const rule of redirects) {
      if (!rule.destination.startsWith("/servicios/")) continue;
      const slug = rule.destination.replace("/servicios/", "");
      assert.ok(publicados.has(slug), `${rule.destination} no existe en service-pages.ts`);
      assert.ok(
        !consolidados.has(slug),
        `${rule.source} apunta a ${rule.destination}, que a su vez está consolidado`,
      );
    }
  });
});

describe("redirecciones · consolidaciones de artículos 404", () => {
  it("consolida los artículos históricos sin reemplazo propio", async () => {
    const redirects = await loadRedirects();
    const map = new Map(redirects.map((r) => [r.source, r.destination]));

    const esperados: Record<string, string> = {
      "/blog/cuanto-cuesta-una-pagina-web-en-chile": "/planes",
      "/blog/como-elegir-agencia-diseno-web-chile":
        "/recursos/como-elegir-empresa-desarrollo-web-chile",
      "/blog/elegir-wordpress-nextjs-saas-web-empresa-chile":
        "/recursos/wordpress-vs-web-a-medida-chile",
      "/blog/diseno-web-chile-vs-plantillas": "/recursos/wordpress-vs-web-a-medida-chile",
      "/blog/landing-pages-para-empresas-checklist": "/servicios/landing-pages-para-empresas",
      "/blog/mantencion-web-chile-que-incluye": "/servicios/mantencion-web-chile",
      "/blog/por-que-empresa-necesita-web-profesional": "/paginas-web-para-empresas",
      "/blog/seo-para-pymes-chile": "/servicios/seo-para-empresas-chile",
    };

    for (const [source, destination] of Object.entries(esperados)) {
      assert.equal(map.get(source), destination, `falta o cambió el redirect de ${source}`);
    }
  });

  it("no redirige las URLs que se restauran en su misma dirección", async () => {
    const redirects = await loadRedirects();
    const sources = new Set(redirects.map((r) => r.source));

    // Estas URLs vuelven a responder 200 con contenido propio desde la base.
    // Un redirect sobre ellas las dejaría inalcanzables, porque las reglas de
    // next.config se evalúan antes que el enrutador de archivos.
    const restauradas = [
      "/blog/diferencia-pagina-web-tienda-online-sistema-web",
      "/blog/cuanto-cuesta-pagina-web-empresa-chile",
      "/blog/que-debe-tener-pagina-web-profesional-pyme",
      "/blog/que-es-sistema-web-a-medida",
      "/blog/errores-criticos-contratar-desarrollo-web-chile",
      "/blog/automatizacion-whatsapp-empresas-casos-reales-chile",
      "/blog/checklist-seguridad-digital-pymes-chilenas-2026",
      "/blog/tienda-online-sin-inventario-catalogo-whatsapp",
      "/blog/landing-page-vs-sitio-web-completo-negocio",
      "/blog/soporte-ti-pymes-santiago-que-buscar-evitar",
    ];

    for (const url of restauradas) {
      assert.ok(!sources.has(url), `${url} se restaura con contenido propio: no debe redirigirse`);
    }
  });
});
