import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isActiveVerifiedPortalAdmin } from "./portal-admin-access";

describe("portal admin access", () => {
  it("accepts only active and verified administrative roles", () => {
    for (const role of ["ADMIN", "SUPERADMIN"]) {
      assert.equal(
        isActiveVerifiedPortalAdmin({
          role,
          accountStatus: "ACTIVE",
          emailVerifiedAt: new Date(),
        }),
        true,
      );
    }
  });

  it("rejects clients, disabled accounts and unverified admins", () => {
    assert.equal(
      isActiveVerifiedPortalAdmin({
        role: "CLIENT",
        accountStatus: "ACTIVE",
        emailVerifiedAt: new Date(),
      }),
      false,
    );
    assert.equal(
      isActiveVerifiedPortalAdmin({
        role: "ADMIN",
        accountStatus: "DISABLED",
        emailVerifiedAt: new Date(),
      }),
      false,
    );
    assert.equal(
      isActiveVerifiedPortalAdmin({
        role: "SUPERADMIN",
        accountStatus: "ACTIVE",
        emailVerifiedAt: null,
      }),
      false,
    );
  });
});
