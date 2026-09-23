import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  configuredRequestOrigins,
  isAllowedMutationOrigin,
  isFlowExternalRoute,
  isUnsafeHttpMethod,
} from "./request-origin";

describe("request origin security", () => {
  it("accepts an exact same-origin mutation", () => {
    assert.equal(
      isAllowedMutationOrigin({
        requestOrigin: "https://www.zyteron.cl",
        origin: "https://www.zyteron.cl",
      }),
      true,
    );
  });

  it("rejects cross-origin and merely same-site subdomains", () => {
    for (const origin of ["https://evil.example", "https://admin.zyteron.cl"]) {
      assert.equal(
        isAllowedMutationOrigin({
          requestOrigin: "https://www.zyteron.cl",
          origin,
          secFetchSite: "cross-site",
        }),
        false,
        origin,
      );
    }

    assert.equal(
      isAllowedMutationOrigin({
        requestOrigin: "https://www.zyteron.cl",
        origin: "null",
        secFetchSite: "same-origin",
      }),
      false,
    );
  });

  it("uses Referer or Sec-Fetch-Site only when Origin is absent", () => {
    assert.equal(
      isAllowedMutationOrigin({
        requestOrigin: "https://www.zyteron.cl",
        referer: "https://www.zyteron.cl/admin/clientes",
      }),
      true,
    );
    assert.equal(
      isAllowedMutationOrigin({
        requestOrigin: "https://www.zyteron.cl",
        secFetchSite: "same-origin",
      }),
      true,
    );
    assert.equal(
      isAllowedMutationOrigin({
        requestOrigin: "https://www.zyteron.cl",
      }),
      false,
    );
  });

  it("allows explicit deployment origins and non-cookie Bearer clients", () => {
    assert.equal(
      isAllowedMutationOrigin({
        requestOrigin: "http://localhost:3000",
        origin: "https://www.zyteron.cl",
        allowedOrigins: ["https://www.zyteron.cl"],
      }),
      true,
    );
    assert.equal(
      isAllowedMutationOrigin({
        requestOrigin: "https://www.zyteron.cl",
        origin: "https://evil.example",
        hasBearerAuthorization: true,
      }),
      true,
    );
  });

  it("recognizes unsafe methods and only the explicit Flow routes", () => {
    assert.equal(isUnsafeHttpMethod("POST"), true);
    assert.equal(isUnsafeHttpMethod("GET"), false);
    assert.equal(isFlowExternalRoute("/api/portal/payments/quotes/flow/confirmation"), true);
    assert.equal(isFlowExternalRoute("/api/portal/payments/quotes/flow/create"), false);
  });

  it("normalizes configured origins and rejects non-http schemes", () => {
    assert.deepEqual(
      configuredRequestOrigins({
        NEXTAUTH_URL: "https://www.zyteron.cl/login",
        NEXT_PUBLIC_SITE_URL: "javascript:alert(1)",
        PUBLIC_SITE_URL: "http://localhost:3000/",
      }),
      ["https://www.zyteron.cl", "http://localhost:3000"],
    );
  });
});
