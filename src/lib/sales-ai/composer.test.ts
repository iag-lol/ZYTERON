import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkOutreachQuality,
  factAuditResponseSchema,
  outreachContentSchema,
  type OutreachContent,
} from "./rules";

/** Correo de referencia que sí cumple: 140-220 palabras y nombra la empresa. */
function buildValidContent(overrides: Partial<OutreachContent> = {}): OutreachContent {
  const body = [
    "Hola Alejandro,",
    "",
    "Revisé el sitio de LogisCargo y vi que publican seguimiento de carga y datos de contacto, pero no hay una forma estructurada de pedir una cotización de flete desde la web.",
    "",
    "Eso significa que cada solicitud llega por teléfono o correo sin origen, destino ni tipo de carga, y alguien del equipo tiene que perseguir esos datos antes de poder cotizar. En transporte, esa demora suele decidir quién se queda con el servicio.",
    "",
    "Lo que hacemos en Zyteron es agregar un formulario de cotización que pida esos campos desde el principio y descarte automáticamente los destinos fuera de cobertura, sobre el sitio que ya tienen.",
    "",
    "El equipo comercial recibe la solicitud completa y responde antes, sin ida y vuelta. Una web con esa estructura parte desde $399.990 más IVA, según el alcance final.",
    "",
    "¿Te sirve que le prepare una propuesta breve con el detalle?",
    "",
    "Si prefieres que no volvamos a escribirte, respóndeme con una línea y no insistimos.",
  ].join("\n");

  return {
    subject: "Cotización de fletes desde el sitio de LogisCargo",
    greeting: "Hola Alejandro,",
    company_observation: "Publican tracking pero no un cotizador estructurado.",
    detected_opportunity: "Las solicitudes llegan incompletas y demoran la respuesta.",
    recommended_solution: "Formulario de cotización con origen, destino y tipo de carga.",
    commercial_benefits: "Responder antes y con la información completa.",
    call_to_action: "¿Te preparo una propuesta breve?",
    body_text: body,
    confidence: 0.86,
    requires_review: false,
    review_reason: "",
    ...overrides,
  };
}

const company = { name: "LogisCargo", contactName: "Alejandro" };

describe("calidad del primer contacto", () => {
  it("acepta un correo profesional y específico", () => {
    const issues = checkOutreachQuality(buildValidContent(), company);
    assert.deepEqual(issues, []);
  });

  it("rechaza un correo que no nombra a la empresa", () => {
    const content = buildValidContent({
      body_text: buildValidContent().body_text.replace(/LogisCargo/g, "su empresa"),
    });
    const issues = checkOutreachQuality(content, company);
    assert.ok(issues.some((issue) => issue.reason.includes("no menciona a la empresa")));
  });

  it("rechaza las fórmulas vacías de consultor", () => {
    const content = buildValidContent({
      body_text: `Hola,\n\nEs crucial optimizar sus procesos en LogisCargo. ${buildValidContent().body_text}`,
    });
    const issues = checkOutreachQuality(content, company);
    assert.ok(issues.some((issue) => issue.reason.includes("fórmula vacía")));
  });

  it("rechaza un cuerpo demasiado corto", () => {
    const content = buildValidContent({ body_text: "Hola, en LogisCargo podemos ayudarte. Saludos." });
    const issues = checkOutreachQuality(content, company);
    assert.ok(issues.some((issue) => issue.field === "body_text" && issue.reason.includes("140")));
  });

  it("rechaza un asunto fuera del rango de largo", () => {
    const issues = checkOutreachQuality(buildValidContent({ subject: "Hola" }), company);
    assert.ok(issues.some((issue) => issue.field === "subject" && issue.reason.includes("35")));
  });

  it("rechaza asuntos con lenguaje de spam", () => {
    const issues = checkOutreachQuality(
      buildValidContent({ subject: "OFERTA increíble 100% gratis para LogisCargo hoy" }),
      company,
    );
    assert.ok(issues.some((issue) => issue.reason.includes("spam")));
  });

  it("rechaza emojis", () => {
    const issues = checkOutreachQuality(
      buildValidContent({ subject: "Cotización de fletes para LogisCargo 🚚 hoy" }),
      company,
    );
    assert.ok(issues.some((issue) => issue.reason.includes("emojis")));
  });

  it("rechaza que se mencione la naturaleza técnica del asistente", () => {
    const content = buildValidContent({
      body_text: buildValidContent().body_text.replace("Hola Alejandro,", "Hola, soy un bot de LogisCargo,"),
    });
    const issues = checkOutreachQuality(content, company);
    assert.ok(issues.some((issue) => issue.reason.includes("terminología técnica")));
  });
});

describe("esquema estricto del correo", () => {
  it("valida un contenido completo", () => {
    assert.equal(outreachContentSchema.safeParse(buildValidContent()).success, true);
  });

  it("rechaza si falta un bloque obligatorio", () => {
    const { call_to_action, ...incomplete } = buildValidContent();
    void call_to_action;
    assert.equal(outreachContentSchema.safeParse(incomplete).success, false);
  });

  it("normaliza una confianza en porcentaje", () => {
    const result = outreachContentSchema.safeParse(buildValidContent({ confidence: 92 as never }));
    assert.equal(result.success, true);
    assert.equal(result.success && result.data.confidence, 0.92);
  });

  it("rechaza un cuerpo demasiado corto para ser profesional", () => {
    const result = outreachContentSchema.safeParse(buildValidContent({ body_text: "Hola." }));
    assert.equal(result.success, false);
  });
});

describe("auditoría factual del primer contacto", () => {
  it("acepta una auditoría sin afirmaciones inventadas", () => {
    const result = factAuditResponseSchema.safeParse({ supported: true, unsupported_claims: [] });
    assert.equal(result.success, true);
  });

  it("conserva las afirmaciones no respaldadas para revisión humana", () => {
    const result = factAuditResponseSchema.safeParse({
      supported: false,
      unsupported_claims: ["Afirma una presencia activa en redes sociales que no está registrada."],
    });
    assert.equal(result.success, true);
    assert.deepEqual(result.success && result.data.unsupported_claims, [
      "Afirma una presencia activa en redes sociales que no está registrada.",
    ]);
  });

  it("rechaza una respuesta incompleta del auditor", () => {
    const result = factAuditResponseSchema.safeParse({ supported: true });
    assert.equal(result.success, false);
  });
});
