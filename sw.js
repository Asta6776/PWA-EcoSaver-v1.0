const CACHE_NAME = 'ecosaver-v2';
const urlsToCache = [
  '.',
  'index.html',
  'manifest.json',
  'https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;0,900;1,400&family=DM+Sans:wght@300;400;500;600&display=swap',
  'https://fonts.gstatic.com/s/fraunces/v26/...', // will be cached dynamically
  'https://fonts.gstatic.com/s/dmsans/v11/...'
];

// Install: pre-cache the main shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache).catch(err => {
        console.warn('Initial cache failed (some URLs may be dynamic):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for static
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass cache for Firebase auth and API calls
  if (url.hostname.includes('googleapis.com') ||
      url.hostname.includes('firebaseapp.com') ||
      url.hostname.includes('gstatic.com') ||
      url.hostname.includes('anthropic.com')) {
    // Network only (or network-first with fallback)
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // For fonts (Google Fonts dynamic URLs), cache on the fly
  if (url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        fetch(request).then(response => {
          cache.put(request, response.clone());
          return response;
        }).catch(() => caches.match(request))
      )
    );
    return;
  }

  // Default: cache-first for local files, network for everything else
  event.respondWith(
    caches.match(request).then(cached => {
      const fetched = fetch(request).then(response => {
        // Cache valid responses for local origin
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});