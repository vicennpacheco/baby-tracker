// Service worker of Métricas Bebé (CLAUDE.md §5, decision 072).
//
// It NEVER caches a response with the family's data: page loads (HTML),
// React Server Component payloads and Server Actions always go to the
// network. It only keeps what is the same for everyone:
//   - the static /offline page, shown when a page load fails;
//   - the app icons;
//   - the build's content-hashed files under /_next/static/ (immutable).
//
// Bump VERSION when the precached files change; old caches are deleted.

const VERSION = "v1";
const CACHE = `static-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icon/192", "/icon/512", "/apple-icon"];

// Also the offline page's own CSS, fonts and scripts, read from its HTML:
// the visits so far may never have loaded them. Best effort: a missing
// asset leaves the page less polished, never without its message.
async function precache() {
  const cache = await caches.open(CACHE);
  await cache.addAll(PRECACHE);
  const offline = await cache.match(OFFLINE_URL);
  const html = offline ? await offline.text() : "";
  const assets = new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) ?? []);
  await Promise.allSettled([...assets].map((asset) => cache.add(asset)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // A page load carries the family's data: always the network, and the
  // static offline page only when there is none.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches
          .match(OFFLINE_URL)
          .then((offline) => offline ?? Response.error()),
      ),
    );
    return;
  }

  // Content-hashed build files never change under the same URL.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              event.waitUntil(
                caches.open(CACHE).then((cache) => cache.put(request, copy)),
              );
            }
            return response;
          }),
      ),
    );
  }

  // Anything else (RSC payloads, icons on first use, the manifest) goes to
  // the network untouched.
});
