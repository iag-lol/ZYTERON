import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// node scripts/audit-public-site.mjs <origin> <output-directory> [baseline.json]
const [origin = "https://www.zyteron.cl", directory = "tmp/redesign-audit", baselinePath] =
  process.argv.slice(2);
const canonicalOrigin = "https://www.zyteron.cl";
await mkdir(directory, { recursive: true });
const clean = (value = "") =>
  value
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] || "";
async function get(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(90000),
    headers: { "User-Agent": "Zyteron-Acceptance-Audit/1.0" },
  });
  return { response, html: await response.text() };
}
const sitemap = await get(`${origin}/sitemap.xml`);
await writeFile(path.join(directory, "sitemap.xml"), sitemap.html);
const baseline = baselinePath ? JSON.parse(await readFile(baselinePath, "utf8")) : null;
const sitemapPaths = [...sitemap.html.matchAll(/<loc>(.*?)<\/loc>/g)].map(
  (m) => new URL(m[1]).pathname,
);
const paths = [
  ...new Set([
    ...(baseline?.pages?.map((p) => p.path) || sitemapPaths),
    "/contacto?tipo=sistema",
    "/contacto?servicio=tiendas-online",
    "/portal-clientes",
    "/__auditoria_ruta_inexistente__",
  ]),
];
const pages = [];
const queue = [...paths];
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const route = queue.shift();
      try {
        const { response, html } = await get(`${origin}${route}`);
        const metas = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
        const canonical = [...html.matchAll(/<link\b[^>]*>/gi)]
          .map((m) => m[0])
          .find((t) => attr(t, "rel") === "canonical");
        const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => clean(m[1]));
        const scripts = [
          ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
        ];
        const jsonLdErrors = scripts.flatMap((m) => {
          try {
            JSON.parse(m[1]);
            return [];
          } catch {
            return ["Invalid JSON-LD"];
          }
        });
        const links = [
          ...new Set(
            [...html.matchAll(/<a\b[^>]*href="([^"]*)"/gi)]
              .map((m) => m[1])
              .filter((href) => href.startsWith("/") && !href.startsWith("//")),
          ),
        ];
        const record = {
          path: route,
          decision: "conservar",
          status: response.status,
          finalUrl: response.url,
          title: clean(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]),
          description: attr(metas.find((t) => attr(t, "name") === "description") || "", "content"),
          h1,
          canonical: attr(canonical || "", "href"),
          robots: attr(metas.find((t) => attr(t, "name") === "robots") || "", "content"),
          htmlBytes: Buffer.byteLength(html),
          jsonLdCount: scripts.length,
          jsonLdErrors,
          links,
        };
        pages.push(record);
        await writeFile(path.join(directory, `${encodeURIComponent(route)}.html`), html);
      } catch (error) {
        pages.push({ path: route, decision: "conservar", error: String(error) });
      }
    }
  }),
);
pages.sort((a, b) => a.path.localeCompare(b.path));
const issues = pages.flatMap((p) => {
  if (p.error) return [`${p.path}: ${p.error}`];
  if (p.path === "/__auditoria_ruta_inexistente__")
    return p.status === 404 ? [] : [`404 esperado: ${p.status}`];
  if (p.path.startsWith("/portal")) return [];
  return [
    p.status !== 200 && `HTTP ${p.status}`,
    p.h1.length !== 1 && `H1: ${p.h1.length}`,
    !p.title && "Sin title",
    !p.description && "Sin descripción",
    p.canonical !== canonicalOrigin + p.path.split("?")[0].replace(/^\/$/, "") &&
      "Canonical inesperada",
    p.robots.includes("noindex") && "noindex",
    ...p.jsonLdErrors,
  ]
    .filter(Boolean)
    .map((issue) => `${p.path}: ${issue}`);
});
const result = { checkedAt: new Date().toISOString(), origin, sitemapPaths, pages, issues };
await writeFile(path.join(directory, "inventory.json"), JSON.stringify(result, null, 2));
console.log(
  JSON.stringify(
    { pages: pages.length, issues, inventory: path.join(directory, "inventory.json") },
    null,
    2,
  ),
);
if (issues.length) process.exitCode = 1;
