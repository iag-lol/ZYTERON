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
