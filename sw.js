// Increment this version every time you deploy an update!
const CACHE_NAME = 'ecosaver-v1.0.1';

// The core files needed to boot up the app shell
const PRE_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
  // If you have specific CSS or JS files, add them here, for example:
  // '/styles.css',
  // '/app.js'
];

// 1. Install – pre‑cache the core files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Pre-caching core assets...');
        return cache.addAll(PRE_CACHE);
      })
      .then(() => self.skipWaiting()) // Force activation immediately
  );
});

// 2. Activate – clean up old legacy caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of open pages immediately
  );
});

// 3. Fetch – Cache-First strategy with Network Fallback (Ensures 100% offline stability)
self.addEventListener('fetch', event => {
  // Skip cross-origin or non-GET requests (like APIs if you have any)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // If the file is in the cache, serve it instantly! (Even after 5 hours)
      if (cachedResponse) {
        
        // OPTIONAL: Fetch a fresh copy in the background to update the cache for next time
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => /* Ignore network failures when updating background */ {});

        return cachedResponse;
      }

      // If it's NOT in the cache, go to the network
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Dynamically cache new assets found while browsing
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback for navigation requests if network fails completely and not in cache
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
