import test from "node:test";
import assert from "node:assert/strict";
import { portfolioClientCount } from "./portfolio-projection";
test("portfolio counts each client once across canonical and historical books", () => {
  assert.equal(portfolioClientCount(["a", "b"], ["a", "a", "c", null]), 3);
});
test("an unavailable canonical domain keeps its unknown state", () => {
  assert.equal(portfolioClientCount(null, ["a"]), null);
});
test("empty books contain no affected clients", () => {
  assert.equal(portfolioClientCount([], []), 0);
});
