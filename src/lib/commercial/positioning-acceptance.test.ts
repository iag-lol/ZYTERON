import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PROJECT_TYPES,
  resolveRequestContext,
  serviceLineFor,
  solutionFamilyFor,
} from "./request-context";
import { safeEventParams } from "../analytics/event-privacy";
import { quoteRequestSchema } from "../quote-requests";

test("una consulta general no presupone web; el contexto específico prevalece y conserva el plan", () => {
  assert.equal(resolveRequestContext(new URLSearchParams("origen=inicio")).projectType, "");
  for (const [query, type, family] of [
    ["servicio=gestion-personas", PROJECT_TYPES[4], "personas_operaciones"],
    ["tipo=sistema&servicio=control-flota", PROJECT_TYPES[5], "personas_operaciones"],
    ["servicio=catalogos-digitales&plan=catalogo", PROJECT_TYPES[2], "comercio_digital"],
    ["servicio=paginas-web/constructoras&tipo=web", PROJECT_TYPES[0], "sitios_web"],
    ["servicio=desconocido&tipo=sistema", PROJECT_TYPES[3], "software"],
    ["tipo=orientacion", PROJECT_TYPES[7], "sin_definir"],
    ["plan=catalogo", PROJECT_TYPES[2], "comercio_digital"],
  ]) {
    const context = resolveRequestContext(new URLSearchParams(query));
    assert.equal(context.projectType, type, query);
    assert.equal(context.solutionFamily, family, query);
  }
  assert.equal(serviceLineFor(PROJECT_TYPES[4]), "sistemas_automatizacion");
  assert.equal(solutionFamilyFor("/automatizacion-whatsapp-empresas"), "automatizacion");
  assert.equal(solutionFamilyFor("/sistemas-web/intranet-corporativa"), "software");
});

test("el backend recibe las nuevas necesidades sin perder el tipo ni aceptar valores arbitrarios", () => {
  const base = {
    clientSubmissionId: "positioning-test-20261108",
    businessName: "Prueba local",
    hasWebsite: "no",
    hasLogo: "no",
    hasDomain: "no",
    hasContent: "no",
    projectAnswers: [{ key: "process", label: "Proceso", value: "Solicitud de prueba local" }],
    budgetRange: "no-claro",
    deadline: "no-claro",
    urgency: "medio",
    contactName: "Prueba local",
    contactEmail: "prueba@example.com",
    contactWhatsapp: "+56911111111",
  };
  for (const projectType of ["catalogo", "gestion-personas", "control-flota"]) {
    const result = quoteRequestSchema.safeParse({ ...base, projectType });
    assert.equal(result.success, true, projectType);
    if (result.success) assert.equal(result.data.projectType, projectType);
  }
  assert.equal(
    quoteRequestSchema.safeParse({ ...base, projectType: "otro-inventado" }).success,
    false,
  );
});

test("la atribución registra familia y ruta pública, descartando consultas y datos personales", () => {
  assert.deepEqual(
    safeEventParams({
      solution_family: "personas_operaciones",
      entry_path: "/sistemas-web/gestion-personas?email=privado@example.com",
      project_id: "fleet",
      message: "Contenido privado",
      email: "privado@example.com",
    }),
    {
      solution_family: "personas_operaciones",
      entry_path: "/sistemas-web/gestion-personas",
      project_id: "fleet",
    },
  );
  assert.deepEqual(
    safeEventParams({
      entry_path: "/administracion/commercial/leads",
      solution_family: "persona@example.com",
    }),
    {},
  );
});
