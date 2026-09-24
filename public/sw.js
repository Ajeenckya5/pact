const CACHE = "pact-shell-v3";
const SHELL_LIMIT = 2 * 1024 * 1024;
const SHELL = ["./", "manifest.webmanifest", "icons/icon-180.png", "icons/icon-192.png", "icons/icon-512.png"];

function shellUrls() {
  return new Set(SHELL.map((path) => new URL(path, self.location.href).href.split("#")[0]));
}

async function cachedBytes(cache) {
  let used = 0;
  for (const request of await cache.keys()) {
    const hit = await cache.match(request);
    if (hit) used += (await hit.clone().blob()).size;
  }
  return used;
}

async function remember(cache, request, response) {
  const size = (await response.clone().blob()).size;
  if ((await cachedBytes(cache)) + size > SHELL_LIMIT) return;
  await cache.put(request, response);
}

async function fillShell(cache) {
  for (const path of SHELL) {
    try {
      const response = await fetch(path);
      if (response.ok) await remember(cache, path, response);
    } catch {
      /* the shell is filled on the next visit */
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => fillShell(cache)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
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
  if (!shellUrls().has(event.request.url.split("#")[0])) return;
  event.respondWith(
    fetch(event.request)
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CACHE);
          await remember(cache, event.request, response.clone());
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((hit) => hit || caches.match("./"))),
  );
});
