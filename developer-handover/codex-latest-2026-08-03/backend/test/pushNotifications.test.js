import test from "node:test";
import assert from "node:assert/strict";
import { normalizePushDevice, pushProviderReadiness } from "../src/services/pushNotifications.js";

test("normalizes Expo and browser push registrations without exposing token hashes", () => {
  const expo = normalizePushDevice({ provider: "expo", platform: "ios", token: "ExponentPushToken[demo_token-123]" });
  assert.equal(expo.provider, "expo");
  assert.equal(expo.platform, "ios");
  assert.equal(expo.tokenHash.length, 64);
  assert.notEqual(expo.tokenHash, expo.token);

  const web = normalizePushDevice({ provider: "web", subscription: { endpoint: "https://push.example.test/device", keys: { p256dh: "public-key", auth: "auth-key" } } });
  assert.equal(web.provider, "web");
  assert.equal(web.platform, "web");
  assert.equal(web.subscription.endpoint, "https://push.example.test/device");
});

test("rejects malformed device registrations and reports provider readiness", () => {
  assert.throws(() => normalizePushDevice({ provider: "expo", token: "not-a-token" }), /Invalid Expo push token/);
  assert.throws(() => normalizePushDevice({ provider: "web", subscription: { endpoint: "http://unsafe.test" } }), /Invalid web push subscription/);
  const readiness = pushProviderReadiness();
  assert.equal(readiness.expo, true);
  assert.equal(typeof readiness.web, "boolean");
});
