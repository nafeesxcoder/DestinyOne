import { Router } from "express";
import { databaseMode, query } from "../config/db.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
const events = new Set(["app_session_started","screen_viewed","onboarding_started","membership_viewed","checkout_started","checkout_store_opened","checkout_verification_started","checkout_completed","checkout_failed","restore_started","restore_completed","restore_failed","discovery_signal","gift_sent","physical_gift_requested","relationship_path_opened","date_plan_status_changed","private_reflection_saved","relationship_learning_consent_changed","date_reminder_changed"]);
const propertyKeys = new Set(["screen_key","action_key","item_key","status_key","source_key","type","stage","from_status","to_status","choice","enabled","demo","count_bucket","value_bucket","platform","app_version","build_variant","network_state","duration_bucket","error_code"]);
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
const consented = async userId => databaseMode === "mysql" && Boolean((await query("SELECT anonymous_analytics AS consent FROM user_settings WHERE user_id=? LIMIT 1", [userId]))[0]?.consent);
function safeProperties(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value); if (entries.length > 12) return null;
  const safe = {};
  for (const [key, item] of entries) {
    const text = String(item);
    if (!propertyKeys.has(key) || !["string","number","boolean"].includes(typeof item) || text.length > 120 ||
      (typeof item === "string" && (/[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(item) || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(item) || /(^|\D)\d{8,}(\D|$)/.test(item)))) return null;
    safe[key] = item;
  }
  return safe;
}

router.post("/sessions", requireAuth, async (request, response, next) => {
  try {
    if (databaseMode === "preview") return response.json({ accepted: false, reason: "analytics_disabled_in_preview" });
    const { sessionId, platform, appVersion, buildVariant } = request.body || {};
    if (!uuid(sessionId) || !["ios","android","web"].includes(platform) || !["development","pilot","preview","production"].includes(buildVariant) || !String(appVersion || "").match(/^.{1,32}$/)) return response.status(400).json({ message: "Invalid analytics session." });
    if (!(await consented(request.user.id))) return response.status(403).json({ message: "Analytics consent is disabled." });
    await query("INSERT INTO launch_analytics_sessions (id,user_id,platform,app_version,build_variant) VALUES (?,?,?,?,?) ON DUPLICATE KEY UPDATE last_seen_at=NOW()", [sessionId,request.user.id,platform,appVersion,buildVariant]);
    return response.status(202).json({ accepted: true });
  } catch (error) { return next(error); }
});

router.post("/events", requireAuth, async (request, response, next) => {
  try {
    if (databaseMode === "preview") return response.json({ accepted: false, reason: "analytics_disabled_in_preview" });
    const { eventId, sessionId, eventName, properties = {}, occurredAt } = request.body || {};
    const safe = safeProperties(properties); const occurred = new Date(occurredAt);
    if (!uuid(eventId) || !uuid(sessionId) || !events.has(eventName) || !safe || Number.isNaN(occurred.valueOf()) || Math.abs(Date.now()-occurred.valueOf()) > 86400000) return response.status(400).json({ message: "Invalid analytics event." });
    if (!(await consented(request.user.id))) return response.status(403).json({ message: "Analytics consent is disabled." });
    const sessions = await query("SELECT id FROM launch_analytics_sessions WHERE id=? AND user_id=? AND ended_at IS NULL LIMIT 1", [sessionId,request.user.id]);
    if (!sessions[0]) return response.status(409).json({ message: "Analytics session unavailable." });
    const result = await query("INSERT IGNORE INTO launch_analytics_events (id,session_id,user_id,event_name,properties_json,occurred_at) VALUES (?,?,?,?,?,?)", [eventId,sessionId,request.user.id,eventName,JSON.stringify(safe),occurred]);
    if (result.affectedRows) await query("UPDATE launch_analytics_sessions SET event_count=LEAST(event_count+1,10000),last_seen_at=NOW() WHERE id=? AND user_id=?", [sessionId,request.user.id]);
    return response.status(202).json({ accepted: true });
  } catch (error) { return next(error); }
});

router.delete("/consent", requireAuth, async (request, response, next) => {
  try {
    if (databaseMode === "preview") return response.json({ withdrawn: true });
    await query("UPDATE user_settings SET anonymous_analytics=FALSE WHERE user_id=?", [request.user.id]);
    await query("DELETE FROM launch_analytics_sessions WHERE user_id=?", [request.user.id]);
    return response.json({ withdrawn: true });
  } catch (error) { return next(error); }
});

router.get("/snapshot", requireAuth, requireRole("admin"), async (request, response, next) => {
  try {
    if (databaseMode === "preview") return response.json({ sessions: 0, members: 0, events: [] });
    const totals = (await query("SELECT COUNT(*) AS sessions,COUNT(DISTINCT user_id) AS members FROM launch_analytics_sessions WHERE started_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)"))[0];
    const eventRows = await query("SELECT event_name AS eventName,COUNT(*) AS total FROM launch_analytics_events WHERE occurred_at>=DATE_SUB(NOW(),INTERVAL 30 DAY) GROUP BY event_name ORDER BY event_name");
    return response.json({ sessions: Number(totals.sessions), members: Number(totals.members), events: eventRows });
  } catch (error) { return next(error); }
});

export default router;
