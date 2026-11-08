import test from "node:test";
import assert from "node:assert/strict";
import { presentPublicCase } from "./public-case-presentation";
import type { DbCaseStudy } from "@/lib/admin/blog-cases-repository";

test("la ficha pública elimina la identidad anterior y su imagen sin alterar el registro administrativo", () => {
  const original = {
    slug: "casos-exito-sistema-control-interno-negocios-eliana",
    companyName: "Negocios Eliana",
    problem: "Eliana administraba dos tiendas.",
    solution: "Un sistema para Negocio Eliana.",
    results: "Control de inventario.",
    clientQuote: null,
    metaTitle: "Negocios Eliana",
    metaDescription: "Sistema para Eliana",
    imageUrl: "https://example.com/private-name.jpg",
  } as DbCaseStudy;
  const presented = presentPublicCase(original);
  assert.equal(presented.slug, original.slug);
  assert.equal(presented.companyName, "Centro de Caja");
  assert.equal(presented.imageUrl, "/projects/centro-de-caja.svg");
  const publicFields = Object.fromEntries(
    Object.entries(presented).filter(([key]) => key !== "slug"),
  );
  assert.doesNotMatch(JSON.stringify(publicFields), /eliana|private-name/i);
  assert.equal(original.companyName, "Negocios Eliana");
  assert.equal(original.imageUrl, "https://example.com/private-name.jpg");
});

test("Fenice usa la vista actual y conserva el contenido y la ruta del caso", () => {
  const original = {
    slug: "fenice-spa",
    companyName: "Fenice SPA",
    problem: "Presencia digital",
    imageUrl: "old.jpg",
  } as DbCaseStudy;
  const presented = presentPublicCase(original);
  assert.equal(presented.imageUrl, "/projects/fenice.jpg");
  assert.equal(presented.slug, original.slug);
  assert.equal(presented.problem, original.problem);
});
