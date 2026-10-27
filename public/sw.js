const CACHE_NAME = 'puresuite-offline-v12';
const PRECACHE_ASSETS = [
  '/manifest.webmanifest',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)).catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (keys) => {
      let deletedOld = false;
      for (const k of keys) {
        if (k !== CACHE_NAME) {
          await caches.delete(k);
          deletedOld = true;
        }
      }
      await self.clients.claim();
      if (deletedOld) {
        const windowClients = await self.clients.matchAll({ type: 'window' });
        for (const client of windowClients) {
          client.postMessage({ type: 'PURGED_OLD_CACHE_RELOAD' });
        }
      }
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request, { cache: 'no-store' })
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

