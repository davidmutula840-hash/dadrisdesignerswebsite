/* =========================================================
   DADRIS DESIGNERS — Service Worker
   Handles caching for offline/fast loading PWA experience
   Place this file in your ROOT website folder (same level as index.html)
   ========================================================= */

const CACHE_NAME = 'dadris-v1';
const BASE = '/dadrisdesignerswebsite';

// Files to cache immediately on install
const PRECACHE_URLS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/about.html',
  BASE + '/services.html',
  BASE + '/portfolio.html',
  BASE + '/pricing.html',
  BASE + '/contact.html',
  BASE + '/css/style.css',
  BASE + '/js/main.js',
  BASE + '/images/logo.jpg',
  BASE + '/manifest.json',
  BASE + '/client-portal/login.html',
];

// ---- Install: pre-cache core files ----
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS).catch(err => {
        console.warn('[SW] Pre-cache failed for some files:', err);
      });
    })
  );
  self.skipWaiting();
});

// ---- Activate: clean up old caches ----
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch: serve from cache, fall back to network ----
self.addEventListener('fetch', event => {
  // Skip non-GET and browser extension requests
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  // For API calls (Anthropic, Firebase) — always go to network
  if (
    event.request.url.includes('api.anthropic.com') ||
    event.request.url.includes('firestore.googleapis.com') ||
    event.request.url.includes('firebase') ||
    event.request.url.includes('formspree.io')
  ) {
    return;
  }

  // For Google Fonts — network first, cache fallback
  if (event.request.url.includes('fonts.googleapis.com') || event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        fetch(event.request)
          .then(response => { cache.put(event.request, response.clone()); return response; })
          .catch(() => caches.match(event.request))
      )
    );
    return;
  }

  // For everything else — cache first, network fallback, then offline page
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Cache successful responses from our own domain
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for HTML pages
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match(BASE + '/index.html');
        }
      });
    })
  );
});
