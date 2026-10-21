import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { siiDocumentCatalog, type Role } from "../../full-control/contracts";
import { financeApi, FinanceApiError } from "../../full-control/lib/finance-api";
import { readHrSii, filterSiiCatalog, siiDownloadPath } from "../../full-control/lib/hr-sii";
import { resolveHrRoute } from "../../full-control/lib/hr-presentation";
import { HrSiiWorkspace } from "../../full-control/components/hr/hr-sii-workspace";

const id = "10000000-0000-4000-8000-000000000001";
const readiness = {
  provider: "SII_DIRECT",
  environment: "CERTIFICATION",
  requirements: [],
  missing: [],
  canIssue: false,
};
const page = {
  items: [
    {
      id,
      documentTypeCode: 33,
      folio: 42,
      issueDate: "2026-01-01",
      environment: "CERTIFICATION",
      status: "SUBMITTED",
      trackId: null,
      statusMessage: null,
    },
  ],
  total: 1,
  page: 1,
  totalPages: 1,
};

test("catálogo único conserva los doce tipos y sus contratos espejo", () => {
  assert.deepEqual(
    siiDocumentCatalog.map((item) => item.code),
    [33, 34, 39, 41, 43, 46, 52, 56, 61, 110, 111, 112],
  );
  assert.equal(
    readFileSync("src/full-control/contracts/sii-catalog.ts", "utf8"),
    readFileSync("control-runtime/contracts/src/sii-catalog.ts", "utf8"),
  );
});

test("las rutas de cada tipo SII se validan sin confundir códigos con IDs laborales", () => {
  for (const { code } of siiDocumentCatalog) {
    const route = resolveHrRoute(["sii", String(code)]);
    assert.equal(route.invalid, false);
    assert.equal(route.documentTypeCode, code);
    assert.equal(route.recordId, null);
    assert.equal(route.employeeId, null);
  }
  for (const code of ["0", "999", "033", "33.0", "../33", id])
    assert.equal(resolveHrRoute(["sii", code]).invalid, true);
  assert.equal(resolveHrRoute(["sii", "33", "otro"]).invalid, true);
});

test("búsqueda y familias conservan distinciones de boletas, sueldos y exportación", () => {
  assert.deepEqual(
    filterSiiCatalog("exportacion", "").map((item) => item.code),
    [110, 111, 112],
  );
  assert.deepEqual(
    filterSiiCatalog("", "Boletas").map((item) => item.code),
    [39, 41],
  );
  assert.deepEqual(
    filterSiiCatalog("52", "").map((item) => item.code),
    [52],
  );
  assert.equal(filterSiiCatalog("inexistente", "").length, 0);
});

test("perfiles sin permiso financiero no consultan la API y conservan el catálogo público", async (t) => {
  t.mock.method(financeApi, "get", async () => {
    throw Error("UNEXPECTED_REQUEST");
  });
  for (const role of ["RRHH", "PROGRAMADOR", "EJECUTIVA_VENTAS"] as Role[]) {
    const result = await readHrSii(role, 33, 1, () => true);
    assert.equal(result?.restricted, true);
    assert.equal(result?.types.length, 0);
    const html = renderToStaticMarkup(
      createElement(HrSiiWorkspace, { role, documentTypeCode: 33 }),
    );
    assert.equal((html.match(/class="hrSiiCard(?: selected)?"/g) ?? []).length, 12);
    assert.match(html, /Acceso financiero restringido/);
    assert.doesNotMatch(html, /Verificar conexión técnica/);
    assert.doesNotMatch(html, /Preparar borrador en Finanzas/);
  }
});

test("consultas usan tipo persistente y paginación, sin escrituras ni conciliación", async (t) => {
  const paths: string[] = [];
  t.mock.method(financeApi, "get", async (_role: Role, path: string) => {
    paths.push(path);
    return path.endsWith("/readiness")
      ? readiness
      : path.includes("tax-documents?")
        ? { ...page, page: 2 }
        : [{ code: 33, enabledForIssue: false, certified: false }];
  });
  const result = await readHrSii("FINANZAS", 33, 2, () => true);
  assert.equal(result?.documents?.items[0]?.id, id);
  assert(paths.includes("/dte/document-types/33/readiness"));
  assert(paths.includes("/tax-documents?documentTypeCode=33&pageSize=8&page=2"));
  assert.equal(paths.length, 3);
});

test("rechazo de autorización invalida todos los resultados parciales", async (t) => {
  t.mock.method(financeApi, "get", async (_role: Role, path: string) => {
    if (path.endsWith("/readiness")) throw new FinanceApiError("Denegado", 403);
    return path.includes("tax-documents?")
      ? page
      : [{ code: 33, enabledForIssue: false, certified: true }];
  });
  const result = await readHrSii("FINANZAS", 33, 1, () => true);
  assert.equal(result?.restricted, true);
  assert.deepEqual(result?.types, []);
  assert.equal(result?.documents, null);
  assert.equal(result?.readiness, null);
});

test("errores parciales e información de otro tipo no se presentan como ausencia ni éxito", async (t) => {
  t.mock.method(financeApi, "get", async (_role: Role, path: string) => {
    if (path.endsWith("/readiness")) throw Error("Fuente temporalmente indisponible");
    return path.includes("tax-documents?")
      ? page
      : [{ code: 52, enabledForIssue: false, certified: false }];
  });
  const result = await readHrSii("FINANZAS", 52, 1, () => true);
  assert.equal(result?.restricted, false);
  assert.match(result?.errors.readiness ?? "", /indisponible/);
  assert.match(result?.errors.documents ?? "", /no corresponde/);
  assert.equal(result?.documents, null);
  assert.equal(result?.types[0]?.code, 52);
});

test("respuestas tardías y consultas inválidas no cambian el documento visible", async (t) => {
  let current = true,
    release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requests = 0;
  t.mock.method(financeApi, "get", async (_role: Role, path: string) => {
    requests++;
    await gate;
    return path.endsWith("/readiness") ? readiness : path.includes("tax-documents?") ? page : [];
  });
  const pending = readHrSii("FINANZAS", 33, 1, () => current);
  current = false;
  release();
  assert.equal(await pending, null);
  assert.equal(requests, 3);
  for (const [code, number] of [
    [999, 1],
    [33, 0],
    [33, 1.5],
  ])
    await assert.rejects(
      readHrSii("FINANZAS", code!, number!, () => true),
      /inválida/,
    );
  assert.equal(requests, 3);
});

test("descargas solo admiten ID de documento y formato fijo, sin rutas de almacenamiento", () => {
  assert.equal(siiDownloadPath(id, "pdf"), `/tax-documents/${id}/pdf`);
  assert.equal(siiDownloadPath(id, "xml"), `/tax-documents/${id}/xml`);
  for (const invalid of ["../../archivo", "finance-documents/a.pdf", "https://otro.invalid", "33"])
    assert.throws(() => siiDownloadPath(invalid, "pdf"));
  assert.throws(() => siiDownloadPath(id, "json" as "pdf"), /Formato/);
});

test("datos incompletos y persistencia ausente tienen estados explícitos sin registros ficticios", async (t) => {
  let mode = "catalog";
  t.mock.method(financeApi, "get", async (_role: Role, path: string) => {
    if (path.endsWith("/readiness"))
      return mode === "readiness"
        ? { ...readiness, requirements: [null] }
        : mode === "memory"
          ? {
              ...readiness,
              requirements: [
                {
                  key: "persistence",
                  label: "Persistencia",
                  detail: "No configurada",
                  satisfied: false,
                },
              ],
            }
          : readiness;
    if (path.includes("tax-documents?"))
      return mode === "documents" ? { ...page, items: [null] } : page;
    return mode === "catalog"
      ? [{ code: 33, enabledForIssue: "false", certified: true }]
      : [{ code: 33, enabledForIssue: false, certified: false }];
  });
  for (const source of ["catalog", "readiness", "documents"] as const) {
    mode = source;
    const result = await readHrSii("FINANZAS", 33, 1, () => true);
    assert.ok(result?.errors[source]);
  }
  mode = "memory";
  const result = await readHrSii("FINANZAS", 33, 1, () => true);
  assert.equal(result?.documents, null);
  assert.match(result?.errors.documents ?? "", /Persistencia no configurada/);
});
