import crypto from "node:crypto";
import webpush from "web-push";
import { databaseMode, query } from "../config/db.js";

const previewDevices = new Map();
const vapidPublicKey = String(process.env.WEB_PUSH_VAPID_PUBLIC_KEY || "").trim();
const vapidPrivateKey = String(process.env.WEB_PUSH_VAPID_PRIVATE_KEY || "").trim();
const vapidSubject = String(process.env.WEB_PUSH_SUBJECT || "mailto:support@destinyone.app").trim();
const expoAccessToken = String(process.env.EXPO_PUSH_ACCESS_TOKEN || "").trim();

if (vapidPublicKey && vapidPrivateKey) webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const tokenHash = (value) => crypto.createHash("sha256").update(value).digest("hex");

function cleanPlatform(value) {
  return ["ios", "android", "web"].includes(value) ? value : "web";
}

export function normalizePushDevice(input = {}) {
  const provider = input.provider === "expo" ? "expo" : input.provider === "web" ? "web" : null;
  const platform = cleanPlatform(input.platform);
  if (!provider) throw new Error("Unsupported push provider.");
  if (provider === "expo") {
    const token = String(input.token || "").trim();
    if (!/^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/.test(token)) throw new Error("Invalid Expo push token.");
    return { provider, platform, token, tokenHash: tokenHash(token), subscription: null };
  }
  const subscription = input.subscription;
  const endpoint = String(subscription?.endpoint || "").trim();
  const p256dh = String(subscription?.keys?.p256dh || "").trim();
  const auth = String(subscription?.keys?.auth || "").trim();
  if (!endpoint.startsWith("https://") || !p256dh || !auth || endpoint.length > 2048) throw new Error("Invalid web push subscription.");
  return { provider, platform: "web", token: endpoint, tokenHash: tokenHash(endpoint), subscription: { endpoint, expirationTime: subscription.expirationTime ?? null, keys: { p256dh, auth } } };
}

export async function registerPushDevice(userId, input) {
  const device = normalizePushDevice(input);
  const label = String(input.deviceLabel || "").trim().slice(0, 120) || null;
  if (databaseMode === "preview") {
    previewDevices.set(`${userId}:${device.tokenHash}`, { userId, ...device, deviceLabel: label, active: true });
    return { provider: device.provider, platform: device.platform, tokenHash: device.tokenHash, active: true };
  }
  await query(
    `INSERT INTO push_devices (user_id, provider, platform, token_hash, token, subscription_json, device_label, active, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, NOW())
     ON DUPLICATE KEY UPDATE user_id=VALUES(user_id), provider=VALUES(provider), platform=VALUES(platform),
       token=VALUES(token), subscription_json=VALUES(subscription_json), device_label=VALUES(device_label),
       active=TRUE, last_seen_at=NOW(), last_error=NULL`,
    [userId, device.provider, device.platform, device.tokenHash, device.token, device.subscription ? JSON.stringify(device.subscription) : null, label],
  );
  return { provider: device.provider, platform: device.platform, tokenHash: device.tokenHash, active: true };
}

export async function revokePushDevice(userId, hash) {
  if (!/^[a-f0-9]{64}$/.test(hash)) return false;
  if (databaseMode === "preview") return previewDevices.delete(`${userId}:${hash}`);
  const result = await query("UPDATE push_devices SET active=FALSE, revoked_at=NOW() WHERE user_id=? AND token_hash=?", [userId, hash]);
  return result.affectedRows > 0;
}

async function sendExpo(token, notification) {
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(expoAccessToken ? { Authorization: `Bearer ${expoAccessToken}` } : {}),
    },
    body: JSON.stringify({ to: token, sound: "default", channelId: "messages", priority: "high", ...notification }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.data?.status === "error") throw new Error(payload?.data?.message || `Expo push failed (${response.status}).`);
}

async function sendWeb(subscription, notification) {
  if (!vapidPublicKey || !vapidPrivateKey) throw new Error("Web Push VAPID keys are not configured.");
  await webpush.sendNotification(subscription, JSON.stringify(notification), { TTL: 60, urgency: "high" });
}

export async function dispatchPushToUser(userId, notification) {
  if (!userId) return { attempted: 0, sent: 0, failed: 0 };
  let devices;
  if (databaseMode === "preview") devices = [...previewDevices.values()].filter((device) => device.userId === userId && device.active);
  else {
    const settings = await query("SELECT message_notifications AS enabled FROM user_settings WHERE user_id=? LIMIT 1", [userId]);
    if (settings[0]?.enabled === 0) return { attempted: 0, sent: 0, failed: 0 };
    devices = await query(
      "SELECT id,provider,platform,token,subscription_json AS subscriptionJson,token_hash AS tokenHash FROM push_devices WHERE user_id=? AND active=TRUE",
      [userId],
    );
  }
  const result = { attempted: devices.length, sent: 0, failed: 0 };
  await Promise.all(devices.map(async (device) => {
    try {
      if (device.provider === "expo") await sendExpo(device.token, notification);
      else {
        const subscription = typeof device.subscriptionJson === "string" ? JSON.parse(device.subscriptionJson) : device.subscriptionJson ?? device.subscription;
        await sendWeb(subscription, notification);
      }
      result.sent += 1;
      if (databaseMode === "mysql") await query("UPDATE push_devices SET last_success_at=NOW(), last_error=NULL WHERE id=?", [device.id]);
    } catch (error) {
      result.failed += 1;
      const statusCode = Number(error?.statusCode || 0);
      const permanent = statusCode === 404 || statusCode === 410 || /DeviceNotRegistered/i.test(String(error?.message || ""));
      if (databaseMode === "mysql") await query(
        "UPDATE push_devices SET active=IF(?,FALSE,active), revoked_at=IF(?,NOW(),revoked_at), last_error=? WHERE id=?",
        [permanent, permanent, String(error?.message || "Push delivery failed").slice(0, 500), device.id],
      );
    }
  }));
  return result;
}

export function pushProviderReadiness() {
  return { expo: true, web: Boolean(vapidPublicKey && vapidPrivateKey), vapidPublicKey: vapidPublicKey || null };
}
