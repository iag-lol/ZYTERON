import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requireCommercialSessionSecret, resolveCommercialSessionSecret } from "./session-secret";

describe("commercial session secret", () => {
  const dedicated = "commercial-session-secret-with-32-bytes-minimum";
  const shared = "nextauth-session-secret-with-32-bytes-minimum";

  it("prefiere una clave dedicada suficientemente larga", () => {
    assert.equal(
      resolveCommercialSessionSecret({
        COMMERCIAL_SESSION_SECRET: dedicated,
        NEXTAUTH_SECRET: shared,
      }),
      dedicated,
    );
  });

  it("permite NEXTAUTH_SECRET solamente cuando no hay una clave dedicada", () => {
    assert.equal(resolveCommercialSessionSecret({ NEXTAUTH_SECRET: shared }), shared);
  });

  it("falla cerrado ante ausencia o secretos débiles", () => {
    assert.equal(resolveCommercialSessionSecret({}), null);
    assert.equal(
      resolveCommercialSessionSecret({
        COMMERCIAL_SESSION_SECRET: "weak",
        NEXTAUTH_SECRET: shared,
      }),
      null,
    );
    assert.throws(() => requireCommercialSessionSecret({}), /COMMERCIAL_SESSION_SECRET/);
  });

  it("rechaza secretos literales cortos de desarrollo", () => {
    assert.equal(
      resolveCommercialSessionSecret({
        COMMERCIAL_SESSION_SECRET: "development-only-secret",
      }),
      null,
    );
  });
});
