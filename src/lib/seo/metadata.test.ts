import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { serializeJsonLd } from "../../components/seo/json-ld";
import { buildAbsoluteUrl } from "../schema";
import { buildRssFeed, escapeXml } from "./rss";
import type { DbBlogPost } from "../admin/blog-cases-repository";

describe("SEO · URLs y serialización", () => {
  it("conserva URLs HTTPS externas con query string para imágenes sociales", () => {
    const external = "https://cdn.example.com/portadas/articulo.webp?width=1200&v=2";
    assert.equal(buildAbsoluteUrl(external), external);
  });

  it("convierte rutas internas en URLs canónicas absolutas", () => {
    assert.equal(
      buildAbsoluteUrl("/servicios/seo-para-empresas-chile"),
      "https://www.zyteron.cl/servicios/seo-para-empresas-chile",
    );
  });

  it("neutraliza cierres de script dentro de JSON-LD administrable", () => {
    const serialized = serializeJsonLd({ name: "</script><script>alert('x')</script>" });
    assert.ok(!serialized.includes("<script>"));
    assert.ok(!serialized.includes("</script>"));
    assert.match(serialized, /\\u003c\/script\\u003e/);
  });
});

describe("SEO · RSS", () => {
  const post: DbBlogPost = {
    id: "post-1",
    slug: "guia-seo",
    title: "SEO & ventas <Chile>",
    excerpt: "Una guía práctica & verificable.",
    content: "Contenido",
    coverImageUrl: null,
    coverImageAlt: null,
    category: "SEO",
    tags: ["Empresas"],
    readMinutes: 5,
    author: "Equipo Zyteron",
    status: "published",
    metaTitle: null,
    metaDescription: null,
    keywords: null,
    ogImageUrl: null,
    publishedAt: "2026-09-20T12:00:00.000Z",
    createdAt: "2026-09-20T12:00:00.000Z",
    updatedAt: "2026-09-21T12:00:00.000Z",
  };

  it("escapa contenido XML sin perder las URLs canónicas", () => {
    const feed = buildRssFeed([post], new Date("2026-09-23T00:00:00.000Z"));
    assert.match(feed, /SEO &amp; ventas &lt;Chile&gt;/);
    assert.match(feed, /https:\/\/www\.zyteron\.cl\/blog\/guia-seo/);
    assert.match(feed, /<atom:link[^>]+type="application\/rss\+xml"/);
    assert.equal(feed.includes("SEO & ventas <Chile>"), false);
  });

  it("escapa los cinco caracteres reservados de XML", () => {
    assert.equal(escapeXml(`&<>"'`), "&amp;&lt;&gt;&quot;&apos;");
  });
});
