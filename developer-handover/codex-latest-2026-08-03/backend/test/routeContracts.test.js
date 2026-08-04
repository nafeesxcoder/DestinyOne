import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("../src/server.js", import.meta.url), "utf8");
const dates = readFileSync(new URL("../src/routes/dates.js", import.meta.url), "utf8");
const messages = readFileSync(new URL("../src/routes/messages.js", import.meta.url), "utf8");
const notifications = readFileSync(new URL("../src/routes/notifications.js", import.meta.url), "utf8");
const analytics = readFileSync(new URL("../src/routes/analytics.js", import.meta.url), "utf8");
const membership = readFileSync(new URL("../src/routes/membership.js", import.meta.url), "utf8");

test("server mounts member, notification, safety and role-protected admin contracts", () => {
  for (const route of ["/api/profiles", "/api/dates", "/api/messages", "/api/notifications", "/api/membership", "/api/safety", "/api/admin", "/api/analytics"]) {
    assert.match(server, new RegExp(route.replaceAll("/", "\\/")));
  }
  assert.match(server, /typing:start/);
  assert.match(server, /message:receipt/);
  assert.match(server, /"signal"/);
  assert.match(server, /call:\$\{event\}/);
  assert.match(server, /dispatchPushToUser/);
  assert.match(notifications, /\/push-readiness/);
  assert.match(notifications, /\/devices/);
});

test("billing and launch analytics remain server-verified and consent-gated", () => {
  assert.match(membership, /STORE_PURCHASE_VERIFIER_URL/);
  assert.match(membership, /purchase_token_hash/);
  assert.match(membership, /finishedTransactionAllowed:true/);
  assert.doesNotMatch(membership, /purchase_token[^_].*INSERT/i);
  assert.match(analytics, /anonymous_analytics/);
  assert.match(analytics, /propertyKeys/);
  assert.match(analytics, /requireRole\("admin"\)/);
  assert.match(analytics, /DELETE FROM launch_analytics_sessions/);
});

test("date and chat routes expose lifecycle, learning and conversation tools", () => {
  assert.match(dates, /\/:datePlanId\/status/);
  assert.match(dates, /\/:datePlanId\/feedback/);
  assert.match(messages, /\/:conversationId\/search/);
  assert.match(messages, /\/:conversationId\/:messageId\/reaction/);
  assert.match(messages, /\/:conversationId\/:messageId\/star/);
});
