/**
 * sw.js - Service Worker for Estate Checkout
 * Provides offline support via cache-first strategy
 */

const CACHE_NAME = 'estate-checkout-v25';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/checkout.js',
  '/js/sale-setup.js',
  '/js/speech.js',
  '/js/qr.js',
  '/js/scan.js',
  '/js/payment.js',
  '/js/dashboard.js',
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

// Fetch: cache-first strategy for offline support
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version or fetch from network
        return cachedResponse || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, return offline fallback for HTML
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('/index.html');
        }
      })
  );
});
