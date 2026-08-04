import test from "node:test";
import assert from "node:assert/strict";
import { defaultMemberSettings, normalizeMemberSettings } from "../src/services/memberSettings.js";

test("settings update only allowlisted booleans, quiet hours and onboarding steps", () => {
  const result = normalizeMemberSettings({
    privateProfile: true,
    safetyNotifications: false,
    quietHoursStart: "21:30",
    onboardingStep: "vibes",
    role: "admin",
  });
  assert.equal(result.privateProfile, true);
  assert.equal(result.safetyNotifications, true);
  assert.equal(result.quietHoursStart, "21:30");
  assert.equal(result.onboardingStep, "vibes");
  assert.equal("role" in result, false);
});

test("invalid preference values keep safe defaults", () => {
  const result = normalizeMemberSettings({ notifications: "yes", quietHoursEnd: "99:99", onboardingStep: "admin" });
  assert.equal(result.notifications, defaultMemberSettings.notifications);
  assert.equal(result.quietHoursEnd, defaultMemberSettings.quietHoursEnd);
  assert.equal(result.onboardingStep, "welcome");
});
