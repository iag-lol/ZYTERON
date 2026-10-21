import test from "node:test";
import { roles } from "../../full-control/contracts";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type {
  Employee,
  EmployeeDetail,
  Role,
  HrProviderReadiness,
  HrWorkspace as Workspace,
} from "../../full-control/contracts";
import {
  hrLifecycleProgress,
  hrProviderPresentation,
  hrSections,
  hrSourceState,
  hrStatusTone,
  resolveHrRoute,
  selectHrRecord,
} from "../../full-control/lib/hr-presentation";
import { enterpriseNavigation } from "../../full-control/lib/navigation";
import {
  CommandCenter,
  EmployeeFiles,
  EmployeeRecord,
  HrWorkspace,
  Lifecycle,
  ViewContent,
} from "../../full-control/components/hr/hr-workspace";
import { hrApi, HrApiError, readHrView } from "../../full-control/lib/hr-api";

const id = "10000000-0000-4000-8000-000000000001";
const otherId = "10000000-0000-4000-8000-000000000002";
function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    sourceStatus: "PERSISTENT",
    summary: {
      activeEmployees: 0,
      hiresThisMonth: 0,
      terminationsThisMonth: 0,
      onboardingActive: 0,
      vacationsUpcoming: 0,
      absencesToday: 0,
      contractsExpiring: 0,
      annexesPendingSignature: 0,
      documentsPending: 0,
      requestsPending: 0,
      lrePending: 0,
      offboardingPending: 0,
    },
    attention: [],
    employees: [],
    relationships: [],
    departments: [],
    teams: [],
    positions: [],
    contracts: [],
    annexes: [],
    onboarding: [],
    offboarding: [],
    leave: [],
    medical: [],
    payroll: [],
    lre: [],
    assets: [],
    goals: [],
    training: [],
    activity: [],
    providers: {
      signature: "NOT_CONFIGURED",
      laborAuthority: "EXTERNAL_MANUAL_WITH_EVIDENCE",
      attendance: "NOT_CONFIGURED",
      payrollSubmission: "EXTERNAL_EXPORT_ONLY",
    },
    providerReadiness: [],
    generatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}
const employee: Employee = {
  id,
  userId: null,
  employeeNumber: "TEST-001",
  rut: "TEST",
  firstName: "Persona",
  middleName: null,
  lastName: "Sintética",
  secondLastName: null,
  preferredName: null,
  personalEmail: null,
  corporateEmail: null,
  phone: null,
  birthDate: null,
  nationality: null,
  address: null,
  region: null,
  commune: null,
  emergencyContact: {},
  status: "PRE_HIRE",
  hireDate: null,
  terminationDate: null,
  privacyLevel: "HR_CONFIDENTIAL",
  archivedAt: null,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

function view(viewName: string, data = workspace(), role: Role = "GERENTE_GENERAL") {
  return renderToStaticMarkup(
    createElement(ViewContent, {
      view: viewName,
      data,
      employees: data.employees,
      query: "",
      setQuery: () => {},
      role,
      act: async () => {},
      revision: 0,
    }),
  );
}

test("every HR menu entry resolves once and each section stays contiguous", () => {
  const items = enterpriseNavigation.find((group) => group.id === "hr")!.items;
  assert.equal(items.length, 28);
  assert.equal(new Set(items.map((item) => item.href)).size, 28);
  const finished = new Set<string>();
  let current = "";
  for (const item of items) {
    assert.equal(
      resolveHrRoute(item.href === "/hr" ? [] : item.href.slice(4).split("/")).invalid,
      false,
      item.href,
    );
    assert.ok(item.section);
    if (item.section !== current) {
      assert.ok(!finished.has(item.section!));
      if (current) finished.add(current);
      current = item.section!;
    }
  }
  assert.equal(hrSections.flatMap((section) => [...section.views]).length, 28);
});

test("attention record routes select their target without falling back to an unrelated list", () => {
  for (const view of [
    "contracts",
    "annexes",
    "onboarding",
    "offboarding",
    "vacations",
    "permissions",
    "absences",
    "payroll",
    "lre",
  ]) {
    assert.deepEqual(resolveHrRoute([view, id]), {
      view,
      recordId: id,
      employeeId: null,
      invalid: false,
    });
  }
  assert.deepEqual(resolveHrRoute(["employees", id]), {
    view: "employees",
    recordId: null,
    employeeId: id,
    invalid: false,
  });
  for (const segments of [
    ["unknown"],
    ["files", id],
    ["contracts", "bad-id"],
    ["contracts", id, "edit"],
    ["constructor", id],
    ["employees", "__proto__"],
  ])
    assert.equal(resolveHrRoute(segments).invalid, true);
  assert.match(
    renderToStaticMarkup(createElement(HrWorkspace, { segments: ["contracts", "bad-id"] })),
    /Ruta RR.HH. no disponible/,
  );
});

test("selected records do not mutate or leak other records into a detail route", () => {
  const data = workspace({ contracts: [{ id }, { id: otherId }] as Workspace["contracts"] });
  const selected = selectHrRecord(data, "contracts", id);
  assert.equal(selected.found, true);
  assert.deepEqual(selected.data.contracts, [{ id }]);
  assert.equal(data.contracts.length, 2);
  assert.equal(selectHrRecord(data, "contracts", "missing").found, false);
  assert.equal(selectHrRecord(data, "constructor", id).found, false);
  assert.strictEqual(selectHrRecord(data, "contracts", null).data, data);
});

test("leave record routes respect the vacation and permission source filters", () => {
  const data = workspace({
    leave: [
      { id, leaveType: "VACATION" },
      { id: otherId, leaveType: "ADMINISTRATIVE_LEAVE" },
    ] as Workspace["leave"],
  });
  assert.equal(selectHrRecord(data, "vacations", id).found, true);
  assert.equal(selectHrRecord(data, "permissions", id).found, false);
  assert.equal(selectHrRecord(data, "permissions", otherId).found, true);
});

test("pending states are not colored as completed through substring matches", () => {
  for (const status of [
    "INACTIVE",
    "NOT_APPROVED",
    "READY_FOR_SIGNATURE",
    "SIGNATURE_REQUESTED",
    "PENDING_DT_REGISTRATION",
    "SUBMITTED_EXTERNALLY",
    "READY",
    "UNKNOWN",
  ])
    assert.equal(hrStatusTone(status), "wait", status);
  assert.equal(hrStatusTone("VALIDATION_ERROR"), "bad");
  assert.equal(hrStatusTone("REGISTERED"), "ok");
});

test("offboarding never invents a percentage and invalid onboarding progress stays unknown", () => {
  for (const status of ["INITIATED", "IN_PROGRESS", "BLOCKED", "CANCELLED"])
    assert.equal(hrLifecycleProgress("offboarding", { status }), null);
  assert.equal(hrLifecycleProgress("offboarding", { status: "COMPLETED" }), 100);
  assert.equal(hrLifecycleProgress("onboarding", { status: "IN_PROGRESS", progress: 40 }), 40);
  for (const progress of [-1, 101, NaN, Infinity])
    assert.equal(hrLifecycleProgress("onboarding", { status: "IN_PROGRESS", progress }), null);
  const html = renderToStaticMarkup(
    createElement(Lifecycle, {
      view: "offboarding",
      data: workspace({
        offboarding: [
          {
            id,
            employeeId: id,
            status: "BLOCKED",
            criticalBlockers: 3,
            effectiveDate: "2026-01-02",
          },
        ] as Workspace["offboarding"],
      }),
    }),
  );
  assert.doesNotMatch(html, /35%|role="progressbar"/);
  assert.match(html, /3 bloqueos registrados/);
});

test("empty, unverified and unconfigured sources remain distinct", () => {
  assert.equal(hrSourceState("PERSISTENT"), "available");
  assert.equal(hrSourceState("NOT_CONFIGURED"), "not-configured");
  assert.equal(hrSourceState(undefined), "unverified");
  const html = renderToStaticMarkup(
    createElement(CommandCenter, { data: workspace({ sourceStatus: undefined }) }),
  );
  assert.match(html, />—</);
  assert.doesNotMatch(html, /Sin alertas pendientes|La operación laboral está conectada/);
  assert.match(html, /configuración, integraciones y evidencias externas/);
});

test("external registration remains an evidence step and points to contracts", () => {
  const item = {
    key: "laborAuthority",
    state: "EXTERNAL_STEP",
    status: "EXTERNAL_MANUAL_WITH_EVIDENCE",
    title: "Operativo",
    detail: "",
    label: "Mi DT",
    actionHref: "/hr/lre",
    actionLabel: "Ver LRE",
  } as HrProviderReadiness;
  const presented = hrProviderPresentation(item);
  assert.equal(presented.actionHref, "/hr/contracts");
  assert.match(presented.title, /Pendiente de evidencia/);
  assert.equal(item.actionHref, "/hr/lre");
});

test("employee files use the employee master and never display annexes as documents", () => {
  const html = renderToStaticMarkup(
    createElement(EmployeeFiles, {
      data: workspace({
        employees: [employee],
        annexes: [{ id: otherId, annexType: "SALARY_CHANGE" }] as Workspace["annexes"],
      }),
    }),
  );
  assert.match(html, new RegExp(`/administracion/hr/employees/${id}#expediente`));
  assert.doesNotMatch(html, /Salary change|SALARY_CHANGE/);
});

test("the employee record only offers existing anchors and real linked documents", () => {
  const detail: EmployeeDetail = {
    employee,
    relationship: null,
    contracts: [],
    annexes: [],
    leave: [],
    balance: null,
    medical: [],
    onboarding: [],
    offboarding: [],
    assets: [],
    goals: [],
    training: [],
    documents: {
      documents: [{ id: otherId, title: "Documento sintético", status: "DRAFT" }] as NonNullable<
        EmployeeDetail["documents"]
      >["documents"],
      total: 1,
      expiring: 0,
      pendingReview: 0,
      pendingSignature: 0,
    },
    activity: [],
    compensationVisible: false,
  };
  const html = renderToStaticMarkup(createElement(EmployeeRecord, { data: detail, role: "RRHH" }));
  const anchors = [...html.matchAll(/href="#([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(anchors, ["resumen", "expediente", "asignaciones", "actividad"]);
  for (const anchor of anchors) assert.match(html, new RegExp(`id="${anchor}"`));
  assert.match(html, new RegExp(`/administracion/documents/${otherId}`));
  assert.match(html, /Restringida/);
});

test("restricted payroll is not presented as an empty period and requests do not reuse leave counts", () => {
  assert.match(view("payroll"), /Información restringida/);
  assert.doesNotMatch(view("payroll"), /Sin períodos visibles/);
  assert.match(view("payroll", workspace(), "RRHH"), /Sin períodos visibles/);
  const requests = view(
    "requests",
    workspace({ summary: { ...workspace().summary, requestsPending: 37 } }),
  );
  assert.doesNotMatch(requests, />37</);
  assert.match(requests, /no consulta sus tickets/);
  assert.match(requests, /\/administracion\/support\/tickets/);
});

test("attendance offers a configuration route instead of linking back to the same screen", () => {
  const html = view("attendance");
  assert.match(html, /\/administracion\/hr\/settings#integraciones/);
  assert.doesNotMatch(html, /href="\/administracion\/hr\/attendance"/);
});

test("workforce read APIs use the existing GET endpoints without invoking balance reads or writes", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls.push(url);
    assert.equal(init.method, undefined);
    return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
  });
  await hrApi.performance("RRHH");
  await hrApi.schedules("RRHH");
  assert.deepEqual(calls, [
    "/api/control-core/api/hr/workforce/performance",
    "/api/control-core/api/hr/workforce/schedules",
  ]);
});

test("API permission errors preserve the status so forbidden is not converted into no records", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response(JSON.stringify({ message: "Sin acceso" }), { status: 403 }),
  );
  await assert.rejects(
    () => hrApi.performance("RRHH"),
    (error: unknown) =>
      error instanceof HrApiError && error.status === 403 && error.message === "Sin acceso",
  );
});

test("partial provider metadata still renders every integration without a crash", () => {
  const data = workspace({
    providerReadiness: [
      {
        key: "signature",
        label: "Firma",
        status: "NOT_CONFIGURED",
        state: "ACTION_REQUIRED",
        title: "Pendiente",
        detail: "Sin proveedor",
        actionHref: "/settings/integrations",
        actionLabel: "Revisar",
      },
    ],
  });
  const html = view("attendance", data);
  assert.match(html, /Pendiente de configurar/);
  assert.match(view("settings", data), /Presentación externa/);
});

test("a historical absence selected from a record route is not silently hidden by today's filter", () => {
  const data = workspace({
    leave: [
      {
        id,
        leaveType: "VACATION",
        status: "APPROVED",
        startDate: "2000-01-01",
        endDate: "2000-01-02",
        requestedUnits: 2,
        unit: "DAYS",
      },
    ] as Workspace["leave"],
  });
  const html = renderToStaticMarkup(
    createElement(ViewContent, {
      view: "absences",
      data,
      employees: [],
      query: "",
      setQuery: () => {},
      role: "RRHH",
      act: async () => {},
      revision: 0,
      selectedRecordId: id,
    }),
  );
  assert.doesNotMatch(html, /Sin solicitudes/);
  assert.match(html, /Vacation/);
});

test("LRE uses its schema reference and contract links open the existing document route", () => {
  const lre = workspace({
    lre: [
      { id, payrollPeriodId: otherId, schemaVersionId: otherId, status: "READY" },
    ] as Workspace["lre"],
  });
  const html = view("lre", lre, "RRHH");
  assert.match(html, /Esquema/);
  assert.doesNotMatch(html, /Sin versión calculada/);
  const contractData = workspace({
    contracts: [
      {
        id,
        contractNumber: "TEST-CONTRACT",
        startDate: "2026-01-01",
        status: "DRAFT",
        documentId: otherId,
      },
    ] as Workspace["contracts"],
  });
  assert.match(
    view("contracts", contractData, "RRHH"),
    new RegExp(`/administracion/documents/${otherId}`),
  );
});

test("individual performance views do not substitute goals or fetch the unscoped list", () => {
  const html = view("performance", workspace(), "JEFE_DESARROLLO");
  assert.match(html, /Consulta individual no disponible/);
  assert.doesNotMatch(html, /Objetivos activos|Consultando registros/);
});

function detailFor(person: Employee): EmployeeDetail {
  return {
    employee: person,
    relationship: null,
    contracts: [],
    annexes: [],
    leave: [],
    balance: null,
    medical: [],
    onboarding: [],
    offboarding: [],
    assets: [],
    goals: [],
    training: [],
    documents: null,
    activity: [],
    compensationVisible: false,
  };
}
function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("new performance queries never fetch the unscoped endpoint for any non-HR role", async (t) => {
  let requests = 0;
  t.mock.method(globalThis, "fetch", async () => {
    requests++;
    return jsonResponse([]);
  });
  for (const role of roles.filter((role) => role !== "RRHH")) {
    await assert.rejects(() => hrApi.performance(role), HrApiError);
    assert.match(view("performance", workspace(), role), /Consulta individual no disponible/);
  }
  assert.equal(requests, 0);
});

test("new document metadata and links remain unavailable to every non-HR role even with a populated snapshot", () => {
  const detail = {
    ...detailFor(employee),
    documents: {
      documents: [
        { id: otherId, title: "ARCHIVO-SINTETICO-RESTRINGIDO", status: "DRAFT" },
      ] as NonNullable<EmployeeDetail["documents"]>["documents"],
      total: 1,
      expiring: 0,
      pendingReview: 0,
      pendingSignature: 0,
    },
  };
  for (const role of roles.filter((role) => role !== "RRHH")) {
    const html = renderToStaticMarkup(createElement(EmployeeRecord, { data: detail, role }));
    assert.doesNotMatch(html, /ARCHIVO-SINTETICO-RESTRINGIDO|\/documents\//, role);
    assert.match(html, /Consulta documental individual no disponible/, role);
  }
  assert.match(
    renderToStaticMarkup(createElement(EmployeeRecord, { data: detail, role: "RRHH" })),
    /ARCHIVO-SINTETICO-RESTRINGIDO/,
  );
  const contractData = workspace({
    contracts: [
      {
        id,
        contractNumber: "TEST-CONTRACT",
        startDate: "2026-01-01",
        status: "DRAFT",
        documentId: otherId,
      },
    ] as Workspace["contracts"],
  });
  assert.doesNotMatch(view("contracts", contractData, "GERENTE_GENERAL"), /\/documents\//);
});

test("employee navigation never queries an ID outside the visible directory or an unconfigured source", async (t) => {
  const calls: string[] = [];
  let source = workspace({ employees: [employee] });
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls.push(url);
    assert.equal(init.method, undefined);
    assert.equal(init.body, undefined);
    return jsonResponse(source);
  });
  await assert.rejects(
    () =>
      readHrView(
        "RRHH",
        otherId,
        () => {},
        () => true,
      ),
    (error: unknown) => error instanceof HrApiError && error.status === 404,
  );
  source = workspace({ employees: [employee], sourceStatus: "NOT_CONFIGURED" });
  assert.equal(
    await readHrView(
      "RRHH",
      id,
      () => {},
      () => true,
    ),
    null,
  );
  assert.deepEqual(calls, [
    "/api/control-core/api/hr/workspace",
    "/api/control-core/api/hr/workspace",
  ]);
});

test("forbidden reads and mismatched detail responses never become an empty or different employee record", async (t) => {
  let workspaceUpdates = 0;
  t.mock.method(globalThis, "fetch", async () => jsonResponse({ message: "Sin acceso" }, 403));
  await assert.rejects(
    () =>
      readHrView(
        "RRHH",
        id,
        () => {
          workspaceUpdates++;
        },
        () => true,
      ),
    (error: unknown) => error instanceof HrApiError && error.status === 403,
  );
  assert.equal(workspaceUpdates, 0);
  t.mock.method(globalThis, "fetch", async (url: string) =>
    jsonResponse(
      url.endsWith("/workspace")
        ? workspace({ employees: [employee] })
        : detailFor({ ...employee, id: otherId }),
    ),
  );
  await assert.rejects(
    () =>
      readHrView(
        "RRHH",
        id,
        () => {},
        () => true,
      ),
    (error: unknown) => error instanceof HrApiError && error.status === 502,
  );
});

test("Back/Forward route sequences discard delayed responses and only use GETs for the selected visible employee", async (t) => {
  const secondEmployee = { ...employee, id: otherId, employeeNumber: "TEST-002" };
  let generation = 0,
    displayed: EmployeeDetail | null = null,
    firstA = true;
  let resolveA!: (response: Response) => void, enteredA!: () => void;
  const entered = new Promise<void>((resolve) => {
    enteredA = resolve;
  });
  const delayed = new Promise<Response>((resolve) => {
    resolveA = resolve;
  });
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calls.push(url);
    assert.equal(init.method, undefined);
    assert.equal(init.body, undefined);
    if (url.endsWith("/workspace"))
      return jsonResponse(workspace({ employees: [employee, secondEmployee] }));
    if (url.endsWith(id) && firstA) {
      firstA = false;
      enteredA();
      return delayed;
    }
    return jsonResponse(detailFor(url.endsWith(id) ? employee : secondEmployee));
  });
  async function navigate(selected: string) {
    const current = ++generation;
    displayed = null;
    const result = await readHrView(
      "RRHH",
      selected,
      () => {},
      () => current === generation,
    );
    if (current === generation) displayed = result;
  }
  const oldRead = navigate(id);
  await entered;
  await navigate(otherId);
  resolveA(jsonResponse(detailFor(employee)));
  await oldRead;
  assert.equal((displayed as EmployeeDetail | null)?.employee.id, otherId);
  await navigate(id);
  assert.equal((displayed as EmployeeDetail | null)?.employee.id, id);
  await navigate(otherId);
  assert.equal((displayed as EmployeeDetail | null)?.employee.id, otherId);
  assert.ok(
    calls.every(
      (url) =>
        url.endsWith("/workspace") ||
        url.endsWith(`/employees/${id}`) ||
        url.endsWith(`/employees/${otherId}`),
    ),
  );
  assert.ok(calls.every((url) => !url.includes("balance")));
});
