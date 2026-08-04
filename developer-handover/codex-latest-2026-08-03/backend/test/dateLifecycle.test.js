import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionDatePlan, normalizeDateFeedback } from "../src/services/dateLifecycle.js";

test("date lifecycle supports cancellation, no-show and unresponsive handling", () => {
  assert.equal(canTransitionDatePlan("accepted", "no_show"), true);
  assert.equal(canTransitionDatePlan("proposed", "unresponsive"), true);
  assert.equal(canTransitionDatePlan("completed", "cancelled"), false);
});

test("private feedback is normalized and rejects unknown outcomes", () => {
  assert.deepEqual(normalizeDateFeedback({ outcome: "continue", feltSafe: true, useForMatching: true, notes: "  calm  " }), {
    outcome: "continue", feltSafe: true, useForMatching: true, notes: "calm",
  });
  assert.equal(normalizeDateFeedback({ outcome: "unknown" }), null);
});
