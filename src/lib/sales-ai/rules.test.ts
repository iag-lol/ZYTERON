import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectAutoReply,
  detectBounce,
  detectOptOut,
  evaluateFollowupGuards,
  findForbiddenClientTerms,
  isTaskAllowedForBudget,
  normalizeCompanyName,
  normalizeDomain,
  normalizeEmail,
  normalizePhone,
  normalizePotential,
  normalizeRut,
  requiresHumanByPolicy,
  resolveBudgetLevel,
  suggestMapping,
} from "./rules";

describe("deduplicación · normalizadores", () => {
  it("normaliza correos a minúsculas y descarta los inválidos", () => {
    assert.equal(normalizeEmail("  Contacto@Empresa.CL "), "contacto@empresa.cl");
    assert.equal(normalizeEmail("sin-arroba"), null);
    assert.equal(normalizeEmail(""), null);
  });

  it("extrae el dominio del sitio web e ignora los correos genéricos", () => {
    assert.equal(normalizeDomain("https://www.clinicaabc.cl/contacto", null), "clinicaabc.cl");
    assert.equal(normalizeDomain(null, "juan@transportes.cl"), "transportes.cl");
    // Un gmail no identifica a una empresa: no debe servir para deduplicar.
    assert.equal(normalizeDomain(null, "juan@gmail.com"), null);
  });

  it("normaliza el nombre quitando tipo societario y acentos", () => {
    assert.equal(normalizeCompanyName("Transportes Ñuñoa SpA"), "transportes nunoa");
    assert.equal(normalizeCompanyName("CLÍNICA ABC Ltda."), "clinica abc");
    // Dos escrituras de la misma empresa colapsan al mismo valor.
    assert.equal(normalizeCompanyName("Constructora Sur S.A."), normalizeCompanyName("constructora sur"));
  });

  it("normaliza el RUT con guion", () => {
    assert.equal(normalizeRut("78.398.774-0"), "78398774-0");
    assert.equal(normalizeRut("783987740"), "78398774-0");
    assert.equal(normalizeRut("123"), null);
  });

  it("compara teléfonos por los últimos 9 dígitos", () => {
    assert.equal(normalizePhone("+56 9 3952 6626"), "939526626");
    assert.equal(normalizePhone("939526626"), "939526626");
    assert.equal(normalizePhone("123"), null);
  });
});

describe("no contactar", () => {
  it("detecta las formas habituales de pedir la baja", () => {
    assert.ok(detectOptOut("Por favor no me contacten más."));
    assert.ok(detectOptOut("Quiero darme de baja de esta lista"));
    assert.ok(detectOptOut("unsubscribe"));
    assert.ok(detectOptOut("Elimínenme de sus registros"));
    assert.ok(detectOptOut("No deseo recibir más correos"));
  });

  it("no confunde una respuesta comercial normal con una baja", () => {
    assert.equal(detectOptOut("Me interesa, ¿me contactan la próxima semana?"), false);
    assert.equal(detectOptOut("Gracias por el correo, lo reviso y te aviso."), false);
  });
});

describe("respuestas automáticas", () => {
  it("reconoce un fuera de oficina y no lo trata como interés", () => {
    assert.ok(detectAutoReply("Automatic reply: Fuera de oficina", "Estaré ausente hasta el 20."));
    assert.ok(detectAutoReply("", "Me encuentro de vacaciones hasta marzo."));
  });

  it("no marca como automática una respuesta real", () => {
    assert.equal(detectAutoReply("Re: propuesta", "Nos interesa, conversemos el lunes."), false);
  });
});

describe("rebotes", () => {
  it("exige remitente de sistema Y texto de fallo", () => {
    assert.ok(
      detectBounce({
        from: "postmaster@empresa.cl",
        subject: "Undeliverable: propuesta",
        body: "550 5.1.1 address not found",
      }),
    );
  });

  it("no marca como rebote un correo humano que menciona una entrega fallida", () => {
    assert.equal(
      detectBounce({
        from: "juan@empresa.cl",
        subject: "Consulta",
        body: "El proveedor anterior no se pudo entregar a tiempo, por eso los buscamos.",
      }),
      false,
    );
  });
});

describe("identidad comercial · terminología prohibida", () => {
  it("bloquea menciones a IA en texto hacia el cliente", () => {
    assert.deepEqual(findForbiddenClientTerms("Respuesta generada por IA"), ["IA", "generada por IA"]);
    assert.ok(findForbiddenClientTerms("Soy un bot comercial").includes("bot"));
    assert.ok(findForbiddenClientTerms("Este correo generado automáticamente").length > 0);
  });

  it("deja pasar un correo comercial normal", () => {
    assert.deepEqual(
      findForbiddenClientTerms(
        "Hola Juan, una página web para tu empresa parte en $219.990 + IVA. ¿Conversamos?",
      ),
      [],
    );
  });
});

describe("política de aprobación humana", () => {
  it("escala siempre reclamos y negociaciones", () => {
    assert.ok(requiresHumanByPolicy("RECLAMO", "texto cualquiera"));
    assert.ok(requiresHumanByPolicy("NEGOCIACION", "texto cualquiera"));
  });

  it("escala cuando aparecen temas sensibles aunque la intención sea simple", () => {
    assert.ok(requiresHumanByPolicy("CONSULTA_PRECIO", "¿Me pueden hacer un descuento?"));
    assert.ok(requiresHumanByPolicy("OTRO", "Necesito revisar el contrato con mi abogado."));
  });

  it("no escala una consulta de precio corriente", () => {
    assert.equal(requiresHumanByPolicy("CONSULTA_PRECIO", "¿Cuánto sale una web con agenda?"), null);
  });
});

describe("seguimientos · verificación previa al envío", () => {
  const base = {
    status: "CONTACTADO",
    doNotContact: false,
    emailInvalid: false,
    hasEmail: true,
    alreadyReplied: false,
  };

  it("envía cuando todo está en orden", () => {
    assert.equal(evaluateFollowupGuards(base).shouldSend, true);
  });

  it("cancela si el prospecto ya respondió", () => {
    const result = evaluateFollowupGuards({ ...base, alreadyReplied: true });
    assert.equal(result.shouldSend, false);
    assert.match(result.reason, /respondido/i);
  });

  it("cancela si la oportunidad se ganó", () => {
    const result = evaluateFollowupGuards({ ...base, status: "GANADO" });
    assert.equal(result.shouldSend, false);
    assert.match(result.reason, /GANADO/);
  });

  it("cancela si la oportunidad se perdió", () => {
    assert.equal(evaluateFollowupGuards({ ...base, status: "PERDIDO" }).shouldSend, false);
  });

  it("cancela si pidió no ser contactada", () => {
    const result = evaluateFollowupGuards({ ...base, doNotContact: true });
    assert.equal(result.shouldSend, false);
    assert.match(result.reason, /no ser contactada/i);
  });

  it("cancela si el correo rebotó", () => {
    assert.equal(evaluateFollowupGuards({ ...base, emailInvalid: true }).shouldSend, false);
  });

  it("cancela si hay conversación activa", () => {
    assert.equal(evaluateFollowupGuards({ ...base, status: "NEGOCIACION" }).shouldSend, false);
  });
});

describe("presupuesto de IA", () => {
  it("clasifica el nivel según el porcentaje consumido", () => {
    assert.equal(resolveBudgetLevel(10), "OK");
    assert.equal(resolveBudgetLevel(85), "WARNING");
    assert.equal(resolveBudgetLevel(95), "REDUCED");
    assert.equal(resolveBudgetLevel(120), "BLOCKED");
  });

  it("al 100% solo deja pasar tareas esenciales", () => {
    assert.equal(isTaskAllowedForBudget("BLOCKED", "ESSENTIAL"), true);
    assert.equal(isTaskAllowedForBudget("BLOCKED", "NORMAL"), false);
    assert.equal(isTaskAllowedForBudget("BLOCKED", "BULK"), false);
  });

  it("al 90% suspende solo las tareas masivas", () => {
    assert.equal(isTaskAllowedForBudget("REDUCED", "NORMAL"), true);
    assert.equal(isTaskAllowedForBudget("REDUCED", "BULK"), false);
  });
});

describe("importador · mapeo de columnas", () => {
  it("reconoce encabezados habituales en español", () => {
    const mapping = suggestMapping(["Empresa", "Correo", "Teléfono", "Rubro", "Comuna"]);
    assert.equal(mapping["Empresa"], "name");
    assert.equal(mapping["Correo"], "primary_email");
    assert.equal(mapping["Teléfono"], "phone");
    assert.equal(mapping["Rubro"], "industry");
    assert.equal(mapping["Comuna"], "commune");
  });

  it("no asigna dos columnas al mismo campo", () => {
    const mapping = suggestMapping(["Nombre empresa", "Empresa"]);
    const assigned = Object.values(mapping).filter((value) => value === "name");
    assert.equal(assigned.length, 1);
  });

  it("deja sin asignar lo que no reconoce", () => {
    const mapping = suggestMapping(["Columna rara XYZ"]);
    assert.equal(mapping["Columna rara XYZ"], "");
  });

  it("normaliza el potencial escrito de distintas formas", () => {
    assert.equal(normalizePotential("alto"), "ALTO");
    assert.equal(normalizePotential("Potencial"), "POTENCIAL");
    assert.equal(normalizePotential("bajo"), "BAJO");
    assert.equal(normalizePotential(""), "MEDIO");
    assert.equal(normalizePotential("cualquier cosa"), "MEDIO");
  });
});
