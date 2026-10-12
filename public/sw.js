// Service worker of Métricas Bebé (CLAUDE.md §5, decision 072).
//
// It NEVER caches a response with the family's data: page loads (HTML),
// React Server Component payloads and Server Actions always go to the
// network. When a page load fails, it shows the static /offline page,
// stored at install time with the icons and the page's own CSS, fonts and
// scripts. Nothing else is stored: the build files are already immutable
// in the HTTP cache, and offline the app has nothing to show but that page.
//
// Bump VERSION to store a newer /offline page; old caches are deleted.

const VERSION = "v1";
const CACHE = `offline-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icon/192", "/icon/512", "/apple-icon"];

// The offline page's assets are read from its HTML. Best effort: a missing
// one leaves the page less polished, never without its message.
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

  // The offline page's stored assets; content-hashed, so never stale.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request)),
    );
  }

  // Anything else goes to the network untouched.
});
