const CACHE = "pact-shell-v1";
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
  let title = "Update available";
  try {
    const data = event.data ? event.data.json() : null;
    if (data && data.title) title = data.title;
  } catch {
    title = "Update available";
  }
  event.waitUntil(self.registration.showNotification(title, { body: "Open Pact to read it.", tag: "pact-update" }));
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
