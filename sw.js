/**
 * sw.js - Service Worker for Estate Checkout
 *
 * Strategy:
 *  - Network-first for core code (HTML, CSS, JS): fetch fresh, fall back to cache if offline.
 *    This ensures new versions show up on every app open when online.
 *  - Cache-first for external libs (unpkg, /lib/*): these don't change, save bandwidth.
 *  - skipWaiting + clients.claim: new service workers activate immediately.
 *  - Offline fallback: any HTML request that fails returns cached /index.html.
 */

const CACHE_NAME = 'estate-checkout-v143';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/ticket.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/checkout.js',
  '/js/sale-setup.js',
  '/js/speech.js',
  '/js/qr.js',
  '/js/scan.js',
  '/js/payment.js',
  '/js/dashboard.js',
  '/js/payouts.js',
  '/js/storage.js',
  '/js/utils.js',
  '/js/version.js',
  '/lib/qrcode.min.js',
  '/manifest.json',
  'https://unpkg.com/html5-qrcode'
];

// Paths that use network-first (our own core code — want freshness over speed)
const NETWORK_FIRST_PATTERNS = [
  /^\/$/,
  /^\/index\.html$/,
  /^\/ticket\.html$/,
  /^\/css\//,
  /^\/js\//,
  /^\/manifest\.json$/
];

function isNetworkFirst(url) {
  try {
    const pathname = new URL(url).pathname;
    return NETWORK_FIRST_PATTERNS.some((pattern) => pattern.test(pathname));
  } catch {
    return false;
  }
}

// Install: cache all static assets, activate new SW immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches, take control of open clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch: route by strategy
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  if (isNetworkFirst(url)) {
    event.respondWith(networkFirst(event.request));
  } else {
    event.respondWith(cacheFirst(event.request));
  }
});

// Network-first: try network, fall back to cache, final fallback to index.html for HTML
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if ((request.headers.get('accept') || '').includes('text/html')) {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    throw err;
  }
}

// Cache-first: serve cached if available, else fetch and cache
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Offline and not in cache — nothing we can do
    throw err;
  }
}

// Allow app to request immediate activation of a waiting SW
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
