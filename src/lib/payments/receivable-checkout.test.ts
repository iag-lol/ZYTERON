import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveReceivableCheckout, refreshExpiredReceivableCheckout } from "./receivable-checkout";
import { PaymentTargetError } from "./invoice-payment-option";

type Intent = {
  id: string;
  state: string;
  amount: number;
  token_cipher: string | null;
  checkout_url: string | null;
  expires_at: Date;
};
const old: Intent = {
  id: "old",
  state: "PENDING",
  amount: 1368100,
  token_cipher: "protected",
  checkout_url: "https://www.flow.cl/existing",
  expires_at: new Date("2020-01-01"),
};
test("an expired pending checkout is opened without submitting a payment and then verified again", async () => {
  let probes = 0,
    reconciliations = 0;
  const state = await refreshExpiredReceivableCheckout({
    state: 1,
    expiresAt: old.expires_at,
    checkoutUrl: "https://www.flow.cl/app/web/pay.php?token=valid_provider_token",
    reconcile: async () => {
      reconciliations++;
      return 4;
    },
    probe: async (url, init) => {
      probes++;
      assert.equal(new URL(String(url)).hostname, "www.flow.cl");
      assert.equal(init?.method, "GET");
      assert.equal(init?.redirect, "error");
      assert.equal(init?.body, undefined);
      return new Response("Checkout expired");
    },
  });
  assert.equal(state, 4);
  assert.equal(probes, 1);
  assert.equal(reconciliations, 1);
});
test("checkout content or a failed probe cannot replace the signed provider status", async () => {
  for (const probe of [
    async () => new Response("Paid! Cancelled! Expired!"),
    async () => {
      throw Error("NETWORK");
    },
  ]) {
    assert.equal(
      await refreshExpiredReceivableCheckout({
        state: 1,
        expiresAt: old.expires_at,
        checkoutUrl: "https://www.flow.cl/app/web/pay.php?token=valid_provider_token",
        reconcile: async () => 1,
        probe,
      }),
      1,
    );
  }
  await assert.rejects(
    refreshExpiredReceivableCheckout({
      state: 1,
      expiresAt: old.expires_at,
      checkoutUrl: "https://www.flow.cl/app/web/pay.php?token=valid_provider_token",
      reconcile: async () => {
        throw Error("PROVIDER_UNAVAILABLE");
      },
      probe: async () => new Response("Expired"),
    }),
    /PROVIDER_UNAVAILABLE/,
  );
});
test("current and terminal orders do not open the checkout or reconcile twice", async () => {
  for (const state of [1, 2, 3, 4]) {
    const result = await refreshExpiredReceivableCheckout({
      state,
      expiresAt: state === 1 ? new Date("2099-01-01") : old.expires_at,
      checkoutUrl: "https://www.flow.cl/app/web/pay.php?token=valid_provider_token",
      reconcile: async () => {
        assert.fail("unneeded reconciliation");
      },
      probe: async () => {
        assert.fail("unneeded checkout probe");
      },
    });
    assert.equal(result, state);
  }
});
test("checkout refresh rejects foreign hosts, credentials, ports and injected parameters", async () => {
  for (const checkoutUrl of [
    "http://www.flow.cl/app/web/pay.php?token=valid_provider_token",
    "https://www.flow.cl.evil.example/?token=valid_provider_token",
    "https://user@www.flow.cl/?token=valid_provider_token",
    "https://www.flow.cl:8443/?token=valid_provider_token",
    "https://www.flow.cl/?token=valid_provider_token&next=evil",
    "https://www.flow.cl/?token=short",
    "https://www.flow.cl/?token=valid_provider_token#test",
  ])
    await assert.rejects(
      refreshExpiredReceivableCheckout({
        state: 1,
        expiresAt: old.expires_at,
        checkoutUrl,
        reconcile: async () => {
          assert.fail("invalid origin must not be queried");
        },
        probe: async () => {
          assert.fail("invalid origin must not be queried");
        },
      }),
      /PAYMENT_DESTINATION_INVALID/,
    );
});
function scenario(state: number, intent = old) {
  let reconciled = false,
    creates = 0,
    reservations = 0;
  const fresh = { ...old, id: "new", state: "CREATING" };
  const operations = {
    reserve: async () => {
      reservations++;
      return {
        intent: reconciled && [3, 4].includes(state) ? fresh : intent,
        created: reconciled && [3, 4].includes(state),
        description: "Saldo del cliente",
      };
    },
    reconcile: async () => {
      reconciled = true;
      return state;
    },
    checkout: (r: Intent) => r.checkout_url!,
    create: async () => {
      creates++;
      return { checkoutUrl: "https://www.flow.cl/new", amount: 1368100 };
    },
  };
  return { operations, counts: () => ({ creates, reservations, reconciled }) };
}

test("a provider-confirmed pending order resumes even after the local deadline without creating another payment", async () => {
  const run = scenario(1);
  const result = await resolveReceivableCheckout(1368100, run.operations);
  assert.equal(result.checkoutUrl, old.checkout_url);
  assert.equal(result.amount, 1368100);
  assert.equal(run.counts().creates, 0);
  assert.equal(run.counts().reconciled, true);
});

test("a cancelled or rejected order is replaced in the same request after reserving and validating the balance again", async () => {
  for (const state of [3, 4]) {
    const run = scenario(state);
    const result = await resolveReceivableCheckout(1368100, run.operations);
    assert.equal(result.checkoutUrl, "https://www.flow.cl/new");
    assert.equal(run.counts().creates, 1);
    assert.equal(run.counts().reservations, 2);
  }
});

test("a confirmed payment refreshes the document instead of generating another order", async () => {
  const run = scenario(2);
  await assert.rejects(resolveReceivableCheckout(1368100, run.operations), /ya fue confirmado/);
  assert.equal(run.counts().creates, 0);
});

test("a changed balance cannot reuse an order for a different amount or bypass the new balance check", async () => {
  const pending = scenario(1, { ...old, amount: 1468100 });
  await assert.rejects(resolveReceivableCheckout(1368100, pending.operations), /saldo cambió/);
  assert.equal(pending.counts().creates, 0);
  const cancelled = scenario(4);
  const reserve = cancelled.operations.reserve;
  cancelled.operations.reserve = async () => {
    if (cancelled.counts().reconciled) throw new PaymentTargetError("El importe del cobro cambió.");
    return reserve();
  };
  await assert.rejects(
    resolveReceivableCheckout(1368100, cancelled.operations),
    /importe del cobro cambió/,
  );
  assert.equal(cancelled.counts().creates, 0);
});

test("an unknown result or unavailable provider does not release a pending order", async () => {
  const missing = scenario(1, {
    ...old,
    state: "UNKNOWN",
    token_cipher: null,
  });
  await assert.rejects(resolveReceivableCheckout(1368100, missing.operations), /verificación/);
  assert.equal(missing.counts().creates, 0);
  const unavailable = scenario(1);
  unavailable.operations.reconcile = async () => {
    throw new Error("PROVIDER_UNAVAILABLE");
  };
  await assert.rejects(
    resolveReceivableCheckout(1368100, unavailable.operations),
    /PROVIDER_UNAVAILABLE/,
  );
  assert.equal(unavailable.counts().creates, 0);
});

test("an in-progress creation remains protected while an unknown terminal result can be recovered", async () => {
  const creating = scenario(1, { ...old, state: "CREATING" });
  await assert.rejects(resolveReceivableCheckout(1368100, creating.operations), /preparando/);
  assert.equal(creating.counts().reconciled, false);
  const unknown = scenario(4, {
    ...old,
    state: "UNKNOWN",
    token_cipher: null,
  });
  assert.equal(
    (await resolveReceivableCheckout(1368100, unknown.operations)).checkoutUrl,
    "https://www.flow.cl/new",
  );
  assert.equal(unknown.counts().creates, 1);
});

test("concurrent retries share the persistent reservation and create at most one replacement", async () => {
  let current = { ...old },
    creates = 0;
  const operations = {
    reserve: async () => {
      if (current.state === "CANCELLED") {
        current = { ...old, id: "replacement", state: "CREATING" };
        return { intent: { ...current }, created: true, description: "Saldo" };
      }
      return { intent: { ...current }, created: false, description: "Saldo" };
    },
    reconcile: async (r: Intent) => {
      await Promise.resolve();
      if (r.id === "old") {
        if (current.id === "old") current.state = "CANCELLED";
        return 4;
      }
      return 1;
    },
    checkout: () => "https://www.flow.cl/replacement",
    create: async () => {
      creates++;
      await Promise.resolve();
      current.state = "PENDING";
      return { checkoutUrl: "https://www.flow.cl/replacement", amount: 1368100 };
    },
  };
  const results = await Promise.allSettled([
    resolveReceivableCheckout(1368100, operations),
    resolveReceivableCheckout(1368100, operations),
  ]);
  assert.equal(creates, 1);
  assert.ok(results.some((r) => r.status === "fulfilled"));
  assert.equal(
    (await resolveReceivableCheckout(1368100, operations)).checkoutUrl,
    "https://www.flow.cl/replacement",
  );
  assert.equal(creates, 1);
});
