import test from "node:test";
import assert from "node:assert/strict";
import { collectionSummary, quoteClientKey, recentQuotes } from "./quote-register";
const base = { total: 100, frequency: "ONE_TIME" as const, finite: true, today: "2026-10-13" };
test("acceptance and no verified money never imply a paid quote", () => {
  assert.deepEqual(collectionSummary({ ...base, evidence: [] }), {
    paid: 0,
    balance: 100,
    advance: 0,
    state: "UNPAID",
  });
});
test("confirmed initial advance remains a partial payment until the balance is assigned", () => {
  assert.deepEqual(
    collectionSummary({ ...base, evidence: [{ amount: 50, paid: 50, initial: true }] }),
    { paid: 50, balance: 50, advance: 50, state: "PARTIAL" },
  );
  assert.equal(
    collectionSummary({ ...base, evidence: [{ amount: 100, paid: 100 }] }).state,
    "PAID",
  );
});
test("indefinite monthly billing never becomes fully paid", () => {
  const result = collectionSummary({
    ...base,
    frequency: "MONTHLY",
    finite: false,
    evidence: [
      { amount: 100, paid: 100, dueDate: "2026-10-01" },
      { amount: 100, paid: 100, dueDate: "2026-11-01" },
    ],
  });
  assert.equal(result.state, "CURRENT");
  assert.equal(result.advance, 100);
  assert.equal(result.paid, 200);
});
test("monthly overdue or partially paid installments keep their actual remaining balance", () => {
  const result = collectionSummary({
    ...base,
    frequency: "MONTHLY",
    finite: false,
    evidence: [{ amount: 100, paid: 60, dueDate: "2026-10-01" }],
  });
  assert.equal(result.state, "PARTIAL");
  assert.equal(result.balance, 40);
});
test("a finite monthly calendar is fully paid only when its complete target is paid", () => {
  assert.equal(
    collectionSummary({
      ...base,
      frequency: "MONTHLY",
      evidence: [
        { amount: 100, paid: 100 },
        { amount: 100, paid: 0 },
      ],
    }).state,
    "PARTIAL",
  );
  assert.equal(
    collectionSummary({
      ...base,
      frequency: "MONTHLY",
      evidence: [
        { amount: 100, paid: 100 },
        { amount: 100, paid: 100 },
      ],
    }).state,
    "PAID",
  );
});
test("recency uses creation, keeps deterministic ties and does not mutate the sources", () => {
  const sources = [
    { id: "a", createdAt: "2026-10-01" },
    { id: "b", createdAt: "2026-10-13" },
    { id: "c", createdAt: "2026-10-13" },
  ];
  assert.deepEqual(
    recentQuotes(sources).map((q) => q.id),
    ["c", "b", "a"],
  );
  assert.equal(sources[0].id, "a");
});
test("clients with the same company name remain separate; unlinked prospects have a distinct key", () => {
  const q = { clientId: "client-1", companyName: "Acme", contactEmail: "same@example.com" };
  assert.notEqual(quoteClientKey(q), quoteClientKey({ ...q, clientId: "client-2" }));
  assert.notEqual(quoteClientKey(q), quoteClientKey({ ...q, clientId: null }));
});
