import test from "node:test";
import assert from "node:assert/strict";
import { publicSupabaseKey, publicSupabaseUrl } from "./public-config";
const key = (role: string) =>
  `header.${Buffer.from(JSON.stringify({ role })).toString("base64url")}.signature`;
test("solo claves públicas pueden incluirse en la configuración del navegador", () => {
  assert.equal(publicSupabaseKey(key("anon")), key("anon"));
  for (const privateKey of [key("service_role"), "sb_secret_private-credential", "arbitrary-value"])
    assert.equal(publicSupabaseKey(privateKey), "");
  assert.equal(publicSupabaseKey("sb_publishable_public-key"), "sb_publishable_public-key");
});
test("la URL pública conserva solo el origen de Supabase", () => {
  assert.equal(
    publicSupabaseUrl("https://example.supabase.co/rest/v1"),
    "https://example.supabase.co",
  );
});
