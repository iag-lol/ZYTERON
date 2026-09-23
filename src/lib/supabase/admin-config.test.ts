import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isPrivilegedSupabaseKey, resolveSupabaseAdminConfig } from "./admin-config";

function unsignedJwt(role: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role })}.signature`;
}

describe("Supabase admin configuration", () => {
  it("accepts only legacy service_role JWTs or modern secret keys", () => {
    assert.equal(isPrivilegedSupabaseKey(unsignedJwt("service_role")), true);
    assert.equal(isPrivilegedSupabaseKey("sb_secret_1234567890abcdefghijklmnop"), true);
    assert.equal(isPrivilegedSupabaseKey(unsignedJwt("anon")), false);
    assert.equal(isPrivilegedSupabaseKey("sb_publishable_public-key"), false);
  });

  it("never falls back to anon or NEXT_PUBLIC credentials", () => {
    assert.throws(
      () =>
        resolveSupabaseAdminConfig({
          SUPABASE_URL: "https://project.supabase.co",
          SUPABASE_ANON_KEY: unsignedJwt("anon"),
          NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: unsignedJwt("service_role"),
        }),
      /clave privada válida/i,
    );
  });

  it("returns a validated server-only configuration", () => {
    const result = resolveSupabaseAdminConfig({
      SUPABASE_URL: "https://project.supabase.co/rest/v1",
      SUPABASE_SERVICE_ROLE_KEY: unsignedJwt("service_role"),
    });

    assert.equal(result.url, "https://project.supabase.co");
    assert.equal(result.source, "SUPABASE_SERVICE_ROLE_KEY");
  });

  it("requires HTTPS for remote Supabase hosts", () => {
    assert.throws(
      () =>
        resolveSupabaseAdminConfig({
          SUPABASE_URL: "http://project.supabase.co",
          SUPABASE_SECRET_KEY: "sb_secret_1234567890abcdefghijklmnop",
        }),
      /HTTPS/,
    );
    assert.throws(
      () =>
        resolveSupabaseAdminConfig({
          SUPABASE_URL: "ftp://localhost",
          SUPABASE_SECRET_KEY: "sb_secret_1234567890abcdefghijklmnop",
        }),
      /HTTPS/,
    );
  });
});
