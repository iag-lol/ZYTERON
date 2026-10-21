import test from "node:test";
import assert from "node:assert/strict";
import { commercialApi } from "./commercial-api";

test("la bandeja recupera leads después de los primeros 100", async () => {
  const original = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input) => {
    requests.push(String(input));
    const page = Number(new URL(String(input), "https://example.invalid").searchParams.get("page"));
    return Response.json({ items: Array.from({ length: page === 1 ? 100 : 3 }, (_, index) => ({ id: String((page - 1) * 100 + index) })), page, totalPages: 2, total: 103, pageSize: 100 });
  };
  try {
    const leads = await commercialApi.allLeads("GERENTE_GENERAL");
    assert.equal(leads.length, 103);
    assert.equal(leads.at(-1)?.id, "102");
    assert.equal(requests.length, 2);
  } finally { globalThis.fetch = original; }
});

test("un fallo de página informa error sin presentar un listado incompleto como exitoso", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ message: "Servicio no disponible" }, { status: 503 });
  try {
    await assert.rejects(commercialApi.allLeads("GERENTE_GENERAL"), /Servicio no disponible/);
  } finally { globalThis.fetch = original; }
});
