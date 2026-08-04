self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() || {};
  const title = payload.title || "DestinyOne";
  event.waitUntil(self.registration.showNotification(title, {
    body: payload.body || "You have a new private update.",
    icon: "/icons/destinyone-mark.svg",
    tag: payload.tag || "destinyone-update",
    renotify: true,
    data: { url: payload.url || "/messages", ...(payload.data || {}) },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/messages", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) return existing.focus().then(() => existing.navigate(target));
    return clients.openWindow(target);
  }));
});
