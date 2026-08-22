import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import nextConfig from "../../../next.config";

const SRC_DIR = path.join(process.cwd(), "src");
const APP_DIR = path.join(SRC_DIR, "app");

/**
 * Rutas servidas desde la base de datos. Su existencia depende de filas
 * publicadas, no del árbol de archivos, así que se validan por separado.
 */
const DB_BACKED = [/^\/blog\/[^/]+$/, /^\/casos-exito\/[^/]+$/];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(full, out);
    } else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

const isDir = (target: string) => existsSync(target) && statSync(target).isDirectory();
const hasLeaf = (dir: string) =>
  ["page.tsx", "page.ts", "route.ts", "route.tsx"].some((file) => existsSync(path.join(dir, file)));

/**
 * Resuelve una ruta pública contra el App Router. Contempla las tres formas en
 * que un segmento de URL puede materializarse: carpeta literal, segmento
 * dinámico `[param]`, y grupos `(grupo)` que organizan archivos sin aparecer en
 * la URL (por eso se atraviesan sin consumir segmento).
 */
function routeExists(route: string, dir: string = APP_DIR): boolean {
  const segments = route.split("/").filter(Boolean);
  if (segments.length === 0 && hasLeaf(dir)) return true;

  const entries = readdirSync(dir, { withFileTypes: true }).filter((entry) => entry.isDirectory());

  // Grupos de rutas: no consumen segmento, se busca dentro de ellos. También
  // cuando ya no quedan segmentos, porque la página final puede vivir dentro
  // del grupo (por ejemplo /admin en admin/(protected)/page.tsx).
  for (const group of entries.filter((entry) => entry.name.startsWith("("))) {
    if (routeExists(route, path.join(dir, group.name))) return true;
  }

  if (segments.length === 0) return false;

  const [head, ...rest] = segments;
  const restRoute = rest.join("/");
  const literal = path.join(dir, head);
  if (isDir(literal) && routeExists(restRoute, literal)) return true;

  for (const dynamic of entries.filter((entry) => entry.name.startsWith("["))) {
    if (routeExists(restRoute, path.join(dir, dynamic.name))) return true;
  }

  return false;
}

function collectInternalLinks(): Map<string, string[]> {
  const links = new Map<string, string[]>();
  for (const file of walk(SRC_DIR)) {
    const contents = readFileSync(file, "utf8");
    for (const match of contents.matchAll(/href:?\s*[=:]?\s*["'`](\/[^"'`{}\s]*)["'`]/g)) {
      const route = match[1].split("?")[0].split("#")[0].replace(/\/$/, "") || "/";
      if (!links.has(route)) links.set(route, []);
      links.get(route)!.push(path.relative(process.cwd(), file));
    }
  }
  return links;
}

describe("enlaces internos", () => {
  it("no apunta a rutas inexistentes", async () => {
    const redirects = (await nextConfig.redirects!()) as { source: string; destination: string }[];
    const redirectSources = new Set(redirects.map((rule) => rule.source));
    const rotos: string[] = [];

    for (const [route, files] of collectInternalLinks()) {
      if (route.startsWith("//")) continue; // protocol-relative externo
      if (DB_BACKED.some((pattern) => pattern.test(route))) continue;
      if (redirectSources.has(route)) continue; // se valida en redirects.test.ts
      if (routeExists(route)) continue;
      rotos.push(`${route} (enlazado desde ${[...new Set(files)].slice(0, 3).join(", ")})`);
    }

    assert.deepEqual(rotos, [], `enlaces internos rotos:\n${rotos.join("\n")}`);
  });

  it("no enlaza a URLs que redirigen: los enlaces apuntan al destino final", async () => {
    const redirects = (await nextConfig.redirects!()) as {
      source: string;
      destination: string;
      has?: unknown;
    }[];
    // Sólo las reglas literales sin condición de host son comparables con un href.
    const literales = new Map(
      redirects
        .filter((rule) => !rule.source.includes(":") && !rule.has)
        .map((rule) => [rule.source, rule.destination]),
    );

    const indirectos: string[] = [];
    for (const [route, files] of collectInternalLinks()) {
      const destino = literales.get(route);
      if (!destino) continue;
      // next.config declara las reglas: citarse a sí mismo no es un enlace.
      const externos = [...new Set(files)].filter((file) => !file.endsWith("next.config.ts"));
      if (externos.length === 0) continue;
      indirectos.push(`${route} -> ${destino} (enlazado desde ${externos.slice(0, 3).join(", ")})`);
    }

    assert.deepEqual(
      indirectos,
      [],
      `enlaces internos que pasan por una redirección:\n${indirectos.join("\n")}`,
    );
  });
});
