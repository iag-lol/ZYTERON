import assert from "node:assert/strict";
import { test } from "node:test";
import { buildZyteronSystemPrompt } from "../ai/zyteron-knowledge";
import { PLAN_CATALOG, PLAN_PRICE_AMOUNTS } from "../../config/pricing";
import { planOffer } from "../../config/commercial-offer";
import { resolveRequestContext, serviceLineFor } from "./request-context";
import { submissionIdFor, finishSubmission } from "./submission-id";
import {
  campaignApplicationsOpen,
  campaignPublicStatus,
  displayChileDate,
  displayChileTime,
} from "../becas/campaign-status";
import { safeEventParams } from "../analytics/event-privacy";
import { revisePublicArticle } from "../content/public-content-revisions";
import type { DbBlogPost } from "../admin/blog-cases-repository";

test("contacto conserva sistema, automatización, plan y estimación", () => {
  assert.equal(
    resolveRequestContext(new URLSearchParams("tipo=sistema")).projectType,
    "Sistema empresarial",
  );
  assert.equal(
    resolveRequestContext(new URLSearchParams("servicio=automatizacion-whatsapp-empresas"))
      .serviceLine,
    "sistemas_automatizacion",
  );
  assert.equal(
    resolveRequestContext(new URLSearchParams("servicio=gestion-documental")).projectType,
    "Sistema empresarial",
  );
  const store = resolveRequestContext(new URLSearchParams("plan=catalogo&estimado=349990"));
  assert.equal(store.projectType, "Catálogo de productos");
  assert.equal(store.planId, "catalogo");
  assert.equal(store.estimate, 349990);
  assert.equal(resolveRequestContext(new URLSearchParams("estimado=Infinity")).estimate, undefined);
  assert.equal(serviceLineFor("/desarrollo-web-santiago"), "sistemas_automatizacion");
});

test("cada precio tiene una oferta, plazo e impuestos coherentes", () => {
  assert.equal(new Set(PLAN_CATALOG.map((p) => p.id)).size, PLAN_CATALOG.length);
  for (const id of Object.keys(PLAN_PRICE_AMOUNTS) as (keyof typeof PLAN_PRICE_AMOUNTS)[]) {
    const plan = planOffer(id);
    assert.equal(plan.amount, PLAN_PRICE_AMOUNTS[id]);
    assert.equal(plan.currency, "CLP");
    assert.equal(plan.taxIncluded, false);
    assert.equal(plan.taxRate, 0.19);
    assert.ok(plan.deadline && plan.recurring && plan.features.length);
  }
  assert.equal(planOffer("ecommerce").deadline, "5 a 8 semanas");
  assert.ok(
    buildZyteronSystemPrompt().includes(`Tienda online: ${planOffer("ecommerce").deadline}`),
  );
  assert.ok(
    buildZyteronSystemPrompt().includes(`Página web para pyme: ${planOffer("pyme").deadline}`),
  );
  assert.notEqual(planOffer("catalogo").amount, planOffer("ecommerce").amount);
});

test("reintentos conservan la clave y editar los datos crea una nueva", async () => {
  const request = { name: "Prueba", message: "Solicitud controlada" };
  const first = await submissionIdFor("test", request);
  assert.equal(await submissionIdFor("test", request), first);
  assert.notEqual(await submissionIdFor("test", { ...request, message: "Cambio" }), first);
  finishSubmission("test");
  assert.notEqual(await submissionIdFor("test", request), first);
});

test("una edición vencida no recibe postulaciones aunque la base conserve active", () => {
  const campaign = {
    status: "active",
    starts_at: "2026-08-01T03:00:00Z",
    ends_at: "2026-08-17T03:59:00Z",
  };
  assert.equal(campaignApplicationsOpen(campaign, new Date("2026-11-08")), false);
  assert.equal(campaignPublicStatus(campaign, new Date("2026-11-08")), "closed");
  assert.equal(campaignPublicStatus(campaign, new Date("2026-07-08")), "scheduled");
  assert.equal(campaignApplicationsOpen(campaign, new Date("2026-08-08")), true);
  assert.equal(campaignApplicationsOpen(campaign, new Date(campaign.ends_at)), false);
  assert.equal(campaignApplicationsOpen({ status: "active" }), false);
  assert.equal(
    campaignPublicStatus({ ...campaign, status: "winner_published" }),
    "winner_published",
  );
  assert.equal(campaign.status, "active");
  assert.equal(displayChileDate("2026-11-08T03:30:00Z"), "08-11-2026");
  assert.equal(displayChileTime("2026-11-08T03:30:00Z"), "00:30");
});

test("Analytics descarta datos personales, mensajes de WhatsApp y rutas privadas", () => {
  const result = safeEventParams({
    name: "Prueba",
    email: "persona@example.com",
    phone: "+56911111111",
    message: "secreto",
    link_text: "persona@example.com",
    page_path: "/contacto?email=persona@example.com",
    destination_path: "/portal-clientes/documentos/123",
    service_line: "sistemas_automatizacion",
    lead_id: "ab000000-0000-5000-a000-000000000000",
    step: 2,
  });
  assert.deepEqual(result, {
    page_path: "/contacto",
    service_line: "sistemas_automatizacion",
    lead_id: "ab000000-0000-5000-a000-000000000000",
    step: 2,
  });
  assert.equal(JSON.stringify(result).includes("persona"), false);
  for (const route of [
    "/clientes/documentos/123",
    "/administracion/commercial",
    "/boletas/consulta?rut=1",
    "/checkout",
    "/pagos",
    "/login",
  ]) {
    assert.deepEqual(safeEventParams({ page_path: route, destination_path: route }), {});
  }
});

test("comparativas conservan URL, diferencian intención y respetan futuras ediciones", () => {
  const base = {
    id: "test",
    slug: "diferencia-pagina-web-tienda-online-sistema-web",
    title: "Anterior",
    content: "un sistema web se paga solo con ese tiempo recuperado",
    updatedAt: "2026-08-23T00:00:00Z",
    status: "published",
  } as DbBlogPost;
  const revised = revisePublicArticle(base);
  const other = revisePublicArticle({
    ...base,
    slug: "pagina-web-tienda-online-o-sistema-web-cual-necesita-tu-empresa",
  });
  assert.equal(revised.slug, base.slug);
  assert.notEqual(revised.metaTitle, other.metaTitle);
  assert.ok(!revised.content.includes("se paga solo"));
  assert.match(revised.content, /5 a 8 semanas/);
  const newer = { ...base, updatedAt: "2026-11-09T00:00:00Z", title: "Nueva edición comercial" };
  assert.equal(revisePublicArticle(newer), newer);
});
