import { createHash } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  contactHtml,
  contactEmailContent,
  contactTemplateSummary,
  parseNotificationRecipients,
} from "./contact-format";
test("escapa contenido del contacto y conserva el enlace dentro del resumen de WhatsApp", () => {
  const payload = {
    kind: "lead",
    title: "Contacto",
    body: "<script>alert(1)</script>" + "x".repeat(3000),
    href: "/administracion/commercial/leads",
    name: "<img src=x>",
  };
  const html = contactHtml(payload);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;img"));
  const summary = contactTemplateSummary(payload);
  assert.ok(summary.length <= 1000);
  assert.ok(summary.endsWith("https://www.zyteron.cl/administracion/commercial/leads"));
});
test("normaliza y elimina duplicados sin aceptar destinatarios inválidos", () => {
  assert.deepEqual(
    parseNotificationRecipients("Contacto@zyteron.cl; contacto@zyteron.cl\nincorrecto", "EMAIL"),
    ["contacto@zyteron.cl"],
  );
  assert.deepEqual(
    parseNotificationRecipients("whatsapp:+56912345678, +56 9 1234 5678, no", "WHATSAPP"),
    ["56912345678"],
  );
});
test("el aviso distingue WhatsApp y chat web y conserva el mensaje escapado con sus saltos", () => {
  const payload = {
    kind: "whatsapp",
    title: "Nuevo mensaje de WhatsApp",
    name: "María González",
    phone: "+56912345678",
    body: "Hola, necesito una página.\n¿Podemos conversar? <script>alert(1)</script>",
    href: "/administracion/commercial/whatsapp?conversation=123",
  };
  const html = contactEmailContent(payload, new Date("2026-10-28T15:29:00Z")).html;
  assert.ok(html.includes("WHATSAPP"));
  assert.ok(html.includes("28-10-2026"));
  assert.ok(html.includes("12:29"));
  assert.ok(html.includes("Hola, necesito una página.<br />¿Podemos conversar? &lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("MENSAJE DEL CLIENTE"));
  assert.ok(
    html.includes("https://www.zyteron.cl/administracion/commercial/whatsapp?conversation=123"),
  );
  assert.ok(html.includes('role="presentation"'));
  assert.ok(!html.includes("<header"));
  const web = contactEmailContent(
    { ...payload, kind: "web", title: "Nuevo mensaje en el chat web" },
    new Date("2026-10-28T15:29:00Z"),
  ).html;
  assert.ok(web.includes("CHAT WEB"));
  assert.ok(!web.includes("WHATSAPP"));
});
test("el contenido del reintento previo conserva el formato anterior y las plantillas específicas se respetan", () => {
  const payload = {
    kind: "web",
    title: "Nuevo mensaje en el chat web",
    body: "Consulta de prueba\nSegunda línea",
    name: "Cliente de prueba",
    href: "/administracion/conversaciones-web?thread=123",
  };
  const previous = contactEmailContent(payload, new Date("2026-10-28T15:29:00Z"), true);
  const later = contactEmailContent(payload, new Date("2026-10-29T15:29:00Z"), true);
  assert.deepEqual(previous, later);
  assert.equal(
    createHash("sha256").update(previous.html).digest("hex"),
    "831d84c23eacb1fd015aec03cd576bf8ef7306bb1a890125cbb8dee6fa666549",
  );
  assert.ok(previous.html.includes("Abrir conversación en Zyteron"));
  assert.ok(!previous.html.includes("MENSAJE DEL CLIENTE"));
  assert.equal(
    contactEmailContent({ ...payload, html: "<p>Plantilla específica</p>" }, new Date()).html,
    "<p>Plantilla específica</p>",
  );
});
