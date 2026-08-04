const booleanKeys = [
  "notifications",
  "privateProfile",
  "pauseDiscovery",
  "showLastOnline",
  "anonymousAnalytics",
  "matchNotifications",
  "messageNotifications",
  "dateNotifications",
  "safetyNotifications",
  "marketingNotifications",
];

export const defaultMemberSettings = {
  notifications: true,
  privateProfile: false,
  pauseDiscovery: false,
  showLastOnline: true,
  anonymousAnalytics: false,
  matchNotifications: true,
  messageNotifications: true,
  dateNotifications: true,
  safetyNotifications: true,
  marketingNotifications: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  onboardingStep: "welcome",
};

export function normalizeMemberSettings(value = {}, current = defaultMemberSettings) {
  const next = { ...defaultMemberSettings, ...current };
  for (const key of booleanKeys) if (typeof value[key] === "boolean") next[key] = value[key];
  next.safetyNotifications = true;
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value.quietHoursStart || ""))) next.quietHoursStart = value.quietHoursStart;
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value.quietHoursEnd || ""))) next.quietHoursEnd = value.quietHoursEnd;
  const steps = new Set(["welcome", "auth", "otp", "verify", "modeSelect", "coupleSetup", "profileSetup", "vibes", "intent", "alignment", "complete"]);
  if (steps.has(value.onboardingStep)) next.onboardingStep = value.onboardingStep;
  return next;
}
