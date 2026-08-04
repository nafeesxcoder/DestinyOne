import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, positiveId, validateCredentials } from "../src/utils/validation.js";

test("normalizes email", () => assert.equal(normalizeEmail("  Member@Example.COM "), "member@example.com"));
test("rejects invalid credentials", () => assert.deepEqual(validateCredentials({ email: "bad", password: "123" }), ["Enter a valid email address.", "Password must be at least 8 characters."]));
test("accepts only positive integer ids", () => { assert.equal(positiveId("12"), 12); assert.equal(positiveId("-1"), null); assert.equal(positiveId("x"), null); });
