import test from "node:test";
import assert from "node:assert/strict";
import type { PortalData } from "@/lib/client-experience/snapshot";
import { presentation } from "./production-model";
test("los contratos publicados y heredados coinciden con el filtro Contrato del cliente", () => {
  const data = {
    services: [],
    projects: [],
    invoices: [],
    tickets: [],
    notifications: [],
    events: [],
    documents: ["CONTRACT", "CONTRATO", "Contrato", "REPORT", "INFORME"].map((category, id) => ({
      id: String(id),
      title: "Documento",
      category,
      description: "",
      fileName: "copia.pdf",
      date: "2026-10-24",
    })),
  } as unknown as PortalData;
  const result = presentation(data);
  assert.deepEqual(
    result.documents.map((d) => d.type),
    ["Contrato", "Contrato", "Contrato", "Informe", "Informe"],
  );
});

test("el estado publicado distingue planificación, validación y entrega aunque el avance sea 100%", () => {
  const data = {
    services: [],
    invoices: [],
    tickets: [],
    notifications: [],
    events: [],
    documents: [],
    projects: ["READY", "QA", "COMPLETED", "ON_HOLD", "CANCELLED", "IN_PROGRESS"].map(
      (status, id) => ({
        id: String(id),
        title: "Proyecto",
        status,
        progress: 100,
        end: null,
      }),
    ),
  } as unknown as PortalData;
  const { projects } = presentation(data);
  assert.deepEqual(
    projects.map((p) => p.phase),
    ["Listo para iniciar", "Pruebas", "Entregado", "En pausa", "Anulado", "En curso"],
  );
  assert.equal(projects.filter((p) => p.status === "DONE").length, 1);
  assert.equal(projects.filter((p) => p.status === "IN_PROGRESS").length, 1);
});
