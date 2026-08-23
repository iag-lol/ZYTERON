import assert from "node:assert/strict";
import test from "node:test";

import { parseGraphSuccessResponse } from "./graph-response";

test("acepta la respuesta 202 vacía usada por Graph al enviar un correo", async () => {
  const response = new Response(null, { status: 202 });

  const result = await parseGraphSuccessResponse<void>(response);

  assert.equal(result, undefined);
});

test("acepta una respuesta exitosa vacía sin intentar leer JSON", async () => {
  const response = new Response("", { status: 200 });

  const result = await parseGraphSuccessResponse<void>(response);

  assert.equal(result, undefined);
});

test("mantiene el parseo normal de respuestas JSON de Graph", async () => {
  const response = new Response(JSON.stringify({ id: "message-1" }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });

  const result = await parseGraphSuccessResponse<{ id: string }>(response);

  assert.deepEqual(result, { id: "message-1" });
});
