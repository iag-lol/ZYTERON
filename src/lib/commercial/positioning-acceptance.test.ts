import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PROJECT_TYPES,
  resolveRequestContext,
  serviceLineFor,
  serviceContactHref,
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

test("apoyo empresarial e IA conservan su servicio sin entrar al cotizador de páginas web", () => {
  for (const [slug, type] of [
    ["creacion-empresas-chile", "Creación de empresas"],
    ["regalos-corporativos-chile", "Regalos corporativos"],
    ["apoyo-empresarial", "Apoyo empresarial y administrativo"],
  ]) {
    const url = new URL(serviceContactHref(slug), "https://www.zyteron.cl");
    assert.equal(url.pathname, "/contacto");
    assert.equal(url.searchParams.get("servicio"), slug);
    assert.equal(url.searchParams.get("tipo"), "orientacion");
    const context = resolveRequestContext(url.searchParams);
    assert.equal(context.projectType, type);
    assert.equal(context.solutionFamily, "apoyo_empresarial");
    assert.equal(serviceLineFor(`/servicios/${slug}`), "apoyo_empresarial");
    assert.equal(solutionFamilyFor(context.projectType), "apoyo_empresarial");
    assert.equal(serviceLineFor(context.projectType), "apoyo_empresarial");
    assert.ok((PROJECT_TYPES as readonly string[]).includes(context.projectType));
  }
  const aiUrl = new URL(serviceContactHref("asistentes-ia-para-webs"), "https://www.zyteron.cl");
  assert.equal(aiUrl.searchParams.get("servicio"), "asistentes-ia-para-webs");
  assert.equal(aiUrl.searchParams.get("tipo"), "automatizacion");
  const context = resolveRequestContext(aiUrl.searchParams);
  assert.equal(context.projectType, PROJECT_TYPES[6]);
  assert.equal(context.solutionFamily, "automatizacion");
  assert.equal(serviceLineFor("/servicios/asistentes-ia-para-webs"), "sistemas_automatizacion");
});

test("apps móviles conservan su necesidad y recorrido de software sin confundir WhatsApp", () => {
  const url = new URL(serviceContactHref("desarrollo-apps-moviles"), "https://www.zyteron.cl");
  assert.equal(url.pathname, "/contacto");
  assert.equal(url.searchParams.get("servicio"), "desarrollo-apps-moviles");
  assert.equal(url.searchParams.get("tipo"), "sistema");
  const context = resolveRequestContext(url.searchParams);
  assert.equal(context.projectType, "Aplicación móvil Android o iOS");
  assert.ok((PROJECT_TYPES as readonly string[]).includes(context.projectType));
  for (const value of [context.projectType, "/servicios/desarrollo-apps-moviles"]) {
    assert.equal(solutionFamilyFor(value), "software");
    assert.equal(serviceLineFor(value), "sistemas_automatizacion");
  }
  assert.equal(context.solutionFamily, "software");
  assert.equal(context.serviceLine, "sistemas_automatizacion");
  assert.equal(solutionFamilyFor("/automatizacion-whatsapp-empresas"), "automatizacion");
  assert.notEqual(solutionFamilyFor("WhatsApp"), "software");
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
