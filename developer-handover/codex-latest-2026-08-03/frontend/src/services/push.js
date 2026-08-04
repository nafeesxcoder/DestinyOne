import { api } from "./api";

function applicationServerKey(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export async function registerBrowserPush() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported in this browser.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not enabled.");
  const readiness = await api.get("/notifications/push-readiness");
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY || readiness?.vapidPublicKey;
  if (!readiness?.web || !publicKey) throw new Error("Web Push credentials still need to be configured by the developer.");
  const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
  return api.post("/notifications/devices", {
    provider: "web",
    platform: "web",
    subscription: subscription.toJSON(),
    deviceLabel: navigator.userAgent.slice(0, 120),
  });
}
