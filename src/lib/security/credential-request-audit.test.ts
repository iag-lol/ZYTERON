import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { prisma } from "@/lib/prisma";
import { auditCredentialRequest } from "./credential-request-audit";
import { CredentialAccessError } from "./credential-access-error";

describe("credential request audit and notification", () => {
  const originalCreate = prisma.clientAuditLog.create;
  const originalUpdate = prisma.clientAuditLog.update;
  const originalKey = process.env.RESEND_API_KEY;
  let auditWrites: Array<Record<string, unknown>>;
  let emails: Array<{ to: string[]; text: string; html: string }>;
  let session: { user: { id: string; email: string } } | null;
  let notificationFails: boolean;
  let storageFails: boolean;

  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-resend-key";
    auditWrites = [];
    emails = [];
    notificationFails = false;
    storageFails = false;
    session = { user: { id: "owner", email: "owner@example.com" } };
    prisma.clientAuditLog.create = (async ({ data }: { data: Record<string, unknown> }) => {
      if (storageFails) throw new Error("Database unavailable");
      auditWrites.push(data);
      return { id: "audit-1", createdAt: new Date("2026-10-06T12:00:00Z") };
    }) as unknown as typeof prisma.clientAuditLog.create;
    prisma.clientAuditLog.update = (async ({ data }: { data: Record<string, unknown> }) => {
      auditWrites.push(data);
      return {};
    }) as unknown as typeof prisma.clientAuditLog.update;
    mock.method(globalThis, "fetch", async (_url: unknown, init: RequestInit) => {
      emails.push(JSON.parse(String(init.body)));
      return new Response(
        JSON.stringify(notificationFails ? { message: "Unavailable" } : { id: "email" }),
        { status: notificationFails ? 500 : 200 },
      );
    });
  });

  afterEach(() => {
    prisma.clientAuditLog.create = originalCreate;
    prisma.clientAuditLog.update = originalUpdate;
    mock.restoreAll();
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  function request(method = "POST", origin = "https://www.zyteron.cl") {
    return new Request("https://www.zyteron.cl/api/portal/credentials/a/reveal", {
      method,
      headers: {
        origin,
        "user-agent": "<script>untrusted</script>",
        "x-forwarded-for": "192.0.2.1",
      },
    });
  }

  async function run(
    req = request(),
    handler = async () => ({ ok: true, secret: "protected-secret" }),
  ) {
    return auditCredentialRequest(req, "REVEAL", "credential-a", handler, async () => session);
  }

  it("records and emails successful access without including the secret", async () => {
    const response = await run();
    assert.equal(response.status, 200);
    assert.equal((await response.json()).secret, "protected-secret");
    assert.match(response.headers.get("cache-control")!, /no-store/);
    assert.deepEqual(emails[0].to, ["contacto@zyteron.cl"]);
    assert.ok(emails[0].text.includes("AUTHORIZED"));
    assert.ok(!JSON.stringify([...emails, ...auditWrites]).includes("protected-secret"));
    assert.ok(!emails[0].html.includes("<script>"));
    assert.equal((auditWrites.at(-1)!.details as { notification: string }).notification, "SENT");
  });

  it("records and emails unauthenticated access without invoking the secret handler", async () => {
    session = null;
    const handler = mock.fn(async () => ({ ok: true, secret: "protected-secret" }));
    const response = await run(request(), handler);
    assert.equal(response.status, 401);
    assert.equal(handler.mock.callCount(), 0);
    assert.ok(emails[0].text.includes("DENIED"));
    assert.equal(auditWrites[0].actorId, null);
  });

  it("records and rejects direct GET and foreign-origin requests", async () => {
    const handler = mock.fn(async () => ({ ok: true, secret: "protected-secret" }));
    assert.equal((await run(request("GET"), handler)).status, 405);
    assert.equal((await run(request("POST", "https://attacker.example"), handler)).status, 403);
    assert.equal(handler.mock.callCount(), 0);
    assert.equal(emails.length, 2);
  });

  it("records validation and authorization failures without echoing server exceptions", async () => {
    const denied = await run(request(), async () => {
      throw new CredentialAccessError("Datos inválidos.", 400);
    });
    assert.equal(denied.status, 400);
    const failed = await run(request(), async () => {
      throw new Error("private-server-detail");
    });
    assert.equal(failed.status, 500);
    assert.ok(!(await failed.text()).includes("private-server-detail"));
    assert.equal(emails.length, 2);
  });

  it("withholds the secret and records failed delivery when the provider fails", async () => {
    notificationFails = true;
    const response = await run();
    assert.equal(response.status, 503);
    assert.ok(!(await response.text()).includes("protected-secret"));
    assert.equal((auditWrites.at(-1)!.details as { notification: string }).notification, "FAILED");
  });

  it("blocks before reading secrets if audit storage is unavailable", async () => {
    storageFails = true;
    const handler = mock.fn(async () => ({ ok: true, secret: "protected-secret" }));
    assert.equal((await run(request(), handler)).status, 503);
    assert.equal(handler.mock.callCount(), 0);
  });
});
