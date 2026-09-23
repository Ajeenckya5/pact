const CACHE = "pact-shell-v2";
const SHELL = ["./"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("push", (event) => {
  let title = "Pact";
  let body = "Your partner nudged you.";
  try {
    const data = event.data ? event.data.json() : null;
    if (data && typeof data.title === "string") title = data.title;
    if (data && typeof data.body === "string") body = data.body;
  } catch {
    title = "Pact";
  }
  event.waitUntil(self.registration.showNotification(title, { body, tag: "pact-nudge" }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((windowClient) => "focus" in windowClient);
      if (open) return open.focus();
      return self.clients.openWindow("./");
    }),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((hit) => hit || caches.match("./"))),
  );
});
