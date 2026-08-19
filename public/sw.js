/* Life Dashboard service worker — offline app shell + asset caching + web push. */
const CACHE = "ld-cache-v1";

// ---- Web push ----
self.addEventListener("push", (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { body: e.data ? e.data.text() : "" };
  }
  const title = data.title || "Life Dashboard";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "life-dashboard",
    data: { url: data.url || "/today" },
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) {
          c.navigate(target).catch(() => {});
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })(),
  );
});

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.add("/")));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Never cache API calls (coach probe, etc.) — always hit the network.
  if (url.pathname.startsWith("/api")) return;

  if (req.mode === "navigate") {
    // Network-first for pages, fall back to the cached shell when offline.
    e.respondWith(
      (async () => {
        try {
          const net = await fetch(req);
          const c = await caches.open(CACHE);
          c.put(req, net.clone());
          return net;
        } catch {
          return (await caches.match(req)) || (await caches.match("/")) || Response.error();
        }
      })(),
    );
    return;
  }

  // Cache-first for static assets, refreshing in the background.
  e.respondWith(
    (async () => {
      const cached = await caches.match(req);
      if (cached) {
        fetch(req)
          .then((net) => caches.open(CACHE).then((c) => c.put(req, net)))
          .catch(() => {});
        return cached;
      }
      try {
        const net = await fetch(req);
        const c = await caches.open(CACHE);
        c.put(req, net.clone());
        return net;
      } catch {
        return Response.error();
      }
    })(),
  );
});
