import { Router } from "express";
import { databaseMode, query } from "../config/db.js";
import { previewProfiles, previewUser } from "../data/mockData.js";
import { requireAuth } from "../middleware/auth.js";
import { defaultMemberSettings, normalizeMemberSettings } from "../services/memberSettings.js";

const router = Router();
const previewSettings = new Map();

router.get("/me", requireAuth, async (request, response, next) => {
  try {
    if (databaseMode === "preview") {
      return response.json(previewUser);
    }

    const rows = await query(
      "SELECT id, first_name AS firstName, email, city, intent, verified FROM users WHERE id = ? LIMIT 1",
      [request.user.id],
    );
    return response.json(rows[0] || null);
  } catch (error) {
    return next(error);
  }
});

router.get("/", requireAuth, async (_request, response, next) => {
  try {
    if (databaseMode === "preview") {
      return response.json(previewProfiles);
    }

    const rows = await query(
      `SELECT id, first_name AS firstName, age, profession, city, intent,
       verified, image_url AS image FROM profiles WHERE is_visible = 1`,
    );
    return response.json(rows);
  } catch (error) {
    return next(error);
  }
});

router.put("/me", requireAuth, async (request, response, next) => {
  try {
    const city = String(request.body?.city || "").trim().slice(0, 120);
    const intent = String(request.body?.intent || "").trim().slice(0, 160);
    const profession = String(request.body?.profession || "").trim().slice(0, 120);
    if (databaseMode === "preview") return response.json({ ...previewUser, city, intent, profession });
    await query("UPDATE users SET city = ?, intent = ? WHERE id = ?", [city, intent, request.user.id]);
    await query("UPDATE profiles SET city = ?, intent = ?, profession = ? WHERE user_id = ?", [city, intent, profession, request.user.id]);
    return response.json({ id: request.user.id, city, intent, profession });
  } catch (error) { return next(error); }
});

router.get("/me/settings", requireAuth, async (request, response, next) => {
  try {
    if (databaseMode === "preview") return response.json(previewSettings.get(request.user.id) || defaultMemberSettings);
    const rows = await query(
      `SELECT notifications_enabled AS notifications,private_profile AS privateProfile,pause_discovery AS pauseDiscovery,
       show_last_online AS showLastOnline,anonymous_analytics AS anonymousAnalytics,
       match_notifications AS matchNotifications,message_notifications AS messageNotifications,
       date_notifications AS dateNotifications,safety_notifications AS safetyNotifications,
       marketing_notifications AS marketingNotifications,quiet_hours_start AS quietHoursStart,
       quiet_hours_end AS quietHoursEnd,onboarding_step AS onboardingStep
       FROM user_settings WHERE user_id=? LIMIT 1`,
      [request.user.id],
    );
    return response.json(normalizeMemberSettings(rows[0] || {}));
  } catch (error) { return next(error); }
});

router.put("/me/settings", requireAuth, async (request, response, next) => {
  try {
    let current = defaultMemberSettings;
    if (databaseMode === "preview") current = previewSettings.get(request.user.id) || current;
    else {
      const rows = await query(
        `SELECT notifications_enabled AS notifications,private_profile AS privateProfile,pause_discovery AS pauseDiscovery,
         show_last_online AS showLastOnline,anonymous_analytics AS anonymousAnalytics,
         match_notifications AS matchNotifications,message_notifications AS messageNotifications,date_notifications AS dateNotifications,
         safety_notifications AS safetyNotifications,marketing_notifications AS marketingNotifications,
         quiet_hours_start AS quietHoursStart,quiet_hours_end AS quietHoursEnd,onboarding_step AS onboardingStep
         FROM user_settings WHERE user_id=? LIMIT 1`,
        [request.user.id],
      );
      current = normalizeMemberSettings(rows[0] || {});
    }
    const settings = normalizeMemberSettings(request.body, current);
    if (databaseMode === "preview") previewSettings.set(request.user.id, settings);
    else await query(
      `INSERT INTO user_settings (user_id,notifications_enabled,private_profile,pause_discovery,show_last_online,anonymous_analytics,
       match_notifications,message_notifications,date_notifications,safety_notifications,marketing_notifications,quiet_hours_start,quiet_hours_end,onboarding_step)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE notifications_enabled=VALUES(notifications_enabled),private_profile=VALUES(private_profile),
       pause_discovery=VALUES(pause_discovery),show_last_online=VALUES(show_last_online),anonymous_analytics=VALUES(anonymous_analytics),
       match_notifications=VALUES(match_notifications),message_notifications=VALUES(message_notifications),date_notifications=VALUES(date_notifications),
       safety_notifications=VALUES(safety_notifications),marketing_notifications=VALUES(marketing_notifications),quiet_hours_start=VALUES(quiet_hours_start),
       quiet_hours_end=VALUES(quiet_hours_end),onboarding_step=VALUES(onboarding_step)`,
      [request.user.id,settings.notifications,settings.privateProfile,settings.pauseDiscovery,settings.showLastOnline,settings.anonymousAnalytics,
        settings.matchNotifications,settings.messageNotifications,settings.dateNotifications,settings.safetyNotifications,settings.marketingNotifications,
        settings.quietHoursStart,settings.quietHoursEnd,settings.onboardingStep],
    );
    return response.json(settings);
  } catch (error) { return next(error); }
});

export default router;
