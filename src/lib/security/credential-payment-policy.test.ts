import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideCredentialPaymentAccess, type CredentialDebt } from "./credential-payment-policy";
import { credentialAdminSchema } from "./credential-admin-schema";
import { credentialSessionBinding } from "./credential-challenge-policy";
import { renderCredentialCodeEmail } from "@/lib/notifications/portal-email";
import { encryptSecret, decryptSecret } from "./secret-crypto";
const project = {
  id: "project",
  clientId: "client",
  quoteId: "quote",
  saleId: null,
  totalCharge: 1000,
  quote: { total: 1000 },
  sale: null,
};
const debt: CredentialDebt = {
  clientId: "client",
  projectId: "project",
  quoteId: "quote",
  saleId: null,
  currency: "CLP",
  totalAmount: 1000,
  allocations: [{ amount: 1000 }],
};
const decide = (
  debts: CredentialDebt[],
  p: typeof project | null = project,
  canonicalPending = false,
) => decideCredentialPaymentAccess({ userId: "client", project: p, debts, canonicalPending });
describe("credential commercial eligibility", () => {
  it("allows an explicit delivery authorization only for the current owner and project", () => {
    const authorization = { userId: "client", projectId: "project", revokedAt: null };
    const input = { userId: "client", project, debts: [], canonicalPending: true };
    assert.equal(
      decideCredentialPaymentAccess({ ...input, deliveryAuthorization: authorization }).allowed,
      true,
    );
    for (const invalid of [
      { ...authorization, userId: "other" },
      { ...authorization, projectId: "other" },
      { ...authorization, revokedAt: new Date() },
    ])
      assert.equal(
        decideCredentialPaymentAccess({ ...input, deliveryAuthorization: invalid }).allowed,
        false,
      );
    assert.equal(
      decideCredentialPaymentAccess({
        ...input,
        project: null,
        deliveryAuthorization: authorization,
      }).allowed,
      false,
    );
    assert.equal(
      decideCredentialPaymentAccess({
        ...input,
        project: { ...project, clientId: "other" },
        deliveryAuthorization: authorization,
      }).allowed,
      false,
    );
  });
  it("requires a real project owned by the same client", () => {
    assert.equal(decide([debt], null).allowed, false);
    assert.equal(decide([debt], { ...project, clientId: "other" }).allowed, false);
    assert.equal(decide([debt]).allowed, true);
  });
  it("rejects missing payments, partial invoices and a pending balance on another project", () => {
    assert.equal(decide([]).allowed, false);
    assert.equal(decide([{ ...debt, allocations: [{ amount: 999 }] }]).allowed, false);
    assert.equal(
      decide([debt, { ...debt, projectId: "another", quoteId: null, allocations: [] }]).allowed,
      false,
    );
    assert.equal(decide([debt], project, true).allowed, false);
  });
  it("does not mistake a fully paid deposit for the full price or apply another client's money", () => {
    assert.equal(
      decide([{ ...debt, totalAmount: 500, allocations: [{ amount: 500 }] }]).allowed,
      false,
    );
    assert.equal(decide([{ ...debt, clientId: "other" }]).allowed, false);
    assert.equal(decide([{ ...debt, currency: "USD" }]).allowed, false);
    assert.equal(decide([debt], { ...project, totalCharge: 1500 }).allowed, false);
  });
});
describe("credential registration and presentation", () => {
  it("encrypts each secret with a fresh nonce and rejects modified ciphertext", () => {
    const saved = process.env.PORTAL_SECRET_KEY;
    process.env.PORTAL_SECRET_KEY = "test-only-encryption-key";
    try {
      const first = encryptSecret("  secret-with-spaces  "),
        second = encryptSecret("  secret-with-spaces  ");
      assert.notEqual(first.ciphertext, second.ciphertext);
      assert.notEqual(first.iv, second.iv);
      assert.equal(decryptSecret(first), "  secret-with-spaces  ");
      const bytes = Buffer.from(first.ciphertext, "base64");
      bytes[0] ^= 1;
      assert.equal(decryptSecret({ ...first, ciphertext: bytes.toString("base64") }), null);
      process.env.PORTAL_SECRET_KEY = "different-test-key";
      assert.equal(decryptSecret(first), null);
    } finally {
      if (saved === undefined) delete process.env.PORTAL_SECRET_KEY;
      else process.env.PORTAL_SECRET_KEY = saved;
    }
  });
  const value = {
    serviceName: "Repositorio",
    projectId: "project",
    username: "client",
    secret: "  exact-secret  ",
    url: "https://github.com/org/repo",
    notes: "Acceso delegado",
  };
  it("preserves the exact secret and forbids unbound projects, hidden passwords and token URLs", () => {
    assert.equal(credentialAdminSchema.parse(value).secret, "  exact-secret  ");
    for (const url of [
      "http://github.com",
      "https://user:password@example.com",
      "https://example.com?token=secret",
      "javascript:alert(1)",
    ])
      assert.equal(credentialAdminSchema.safeParse({ ...value, url }).success, false);
    assert.equal(credentialAdminSchema.safeParse({ ...value, projectId: "" }).success, false);
    assert.equal(credentialAdminSchema.safeParse({ ...value, isSensitive: false }).success, false);
  });
  it("renders escaped email content with no active links, scripts or password payloads", () => {
    const html = renderCredentialCodeEmail({
      fullName: "<script>alert(1)</script>",
      code: "000000",
      serviceName: "<img src=x>",
      expiresMinutes: 5,
    });
    assert.ok(html.includes("000000"));
    assert.ok(!html.includes("<script>"));
    assert.ok(!html.includes("<img"));
    assert.ok(!html.includes("<a "));
  });
  it("binds to the stable authenticated session identity and the owner", () => {
    const saved = process.env.PORTAL_CODE_PEPPER;
    process.env.PORTAL_CODE_PEPPER = "test-key";
    try {
      assert.equal(
        credentialSessionBinding("client", "session-a"),
        credentialSessionBinding("client", "session-a"),
      );
      assert.notEqual(
        credentialSessionBinding("client", "session-a"),
        credentialSessionBinding("client", "session-b"),
      );
      assert.notEqual(
        credentialSessionBinding("client", "session-a"),
        credentialSessionBinding("other", "session-a"),
      );
      assert.throws(() => credentialSessionBinding("client", ""));
    } finally {
      if (saved === undefined) delete process.env.PORTAL_CODE_PEPPER;
      else process.env.PORTAL_CODE_PEPPER = saved;
    }
  });
});
