import { api } from "./api";

const allowedEvents = new Set(["app_session_started","screen_viewed","onboarding_started","membership_viewed","checkout_started","checkout_store_opened","checkout_verification_started","checkout_completed","checkout_failed","restore_started","restore_completed","restore_failed","discovery_signal","gift_sent","physical_gift_requested","relationship_path_opened","date_plan_status_changed","private_reflection_saved","relationship_learning_consent_changed","date_reminder_changed"]);
const allowedKeys = new Set(["screen_key","action_key","item_key","status_key","source_key","type","stage","from_status","to_status","choice","enabled","demo","count_bucket","value_bucket","platform","app_version","build_variant","network_state","duration_bucket","error_code"]);
const uuid = () => typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString().padStart(12,"0").slice(-12)}`;
const sessionId = uuid();
let enabled = false; let started = false; let sending = false;
const queue = [];
function safeProperties(properties = {}) {
  return Object.fromEntries(Object.entries(properties).filter(([key,value]) => allowedKeys.has(key) && ["string","number","boolean"].includes(typeof value) && String(value).length <= 120).slice(0,12));
}
async function flush() {
  if (!enabled || sending || !queue.length) return;
  sending = true;
  try {
    if (!started) {
      await api.post("/analytics/sessions", { sessionId,platform:"web",appVersion:"1.0.0",buildVariant:process.env.NODE_ENV === "production" ? "production" : "development" });
      started = true;
    }
    while (queue.length) {
      await api.post("/analytics/events", queue[0]); queue.shift();
    }
  } catch { /* Offline/auth failures remain silent and retryable. */ }
  finally { sending = false; }
}
export function configureWebAnalytics(consent) {
  enabled = Boolean(consent);
  if (!enabled) { queue.length = 0; started = false; }
  else void flush();
}
export function trackWebAnalytics(eventName, properties = {}) {
  if (!enabled || !allowedEvents.has(eventName)) return false;
  queue.push({ eventId:uuid(),sessionId,eventName,properties:safeProperties(properties),occurredAt:new Date().toISOString() });
  if (queue.length > 100) queue.splice(0,queue.length-100);
  void flush(); return true;
}
export async function withdrawWebAnalytics() {
  configureWebAnalytics(false);
  try { await api.delete("/analytics/consent"); } catch { /* Server setting save remains authoritative. */ }
}
