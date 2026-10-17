// Keeps the game playable with no connection (Game Doc v2: works offline). Everything the
// page has loaded once is kept on the device; the page itself is fetched fresh when it can be.
const CACHE = 'party-plaza-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// The page lists what it loaded before this worker was in charge.
self.addEventListener('message', (event) => {
  const urls = event.data && event.data.type === 'cache' && Array.isArray(event.data.urls) ? event.data.urls : [];
  if (urls.length === 0) return;
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(urls.map((url) => cache.add(url).catch(() => undefined)))));
});

async function fresh(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const kept = await cache.match(request, { ignoreSearch: request.mode === 'navigate' });
    if (kept) return kept;
    throw err;
  }
}

async function kept(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // The grown-up account's server is never cached, should it share the game's address.
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin || new URL(request.url).pathname.includes('/api/')) return;
  // Built files carry a hash in their name and never change; the page and the rest may.
  event.respondWith(new URL(request.url).pathname.includes('/assets/') ? kept(request) : fresh(request));
});
