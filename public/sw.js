// AURA service worker — gives the installed PWA offline support.
// Strategy: navigations fall back to the cached app shell; same-origin GETs are
// cached as they're fetched (stale-while-revalidate-ish). Cloud sync still uses
// the network (Supabase) when online; the app itself keeps working offline.

const CACHE = 'aura-cache-v1';
const SHELL = './index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([SHELL, './manifest.webmanifest'])),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // never intercept Supabase / cross-origin API traffic
  if (url.origin !== self.location.origin) return;

  // SPA navigations -> cached shell when offline
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(SHELL).then((r) => r || fetch(req))),
    );
    return;
  }

  // static assets -> cache first, then network, and refresh the cache
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
