import assert from "node:assert/strict";
import { describe, it } from "node:test";

import nextConfig from "../../../next.config";
import { priorityServicePages } from "../../content/priority-service-pages";
import { seoServicePages } from "../../content/seo-service-pages";
import { servicePages } from "../../content/service-pages";
import { systemPages } from "../../content/system-pages";
import { verticalPages } from "../../content/vertical-pages";

/**
 * El sitemap real consulta Supabase para blog y casos, así que no puede
 * ejecutarse aquí. Estas pruebas cubren la parte declarativa —las rutas que
 * salen de archivos de contenido— que es donde puede colarse una URL
 * consolidada o inexistente.
 */
async function redirectSources(): Promise<Set<string>> {
  const redirects = (await nextConfig.redirects!()) as { source: string; has?: unknown }[];
  return new Set(redirects.filter((rule) => !rule.has).map((rule) => rule.source));
}

const rutasDeContenido = () => [
  ...priorityServicePages.map((page) => page.path),
  ...seoServicePages.map((page) => page.path),
  ...verticalPages.map((page) => page.path),
  ...systemPages.map((page) => page.path),
  ...servicePages.map((service) => `/servicios/${service.slug}`),
];

describe("sitemap · integridad de las rutas declarativas", () => {
  it("excluye del sitemap toda ruta que tenga una redirección", async () => {
    const sources = await redirectSources();

    // Estas listas replican los filtros del sitemap: lo que el sitemap excluye
    // debe ser exactamente lo que está redirigido.
    const consolidadas = new Set([
      "/tiendas-online-chile",
      "/sistemas-web-a-medida",
      ...[
        "desarrollo-web-chile",
        "paginas-web-para-empresas",
        "creacion-de-sitios-web-para-empresas",
        "paginas-web-para-pymes",
        "diseno-web-chile",
        "agencia-diseno-web-chile",
        "diseno-web-santiago",
      ].map((slug) => `/servicios/${slug}`),
    ]);

    const publicadas = rutasDeContenido().filter((route) => !consolidadas.has(route));

    for (const route of publicadas) {
      assert.ok(
        !sources.has(route),
        `${route} entra al sitemap pero está redirigida: el sitemap no debe listar redirecciones`,
      );
    }
  });

  it("no publica rutas duplicadas", () => {
    const publicadas = rutasDeContenido();
    const vistos = new Set<string>();
    const duplicados: string[] = [];

    for (const route of publicadas) {
      if (vistos.has(route)) duplicados.push(route);
      vistos.add(route);
    }

    assert.deepEqual(duplicados, [], `rutas duplicadas en el sitemap: ${duplicados.join(", ")}`);
  });

  it("mantiene en el sitemap las páginas prioritarias pendientes de indexación", () => {
    const publicadas = new Set(rutasDeContenido());
    const pendientes = [
      "/paginas-web-santiago",
      "/paginas-web/constructoras",
      "/paginas-web/industria-b2b",
      "/paginas-web/servicios-profesionales",
      "/sistemas-web/gestion-documental",
      "/sistemas-web/intranet-corporativa",
    ];

    for (const route of pendientes) {
      assert.ok(publicadas.has(route), `${route} debe seguir declarada en el sitemap`);
    }
  });
});
