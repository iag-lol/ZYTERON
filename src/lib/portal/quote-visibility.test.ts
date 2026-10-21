import test from "node:test";
import assert from "node:assert/strict";
import { nativeProposalVisible } from "./quote-visibility";
test("historical customer proposals remain visible while explicit working drafts stay private", () => {
  assert.equal(nativeProposalVisible("PENDING", {}), true);
  assert.equal(nativeProposalVisible("SENT", {}), true);
  assert.equal(nativeProposalVisible("WON", {}), true);
  for (const controlState of ["DRAFT", "REJECTED", "PENDING_APPROVAL", "APPROVED", "READY_TO_SEND"])
    assert.equal(nativeProposalVisible("PENDING", { controlState }), false);
  assert.equal(nativeProposalVisible("LOST", { controlState: "ACCEPTED" }), false);
  assert.equal(nativeProposalVisible("PENDING", { controlState: "ACCEPTED" }), true);
});
