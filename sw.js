/**
 * sw.js - Service Worker for Estate Checkout
 * Provides offline support via stale-while-revalidate strategy
 */

const CACHE_NAME = 'estate-checkout-v80';
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
  '/js/onboarding.js',
  '/js/storage.js',
  '/js/utils.js',
  '/lib/qrcode.min.js',
  '/manifest.json',
  'https://unpkg.com/html5-qrcode'
];

// Install: cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
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

// Fetch: stale-while-revalidate — serve from cache, update in background
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Only cache successful same-origin or CORS responses
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Network failed — fall back to cached version or offline fallback
        if (cachedResponse) return cachedResponse;
        if ((event.request.headers.get('accept') || '').includes('text/html')) {
          return caches.match('/index.html');
        }
      });

      // Return cached response immediately, or wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
