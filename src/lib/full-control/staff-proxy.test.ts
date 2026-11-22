import test from "node:test";
import assert from "node:assert/strict";
import { handleStaffControlRequest } from "./staff-proxy";

const originalUrl = process.env.SUPABASE_URL,
  originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
test.after(() => {
  if (originalUrl === undefined) delete process.env.SUPABASE_URL;
  else process.env.SUPABASE_URL = originalUrl;
  if (originalKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
});
function setup(
  role = "EJECUTIVA_VENTAS",
  claimsRole = role,
  bannedUntil: string | null = null,
  linked = true,
) {
  const calls: Array<{ url: string; headers: Headers }> = [];
  const authClient = {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        async maybeSingle() {
          return { data: linked ? { rut: "12345678-5" } : null, error: null };
        },
      };
    },
    auth: {
      async getUser() {
        return {
          data: { user: { id: "test-user", app_metadata: { role }, banned_until: bannedUntil } },
          error: null,
        };
      },
      async getClaims() {
        return { data: { claims: { app_metadata: { role: claimsRole } } }, error: null };
      },
    },
  } as unknown as NonNullable<Parameters<typeof handleStaffControlRequest>[3]>["authClient"];
  const forward: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), headers: new Headers(init?.headers) });
    return new Response(JSON.stringify({ role }), {
      headers: { "content-type": "application/json" },
    });
  };
  return { dependencies: { authClient, forward }, calls };
}
test("una cuenta sin RUT vinculado no alcanza los módulos internos", async () => {
  const { dependencies, calls } = setup("EJECUTIVA_VENTAS", "EJECUTIVA_VENTAS", null, false);
  const result = await handleStaffControlRequest(
    new Request("https://zyteron.cl/api/control-core/api/leads", {
      headers: { authorization: "Bearer staff-token" },
    }),
    ["api", "leads"],
    Buffer.alloc(0),
    dependencies,
  );
  assert.equal(result.status, 403);
  assert.equal(calls.length, 0);
});
test("el equipo conserva su identidad aunque el navegador incluya una cookie administrativa", async () => {
  const { dependencies, calls } = setup();
  const request = new Request("https://www.zyteron.cl/api/control-core/api/leads?page=2", {
    headers: {
      authorization: "Bearer staff-token",
      cookie: "zyteron_admin_token=administrative-cookie",
      "x-zyteron-role": "GERENTE_GENERAL",
      "x-zyteron-native-context": "forged",
    },
  });
  const result = await handleStaffControlRequest(
    request,
    ["api", "leads"],
    Buffer.alloc(0),
    dependencies,
  );
  assert.equal(result.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.get("authorization"), "Bearer staff-token");
  for (const key of ["cookie", "x-zyteron-role", "x-zyteron-native-context"])
    assert.equal(calls[0].headers.get(key), null);
  assert.equal(new URL(calls[0].url).search, "?page=2");
});
test("clientes, cuentas bloqueadas y tokens con roles antiguos no alcanzan la API interna", async () => {
  const cases: Array<[string, string, string | null]> = [
    ["PORTAL_CLIENT", "PORTAL_CLIENT", null],
    ["EJECUTIVA_VENTAS", "GERENTE_GENERAL", null],
    ["EJECUTIVA_VENTAS", "EJECUTIVA_VENTAS", "2999-01-01T00:00:00Z"],
  ];
  for (const options of cases) {
    const { dependencies, calls } = setup(...options);
    const result = await handleStaffControlRequest(
      new Request("https://www.zyteron.cl/api/control-core/api/security/users", {
        headers: { authorization: "Bearer staff-token" },
      }),
      ["api", "security", "users"],
      Buffer.alloc(0),
      dependencies,
    );
    assert.ok([401, 403].includes(result.status));
    assert.equal(calls.length, 0);
  }
});
test("rutas manipuladas y autorización ausente se rechazan antes de reenviar", async () => {
  const { dependencies, calls } = setup();
  for (const segments of [
    ["api", "..", "security"],
    ["api", "%2e%2e"],
    ["api", "leads?other=path"],
  ]) {
    const result = await handleStaffControlRequest(
      new Request("https://www.zyteron.cl/api/control-core/api/leads", {
        headers: { authorization: "Bearer staff-token" },
      }),
      segments,
      Buffer.alloc(0),
      dependencies,
    );
    assert.equal(result.status, 400);
  }
  const result = await handleStaffControlRequest(
    new Request("https://www.zyteron.cl/api/control-core/api/leads"),
    ["api", "leads"],
    Buffer.alloc(0),
    dependencies,
  );
  assert.equal(result.status, 400);
  assert.equal(calls.length, 0);
});
