import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCtaClickEvent } from "./cta-click";

const origin = "https://www.zyteron.cl";

test("los enlaces al cotizador manual conservan el plan sin registrar datos personales", () => {
  const event = buildCtaClickEvent(
    "/cotizador/manual?plan=ecommerce&email=cliente@example.com#datos-cliente",
    `${origin}/sistemas-web?email=cliente@example.com#consulta`,
  );
  assert.deepEqual(event, {
    eventName: "quote_cta_click",
    params: {
      page_path: "/sistemas-web",
      destination_path: "/cotizador/manual",
      form_type: "manual_quote",
      plan_id: "ecommerce",
      solution_family: "comercio_digital",
      service_line: "web_ecommerce",
    },
  });
});

test("cotizador, alias y subrutas cuentan como acceso a cotizar, separado del pago", () => {
  for (const path of [
    "/cotizador?tipo=web#inicio",
    "/cotizar?tipo=web",
    "/cotizador/",
    "/cotizador/manual?plan=pyme",
    "/cotizador/manual/resumen?plan=pyme#precio",
  ]) {
    assert.equal(buildCtaClickEvent(origin + path, origin)?.eventName, "quote_cta_click", path);
  }
  for (const path of [
    "/checkout/finalizado?order=privado",
    "/pagos/finalizado",
    "/api/manual-quote/checkout",
    "/clientes/panel",
    "/cotizador-web-pdf",
    "/cotizador-falso",
  ]) {
    assert.equal(buildCtaClickEvent(path, origin), null, path);
  }
});

test("solo el destino interno atribuye servicio y se omiten campos de contacto externos", () => {
  const contact = buildCtaClickEvent(
    "/contacto?servicio=sistemas-web&email=cliente@example.com#formulario",
    `${origin}/planes`,
  );
  assert.equal(contact?.eventName, "contact_cta_click");
  assert.equal(contact?.params.service_line, "sistemas_automatizacion");
  const business = buildCtaClickEvent(
    "/contacto?servicio=regalos-corporativos-chile&tipo=orientacion",
    `${origin}/planes`,
  );
  assert.equal(business?.params.service_line, "apoyo_empresarial");
  assert.equal(business?.params.solution_family, "apoyo_empresarial");
  for (const href of [
    "https://wa.me/56911111111?text=correo%20cliente@example.com",
    "mailto:cliente@example.com?subject=Consulta",
    "tel:+56911111111",
  ]) {
    const event = buildCtaClickEvent(href, `${origin}/planes`);
    assert.ok(event);
    assert.equal(event.params.destination_path, undefined);
    assert.doesNotMatch(JSON.stringify(event), /cliente|56911111111|subject|text=/);
  }
  assert.equal(buildCtaClickEvent("https://example.com/cotizador/manual", origin), null);
  assert.equal(buildCtaClickEvent("https://wa.me.example.com/56911111111", origin), null);
  assert.equal(buildCtaClickEvent("/cotizador/manual", `${origin}/clientes/panel`), null);
});
